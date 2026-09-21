const { RiskEvaluation } = require('../models/RiskEvaluation');
const logger = require('../utils/logger');

class RiskEvaluationRepository {
  /**
   * Records a risk evaluation result idempotently
   * @param {Object} data 
   * @returns {Promise<Object>}
   */
  async recordEvaluation(data) {
    try {
      const evaluation = await RiskEvaluation.findOneAndUpdate(
        {
          userId: data.userId,
          copyRuleId: data.copyRuleId,
          sourceParsedTransactionId: data.sourceParsedTransactionId
        },
        { $setOnInsert: data },
        { upsert: true, new: true, runValidators: true }
      );
      return evaluation;
    } catch (err) {
      if (err.code === 11000) {
        return await RiskEvaluation.findOne({
          userId: data.userId,
          copyRuleId: data.copyRuleId,
          sourceParsedTransactionId: data.sourceParsedTransactionId
        });
      }
      logger.error(`Error recording risk evaluation: ${err.message}`);
      throw err;
    }
  }

  /**
   * Retrieves paginated risk evaluation history for a user
   * @param {string} userId 
   * @param {Object} filters 
   * @param {Object} pagination 
   * @returns {Promise<{ evaluations: Array, total: number, page: number, pages: number }>}
   */
  async listByUser(userId, filters = {}, pagination = { page: 1, limit: 20 }) {
    const query = { userId };

    if (filters.decision) {
      query.decision = filters.decision.toUpperCase();
    }
    if (filters.network) {
      query.network = filters.network.toLowerCase();
    }
    if (filters.traderId) {
      query.traderId = filters.traderId;
    }

    const page = Math.max(1, parseInt(pagination.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(pagination.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const [evaluations, total] = await Promise.all([
      RiskEvaluation.find(query)
        .sort({ evaluatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('traderId', 'displayName publicWalletAddress network')
        .lean(),
      RiskEvaluation.countDocuments(query)
    ]);

    return {
      evaluations,
      total,
      page,
      pages: Math.ceil(total / limit)
    };
  }
}

module.exports = new RiskEvaluationRepository();
