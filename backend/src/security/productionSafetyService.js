const env = require('../config/env');
const logger = require('../utils/logger');

const PERMITTED_MODES = Object.freeze(['PAPER', 'TESTNET']);
const FORBIDDEN_MODES = Object.freeze(['MAINNET', 'PRODUCTION', 'LIVE', 'REAL']);

const FORBIDDEN_MAINNET_IDENTIFIERS = Object.freeze([
  'ethereum',
  'mainnet',
  'eth',
  'base',
  'polygon',
  'matic',
  'solana',
  'solana-mainnet',
  'solana-mainnet-beta',
  'arbitrum',
  'optimism',
  'bsc',
  'binance',
  'avalanche'
]);

const FORBIDDEN_MAINNET_CHAIN_IDS = Object.freeze([
  1,     // Ethereum Mainnet
  8453,  // Base Mainnet
  137,   // Polygon Mainnet
  101,   // Solana Mainnet Beta
  56,    // BNB Chain Mainnet
  42161, // Arbitrum One Mainnet
  10,    // Optimism Mainnet
  43114  // Avalanche C-Chain Mainnet
]);

const ALLOWED_TESTNET_CHAIN_IDS = Object.freeze([
  11155111, // Sepolia
  84532,    // Base Sepolia
  80002     // Polygon Amoy
]);

class ProductionSafetyService {
  constructor() {
    // Runtime kill switch state (initialized from env)
    // If EXECUTION_KILL_SWITCH is 'true', kill switch is active (execution disabled)
    // Or if TESTNET_EXECUTION_ENABLED is 'false', execution is disabled
    const envKillSwitch = process.env.EXECUTION_KILL_SWITCH === 'true' || env.TESTNET_EXECUTION_ENABLED === false;
    this.killSwitchActive = envKillSwitch;
  }

  /**
   * Returns current emergency kill switch status
   * @returns {boolean} true if kill switch is ACTIVE (execution disabled)
   */
  isKillSwitchActive() {
    return this.killSwitchActive;
  }

  /**
   * Sets emergency kill switch state at runtime
   * @param {boolean} active 
   * @param {string} [reason]
   */
  setKillSwitch(active, reason = 'Operational override') {
    const previous = this.killSwitchActive;
    this.killSwitchActive = Boolean(active);
    logger.warn(`[SAFETY] Emergency Kill Switch changed from ${previous} to ${this.killSwitchActive}. Reason: ${reason}`);
    return this.killSwitchActive;
  }

  /**
   * Validates requested execution mode
   * @param {string} mode 
   * @returns {{ valid: boolean, mode: string, error?: string }}
   */
  validateExecutionMode(mode) {
    if (!mode || typeof mode !== 'string') {
      return { valid: false, mode: 'INVALID', error: 'Execution mode is required' };
    }

    const normalized = mode.toUpperCase().trim();

    if (FORBIDDEN_MODES.includes(normalized)) {
      return {
        valid: false,
        mode: normalized,
        error: `Mode '${normalized}' is strictly forbidden. CryptoCopy operates ONLY in PAPER and TESTNET modes.`
      };
    }

    if (!PERMITTED_MODES.includes(normalized)) {
      return {
        valid: false,
        mode: normalized,
        error: `Unknown execution mode '${mode}'. Allowed modes: ${PERMITTED_MODES.join(', ')}`
      };
    }

    return { valid: true, mode: normalized };
  }

  /**
   * Central multi-layer check to ensure network and chain ID are not mainnet
   * @param {string} network 
   * @param {number} [chainId]
   * @returns {{ allowed: boolean, reason?: string }}
   */
  assertTestnetSafety(network, chainId = null) {
    if (!network || typeof network !== 'string') {
      return { allowed: false, reason: 'Network identifier is required' };
    }

    const normalized = network.toLowerCase().trim();

    if (FORBIDDEN_MAINNET_IDENTIFIERS.includes(normalized)) {
      return {
        allowed: false,
        reason: `MAINNET_BLOCKED: Network '${network}' is a production mainnet network. Mainnet execution is strictly disabled.`
      };
    }

    if (chainId) {
      const numChainId = Number(chainId);
      if (FORBIDDEN_MAINNET_CHAIN_IDS.includes(numChainId)) {
        return {
          allowed: false,
          reason: `MAINNET_BLOCKED: Chain ID ${numChainId} corresponds to a mainnet blockchain. Execution blocked.`
        };
      }
      if (!ALLOWED_TESTNET_CHAIN_IDS.includes(numChainId)) {
        return {
          allowed: false,
          reason: `UNAPPROVED_NETWORK: Chain ID ${numChainId} is not in the approved testnet registry.`
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Comprehensive pre-flight safety check
   * @param {Object} params
   * @param {string} params.mode
   * @param {string} params.network
   * @param {number} [params.chainId]
   * @returns {{ allowed: boolean, code?: string, reason?: string }}
   */
  checkExecutionSafety({ mode, network, chainId = null }) {
    // 1. Mode Validation
    const modeCheck = this.validateExecutionMode(mode);
    if (!modeCheck.valid) {
      return {
        allowed: false,
        code: 'MAINNET_BLOCKED',
        reason: modeCheck.error
      };
    }

    // 2. Kill switch check for TESTNET mode
    if (modeCheck.mode === 'TESTNET' && this.isKillSwitchActive()) {
      return {
        allowed: false,
        code: 'EXECUTION_DISABLED',
        reason: 'Global emergency execution kill switch is ACTIVE. Testnet transactions are halted.'
      };
    }

    // 3. Network mainnet guard
    const netCheck = this.assertTestnetSafety(network, chainId);
    if (!netCheck.allowed) {
      return {
        allowed: false,
        code: 'MAINNET_BLOCKED',
        reason: netCheck.reason
      };
    }

    return { allowed: true };
  }

  /**
   * Returns current operational safety overview
   */
  getSafetyStatus() {
    return {
      executionModes: {
        paperEnabled: true,
        testnetEnabled: !this.isKillSwitchActive(),
        mainnetEnabled: false,
        mainnetBlocked: true
      },
      killSwitchActive: this.isKillSwitchActive(),
      permittedModes: [...PERMITTED_MODES],
      blockedMainnetChainIds: [...FORBIDDEN_MAINNET_CHAIN_IDS],
      approvedTestnetChainIds: [...ALLOWED_TESTNET_CHAIN_IDS]
    };
  }
}

module.exports = new ProductionSafetyService();
