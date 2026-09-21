/**
 * In-Memory Metrics Registry & Observability Tracker
 * Tracks real-time counts, latencies, and reliability indicators without external dependencies
 */
class MetricsService {
  constructor() {
    this.reset();
  }

  reset() {
    this.startTime = new Date();
    this.counters = {
      apiRequestsTotal: 0,
      apiErrorsTotal: 0,
      rpcCallsTotal: 0,
      rpcFailuresTotal: 0,
      monitoringCyclesTotal: 0,
      parsedTransactionsTotal: 0,
      copyDecisionsTotal: 0,
      paperTradesTotal: 0,
      riskBlocksTotal: 0,
      testnetExecutionsTotal: 0,
      testnetExecutionsConfirmed: 0,
      testnetExecutionsFailed: 0,
      duplicatesPreventedTotal: 0,
      recoveriesTotal: 0
    };

    this.latencies = {
      apiLatenciesMs: [],
      rpcLatenciesMs: []
    };
  }

  increment(metric, amount = 1) {
    if (this.counters[metric] !== undefined) {
      this.counters[metric] += amount;
    }
  }

  recordLatency(type, latencyMs) {
    if (typeof latencyMs !== 'number' || isNaN(latencyMs)) return;
    const key = type === 'rpc' ? 'rpcLatenciesMs' : 'apiLatenciesMs';
    const list = this.latencies[key];
    list.push(latencyMs);
    if (list.length > 200) {
      list.shift(); // Keep last 200 samples
    }
  }

  getAverageLatency(type) {
    const key = type === 'rpc' ? 'rpcLatenciesMs' : 'apiLatenciesMs';
    const list = this.latencies[key];
    if (list.length === 0) return 0;
    const sum = list.reduce((a, b) => a + b, 0);
    return Math.round(sum / list.length);
  }

  getSnapshot() {
    const uptimeSeconds = Math.floor((Date.now() - this.startTime.getTime()) / 1000);
    const avgApiLatency = this.getAverageLatency('api');
    const avgRpcLatency = this.getAverageLatency('rpc');

    return {
      uptimeSeconds,
      startTime: this.startTime.toISOString(),
      counters: { ...this.counters },
      performance: {
        avgApiLatencyMs: avgApiLatency,
        avgRpcLatencyMs: avgRpcLatency,
        apiSuccessRatePercent: this.counters.apiRequestsTotal > 0
          ? Math.round(((this.counters.apiRequestsTotal - this.counters.apiErrorsTotal) / this.counters.apiRequestsTotal) * 100)
          : 100,
        rpcSuccessRatePercent: this.counters.rpcCallsTotal > 0
          ? Math.round(((this.counters.rpcCallsTotal - this.counters.rpcFailuresTotal) / this.counters.rpcCallsTotal) * 100)
          : 100
      }
    };
  }
}

module.exports = new MetricsService();
