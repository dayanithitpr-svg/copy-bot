const env = require('../config/env');
const { getDBStatus } = require('../config/database');
const monitoringScheduler = require('../services/monitoringScheduler');
const productionSafetyService = require('../security/productionSafetyService');
const metricsService = require('../services/metricsService');
const executionRecoveryService = require('../services/executionRecoveryService');
const auditService = require('../services/auditService');
const { AUDIT_EVENT_TYPE, AUDIT_SEVERITY } = require('../models/AuditLog');
const ApiResponse = require('../utils/apiResponse');

class SystemController {
  /**
   * GET /api/v1/system/status
   * Safe operational status overview (Never exposes secrets or internal credentials)
   */
  async getStatus(req, res, next) {
    try {
      const db = getDBStatus();
      const monitoring = monitoringScheduler.getStatus();
      const safety = productionSafetyService.getSafetyStatus();
      const uptime = process.uptime();

      return ApiResponse.success(res, {
        statusCode: 200,
        message: 'System operational status retrieved',
        data: {
          environment: env.NODE_ENV,
          version: '1.0.0',
          uptimeSeconds: Math.floor(uptime),
          executionMode: 'PAPER', // Default platform baseline
          testnetEnabled: !safety.killSwitchActive,
          mainnetEnabled: false,
          mainnetStatus: 'BLOCKED',
          executionKillSwitch: safety.killSwitchActive,
          database: db.status,
          monitoring: monitoring.enabled ? (monitoring.isRunning ? 'running' : 'idle') : 'disabled',
          lastMonitoringCycle: monitoring.stats.lastRunAt,
          totalMonitoringCycles: monitoring.stats.totalCycles,
          supportedExecutionModes: ['PAPER', 'TESTNET']
        }
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/system/metrics
   * Returns internal reliability and performance metrics snapshot
   */
  async getMetrics(req, res, next) {
    try {
      const snapshot = metricsService.getSnapshot();
      return ApiResponse.success(res, {
        statusCode: 200,
        message: 'Internal system metrics retrieved',
        data: snapshot
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/system/kill-switch
   * Allows authenticated operators/users to toggle the emergency execution kill switch
   */
  async setKillSwitch(req, res, next) {
    try {
      const { active, reason } = req.body;
      if (typeof active !== 'boolean') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Parameter "active" must be a boolean (true to engage kill switch, false to disengage)'
          }
        });
      }

      const userId = req.user?.id || req.user?.userId || null;
      const updatedStatus = productionSafetyService.setKillSwitch(active, reason || 'Manual operator trigger');

      // Audit the kill switch change
      await auditService.logEvent({
        userId,
        eventType: AUDIT_EVENT_TYPE.EXECUTION_KILL_SWITCH_CHANGED,
        severity: active ? AUDIT_SEVERITY.CRITICAL : AUDIT_SEVERITY.WARN,
        resourceType: 'SYSTEM',
        action: active ? 'KILL_SWITCH_ENGAGED' : 'KILL_SWITCH_DISENGAGED',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        requestId: req.id,
        details: { killSwitchActive: updatedStatus, reason }
      });

      return ApiResponse.success(res, {
        statusCode: 200,
        message: `Execution kill switch is now ${updatedStatus ? 'ACTIVE (Execution Disabled)' : 'OFF (Execution Enabled)'}`,
        data: {
          executionKillSwitch: updatedStatus,
          testnetEnabled: !updatedStatus,
          mainnetEnabled: false,
          mainnetStatus: 'BLOCKED'
        }
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/system/recover
   * Triggers an on-demand interrupted execution recovery scan
   */
  async triggerRecovery(req, res, next) {
    try {
      const userId = req.user?.id || req.user?.userId || null;
      const results = await executionRecoveryService.runRecoveryCycle({ olderThanMs: 10000 });

      return ApiResponse.success(res, {
        statusCode: 200,
        message: `Recovery cycle completed. Scanned ${results.scanned} record(s), resolved ${results.recovered}.`,
        data: results
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new SystemController();
