const IExecutionAdapter = require('./IExecutionAdapter');
const crypto = require('crypto');

class MockExecutionAdapter extends IExecutionAdapter {
  constructor(network = 'sepolia', options = {}) {
    super();
    this.network = network;
    this.mockWallet = options.walletAddress || '0x71C800000000000000000000000000000000Mock';
    this.shouldFail = options.shouldFail || false;
    this.failureError = options.failureError || 'Mock testnet execution reverted';
    this.nonceCounter = 100;
  }

  getExecutionWalletAddress() {
    return this.mockWallet;
  }

  async estimateGas(txParams) {
    if (this.shouldFail) {
      throw new Error(this.failureError);
    }
    return {
      gasLimit: 150000,
      gasPriceGwei: 25
    };
  }

  async executeSwap(txParams) {
    if (this.shouldFail) {
      throw new Error(this.failureError);
    }

    const txHash = '0x' + crypto.randomBytes(32).toString('hex');
    this.nonceCounter++;

    return {
      transactionHash: txHash,
      nonce: this.nonceCounter,
      gasLimit: 150000,
      gasPriceGwei: 25,
      amountInBaseUnits: txParams.amountInBaseUnits || '100000000',
      minimumAmountOutBaseUnits: txParams.minimumAmountOutBaseUnits || '99000000'
    };
  }

  async waitForReceipt(txHash, timeoutMs = 5000) {
    if (this.shouldFail) {
      return {
        confirmed: false,
        status: 0,
        blockNumber: null,
        gasUsed: 150000,
        error: this.failureError
      };
    }

    return {
      confirmed: true,
      status: 1,
      blockNumber: 5829102,
      gasUsed: 124500
    };
  }
}

module.exports = MockExecutionAdapter;
