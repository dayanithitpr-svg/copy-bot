const { WalletActivity } = require('../models/WalletActivity');
const ApiError = require('../utils/apiError');
const { getDBStatus } = require('../config/database');

class ActivityRepository {
  static checkConnection() {
    const dbStatus = getDBStatus();
    if (dbStatus.status !== 'healthy') {
      throw ApiError.databaseUnavailable(
        'Database connection is not active. Please ensure MongoDB is running and reachable.'
      );
    }
  }

  /**
   * Safely inserts an activity, ignoring duplicates (idempotent)
   * @param {Object} activityData 
   * @returns {Promise<WalletActivity|null>}
   */
  async createOrIgnore(activityData) {
    ActivityRepository.checkConnection();
    try {
      const activity = new WalletActivity(activityData);
      return await activity.save();
    } catch (err) {
      // Ignore duplicate key error (E11000)
      if (err.code === 11000) {
        return null;
      }
      throw err;
    }
  }

  /**
   * Bulk inserts activities, ignoring duplicates
   * @param {Array<Object>} activities 
   * @returns {Promise<number>} count of newly inserted activities
   */
  async bulkInsertOrIgnore(activities) {
    if (!activities || activities.length === 0) return 0;
    ActivityRepository.checkConnection();

    try {
      const result = await WalletActivity.insertMany(activities, {
        ordered: false,
        rawResult: true
      });
      return result.insertedCount || 0;
    } catch (err) {
      if (err.code === 11000 || err.writeErrors) {
        // Some or all were duplicates; return the number actually inserted
        return err.result?.nInserted || err.insertedDocs?.length || 0;
      }
      throw err;
    }
  }

  /**
   * Lists activity for a specific trader belonging to a user (IDOR protected)
   * @param {string} userId 
   * @param {string} traderId 
   * @param {Object} filter 
   * @param {Object} pagination 
   */
  async listByTrader(userId, traderId, filter = {}, { page = 1, limit = 20 } = {}) {
    ActivityRepository.checkConnection();

    const query = { userId, traderId, ...filter };
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      WalletActivity.find(query).sort({ timestamp: -1, _id: -1 }).skip(skip).limit(limit),
      WalletActivity.countDocuments(query)
    ]);

    return { items, total };
  }

  /**
   * Lists recent activity across all traders for a user (for Dashboard)
   * @param {string} userId 
   * @param {Object} filter 
   * @param {Object} pagination 
   */
  async listByUser(userId, filter = {}, { page = 1, limit = 10 } = {}) {
    ActivityRepository.checkConnection();

    const query = { userId, ...filter };
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      WalletActivity.find(query).sort({ timestamp: -1, _id: -1 }).skip(skip).limit(limit),
      WalletActivity.countDocuments(query)
    ]);

    return { items, total };
  }

  /**
   * Gets total activity count for a trader
   * @param {string} userId 
   * @param {string} traderId 
   */
  async countByTrader(userId, traderId) {
    ActivityRepository.checkConnection();
    return await WalletActivity.countDocuments({ userId, traderId });
  }

  /**
   * Gets total activity count for a user across all traders
   * @param {string} userId 
   */
  async countByUser(userId) {
    ActivityRepository.checkConnection();
    return await WalletActivity.countDocuments({ userId });
  }
}

module.exports = new ActivityRepository();
