const RiskConfig = require('../models/RiskConfig');
const logger = require('../utils/logger');

class RiskConfigRepository {
  /**
   * Retrieves the user's risk configuration or creates default settings if none exists
   * @param {string} userId 
   * @returns {Promise<Object>}
   */
  async getOrCreateForUser(userId) {
    let config = await RiskConfig.findOne({ userId });
    if (!config) {
      config = await RiskConfig.create({
        userId,
        enabled: true,
        maxTradeExposure: 1000,
        maxDailyExposure: 3000,
        maxPortfolioExposure: 40,
        maxTraderAllocation: 30,
        maxTokenAllocation: 25,
        maxOpenPositions: 10,
        minConfidence: 'MEDIUM',
        allowedNetworks: ['ethereum', 'base', 'polygon', 'solana'],
        blockedTokens: [],
        allowedTokens: []
      });
      logger.info(`Initialized default risk config for user ${userId}`);
    }
    return config;
  }

  /**
   * Updates risk configuration for a specific user
   * @param {string} userId 
   * @param {Object} updateData 
   * @returns {Promise<Object>}
   */
  async updateForUser(userId, updateData) {
    const config = await this.getOrCreateForUser(userId);

    const allowedFields = [
      'enabled',
      'maxTradeExposure',
      'maxDailyExposure',
      'maxPortfolioExposure',
      'maxTraderAllocation',
      'maxTokenAllocation',
      'maxOpenPositions',
      'minConfidence',
      'allowedNetworks',
      'blockedTokens',
      'allowedTokens'
    ];

    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        config[field] = updateData[field];
      }
    }

    await config.save();
    logger.info(`Updated risk config for user ${userId}`);
    return config;
  }
}

module.exports = new RiskConfigRepository();
