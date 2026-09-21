/**
 * MockAdapter
 * Resilient mock adapter for offline unit tests and sandbox environments.
 */
class MockAdapter {
  constructor(networkId = 'mock') {
    this.networkId = networkId;
    this.currentMockBlock = 19500000;
  }

  async getLatestBlockNumber() {
    this.currentMockBlock += 1;
    return this.currentMockBlock;
  }

  async getLatestSlot() {
    this.currentMockBlock += 1;
    return this.currentMockBlock;
  }

  async scanWalletActivity(rpcUrl, walletAddress, fromBlock, toBlock) {
    // Generates deterministic mock activities for tests
    return [
      {
        network: this.networkId,
        walletAddress,
        transactionHash: `0xmock_tx_${fromBlock || 1}_${Date.now()}`,
        blockNumber: fromBlock || this.currentMockBlock,
        timestamp: new Date(),
        from: walletAddress,
        to: '0x71c7656ec7ab88b098defb751b7401b5f6d8976f',
        nativeValue: '0.150000 ETH',
        status: 'CONFIRMED',
        activityType: 'TRANSACTION',
        rawMetadata: { isMock: true }
      }
    ];
  }
}

module.exports = MockAdapter;
