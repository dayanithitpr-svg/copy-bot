const IBlockchainService = require('./IBlockchainService');
const { validateWalletAddress } = require('../networks');
const logger = require('../utils/logger');

/**
 * MockBlockchainService
 * 
 * Safe mock implementation of IBlockchainService used during Phase 1 & 2.
 * Connects to NO real networks and holds NO private keys.
 */
class MockBlockchainService extends IBlockchainService {
  constructor(networkName = 'Mock-Chain-Phase2') {
    super();
    this.networkName = networkName;
    logger.info(`Blockchain abstraction initialized: [${this.networkName}] (Phase 2 Stub - Address Validation Active)`);
  }

  isValidAddress(address, network = 'solana') {
    if (!address || typeof address !== 'string') return false;
    const result = validateWalletAddress(network, address);
    return result.isValid;
  }

  async getBalance(address) {
    logger.debug(`[MockBlockchain] getBalance requested for: ${address}`);
    return {
      address,
      balance: '0.0000',
      symbol: 'SOL',
      isDemo: true,
      message: 'Phase 2 Mock Balance - No real blockchain connection'
    };
  }

  async getRecentTransactions(address, options = {}) {
    logger.debug(`[MockBlockchain] getRecentTransactions requested for: ${address}`);
    return [];
  }

  subscribeToWallet(address, callback) {
    logger.warn('[MockBlockchain] Live wallet subscription will be implemented in Phase 3');
    return () => {}; // Unsubscribe no-op
  }
}

module.exports = new MockBlockchainService();
