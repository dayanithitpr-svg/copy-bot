const RpcClient = require('../rpcClient');
const logger = require('../../utils/logger');

class SolanaAdapter {
  constructor() {
    this.networkId = 'solana';
  }

  /**
   * Fetches the current slot from Solana RPC
   * @param {string} rpcUrl 
   * @returns {Promise<number>}
   */
  async getLatestSlot(rpcUrl) {
    return await RpcClient.call(rpcUrl, 'getSlot', []);
  }

  /**
   * Fetches confirmed signatures for a Solana wallet address
   * @param {string} rpcUrl 
   * @param {string} walletAddress 
   * @param {Object} options 
   * @returns {Promise<Array>}
   */
  async getSignaturesForAddress(rpcUrl, walletAddress, options = {}) {
    const config = {
      limit: options.limit || 20
    };
    if (options.until) {
      config.until = options.until;
    }

    const signatures = await RpcClient.call(rpcUrl, 'getSignaturesForAddress', [
      walletAddress,
      config
    ]);

    return Array.isArray(signatures) ? signatures : [];
  }

  /**
   * Scans for new wallet activity on Solana using signature cursor
   * @param {string} rpcUrl 
   * @param {string} walletAddress 
   * @param {string} lastScannedSignature 
   * @returns {Promise<{ activities: Array<Object>, newLatestSignature: string|null }>}
   */
  async scanWalletActivity(rpcUrl, walletAddress, lastScannedSignature = null) {
    const signatures = await this.getSignaturesForAddress(rpcUrl, walletAddress, {
      until: lastScannedSignature || undefined,
      limit: 20
    });

    if (signatures.length === 0) {
      return { activities: [], newLatestSignature: lastScannedSignature };
    }

    const activities = signatures.map((sigInfo) => {
      const timestamp = sigInfo.blockTime
        ? new Date(sigInfo.blockTime * 1000)
        : new Date();

      const isFailed = Boolean(sigInfo.err);

      return {
        network: 'solana',
        walletAddress,
        transactionHash: sigInfo.signature,
        slot: sigInfo.slot,
        blockNumber: sigInfo.slot,
        timestamp,
        from: walletAddress,
        to: 'Solana Program',
        nativeValue: '0.000 SOL',
        status: isFailed ? 'FAILED' : 'CONFIRMED',
        activityType: sigInfo.memo ? 'TOKEN_TRANSFER' : 'TRANSACTION',
        rawMetadata: {
          slot: sigInfo.slot,
          err: sigInfo.err,
          memo: sigInfo.memo,
          confirmationStatus: sigInfo.confirmationStatus
        }
      };
    });

    // The most recent signature is the first element returned by Solana RPC
    const newLatestSignature = signatures[0]?.signature || lastScannedSignature;

    return { activities, newLatestSignature };
  }
}

module.exports = SolanaAdapter;
