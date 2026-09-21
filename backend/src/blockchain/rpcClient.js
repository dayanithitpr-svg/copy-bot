const env = require('../config/env');
const logger = require('../utils/logger');
const metricsService = require('../services/metricsService');

const CIRCUIT_STATE = {
  CLOSED: 'CLOSED',       // Normal operation
  OPEN: 'OPEN',           // Tripped, rejecting calls fast
  HALF_OPEN: 'HALF_OPEN'  // Testing recovery
};

/**
 * Resilient JSON-RPC Client
 * Features: Request timeout, exponential backoff with jitter, error normalization, circuit breaker protection.
 */
class RpcClient {
  constructor() {
    this.circuitBreakers = new Map(); // rpcUrl -> { state, failureCount, lastFailureTime, successCount }
    this.failureThreshold = 5;
    this.coolOffPeriodMs = 15000;
  }

  getCircuit(rpcUrl) {
    if (!this.circuitBreakers.has(rpcUrl)) {
      this.circuitBreakers.set(rpcUrl, {
        state: CIRCUIT_STATE.CLOSED,
        failureCount: 0,
        lastFailureTime: 0,
        successCount: 0
      });
    }
    const circuit = this.circuitBreakers.get(rpcUrl);

    // Transition from OPEN to HALF_OPEN after cool off
    if (circuit.state === CIRCUIT_STATE.OPEN && Date.now() - circuit.lastFailureTime > this.coolOffPeriodMs) {
      circuit.state = CIRCUIT_STATE.HALF_OPEN;
      circuit.successCount = 0;
      logger.info(`[RPC CIRCUIT] Circuit for ${rpcUrl} transitioned to HALF_OPEN (probing health)`);
    }

    return circuit;
  }

  recordSuccess(rpcUrl) {
    const circuit = this.getCircuit(rpcUrl);
    if (circuit.state === CIRCUIT_STATE.HALF_OPEN) {
      circuit.successCount++;
      if (circuit.successCount >= 2) {
        circuit.state = CIRCUIT_STATE.CLOSED;
        circuit.failureCount = 0;
        logger.info(`[RPC CIRCUIT] Circuit for ${rpcUrl} restored to CLOSED (healthy)`);
      }
    } else if (circuit.state === CIRCUIT_STATE.CLOSED) {
      circuit.failureCount = 0;
    }
  }

  recordFailure(rpcUrl, err) {
    const circuit = this.getCircuit(rpcUrl);
    circuit.failureCount++;
    circuit.lastFailureTime = Date.now();

    if (circuit.state === CIRCUIT_STATE.CLOSED && circuit.failureCount >= this.failureThreshold) {
      circuit.state = CIRCUIT_STATE.OPEN;
      logger.error(`[RPC CIRCUIT] Circuit for ${rpcUrl} tripped to OPEN (${circuit.failureCount} consecutive failures)`);
    } else if (circuit.state === CIRCUIT_STATE.HALF_OPEN) {
      circuit.state = CIRCUIT_STATE.OPEN;
      logger.warn(`[RPC CIRCUIT] Probe failed for ${rpcUrl}, returning to OPEN`);
    }
  }

  /**
   * Executes a JSON-RPC method call with retry and circuit breaker
   * @param {string} rpcUrl 
   * @param {string} method 
   * @param {Array} params 
   * @param {Object} options 
   * @returns {Promise<any>}
   */
  async call(rpcUrl, method, params = [], options = {}) {
    metricsService.increment('rpcCallsTotal');
    const circuit = this.getCircuit(rpcUrl);

    // Fast fail if circuit is OPEN
    if (circuit.state === CIRCUIT_STATE.OPEN) {
      metricsService.increment('rpcFailuresTotal');
      const timeRemaining = Math.ceil((this.coolOffPeriodMs - (Date.now() - circuit.lastFailureTime)) / 1000);
      throw new Error(`RPC_CIRCUIT_OPEN: Node ${rpcUrl} is temporarily unavailable. Cool-off active (${timeRemaining}s remaining).`);
    }

    const timeoutMs = options.timeoutMs || env.RPC_TIMEOUT_MS;
    const maxRetries = options.maxRetries ?? env.RPC_MAX_RETRIES;
    let attempt = 0;
    let lastError = null;

    const body = JSON.stringify({
      jsonrpc: '2.0',
      id: Math.floor(Math.random() * 1000000),
      method,
      params
    });

    const callStartTime = Date.now();

    while (attempt <= maxRetries) {
      const attemptStartTime = Date.now();
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);

        const response = await fetch(rpcUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body,
          signal: controller.signal
        });

        clearTimeout(timer);
        const duration = Date.now() - attemptStartTime;
        metricsService.recordLatency('rpc', duration);

        if (!response.ok) {
          if (response.status === 429) {
            throw new Error(`RPC_RATE_LIMIT: HTTP 429 Too Many Requests from RPC provider`);
          }
          throw new Error(`RPC HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.error) {
          throw new Error(`RPC Error [${data.error.code}]: ${data.error.message || JSON.stringify(data.error)}`);
        }

        this.recordSuccess(rpcUrl);
        return data.result;
      } catch (err) {
        lastError = err;
        attempt++;

        const isAbort = err.name === 'AbortError' || err.message.includes('aborted');
        const errorMsg = isAbort ? `RPC request timed out (${timeoutMs}ms)` : err.message;

        if (attempt <= maxRetries) {
          // Exponential backoff with random jitter (+/- 20%)
          const baseDelay = Math.min(1000 * Math.pow(2, attempt - 1), 4000);
          const jitter = baseDelay * (0.8 + Math.random() * 0.4);
          const delayMs = Math.round(jitter);

          logger.warn(`RPC call [${method}] failed (${errorMsg}). Retrying in ${delayMs}ms (attempt ${attempt}/${maxRetries})...`);
          await new Promise((res) => setTimeout(res, delayMs));
        } else {
          logger.error(`RPC call [${method}] failed after ${maxRetries + 1} attempts: ${errorMsg}`);
        }
      }
    }

    metricsService.increment('rpcFailuresTotal');
    this.recordFailure(rpcUrl, lastError);
    throw new Error(`RPC request failed: ${lastError?.message || 'Unknown error'}`);
  }

  /**
   * Resets all circuit breakers
   */
  resetCircuits() {
    this.circuitBreakers.clear();
  }

  /**
   * Gets circuit status overview
   */
  getCircuitStatuses() {
    const statuses = {};
    for (const [url, circuit] of this.circuitBreakers.entries()) {
      statuses[url] = {
        state: circuit.state,
        failureCount: circuit.failureCount,
        lastFailure: circuit.lastFailureTime ? new Date(circuit.lastFailureTime).toISOString() : null
      };
    }
    return statuses;
  }
}

module.exports = new RpcClient();
