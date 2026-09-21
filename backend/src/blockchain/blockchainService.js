const EvmAdapter = require('./adapters/EvmAdapter');
const SolanaAdapter = require('./adapters/SolanaAdapter');
const MockAdapter = require('./adapters/MockAdapter');
const env = require('../config/env');
const logger = require('../utils/logger');

class BlockchainService {
  constructor() {
    this.adapters = {
      ethereum: new EvmAdapter('ethereum'),
      base: new EvmAdapter('base'),
      polygon: new EvmAdapter('polygon'),
      solana: new SolanaAdapter()
    };

    this.rpcUrls = {
      ethereum: env.ETHEREUM_RPC_URL,
      base: env.BASE_RPC_URL,
      polygon: env.POLYGON_RPC_URL,
      solana: env.SOLANA_RPC_URL
    };
  }

  /**
   * Sets a custom adapter for testing
   * @param {string} networkId 
   * @param {Object} adapter 
   */
  setAdapter(networkId, adapter) {
    this.adapters[networkId] = adapter;
  }

  /**
   * Returns adapter for a specific network
   * @param {string} networkId 
   */
  getAdapter(networkId) {
    const adapter = this.adapters[networkId.toLowerCase()];
    if (!adapter) {
      throw new Error(`No blockchain adapter registered for network: ${networkId}`);
    }
    return adapter;
  }

  /**
   * Returns configured RPC URL for a network
   * @param {string} networkId 
   */
  getRpcUrl(networkId) {
    return this.rpcUrls[networkId.toLowerCase()] || null;
  }

  /**
   * Fetches latest head block/slot for a network
   * @param {string} networkId 
   */
  async getLatestHead(networkId) {
    const adapter = this.getAdapter(networkId);
    const rpcUrl = this.getRpcUrl(networkId);

    if (networkId === 'solana') {
      return await adapter.getLatestSlot(rpcUrl);
    }
    return await adapter.getLatestBlockNumber(rpcUrl);
  }

  /**
   * Scans wallet activity through the appropriate network adapter
   * @param {string} networkId 
   * @param {string} walletAddress 
   * @param {Object} checkpoint 
   */
  async scanWallet(networkId, walletAddress, checkpoint = {}) {
    const adapter = this.getAdapter(networkId);
    const rpcUrl = this.getRpcUrl(networkId);

    if (networkId === 'solana') {
      return await adapter.scanWalletActivity(rpcUrl, walletAddress, checkpoint.lastScannedSignature);
    }

    // EVM: Determine block range
    const latestBlock = await adapter.getLatestBlockNumber(rpcUrl);
    const maxRange = env.MONITORING_MAX_BLOCK_RANGE;

    let fromBlock = checkpoint.lastScannedBlock
      ? checkpoint.lastScannedBlock + 1
      : latestBlock - 5; // Default to last 5 blocks on first scan

    if (fromBlock > latestBlock) {
      return { activities: [], newLatestBlock: checkpoint.lastScannedBlock };
    }

    // Cap the range to prevent overwhelming the node
    const toBlock = Math.min(fromBlock + maxRange - 1, latestBlock);

    const activities = await adapter.scanWalletActivity(rpcUrl, walletAddress, fromBlock, toBlock);
    return { activities, newLatestBlock: toBlock };
  }
}

module.exports = new BlockchainService();
