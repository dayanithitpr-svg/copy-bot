/**
 * Extensible Protocol Registry for Multi-Chain DEXs, Routers, and Smart Contracts
 * Maps known protocol identities across Ethereum, Base, Polygon, and Solana.
 */

const KNOWN_PROTOCOLS = {
  ethereum: {
    // Uniswap V2 Router
    '0x7a250d5630b4cf539739df2c5dacb4c659f2488d': { name: 'Uniswap V2', type: 'DEX_ROUTER' },
    // Uniswap V3 SwapRouter
    '0xe592427a0aece92de3edee1f18e0157c05861564': { name: 'Uniswap V3', type: 'DEX_ROUTER' },
    // Uniswap V3 SwapRouter02
    '0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45': { name: 'Uniswap V3', type: 'DEX_ROUTER' },
    // Uniswap Universal Router
    '0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad': { name: 'Uniswap Universal Router', type: 'DEX_ROUTER' },
    '0xef1c6e67703c7bd7107eed8303fbe6ec2554bf6b': { name: 'Uniswap Universal Router', type: 'DEX_ROUTER' },
    // SushiSwap Router
    '0xd9e1ce17f2641f24ae83637ab66a2cca9c378b9f': { name: 'SushiSwap', type: 'DEX_ROUTER' },
    // 1inch Aggregation Router V5
    '0x1111111254eeb25477b68fb85ed929f73a960582': { name: '1inch Router', type: 'DEX_AGGREGATOR' },
    // Curve 3pool
    '0xbebc44782c7db0a1a60cb6fe97d0b483032ff1c7': { name: 'Curve Finance', type: 'DEX_POOL' }
  },
  base: {
    // Aerodrome Router
    '0xcf77a3ba9a5ca399b7c97c74d54e5b1beb874e43': { name: 'Aerodrome', type: 'DEX_ROUTER' },
    // Aerodrome Universal Router
    '0x6cd442c51029c7167664687d7b003a272365bf02': { name: 'Aerodrome', type: 'DEX_ROUTER' },
    // Uniswap SwapRouter02 on Base
    '0x2626664c2603336e57b271c5c0b26f421741e481': { name: 'Uniswap V3', type: 'DEX_ROUTER' },
    // Uniswap Universal Router on Base
    '0x198ef79f1f515f02dfee9e330a560d891fa6c7ce': { name: 'Uniswap Universal Router', type: 'DEX_ROUTER' },
    // BaseSwap Router
    '0x327df1e6de05895d2ab08513aadd9313fe505d86': { name: 'BaseSwap', type: 'DEX_ROUTER' },
    // SushiSwap V3 on Base
    '0x83e9503374020a67ebc1a7036a7a03fb70e7a2b9': { name: 'SushiSwap', type: 'DEX_ROUTER' }
  },
  polygon: {
    // QuickSwap Router
    '0xa5e0829caced8ffdd4de3c43696c57f7d7a678ff': { name: 'QuickSwap', type: 'DEX_ROUTER' },
    // QuickSwap V3 Router
    '0xf5b509bb0909a69b1c207e495f687a596c168e12': { name: 'QuickSwap V3', type: 'DEX_ROUTER' },
    // Uniswap V3 on Polygon
    '0xe592427a0aece92de3edee1f18e0157c05861564': { name: 'Uniswap V3', type: 'DEX_ROUTER' },
    '0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45': { name: 'Uniswap V3', type: 'DEX_ROUTER' },
    // SushiSwap on Polygon
    '0x1b02da8cb0d097eb8d57a175b88c7d8b47997506': { name: 'SushiSwap', type: 'DEX_ROUTER' }
  },
  solana: {
    // Raydium AMM V4
    '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8': { name: 'Raydium AMM', type: 'DEX_AMM' },
    // Raydium CLMM (Concentrated Liquidity)
    'CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK': { name: 'Raydium CLMM', type: 'DEX_AMM' },
    // Raydium CPMM
    'CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C': { name: 'Raydium CPMM', type: 'DEX_AMM' },
    // Orca Whirlpools
    'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc': { name: 'Orca Whirlpool', type: 'DEX_AMM' },
    // Jupiter v6 Aggregator
    'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4': { name: 'Jupiter Aggregator', type: 'DEX_AGGREGATOR' },
    // Jupiter v4 Aggregator
    'JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB': { name: 'Jupiter Aggregator', type: 'DEX_AGGREGATOR' },
    // Pump.fun Bonding Curve
    '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P': { name: 'Pump.fun', type: 'DEX_BONDING_CURVE' }
  }
};

/**
 * Standard EVM Method Selectors
 */
const EVM_SELECTORS = {
  // ERC-20 Methods
  '0xa9059cbb': { name: 'transfer', classification: 'TOKEN_TRANSFER' },
  '0x23b87266': { name: 'transferFrom', classification: 'TOKEN_TRANSFER' },
  '0x095ea7b3': { name: 'approve', classification: 'APPROVAL' },
  '0xd505accf': { name: 'permit', classification: 'APPROVAL' },
  '0x42966c68': { name: 'burn', classification: 'BURN' },

  // Uniswap V2 / Standard DEX Swap Methods
  '0x38ed1739': { name: 'swapExactTokensForTokens', classification: 'SWAP', protocol: 'Uniswap V2' },
  '0x7ff36ab5': { name: 'swapExactETHForTokens', classification: 'SWAP', protocol: 'Uniswap V2' },
  '0x18cbafe5': { name: 'swapExactTokensForETH', classification: 'SWAP', protocol: 'Uniswap V2' },
  '0xfb3bdb41': { name: 'swapETHForExactTokens', classification: 'SWAP', protocol: 'Uniswap V2' },
  '0x8803dbee': { name: 'swapTokensForExactTokens', classification: 'SWAP', protocol: 'Uniswap V2' },
  '0x4a25d94a': { name: 'swapTokensForExactETH', classification: 'SWAP', protocol: 'Uniswap V2' },
  '0x5c11d795': { name: 'swapExactTokensForTokensSupportingFeeOnTransferTokens', classification: 'SWAP', protocol: 'Uniswap V2' },
  '0xb6f9de95': { name: 'swapExactETHForTokensSupportingFeeOnTransferTokens', classification: 'SWAP', protocol: 'Uniswap V2' },
  '0x791ac947': { name: 'swapExactTokensForETHSupportingFeeOnTransferTokens', classification: 'SWAP', protocol: 'Uniswap V2' },

  // Uniswap V3 Methods
  '0x414bf382': { name: 'exactInputSingle', classification: 'SWAP', protocol: 'Uniswap V3' },
  '0xc04b8d59': { name: 'exactInput', classification: 'SWAP', protocol: 'Uniswap V3' },
  '0xdb3e2198': { name: 'exactOutputSingle', classification: 'SWAP', protocol: 'Uniswap V3' },
  '0xf285a401': { name: 'exactOutput', classification: 'SWAP', protocol: 'Uniswap V3' },
  '0xac9650d8': { name: 'multicall', classification: 'CONTRACT_INTERACTION', protocol: 'Multicall' },

  // Universal Router
  '0x3593564c': { name: 'execute', classification: 'SWAP', protocol: 'Universal Router' },
  '0x24856bc3': { name: 'execute', classification: 'SWAP', protocol: 'Universal Router' },

  // Staking Methods
  '0xa694fc3a': { name: 'stake', classification: 'STAKE' },
  '0x2e174266': { name: 'unstake', classification: 'UNSTAKE' },
  '0xb6b55f25': { name: 'deposit', classification: 'STAKE' },
  '0x2e1a7d4d': { name: 'withdraw', classification: 'UNSTAKE' }
};

/**
 * Common EVM Event Log Topics
 */
const EVM_EVENT_TOPICS = {
  // Transfer(address,address,uint256)
  TRANSFER: '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
  // Approval(address,address,uint256)
  APPROVAL: '0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925',
  // Uniswap V2 Swap(address,uint256,uint256,uint256,uint256,address)
  UNISWAP_V2_SWAP: '0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822',
  // Uniswap V3 Swap(address,address,int256,int256,uint160,uint128,int24)
  UNISWAP_V3_SWAP: '0xc42079f94a6350d7e6235f29174924f9d5fb2d7b2e155705cc7f6c3f1b40283c'
};

class ProtocolRegistry {
  /**
   * Identifies protocol from address and network
   * @param {string} network 
   * @param {string} address 
   * @returns {Object|null}
   */
  static getProtocol(network, address) {
    if (!network || !address) return null;
    const net = network.toLowerCase();
    const normalizedAddr = net === 'solana' ? address : address.toLowerCase();

    const netProtocols = KNOWN_PROTOCOLS[net];
    if (!netProtocols) return null;

    return netProtocols[normalizedAddr] || null;
  }

  /**
   * Checks if address is a known DEX router/pool
   * @param {string} network 
   * @param {string} address 
   * @returns {boolean}
   */
  static isDexContract(network, address) {
    const protocol = this.getProtocol(network, address);
    if (!protocol) return false;
    return protocol.type.startsWith('DEX_');
  }

  /**
   * Resolves selector info for EVM calldata
   * @param {string} inputData 
   * @returns {Object|null}
   */
  static getSelectorInfo(inputData) {
    if (!inputData || typeof inputData !== 'string' || inputData.length < 10) {
      return null;
    }
    const selector = inputData.slice(0, 10).toLowerCase();
    return EVM_SELECTORS[selector] || null;
  }

  /**
   * Returns known event topic hashes
   */
  static getEventTopics() {
    return EVM_EVENT_TOPICS;
  }
}

module.exports = {
  ProtocolRegistry,
  KNOWN_PROTOCOLS,
  EVM_SELECTORS,
  EVM_EVENT_TOPICS
};
