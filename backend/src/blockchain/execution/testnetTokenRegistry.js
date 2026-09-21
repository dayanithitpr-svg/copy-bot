const TESTNET_TOKENS = {
  sepolia: [
    {
      symbol: 'WETH',
      name: 'Wrapped Ether (Sepolia)',
      address: '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9',
      decimals: 18,
      isTestnet: true,
      enabled: true
    },
    {
      symbol: 'USDC',
      name: 'USD Coin (Sepolia)',
      address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
      decimals: 6,
      isTestnet: true,
      enabled: true
    },
    {
      symbol: 'UNI',
      name: 'Uniswap Token (Sepolia)',
      address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
      decimals: 18,
      isTestnet: true,
      enabled: true
    },
    {
      symbol: 'TEST',
      name: 'Mock Test Token',
      address: '0x9999999999999999999999999999999999999999',
      decimals: 18,
      isTestnet: true,
      enabled: true
    }
  ],
  'base-sepolia': [
    {
      symbol: 'WETH',
      name: 'Wrapped Ether (Base Sepolia)',
      address: '0x4200000000000000000000000000000000000006',
      decimals: 18,
      isTestnet: true,
      enabled: true
    },
    {
      symbol: 'USDC',
      name: 'USD Coin (Base Sepolia)',
      address: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
      decimals: 6,
      isTestnet: true,
      enabled: true
    }
  ],
  'polygon-amoy': [
    {
      symbol: 'WMATIC',
      name: 'Wrapped POL (Amoy)',
      address: '0x326C977E6efc84E512bB9C30f76E30c160eD06FB',
      decimals: 18,
      isTestnet: true,
      enabled: true
    },
    {
      symbol: 'USDC',
      name: 'USD Coin (Amoy)',
      address: '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582',
      decimals: 6,
      isTestnet: true,
      enabled: true
    }
  ]
};

class TestnetTokenRegistry {
  /**
   * Finds a testnet token by address on a specific network
   * @param {string} networkId 
   * @param {string} address 
   */
  getTokenByAddress(networkId, address) {
    if (!networkId || !address) return null;
    const tokens = TESTNET_TOKENS[networkId.toLowerCase()] || [];
    return tokens.find((t) => t.address.toLowerCase() === address.toLowerCase()) || null;
  }

  /**
   * Finds a testnet token by symbol on a specific network
   * @param {string} networkId 
   * @param {string} symbol 
   */
  getTokenBySymbol(networkId, symbol) {
    if (!networkId || !symbol) return null;
    const tokens = TESTNET_TOKENS[networkId.toLowerCase()] || [];
    return tokens.find((t) => t.symbol.toUpperCase() === symbol.toUpperCase()) || null;
  }

  /**
   * Returns list of allowed tokens for a testnet network
   * @param {string} networkId 
   */
  getTokensForNetwork(networkId) {
    if (!networkId) return [];
    return TESTNET_TOKENS[networkId.toLowerCase()] || [];
  }
}

module.exports = new TestnetTokenRegistry();
