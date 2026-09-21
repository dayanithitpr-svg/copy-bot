/**
 * IBlockchainService Interface / Base Contract
 * 
 * Defines the contract that future blockchain indexers / RPC connectors (Solana, EVM, etc.)
 * must implement. This ensures modularity so that the core copy trading engine remains
 * decoupled from specific blockchain RPC providers.
 * 
 * NOTE FOR PHASE 1: No live blockchain connections or private key logic are implemented.
 */

class IBlockchainService {
  /**
   * Validates if an address string is formatted correctly for this chain
   * @param {string} address 
   * @returns {boolean}
   */
  isValidAddress(address) {
    throw new Error('Method isValidAddress() must be implemented');
  }

  /**
   * Fetches native or token balance for an address (Read-only)
   * @param {string} address 
   * @returns {Promise<{ balance: string, symbol: string }>}
   */
  async getBalance(address) {
    throw new Error('Method getBalance() must be implemented');
  }

  /**
   * Fetches recent transactions for a public wallet address (Read-only)
   * @param {string} address 
   * @param {Object} options 
   * @returns {Promise<Array>}
   */
  async getRecentTransactions(address, options = {}) {
    throw new Error('Method getRecentTransactions() must be implemented');
  }

  /**
   * Subscribes to real-time wallet transaction stream (Future Phase)
   * @param {string} address 
   * @param {Function} callback 
   */
  subscribeToWallet(address, callback) {
    throw new Error('Method subscribeToWallet() must be implemented');
  }
}

module.exports = IBlockchainService;
