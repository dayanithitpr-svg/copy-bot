const { PaperPortfolio } = require('../models/PaperPortfolio');
const ApiError = require('../utils/apiError');
const { getDBStatus } = require('../config/database');

class PaperPortfolioRepository {
  static checkConnection() {
    const dbStatus = getDBStatus();
    if (dbStatus.status !== 'healthy') {
      throw ApiError.databaseUnavailable(
        'Database connection is not active. Please ensure MongoDB is running and reachable.'
      );
    }
  }

  /**
   * Retrieves or initializes the virtual paper portfolio for a user
   * Default starting balance: 10,000 Paper USDC
   */
  async getOrCreatePortfolio(userId) {
    PaperPortfolioRepository.checkConnection();
    let portfolio = await PaperPortfolio.findOne({ userId });
    if (!portfolio) {
      try {
        portfolio = new PaperPortfolio({
          userId,
          virtualCashBalance: 10000.0,
          initialBalance: 10000.0,
          holdings: []
        });
        await portfolio.save();
      } catch (err) {
        if (err.code === 11000) {
          portfolio = await PaperPortfolio.findOne({ userId });
        } else {
          throw err;
        }
      }
    }
    return portfolio;
  }

  /**
   * Resets the paper portfolio back to initial state
   */
  async resetPortfolio(userId, initialBalance = 10000.0) {
    PaperPortfolioRepository.checkConnection();
    const updated = await PaperPortfolio.findOneAndUpdate(
      { userId },
      {
        $set: {
          virtualCashBalance: initialBalance,
          initialBalance,
          holdings: []
        }
      },
      { new: true, upsert: true }
    );
    return updated;
  }

  /**
   * Atomically updates cash balance and token holdings
   * @param {string} userId 
   * @param {number} cashDelta - Amount to add/deduct (e.g. -100 for buy)
   * @param {Object} tokenHolding - { tokenAddress, network, symbol, quantityDelta, costDelta }
   */
  async updateBalancesAndHoldings(userId, cashDelta, tokenHolding = null) {
    PaperPortfolioRepository.checkConnection();
    const portfolio = await this.getOrCreatePortfolio(userId);

    // Prevent negative cash balance
    if (portfolio.virtualCashBalance + cashDelta < 0) {
      throw new Error('Insufficient virtual paper cash balance');
    }

    portfolio.virtualCashBalance = Math.max(0, portfolio.virtualCashBalance + cashDelta);

    if (tokenHolding && tokenHolding.tokenAddress) {
      const normalizedAddr = tokenHolding.tokenAddress.toLowerCase();
      const existingIdx = portfolio.holdings.findIndex(
        (h) => h.tokenAddress.toLowerCase() === normalizedAddr && h.network === tokenHolding.network
      );

      if (existingIdx >= 0) {
        const h = portfolio.holdings[existingIdx];
        const newQuantity = h.quantity + tokenHolding.quantityDelta;
        const newCost = Math.max(0, h.totalCost + (tokenHolding.costDelta || 0));

        if (newQuantity <= 0) {
          // Sold completely
          portfolio.holdings.splice(existingIdx, 1);
        } else {
          h.quantity = newQuantity;
          h.totalCost = newCost;
          h.averageEntryPrice = newQuantity > 0 ? newCost / newQuantity : 0;
          h.lastUpdated = new Date();
        }
      } else if (tokenHolding.quantityDelta > 0) {
        // New holding
        portfolio.holdings.push({
          tokenAddress: tokenHolding.tokenAddress,
          network: tokenHolding.network,
          symbol: tokenHolding.symbol || 'TOKEN',
          quantity: tokenHolding.quantityDelta,
          averageEntryPrice: tokenHolding.quantityDelta > 0 ? (tokenHolding.costDelta || 0) / tokenHolding.quantityDelta : 0,
          totalCost: tokenHolding.costDelta || 0,
          lastUpdated: new Date()
        });
      }
    }

    await portfolio.save();
    return portfolio;
  }
}

module.exports = new PaperPortfolioRepository();
