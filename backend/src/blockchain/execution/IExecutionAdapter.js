/**
 * Interface defining operations for blockchain execution adapters
 */
class IExecutionAdapter {
  /**
   * Returns wallet address of the runtime testnet execution signer
   * @returns {string}
   */
  getExecutionWalletAddress() {
    throw new Error('Method not implemented');
  }

  /**
   * Estimates gas required for the swap transaction
   * @param {Object} txParams 
   * @returns {Promise<Object>} { gasLimit: number, gasPriceGwei: number }
   */
  async estimateGas(txParams) {
    throw new Error('Method not implemented');
  }

  /**
   * Builds, signs, and broadcasts the testnet transaction
   * @param {Object} txParams 
   * @returns {Promise<Object>} { transactionHash: string, nonce: number, gasLimit: number, gasPriceGwei: number }
   */
  async executeSwap(txParams) {
    throw new Error('Method not implemented');
  }

  /**
   * Polls for transaction confirmation receipt
   * @param {string} txHash 
   * @param {number} [timeoutMs] 
   * @returns {Promise<Object>} { confirmed: boolean, status: number, blockNumber: number, gasUsed: number }
   */
  async waitForReceipt(txHash, timeoutMs = 30000) {
    throw new Error('Method not implemented');
  }
}

module.exports = IExecutionAdapter;
