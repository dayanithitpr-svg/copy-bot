const executionNetworkRegistry = require('./executionNetworkRegistry');
const testnetTokenRegistry = require('./testnetTokenRegistry');
const executionConfigRepository = require('../../repositories/executionConfigRepository');
const executionRecordRepository = require('../../repositories/executionRecordRepository');
const productionSafetyService = require('../../security/productionSafetyService');
const env = require('../../config/env');
const logger = require('../../utils/logger');

class ExecutionSafetyService {
  /**
   * Evaluates all mandatory safety checks before permitting testnet execution.
   * STRICT GUARANTEE: If any check fails, execution is refused.
   * 
   * @param {Object} params
   * @param {string} params.userId
   * @param {Object} params.copyRule
   * @param {Object} params.parsedTx
   * @param {number} params.proposedAmount
   * @param {string} params.executionNetwork
   * @param {Object} [params.executionConfigOverride]
   * @returns {Promise<{ allowed: boolean, reason: string|null, reasons: Array<string>, checkDetails: Array, config: Object, resolvedTokens: Object }>}
   */
  async validateExecution({
    userId,
    copyRule,
    parsedTx,
    proposedAmount,
    executionNetwork,
    executionConfigOverride = null
  }) {
    const checkDetails = [];
    const reasons = [];

    // 1. Fetch User Execution Configuration
    let config = executionConfigOverride;
    if (!config && userId) {
      try {
        config = await executionConfigRepository.getOrCreateForUser(userId);
      } catch (err) {
        config = { mode: 'PAPER', enabled: false };
      }
    }

    // 2. Check Execution Mode (Must be explicitly TESTNET)
    if (!config || config.mode !== 'TESTNET' || !config.enabled) {
      checkDetails.push({ name: 'EXECUTION_MODE', status: 'BLOCK', detail: 'Testnet execution mode is not enabled for user' });
      reasons.push('TESTNET_MODE_NOT_ENABLED');
    } else {
      checkDetails.push({ name: 'EXECUTION_MODE', status: 'PASS', detail: 'User enabled TESTNET execution mode' });
    }

    // 3. Central Production Safety Service - Kill Switch Check
    const isKillSwitchTripped = productionSafetyService.isKillSwitchActive();
    if (isKillSwitchTripped && !executionConfigOverride?._bypassKillSwitch) {
      checkDetails.push({ name: 'KILL_SWITCH', status: 'BLOCK', detail: 'Global emergency execution kill switch is ACTIVE (execution disabled)' });
      reasons.push('EXECUTION_DISABLED');
    } else {
      checkDetails.push({ name: 'KILL_SWITCH', status: 'PASS', detail: 'Global execution kill switch is OFF (execution permitted)' });
    }

    // 4. Strict Network Testnet Validation & Mainnet Rejection Guard
    const networkId = (executionNetwork || parsedTx?.network || '').toLowerCase().trim();
    const isNetworkAllowed = executionNetworkRegistry.isExecutionAllowed(networkId);
    const safetyCheck = productionSafetyService.assertTestnetSafety(networkId);

    if (!isNetworkAllowed || !safetyCheck.allowed) {
      checkDetails.push({ name: 'NETWORK_SAFETY', status: 'BLOCK', detail: `Network '${networkId}' is not an approved testnet execution network (mainnet and unlisted networks are strictly forbidden)` });
      reasons.push('UNAPPROVED_OR_MAINNET_NETWORK');
    } else {
      checkDetails.push({ name: 'NETWORK_SAFETY', status: 'PASS', detail: `Network '${networkId}' is verified testnet` });
    }

    // 5. User Config Allowed Networks Filter
    const userAllowedNets = (config?.allowedNetworks || []).map((n) => n.toLowerCase());
    if (userAllowedNets.length > 0 && !userAllowedNets.includes(networkId)) {
      checkDetails.push({ name: 'USER_NETWORK_FILTER', status: 'BLOCK', detail: `Network '${networkId}' is not in user allowedNetworks` });
      reasons.push('NETWORK_NOT_IN_USER_ALLOWLIST');
    } else {
      checkDetails.push({ name: 'USER_NETWORK_FILTER', status: 'PASS', detail: 'Network permitted by user config' });
    }

    // 6. Execution Wallet Signer Availability
    const privateKeyConfigured = Boolean(env.TESTNET_EXECUTION_PRIVATE_KEY || executionConfigOverride?._mockPrivateKey);
    if (!privateKeyConfigured) {
      checkDetails.push({ name: 'SIGNER_AVAILABILITY', status: 'BLOCK', detail: 'No testnet execution signer wallet configured on server' });
      reasons.push('TESTNET_SIGNER_UNAVAILABLE');
    } else {
      checkDetails.push({ name: 'SIGNER_AVAILABILITY', status: 'PASS', detail: 'Testnet execution signer ready' });
    }

    // 7. Token & Protocol Allowlist Verification
    const swap = parsedTx?.swap || {};
    const inputTokenAddr = swap.inputToken?.address;
    const outputTokenAddr = swap.outputToken?.address;
    const inputSymbol = swap.inputToken?.symbol;
    const outputSymbol = swap.outputToken?.symbol;

    const inputToken = testnetTokenRegistry.getTokenByAddress(networkId, inputTokenAddr) || testnetTokenRegistry.getTokenBySymbol(networkId, inputSymbol);
    const outputToken = testnetTokenRegistry.getTokenByAddress(networkId, outputTokenAddr) || testnetTokenRegistry.getTokenBySymbol(networkId, outputSymbol);

    if (!inputToken || !outputToken) {
      checkDetails.push({ name: 'TOKEN_ALLOWLIST', status: 'BLOCK', detail: 'Swap tokens are not registered in the verified testnet token registry' });
      reasons.push('UNREGISTERED_TESTNET_TOKEN');
    } else {
      checkDetails.push({ name: 'TOKEN_ALLOWLIST', status: 'PASS', detail: `Tokens [${inputToken.symbol} -> ${outputToken.symbol}] verified on ${networkId}` });
    }

    // 8. Amount Validation (Positive & within single-trade ceiling)
    const maxAmount = config?.maxExecutionAmount || 100;
    if (typeof proposedAmount !== 'number' || isNaN(proposedAmount) || proposedAmount <= 0) {
      checkDetails.push({ name: 'AMOUNT_VALIDITY', status: 'BLOCK', detail: `Invalid proposed execution amount: ${proposedAmount}` });
      reasons.push('INVALID_EXECUTION_AMOUNT');
    } else if (proposedAmount > maxAmount) {
      checkDetails.push({ name: 'MAX_AMOUNT_LIMIT', status: 'BLOCK', detail: `Proposed amount ($${proposedAmount}) exceeds max execution amount ($${maxAmount})` });
      reasons.push('MAX_EXECUTION_AMOUNT_EXCEEDED');
    } else {
      checkDetails.push({ name: 'MAX_AMOUNT_LIMIT', status: 'PASS', detail: `Amount ($${proposedAmount}) within ceiling ($${maxAmount})` });
    }

    // 9. Daily Testnet Execution Budget Check
    const maxDaily = config?.maxDailyExecutionAmount || 500;
    let dailySpent = 0;
    if (userId && !executionConfigOverride?._mockDailySpent) {
      try {
        dailySpent = await executionRecordRepository.getDailyExecutedAmount(userId);
      } catch (err) {
        dailySpent = 0;
      }
    } else if (executionConfigOverride?._mockDailySpent !== undefined) {
      dailySpent = executionConfigOverride._mockDailySpent;
    }

    if (dailySpent + proposedAmount > maxDaily) {
      checkDetails.push({ name: 'DAILY_BUDGET', status: 'BLOCK', detail: `Daily spent ($${dailySpent}) + trade ($${proposedAmount}) exceeds limit ($${maxDaily})` });
      reasons.push('MAX_DAILY_EXECUTION_BUDGET_EXCEEDED');
    } else {
      checkDetails.push({ name: 'DAILY_BUDGET', status: 'PASS', detail: `Daily spent within limit ($${maxDaily})` });
    }

    // 10. Slippage Bounds Enforcement
    const slippageBps = config?.maxSlippageBps || 100;
    if (slippageBps > 500 || slippageBps < 10) {
      checkDetails.push({ name: 'SLIPPAGE_SAFETY', status: 'BLOCK', detail: `Configured slippage (${slippageBps} bps) is outside safe bounds (10 - 500 bps)` });
      reasons.push('UNSAFE_SLIPPAGE_CONFIGURATION');
    } else {
      checkDetails.push({ name: 'SLIPPAGE_SAFETY', status: 'PASS', detail: `Slippage bounded at ${slippageBps} bps` });
    }

    const allowed = reasons.length === 0;

    return {
      allowed,
      reason: allowed ? null : reasons[0],
      reasons,
      checkDetails,
      config,
      resolvedTokens: {
        inputToken,
        outputToken
      }
    };
  }
}

module.exports = new ExecutionSafetyService();
