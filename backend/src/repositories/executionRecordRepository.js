const { ExecutionRecord } = require('../models/ExecutionRecord');
const ApiError = require('../utils/apiError');
const { getDBStatus } = require('../config/database');
const logger = require('../utils/logger');

class ExecutionRecordRepository {
  static checkConnection() {
    const dbStatus = getDBStatus();
    if (dbStatus.status !== 'healthy') {
      throw ApiError.databaseUnavailable(
        'Database connection is not active. Please ensure MongoDB is running and reachable.'
      );
    }
  }

  /**
   * Idempotently creates an execution record
   * @param {Object} recordData 
   */
  async createRecord(recordData) {
    ExecutionRecordRepository.checkConnection();
    try {
      const record = new ExecutionRecord(recordData);
      return await record.save();
    } catch (err) {
      if (err.code === 11000) {
        return await ExecutionRecord.findOne({
          userId: recordData.userId,
          copyRuleId: recordData.copyRuleId,
          sourceParsedTransactionId: recordData.sourceParsedTransactionId,
          executionMode: recordData.executionMode
        });
      }
      logger.error(`Error creating ExecutionRecord: ${err.message}`);
      throw err;
    }
  }

  /**
   * Updates an execution record status and confirmation metadata
   * @param {string} recordId 
   * @param {Object} updates 
   */
  async updateStatus(recordId, updates) {
    ExecutionRecordRepository.checkConnection();
    return await ExecutionRecord.findByIdAndUpdate(recordId, { $set: updates }, { new: true });
  }

  /**
   * Checks if an execution record already exists for the given user, copy rule, source transaction and mode
   */
  async findExisting(userId, copyRuleId, sourceParsedTransactionId, executionMode = 'TESTNET') {
    ExecutionRecordRepository.checkConnection();
    return await ExecutionRecord.findOne({
      userId,
      copyRuleId,
      sourceParsedTransactionId,
      executionMode
    });
  }

  /**
   * Calculates total testnet amount executed in a rolling 24h period
   */
  async getDailyExecutedAmount(userId, date = new Date()) {
    try {
      ExecutionRecordRepository.checkConnection();
    } catch (err) {
      return 0;
    }

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const result = await ExecutionRecord.aggregate([
      {
        $match: {
          userId: typeof userId === 'string' ? new (require('mongoose').Types.ObjectId)(userId) : userId,
          status: { $in: ['SUBMITTED', 'CONFIRMING', 'CONFIRMED'] },
          createdAt: { $gte: startOfDay }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: { $toDouble: '$tokenIn.amount' } }
        }
      }
    ]);

    return result.length > 0 ? result[0].total : 0;
  }

  /**
   * Lists paginated execution records for a user
   */
  async listByUser(userId, filter = {}, { page = 1, limit = 20 } = {}) {
    ExecutionRecordRepository.checkConnection();
    const query = { userId };
    if (filter.network) query.network = filter.network.toLowerCase();
    if (filter.status) query.status = filter.status.toUpperCase();
    if (filter.traderId) query.traderId = filter.traderId;

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      ExecutionRecord.find(query)
        .populate('traderId', 'displayName walletAddress network')
        .populate('copyRuleId')
        .populate('sourceParsedTransactionId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ExecutionRecord.countDocuments(query)
    ]);

    return { items, total, page, pages: Math.ceil(total / limit) };
  }
}

module.exports = new ExecutionRecordRepository();
