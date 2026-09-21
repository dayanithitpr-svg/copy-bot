const app = require('./app');
const env = require('./config/env');
const { connectDB, disconnectDB } = require('./config/database');
const monitoringScheduler = require('./services/monitoringScheduler');
const executionRecoveryService = require('./services/executionRecoveryService');
const logger = require('./utils/logger');

let server;

const startServer = async () => {
  try {
    // 1. Initiate Database Connection (Non-blocking so server can report health/degraded status)
    connectDB()
      .then(async () => {
        // Run safe recovery scan for interrupted testnet transactions upon connection
        try {
          await executionRecoveryService.runRecoveryCycle({ olderThanMs: 15000 });
        } catch (recErr) {
          logger.warn(`Startup recovery cycle warning: ${recErr.message}`);
        }

        // Start monitoring scheduler once database connection is attempted
        monitoringScheduler.start();
      })
      .catch((err) => {
        logger.warn(`Initial MongoDB connection failed: ${err.message}`);
        monitoringScheduler.start();
      });

    // 2. Start HTTP Server
    server = app.listen(env.PORT, () => {
      logger.info(`====================================================`);
      logger.info(`  CRYPTO COPY TRADING PLATFORM API - PHASE 9`);
      logger.info(`  Environment: ${env.NODE_ENV}`);
      logger.info(`  Listening on: http://localhost:${env.PORT}`);
      logger.info(`  Health Check: http://localhost:${env.PORT}/api/v1/health`);
      logger.info(`  System Status: http://localhost:${env.PORT}/api/v1/system/status`);
      logger.info(`  Monitoring: ${env.MONITORING_ENABLED ? 'ENABLED' : 'DISABLED'} (${env.MONITORING_INTERVAL_MS}ms)`);
      logger.info(`  Execution Modes: PAPER (Simulated) & TESTNET (No Real Funds)`);
      logger.info(`  Mainnet Status: STRICTLY BLOCKED`);
      logger.info(`====================================================`);
    });

    // Handle process termination gracefully
    const handleShutdown = async (signal) => {
      logger.info(`Received ${signal}. Initiating graceful shutdown...`);
      monitoringScheduler.stop();
      if (server) {
        server.close(async () => {
          logger.info('HTTP server closed.');
          await disconnectDB();
          logger.info('Graceful shutdown completed.');
          process.exit(0);
        });
      } else {
        process.exit(0);
      }
    };

    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
    process.on('SIGINT', () => handleShutdown('SIGINT'));

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Promise Rejection:', { reason, promise });
    });

    process.on('uncaughtException', (err) => {
      logger.error('Uncaught Exception:', { message: err.message, stack: err.stack });
      process.exit(1);
    });

  } catch (err) {
    logger.error('Fatal error during startup:', err);
    process.exit(1);
  }
};

startServer();
