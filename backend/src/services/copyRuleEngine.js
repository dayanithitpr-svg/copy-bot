const paperTradeRepository = require('../repositories/paperTradeRepository');
const { SKIP_REASON } = require('../models/PaperTrade');
const logger = require('../utils/logger');

const CONFIDENCE_LEVELS = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3
};

class CopyRuleEngine {
  /**
   * Evaluates a single copy rule against a parsed transaction
   * @param {Object} copyRule - CopyRule model instance
   * @param {Object} parsedTx - ParsedTransaction object
   * @param {Object} portfolio - PaperPortfolio object
   * @returns {Promise<Object>} { decision: 'COPY'|'SKIP', reason: string|null, calculatedAllocation: number, swapDetails: Object }
   */
  async evaluateRule(copyRule, parsedTx, portfolio) {
    // 1. Check if rule is enabled
    if (!copyRule.enabled) {
      return { decision: 'SKIP', reason: SKIP_REASON.RULE_DISABLED, calculatedAllocation: 0 };
    }

    // 2. Check if transaction is a SWAP
    if (parsedTx.classification !== 'SWAP' && !parsedTx.swap) {
      return { decision: 'SKIP', reason: SKIP_REASON.UNSUPPORTED_SWAP, calculatedAllocation: 0 };
    }

    // 3. Check parser confidence threshold
    const requiredConf = CONFIDENCE_LEVELS[copyRule.minConfidence || 'MEDIUM'] || 2;
    const txConf = CONFIDENCE_LEVELS[parsedTx.confidence || 'LOW'] || 1;
    if (txConf < requiredConf) {
      return { decision: 'SKIP', reason: SKIP_REASON.PARSER_CONFIDENCE_TOO_LOW, calculatedAllocation: 0 };
    }

    // 4. Check network allowlist
    const net = (parsedTx.network || '').toLowerCase();
    if (copyRule.allowedNetworks && copyRule.allowedNetworks.length > 0) {
      const allowed = copyRule.allowedNetworks.map((n) => n.toLowerCase());
      if (!allowed.includes(net)) {
        return { decision: 'SKIP', reason: SKIP_REASON.NETWORK_NOT_ALLOWED, calculatedAllocation: 0 };
      }
    }

    // 5. Check token filters (allowlist and blocklist)
    const swap = parsedTx.swap || {};
    const inputTokenAddr = (swap.inputToken?.address || '').toLowerCase();
    const outputTokenAddr = (swap.outputToken?.address || '').toLowerCase();

    if (copyRule.blockedTokens && copyRule.blockedTokens.length > 0) {
      const blocked = copyRule.blockedTokens.map((t) => t.toLowerCase());
      if (blocked.includes(inputTokenAddr) || blocked.includes(outputTokenAddr)) {
        return { decision: 'SKIP', reason: SKIP_REASON.TOKEN_BLOCKED, calculatedAllocation: 0 };
      }
    }

    if (copyRule.allowedTokens && copyRule.allowedTokens.length > 0) {
      const allowed = copyRule.allowedTokens.map((t) => t.toLowerCase());
      if (inputTokenAddr && outputTokenAddr && !allowed.includes(inputTokenAddr) && !allowed.includes(outputTokenAddr)) {
        return { decision: 'SKIP', reason: SKIP_REASON.TOKEN_NOT_ALLOWED, calculatedAllocation: 0 };
      }
    }

    // 6. Calculate required paper allocation
    const availableCash = portfolio.virtualCashBalance || 0;
    let allocation = 0;

    if (copyRule.allocationMode === 'PERCENTAGE') {
      allocation = (availableCash * (copyRule.allocationValue || 10)) / 100;
    } else {
      allocation = copyRule.allocationValue || 100;
    }

    // Round to 2 decimals
    allocation = Math.round(allocation * 100) / 100;

    // Minimum trade value check ($1.00 Paper USDC)
    if (allocation < 1.0) {
      return { decision: 'SKIP', reason: SKIP_REASON.TRADE_TOO_SMALL, calculatedAllocation: allocation };
    }

    // Maximum trade amount ceiling check
    if (copyRule.maxTradeAmount && allocation > copyRule.maxTradeAmount) {
      allocation = copyRule.maxTradeAmount;
    }

    // 7. Check 24h daily budget limit
    if (copyRule.maxDailyAmount && copyRule.maxDailyAmount > 0) {
      const dailySpent = await paperTradeRepository.getDailySpent(copyRule.userId, copyRule._id);
      if (dailySpent + allocation > copyRule.maxDailyAmount) {
        return { decision: 'SKIP', reason: SKIP_REASON.DAILY_LIMIT_REACHED, calculatedAllocation: allocation };
      }
    }

    // 8. Check available paper cash balance
    if (availableCash < allocation) {
      return { decision: 'SKIP', reason: SKIP_REASON.INSUFFICIENT_PAPER_BALANCE, calculatedAllocation: allocation };
    }

    // All rule checks passed
    return {
      decision: 'COPY',
      reason: null,
      calculatedAllocation: allocation,
      swapDetails: {
        inputToken: swap.inputToken || { address: null, symbol: 'INPUT', amount: '0' },
        outputToken: swap.outputToken || { address: null, symbol: 'OUTPUT', amount: '0' }
      }
    };
  }
}

module.exports = new CopyRuleEngine();
