const traderRepository = require('../repositories/traderRepository');
const { normalizeWalletAddress } = require('../networks');
const ApiError = require('../utils/apiError');
const logger = require('../utils/logger');
const { TRADER_STATUS } = require('../models/Trader');

const maskAddress = (address) => {
  if (!address || address.length < 10) return address || '***';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

class TraderService {
  /**
   * Adds a new tracked trader for the user
   * @param {string} userId 
   * @param {Object} data 
   * @returns {Promise<Object>}
   */
  async createTrader(userId, { displayName, walletAddress, network, notes }) {
    const normalizedNetwork = network.toLowerCase();
    const normalizedAddress = normalizeWalletAddress(normalizedNetwork, walletAddress);

    // Check for duplicate wallet on same network for this user
    const existing = await traderRepository.findByUserNetworkAndAddress(
      userId,
      normalizedNetwork,
      normalizedAddress
    );

    if (existing) {
      throw ApiError.conflict(
        `You are already tracking wallet ${maskAddress(normalizedAddress)} on ${normalizedNetwork.toUpperCase()}`
      );
    }

    const trader = await traderRepository.create({
      userId,
      displayName: displayName.trim(),
      walletAddress: normalizedAddress,
      network: normalizedNetwork,
      status: TRADER_STATUS.ACTIVE,
      trackingEnabled: true,
      notes: notes ? notes.trim() : ''
    });

    logger.info(`Trader added: "${trader.displayName}" (${maskAddress(trader.walletAddress)} on ${trader.network}) for user ${userId}`);

    return trader.toSafeObject();
  }

  /**
   * Lists traders for a user with pagination and search
   * @param {string} userId 
   * @param {Object} query 
   */
  async listTraders(userId, { page = 1, limit = 20, network, status, search }) {
    const filter = {};

    if (network) {
      filter.network = network.toLowerCase();
    }

    if (status) {
      filter.status = status.toUpperCase();
    }

    if (search) {
      const sanitizedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { displayName: { $regex: sanitizedSearch, $options: 'i' } },
        { walletAddress: { $regex: sanitizedSearch, $options: 'i' } }
      ];
    }

    const { items, total } = await traderRepository.listByUser(userId, filter, {
      page,
      limit,
      sort: { createdAt: -1 }
    });

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      items: items.map((item) => item.toSafeObject()),
      page,
      limit,
      total,
      totalPages
    };
  }

  /**
   * Gets a specific trader by ID for the user
   * @param {string} userId 
   * @param {string} traderId 
   */
  async getTraderById(userId, traderId) {
    const trader = await traderRepository.findByUserAndId(userId, traderId);
    if (!trader) {
      throw ApiError.notFound('Trader not found or you do not have permission to view it');
    }
    return trader.toSafeObject();
  }

  /**
   * Updates trader info (displayName, notes, trackingEnabled)
   * @param {string} userId 
   * @param {string} traderId 
   * @param {Object} updateData 
   */
  async updateTrader(userId, traderId, { displayName, notes, trackingEnabled }) {
    const trader = await traderRepository.findByUserAndId(userId, traderId);
    if (!trader) {
      throw ApiError.notFound('Trader not found or you do not have permission to modify it');
    }

    const updates = {};
    if (displayName !== undefined) {
      updates.displayName = displayName.trim();
    }
    if (notes !== undefined) {
      updates.notes = notes.trim();
    }
    if (trackingEnabled !== undefined) {
      updates.trackingEnabled = Boolean(trackingEnabled);
      updates.status = trackingEnabled ? TRADER_STATUS.ACTIVE : TRADER_STATUS.PAUSED;
    }

    const updatedTrader = await traderRepository.updateByUserAndId(userId, traderId, updates);

    logger.info(`Trader updated: ${traderId} for user ${userId}`);

    return updatedTrader.toSafeObject();
  }

  /**
   * Toggles tracking enabled/disabled
   * @param {string} userId 
   * @param {string} traderId 
   * @param {boolean} trackingEnabled 
   */
  async toggleTrackingStatus(userId, traderId, trackingEnabled) {
    const trader = await traderRepository.findByUserAndId(userId, traderId);
    if (!trader) {
      throw ApiError.notFound('Trader not found or you do not have permission to modify it');
    }

    const status = trackingEnabled ? TRADER_STATUS.ACTIVE : TRADER_STATUS.PAUSED;
    const updatedTrader = await traderRepository.updateByUserAndId(userId, traderId, {
      trackingEnabled,
      status
    });

    logger.info(`Tracking ${trackingEnabled ? 'resumed' : 'paused'} for trader ${traderId} (${maskAddress(updatedTrader.walletAddress)})`);

    return updatedTrader.toSafeObject();
  }

  /**
   * Deletes a trader
   * @param {string} userId 
   * @param {string} traderId 
   */
  async deleteTrader(userId, traderId) {
    const deleted = await traderRepository.deleteByUserAndId(userId, traderId);
    if (!deleted) {
      throw ApiError.notFound('Trader not found or you do not have permission to delete it');
    }

    logger.info(`Trader deleted: ${traderId} (${maskAddress(deleted.walletAddress)}) by user ${userId}`);
    return true;
  }

  /**
   * Gets counts summary for dashboard
   * @param {string} userId 
   */
  async getTraderSummary(userId) {
    return await traderRepository.getCountsByUser(userId);
  }
}

module.exports = new TraderService();
