const { CopyRule } = require('../models/CopyRule');
const ApiError = require('../utils/apiError');
const { getDBStatus } = require('../config/database');

class CopyRuleRepository {
  static checkConnection() {
    const dbStatus = getDBStatus();
    if (dbStatus.status !== 'healthy') {
      throw ApiError.databaseUnavailable(
        'Database connection is not active. Please ensure MongoDB is running and reachable.'
      );
    }
  }

  /**
   * Creates a new copy rule for a user
   */
  async create(ruleData) {
    CopyRuleRepository.checkConnection();
    try {
      const rule = new CopyRule(ruleData);
      return await rule.save();
    } catch (err) {
      if (err.code === 11000) {
        throw ApiError.conflict('A copy rule for this trader already exists for your account');
      }
      throw err;
    }
  }

  /**
   * Finds a copy rule by ID and verifies user ownership (IDOR Protected)
   */
  async findByUserAndId(userId, ruleId) {
    CopyRuleRepository.checkConnection();
    return await CopyRule.findOne({ _id: ruleId, userId }).populate('traderId');
  }

  /**
   * Finds a copy rule by user and trader ID
   */
  async findByUserAndTrader(userId, traderId) {
    CopyRuleRepository.checkConnection();
    return await CopyRule.findOne({ userId, traderId });
  }

  /**
   * Lists all copy rules for a user
   */
  async listByUser(userId, filter = {}) {
    CopyRuleRepository.checkConnection();
    return await CopyRule.find({ userId, ...filter }).populate('traderId').sort({ createdAt: -1 });
  }

  /**
   * Finds all active enabled copy rules for a specific trader
   */
  async findActiveRulesForTrader(traderId) {
    CopyRuleRepository.checkConnection();
    return await CopyRule.find({ traderId, enabled: true });
  }

  /**
   * Updates a copy rule with user ownership check
   */
  async update(userId, ruleId, updateData) {
    CopyRuleRepository.checkConnection();
    const updated = await CopyRule.findOneAndUpdate(
      { _id: ruleId, userId },
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate('traderId');

    if (!updated) {
      throw ApiError.notFound('Copy rule not found or you do not have permission to update it');
    }
    return updated;
  }

  /**
   * Deletes a copy rule with user ownership check
   */
  async delete(userId, ruleId) {
    CopyRuleRepository.checkConnection();
    const deleted = await CopyRule.findOneAndDelete({ _id: ruleId, userId });
    if (!deleted) {
      throw ApiError.notFound('Copy rule not found or you do not have permission to delete it');
    }
    return deleted;
  }
}

module.exports = new CopyRuleRepository();
