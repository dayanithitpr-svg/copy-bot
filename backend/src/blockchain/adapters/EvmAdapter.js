const RpcClient = require('../rpcClient');
const logger = require('../../utils/logger');

const ERC20_TRANSFER_METHOD = '0xa9059cbb';

class EvmAdapter {
  constructor(networkId = 'ethereum') {
    this.networkId = networkId;
  }

  /**
   * Fetches latest block number from EVM node
   * @param {string} rpcUrl 
   * @returns {Promise<number>}
   */
  async getLatestBlockNumber(rpcUrl) {
    const hexBlock = await RpcClient.call(rpcUrl, 'eth_blockNumber', []);
    return parseInt(hexBlock, 16);
  }

  /**
   * Fetches block data with full transaction objects
   * @param {string} rpcUrl 
   * @param {number} blockNumber 
   * @returns {Promise<Object>}
   */
  async getBlockWithTransactions(rpcUrl, blockNumber) {
    const hexNumber = '0x' + blockNumber.toString(16);
    return await RpcClient.call(rpcUrl, 'eth_getBlockByNumber', [hexNumber, true]);
  }

  /**
   * Scans a range of blocks for activity involving the target wallet address
   * @param {string} rpcUrl 
   * @param {string} walletAddress 
   * @param {number} fromBlock 
   * @param {number} toBlock 
   * @returns {Promise<Array<Object>>}
   */
  async scanWalletActivity(rpcUrl, walletAddress, fromBlock, toBlock) {
    const normalizedTarget = walletAddress.toLowerCase();
    const detectedActivities = [];

    // Scan blocks in range sequentially or in small parallel batches
    for (let currentBlock = fromBlock; currentBlock <= toBlock; currentBlock++) {
      try {
        const block = await this.getBlockWithTransactions(rpcUrl, currentBlock);
        if (!block || !Array.isArray(block.transactions)) continue;

        const blockTimestamp = block.timestamp
          ? new Date(parseInt(block.timestamp, 16) * 1000)
          : new Date();

        for (const tx of block.transactions) {
          const from = tx.from ? tx.from.toLowerCase() : '';
          const to = tx.to ? tx.to.toLowerCase() : '';

          // Check if wallet is sender or direct recipient
          const isSender = from === normalizedTarget;
          const isRecipient = to === normalizedTarget;

          if (isSender || isRecipient) {
            const valueWei = tx.value ? BigInt(tx.value).toString() : '0';
            const valueEth = (Number(valueWei) / 1e18).toFixed(6);

            let activityType = 'TRANSACTION';
            let contractAddress = null;

            if (tx.input && tx.input !== '0x') {
              if (tx.input.startsWith(ERC20_TRANSFER_METHOD)) {
                activityType = 'TOKEN_TRANSFER';
                contractAddress = tx.to;
              } else {
                activityType = 'CONTRACT_INTERACTION';
                contractAddress = tx.to;
              }
            }

            detectedActivities.push({
              network: this.networkId,
              walletAddress: normalizedTarget,
              transactionHash: tx.hash,
              blockNumber: currentBlock,
              timestamp: blockTimestamp,
              from: tx.from,
              to: tx.to || 'Contract Creation',
              nativeValue: `${valueEth} ETH`,
              status: 'CONFIRMED',
              activityType,
              rawMetadata: {
                gas: tx.gas ? parseInt(tx.gas, 16) : null,
                gasPrice: tx.gasPrice ? (Number(BigInt(tx.gasPrice)) / 1e9).toFixed(2) + ' Gwei' : null,
                nonce: tx.nonce ? parseInt(tx.nonce, 16) : null,
                isSender,
                contractAddress
              }
            });
          }
        }
      } catch (err) {
        logger.warn(`Failed to scan EVM block ${currentBlock} on ${this.networkId}: ${err.message}`);
      }
    }

    return detectedActivities;
  }
}

module.exports = EvmAdapter;
