const { PaperTrade } = require('../models/PaperTrade');
const ApiError = require('../utils/apiError');
const { getDBStatus } = require('../config/database');

class PaperTradeRepository {
  static checkConnection() {
    const dbStatus = getDBStatus();
    if (dbStatus.status !== 'healthy') {
      throw ApiError.databaseUnavailable(
        'Database connection is not active. Please ensure MongoDB is running and reachable.'
      );
    }
  }

  /**
   * Idempotently creates a paper trade record (ignores duplicates)
   */
  async createOrIgnore(tradeData) {
    PaperTradeRepository.checkConnection();
    try {
      const trade = new PaperTrade(tradeData);
      return await trade.save();
    } catch (err) {
      if (err.code === 11000) {
        return null; // Already processed
      }
      throw err;
    }
  }

  /**
   * Finds an existing paper trade for a given user, copy rule, and source transaction
   */
  async findExisting(userId, copyRuleId, sourceParsedTransactionId) {
    PaperTradeRepository.checkConnection();
    return await PaperTrade.findOne({ userId, copyRuleId, sourceParsedTransactionId });
  }

  /**
   * Lists paper trades for a user with filters and pagination
   */
  async listByUser(userId, filter = {}, { page = 1, limit = 20 } = {}) {
    PaperTradeRepository.checkConnection();

    const query = { userId, ...filter };
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      PaperTrade.find(query)
        .populate('traderId', 'displayName walletAddress network')
        .populate('copyRuleId', 'allocationMode allocationValue')
        .sort({ simulatedAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit),
      PaperTrade.countDocuments(query)
    ]);

    return { items, total };
  }

  /**
   * Finds a single paper trade by ID and verifies user ownership
   */
  async findByIdAndUser(id, userId) {
    PaperTradeRepository.checkConnection();
    return await PaperTrade.findOne({ _id: id, userId })
      .populate('traderId', 'displayName walletAddress network')
      .populate('copyRuleId')
      .populate('sourceParsedTransactionId');
  }

  /**
   * Calculates total simulated allocation spent today for 24h daily limit enforcement
   */
  async getDailySpent(userId, copyRuleId = null, date = new Date()) {
    PaperTradeRepository.checkConnection();

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const query = {
      userId,
      status: 'SIMULATED',
      simulatedAt: { $gte: startOfDay }
    };

    if (copyRuleId) {
      query.copyRuleId = copyRuleId;
    }

    const result = await PaperTrade.aggregate([
      { $match: query },
      { $group: { _id: null, totalSpent: { $sum: '$paperInputAmount' } } }
    ]);

    return result.length > 0 ? result[0].totalSpent : 0;
  }

  /**
   * Gets summary counts of simulated, skipped, risk blocked trades, and total simulated volume
   */
  async getTradeSummary(userId) {
    PaperTradeRepository.checkConnection();

    const [simulated, skipped, riskBlocked, failed, volumeResult] = await Promise.all([
      PaperTrade.countDocuments({ userId, status: 'SIMULATED' }),
      PaperTrade.countDocuments({ userId, status: 'SKIPPED' }),
      PaperTrade.countDocuments({ userId, status: 'RISK_BLOCKED' }),
      PaperTrade.countDocuments({ userId, status: 'FAILED' }),
      PaperTrade.aggregate([
        { $match: { userId: typeof userId === 'string' ? new (require('mongoose').Types.ObjectId)(userId) : userId, status: 'SIMULATED' } },
        { $group: { _id: null, totalVolume: { $sum: '$paperInputAmount' } } }
      ])
    ]);

    const totalVolume = volumeResult.length > 0 ? Number(volumeResult[0].totalVolume.toFixed(2)) : 0;

    return {
      total: simulated + skipped + riskBlocked + failed,
      simulated,
      skipped,
      riskBlocked,
      failed,
      totalVolume
    };
  }

  /**
   * Lists copy trading decisions with optional filters for status, network, trader
   */
  async listDecisions(userId, filter = {}, { page = 1, limit = 20 } = {}) {
    PaperTradeRepository.checkConnection();

    const query = { userId };
    if (filter.status) query.status = filter.status.toUpperCase();
    if (filter.network) query.network = filter.network.toLowerCase();
    if (filter.traderId) query.traderId = filter.traderId;
    if (filter.skipReason) query.skipReason = filter.skipReason;

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      PaperTrade.find(query)
        .populate('traderId', 'displayName walletAddress network status trackingEnabled')
        .populate('copyRuleId')
        .populate('riskEvaluationId')
        .populate('sourceParsedTransactionId')
        .sort({ simulatedAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit),
      PaperTrade.countDocuments(query)
    ]);

    return { items, total, page, pages: Math.ceil(total / limit) };
  }
}

module.exports = new PaperTradeRepository();
