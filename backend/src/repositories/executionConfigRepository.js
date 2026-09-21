const { ExecutionConfig, EXECUTION_MODE } = require('../models/ExecutionConfig');
const ApiError = require('../utils/apiError');
const { getDBStatus } = require('../config/database');
const logger = require('../utils/logger');

class ExecutionConfigRepository {
  static checkConnection() {
    const dbStatus = getDBStatus();
    if (dbStatus.status !== 'healthy') {
      throw ApiError.databaseUnavailable(
        'Database connection is not active. Please ensure MongoDB is running and reachable.'
      );
    }
  }

  /**
   * Retrieves the user's execution configuration or initializes safe default PAPER settings
   * @param {string} userId 
   */
  async getOrCreateForUser(userId) {
    ExecutionConfigRepository.checkConnection();
    let config = await ExecutionConfig.findOne({ userId });
    if (!config) {
      config = await ExecutionConfig.create({
        userId,
        mode: EXECUTION_MODE.PAPER,
        enabled: false,
        allowedNetworks: ['sepolia', 'base-sepolia'],
        maxExecutionAmount: 100,
        maxDailyExecutionAmount: 500,
        maxGasCostGwei: 50,
        maxSlippageBps: 100
      });
      logger.info(`Initialized default execution config (PAPER mode) for user ${userId}`);
    }
    return config;
  }

  /**
   * Updates execution configuration for a user
   * @param {string} userId 
   * @param {Object} updateData 
   */
  async updateForUser(userId, updateData) {
    ExecutionConfigRepository.checkConnection();
    const config = await this.getOrCreateForUser(userId);

    const allowedFields = [
      'mode',
      'enabled',
      'allowedNetworks',
      'maxExecutionAmount',
      'maxDailyExecutionAmount',
      'maxGasCostGwei',
      'maxSlippageBps'
    ];

    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        config[field] = updateData[field];
      }
    }

    await config.save();
    logger.info(`Updated execution config for user ${userId} (mode: ${config.mode}, enabled: ${config.enabled})`);
    return config;
  }
}

module.exports = new ExecutionConfigRepository();
