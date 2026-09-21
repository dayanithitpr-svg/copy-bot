const { Trader } = require('../models/Trader');
const ApiError = require('../utils/apiError');
const { getDBStatus } = require('../config/database');

class TraderRepository {
  static checkConnection() {
    const dbStatus = getDBStatus();
    if (dbStatus.status !== 'healthy') {
      throw ApiError.databaseUnavailable(
        'Database connection is not active. Please ensure MongoDB is running and reachable.'
      );
    }
  }

  /**
   * Creates a new trader record
   * @param {Object} traderData 
   * @returns {Promise<Trader>}
   */
  async create(traderData) {
    TraderRepository.checkConnection();
    const trader = new Trader(traderData);
    return await trader.save();
  }

  /**
   * Finds a specific trader belonging to a user
   * @param {string} userId 
   * @param {string} traderId 
   * @returns {Promise<Trader|null>}
   */
  async findByUserAndId(userId, traderId) {
    TraderRepository.checkConnection();
    return await Trader.findOne({ _id: traderId, userId });
  }

  /**
   * Finds a trader by user, network, and wallet address
   * @param {string} userId 
   * @param {string} network 
   * @param {string} walletAddress 
   * @returns {Promise<Trader|null>}
   */
  async findByUserNetworkAndAddress(userId, network, walletAddress) {
    TraderRepository.checkConnection();
    return await Trader.findOne({ userId, network, walletAddress });
  }

  /**
   * Lists traders for a user with filtering and pagination
   * @param {string} userId 
   * @param {Object} filter 
   * @param {Object} pagination 
   * @returns {Promise<{ items: Array<Trader>, total: number }>}
   */
  async listByUser(userId, filter = {}, { page = 1, limit = 20, sort = { createdAt: -1 } } = {}) {
    TraderRepository.checkConnection();
    
    const query = { userId, ...filter };

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Trader.find(query).sort(sort).skip(skip).limit(limit),
      Trader.countDocuments(query)
    ]);

    return { items, total };
  }

  /**
   * Updates a trader belonging to a user
   * @param {string} userId 
   * @param {string} traderId 
   * @param {Object} updateData 
   * @returns {Promise<Trader|null>}
   */
  async updateByUserAndId(userId, traderId, updateData) {
    TraderRepository.checkConnection();
    return await Trader.findOneAndUpdate(
      { _id: traderId, userId },
      { $set: updateData },
      { new: true, runValidators: true }
    );
  }

  /**
   * Deletes a trader belonging to a user
   * @param {string} userId 
   * @param {string} traderId 
   * @returns {Promise<Trader|null>}
   */
  async deleteByUserAndId(userId, traderId) {
    TraderRepository.checkConnection();
    return await Trader.findOneAndDelete({ _id: traderId, userId });
  }

  /**
   * Gets summary counts for a user
   * @param {string} userId 
   */
  async getCountsByUser(userId) {
    TraderRepository.checkConnection();
    const [total, active, paused, errors] = await Promise.all([
      Trader.countDocuments({ userId }),
      Trader.countDocuments({ userId, trackingEnabled: true }),
      Trader.countDocuments({ userId, trackingEnabled: false }),
      Trader.countDocuments({ userId, monitoringStatus: 'ERROR' })
    ]);

    return { total, active, paused, errors };
  }

  /**
   * Finds all active traders across the system for the monitoring worker
   * @returns {Promise<Array<Trader>>}
   */
  async findActiveTradersForMonitoring() {
    TraderRepository.checkConnection();
    return await Trader.find({
      trackingEnabled: true,
      status: 'ACTIVE'
    }).lean();
  }

  /**
   * Updates trader monitoring checkpoint and status
   * @param {string} traderId 
   * @param {Object} checkpointData 
   */
  async updateCheckpoint(traderId, checkpointData) {
    TraderRepository.checkConnection();
    return await Trader.findByIdAndUpdate(
      traderId,
      { $set: checkpointData },
      { new: true }
    );
  }

  /**
   * Updates trader monitoring error state
   * @param {string} traderId 
   * @param {string} errorMessage 
   */
  async updateMonitoringError(traderId, errorMessage) {
    TraderRepository.checkConnection();
    return await Trader.findByIdAndUpdate(traderId, {
      $set: {
        monitoringStatus: 'ERROR',
        lastErrorAt: new Date(),
        lastErrorMessage: errorMessage
      }
    });
  }
}

module.exports = new TraderRepository();
