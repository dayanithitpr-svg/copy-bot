const env = require('../config/env');
const { getDBStatus } = require('../config/database');
const monitoringScheduler = require('../services/monitoringScheduler');
const productionSafetyService = require('../security/productionSafetyService');
const rpcClient = require('../blockchain/rpcClient');
const ApiResponse = require('../utils/apiResponse');

/**
 * General Health Check
 * GET /api/v1/health
 */
const checkHealth = (req, res) => {
  const db = getDBStatus();
  const uptime = process.uptime();
  const monitoring = monitoringScheduler.getStatus();
  const safety = productionSafetyService.getSafetyStatus();

  return ApiResponse.success(res, {
    statusCode: 200,
    message: 'Copy Trading API is operational',
    data: {
      environment: env.NODE_ENV,
      version: '1.0.0',
      uptime: `${Math.floor(uptime)}s`,
      timestamp: new Date().toISOString(),
      services: {
        api: 'operational',
        database: db.status, // 'healthy' or 'degraded'
        blockchain: 'read-only-rpc-active',
        monitoring: monitoring.enabled
          ? monitoring.isRunning
            ? 'active'
            : 'idle'
          : 'disabled',
        testnetExecution: safety.executionModes.testnetEnabled ? 'ready' : 'disabled_by_kill_switch',
        mainnetExecution: 'BLOCKED'
      },
      monitoring: {
        enabled: monitoring.enabled,
        intervalMs: monitoring.intervalMs,
        totalCycles: monitoring.stats.totalCycles,
        lastRunAt: monitoring.stats.lastRunAt
      },
      safety: {
        killSwitchActive: safety.killSwitchActive,
        mainnetBlocked: true,
        supportedModes: safety.permittedModes
      },
      phase: 9
    }
  });
};

/**
 * Fast Liveness Probe (Kubernetes / Process Manager)
 * GET /api/v1/health/liveness
 */
const checkLiveness = (req, res) => {
  return res.status(200).json({
    status: 'UP',
    alive: true,
    timestamp: new Date().toISOString()
  });
};

/**
 * Deep Readiness Probe
 * GET /api/v1/health/readiness
 */
const checkReadiness = (req, res) => {
  const db = getDBStatus();
  const monitoring = monitoringScheduler.getStatus();
  const safety = productionSafetyService.getSafetyStatus();

  const isDbReady = db.status === 'healthy';
  const isReady = isDbReady; // Readiness criteria: DB connectivity established

  const payload = {
    status: isReady ? 'READY' : 'DEGRADED',
    timestamp: new Date().toISOString(),
    components: {
      database: {
        status: db.status,
        healthy: isDbReady
      },
      monitoringScheduler: {
        status: monitoring.isRunning ? 'running' : 'idle',
        enabled: monitoring.enabled
      },
      productionSafety: {
        killSwitchActive: safety.killSwitchActive,
        mainnetBlocked: true,
        testnetPermitted: safety.executionModes.testnetEnabled
      }
    }
  };

  return res.status(isReady ? 200 : 503).json(payload);
};

module.exports = {
  checkHealth,
  checkLiveness,
  checkReadiness
};
