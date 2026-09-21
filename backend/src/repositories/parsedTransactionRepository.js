const { ParsedTransaction } = require('../models/ParsedTransaction');
const ApiError = require('../utils/apiError');
const { getDBStatus } = require('../config/database');

class ParsedTransactionRepository {
  static checkConnection() {
    const dbStatus = getDBStatus();
    if (dbStatus.status !== 'healthy') {
      throw ApiError.databaseUnavailable(
        'Database connection is not active. Please ensure MongoDB is running and reachable.'
      );
    }
  }

  /**
   * Inserts a single parsed transaction, ignoring duplicates (idempotent)
   * @param {Object} txData 
   * @returns {Promise<ParsedTransaction|null>}
   */
  async createOrIgnore(txData) {
    ParsedTransactionRepository.checkConnection();
    try {
      const doc = new ParsedTransaction(txData);
      return await doc.save();
    } catch (err) {
      if (err.code === 11000) {
        return null;
      }
      throw err;
    }
  }

  /**
   * Bulk inserts parsed transactions, ignoring duplicate errors
   * @param {Array<Object>} transactions 
   * @returns {Promise<number>} number of inserted records
   */
  async bulkInsertOrIgnore(transactions) {
    if (!transactions || transactions.length === 0) return 0;
    ParsedTransactionRepository.checkConnection();

    try {
      const result = await ParsedTransaction.insertMany(transactions, {
        ordered: false,
        rawResult: true
      });
      return result.insertedCount || 0;
    } catch (err) {
      if (err.code === 11000 || err.writeErrors) {
        return err.result?.nInserted || err.insertedDocs?.length || 0;
      }
      throw err;
    }
  }

  /**
   * Lists parsed transactions for a trader with IDOR protection
   * @param {string} userId 
   * @param {string} traderId 
   * @param {Object} filter 
   * @param {Object} pagination 
   */
  async listByTrader(userId, traderId, filter = {}, { page = 1, limit = 20 } = {}) {
    ParsedTransactionRepository.checkConnection();

    const query = { userId, traderId, ...filter };
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      ParsedTransaction.find(query).sort({ timestamp: -1, _id: -1 }).skip(skip).limit(limit),
      ParsedTransaction.countDocuments(query)
    ]);

    return { items, total };
  }

  /**
   * Lists recent parsed transactions across all traders for a user (Dashboard feed)
   * @param {string} userId 
   * @param {Object} filter 
   * @param {Object} pagination 
   */
  async listByUser(userId, filter = {}, { page = 1, limit = 10 } = {}) {
    ParsedTransactionRepository.checkConnection();

    const query = { userId, ...filter };
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      ParsedTransaction.find(query).sort({ timestamp: -1, _id: -1 }).skip(skip).limit(limit),
      ParsedTransaction.countDocuments(query)
    ]);

    return { items, total };
  }

  /**
   * Finds a parsed transaction by ID ensuring user ownership
   * @param {string} id 
   * @param {string} userId 
   */
  async findByIdAndUser(id, userId) {
    ParsedTransactionRepository.checkConnection();
    return await ParsedTransaction.findOne({ _id: id, userId });
  }

  /**
   * Counts transactions for a trader matching a filter
   * @param {string} userId 
   * @param {string} traderId 
   * @param {Object} filter 
   */
  async countByTrader(userId, traderId, filter = {}) {
    ParsedTransactionRepository.checkConnection();
    return await ParsedTransaction.countDocuments({ userId, traderId, ...filter });
  }
}

module.exports = new ParsedTransactionRepository();
