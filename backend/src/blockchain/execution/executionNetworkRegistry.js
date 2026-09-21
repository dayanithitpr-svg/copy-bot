const env = require('../../config/env');

const EXECUTION_NETWORKS = {
  sepolia: {
    id: 'sepolia',
    name: 'Ethereum Sepolia Testnet',
    chainId: 11155111,
    isTestnet: true,
    executionEnabled: true,
    nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
    rpcUrl: env.TESTNET_SEPOLIA_RPC_URL,
    explorerUrl: 'https://sepolia.etherscan.io',
    explorerTxUrl: (txHash) => `https://sepolia.etherscan.io/tx/${txHash}`,
    // Supported Testnet Uniswap V2/V3 Router
    dexRouters: [
      {
        protocol: 'UNISWAP_V2_TESTNET',
        address: '0xC532a74256D3Db42D0Bf7a0400fEFDbad7694008', // Uniswap V2 Router on Sepolia
        name: 'Uniswap V2 Sepolia Router'
      },
      {
        protocol: 'UNISWAP_V3_TESTNET',
        address: '0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E', // SwapRouter02 on Sepolia
        name: 'Uniswap V3 SwapRouter02 Sepolia'
      }
    ]
  },
  'base-sepolia': {
    id: 'base-sepolia',
    name: 'Base Sepolia Testnet',
    chainId: 84532,
    isTestnet: true,
    executionEnabled: true,
    nativeCurrency: { name: 'Base Sepolia Ether', symbol: 'ETH', decimals: 18 },
    rpcUrl: env.TESTNET_BASE_SEPOLIA_RPC_URL,
    explorerUrl: 'https://sepolia.basescan.org',
    explorerTxUrl: (txHash) => `https://sepolia.basescan.org/tx/${txHash}`,
    dexRouters: [
      {
        protocol: 'UNISWAP_V3_TESTNET',
        address: '0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4', // Uniswap V3 on Base Sepolia
        name: 'Uniswap V3 Base Sepolia Router'
      }
    ]
  },
  'polygon-amoy': {
    id: 'polygon-amoy',
    name: 'Polygon Amoy Testnet',
    chainId: 80002,
    isTestnet: true,
    executionEnabled: true,
    nativeCurrency: { name: 'Polygon Amoy POL', symbol: 'POL', decimals: 18 },
    rpcUrl: env.TESTNET_POLYGON_AMOY_RPC_URL,
    explorerUrl: 'https://amoy.polygonscan.com',
    explorerTxUrl: (txHash) => `https://amoy.polygonscan.com/tx/${txHash}`,
    dexRouters: [
      {
        protocol: 'UNISWAP_V3_TESTNET',
        address: '0x0286F6B5F455c1e57c667493D152504856E3dF62',
        name: 'Uniswap V3 Polygon Amoy Router'
      }
    ]
  }
};

// Hardcoded Mainnet Network and Chain ID Blacklist for Absolute Execution Safety
const FORBIDDEN_MAINNET_IDENTIFIERS = [
  'ethereum',
  'mainnet',
  'eth',
  'base',
  'polygon',
  'matic',
  'solana',
  'solana-mainnet'
];

const FORBIDDEN_MAINNET_CHAIN_IDS = [
  1,     // Ethereum Mainnet
  8453,  // Base Mainnet
  137,   // Polygon Mainnet
  101,   // Solana Mainnet Beta
  56,    // BNB Chain Mainnet
  42161, // Arbitrum One Mainnet
  10     // Optimism Mainnet
];

class ExecutionNetworkRegistry {
  /**
   * Retrieves registered testnet execution network metadata
   * @param {string} networkId 
   */
  getNetwork(networkId) {
    if (!networkId || typeof networkId !== 'string') return null;
    return EXECUTION_NETWORKS[networkId.toLowerCase()] || null;
  }

  /**
   * Checks if network is an approved testnet execution network
   * @param {string} networkId 
   * @param {number} [chainId] 
   * @returns {boolean}
   */
  isExecutionAllowed(networkId, chainId = null) {
    if (!networkId || typeof networkId !== 'string') return false;

    const normalized = networkId.toLowerCase().trim();

    // 1. Strict Mainnet Rejection Guard
    if (FORBIDDEN_MAINNET_IDENTIFIERS.includes(normalized)) {
      return false;
    }
    if (chainId && FORBIDDEN_MAINNET_CHAIN_IDS.includes(Number(chainId))) {
      return false;
    }

    // 2. Validate Against Execution Network Registry
    const net = EXECUTION_NETWORKS[normalized];
    if (!net) return false;

    if (!net.isTestnet || !net.executionEnabled) {
      return false;
    }

    if (chainId && net.chainId !== Number(chainId)) {
      return false;
    }

    return true;
  }

  /**
   * Resolves allowlisted DEX router for the given testnet network
   * @param {string} networkId 
   * @param {string} [protocol] 
   */
  getRouter(networkId, protocol = null) {
    const net = this.getNetwork(networkId);
    if (!net || !net.dexRouters || net.dexRouters.length === 0) return null;

    if (protocol) {
      return net.dexRouters.find((r) => r.protocol === protocol) || net.dexRouters[0];
    }
    return net.dexRouters[0];
  }

  /**
   * Returns list of all allowed execution networks
   */
  getAllAllowedNetworks() {
    return Object.values(EXECUTION_NETWORKS).map((n) => ({
      id: n.id,
      name: n.name,
      chainId: n.chainId,
      isTestnet: n.isTestnet,
      executionEnabled: n.executionEnabled,
      nativeCurrency: n.nativeCurrency,
      explorerUrl: n.explorerUrl,
      protocols: (n.dexRouters || []).map((r) => r.protocol)
    }));
  }
}

module.exports = new ExecutionNetworkRegistry();
