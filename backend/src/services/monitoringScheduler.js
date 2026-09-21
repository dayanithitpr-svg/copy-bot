const monitoringService = require('./monitoringService');
const env = require('../config/env');
const logger = require('../utils/logger');

class MonitoringScheduler {
  constructor() {
    this.intervalHandle = null;
    this.isRunning = false;
    this.isCycleRunning = false;
    this.stats = {
      totalCycles: 0,
      lastRunAt: null,
      lastDurationMs: null,
      lastSummary: null
    };
  }

  /**
   * Starts the background monitoring loop
   */
  start() {
    if (!env.MONITORING_ENABLED) {
      logger.info('Blockchain Monitoring Scheduler is DISABLED via configuration (MONITORING_ENABLED=false)');
      return;
    }

    if (this.isRunning) {
      logger.warn('Blockchain Monitoring Scheduler is already active');
      return;
    }

    this.isRunning = true;
    const intervalMs = env.MONITORING_INTERVAL_MS;

    logger.info(`Starting Blockchain Monitoring Scheduler (Interval: ${intervalMs}ms, Max Concurrency: ${env.MONITORING_MAX_CONCURRENCY})...`);

    // Initial run after a short 3-second startup delay
    setTimeout(() => {
      this.executeCycle();
    }, 3000);

    this.intervalHandle = setInterval(() => {
      this.executeCycle();
    }, intervalMs);
  }

  /**
   * Executes a single cycle with overlap protection
   */
  async executeCycle() {
    if (this.isCycleRunning) {
      logger.warn('Skipping monitoring cycle: Previous cycle is still executing');
      return;
    }

    this.isCycleRunning = true;
    this.stats.lastRunAt = new Date();

    try {
      const summary = await monitoringService.runMonitoringCycle();
      this.stats.totalCycles++;
      this.stats.lastDurationMs = summary.durationMs;
      this.stats.lastSummary = summary;
    } catch (err) {
      logger.error('Unexpected error in monitoring cycle loop:', err);
    } finally {
      this.isCycleRunning = false;
    }
  }

  /**
   * Gracefully stops the scheduler
   */
  stop() {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
    this.isRunning = false;
    this.isCycleRunning = false;
    logger.info('Blockchain Monitoring Scheduler stopped gracefully');
  }

  /**
   * Returns current scheduler health & statistics
   */
  getStatus() {
    return {
      enabled: env.MONITORING_ENABLED,
      isRunning: this.isRunning,
      isCycleRunning: this.isCycleRunning,
      intervalMs: env.MONITORING_INTERVAL_MS,
      stats: this.stats
    };
  }
}

module.exports = new MonitoringScheduler();
