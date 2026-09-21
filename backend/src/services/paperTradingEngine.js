const copyRuleRepository = require('../repositories/copyRuleRepository');
const paperPortfolioRepository = require('../repositories/paperPortfolioRepository');
const paperTradeRepository = require('../repositories/paperTradeRepository');
const riskEvaluationRepository = require('../repositories/riskEvaluationRepository');
const copyRuleEngine = require('./copyRuleEngine');
const riskManagementEngine = require('./riskManagementEngine');
const { TRADE_STATUS } = require('../models/PaperTrade');
const { RISK_DECISION } = require('../models/RiskEvaluation');
const logger = require('../utils/logger');

class PaperTradingEngine {
  /**
   * Processes a newly parsed transaction across all active copy rules for that trader
   * @param {Object} parsedTx - ParsedTransaction document
   * @returns {Promise<Array<Object>>} Array of created PaperTrade records
   */
  async processTransactionForRules(parsedTx) {
    if (!parsedTx || !parsedTx.traderId) return [];

    const traderId = parsedTx.traderId;
    const txId = parsedTx._id || parsedTx.id;
    const executedTrades = [];

    try {
      // 1. Find all active copy rules configured for this trader
      const activeRules = await copyRuleRepository.findActiveRulesForTrader(traderId);
      if (!activeRules || activeRules.length === 0) {
        return [];
      }

      logger.info(`Evaluating ${activeRules.length} active copy rule(s) for trader swap on ${parsedTx.network} (${parsedTx.transactionHash})`);

      for (const rule of activeRules) {
        try {
          const trade = await this.executeSimulation(rule, parsedTx);
          if (trade) {
            executedTrades.push(trade);
          }
        } catch (err) {
          logger.warn(`Paper trade simulation error for rule ${rule._id}: ${err.message}`);
        }
      }

      return executedTrades;
    } catch (err) {
      logger.error(`PaperTradingEngine fatal error for tx ${txId}: ${err.message}`);
      return [];
    }
  }

  /**
   * Simulates trade execution for a specific rule and parsed transaction through CopyRule and RiskManagement engines
   * @param {Object} copyRule 
   * @param {Object} parsedTx 
   */
  async executeSimulation(copyRule, parsedTx) {
    const userId = copyRule.userId;
    const traderId = copyRule.traderId;
    const ruleId = copyRule._id;
    const txId = parsedTx._id || parsedTx.id;

    // 1. Idempotency Check: Prevent duplicate processing of the same transaction per rule
    const existing = await paperTradeRepository.findExisting(userId, ruleId, txId);
    if (existing) {
      return existing;
    }

    // 2. Fetch User's Virtual Paper Portfolio
    const portfolio = await paperPortfolioRepository.getOrCreatePortfolio(userId);

    // 3. Step A: Evaluate Rule Decisions via CopyRuleEngine
    const ruleEvaluation = await copyRuleEngine.evaluateRule(copyRule, parsedTx, portfolio);

    const inputToken = parsedTx.swap?.inputToken || { address: null, symbol: 'IN', amount: '0' };
    const outputToken = parsedTx.swap?.outputToken || { address: null, symbol: 'OUT', amount: '0' };

    if (ruleEvaluation.decision !== 'COPY') {
      // Record Skipped Decision for rule auditability
      const paperTrade = await paperTradeRepository.createOrIgnore({
        userId,
        traderId,
        copyRuleId: ruleId,
        sourceParsedTransactionId: txId,
        network: parsedTx.network,
        status: TRADE_STATUS.SKIPPED,
        classification: parsedTx.classification || 'SWAP',
        inputToken,
        outputToken,
        allocationMode: copyRule.allocationMode,
        allocationValue: copyRule.allocationValue,
        paperInputAmount: 0,
        paperOutputAmount: 0,
        skipReason: ruleEvaluation.reason,
        simulatedAt: new Date()
      });

      logger.debug(`[SIMULATION SKIPPED - RULE] Rule ${ruleId} skipped trade: ${ruleEvaluation.reason}`);
      return paperTrade;
    }

    const paperInputAmount = ruleEvaluation.calculatedAllocation;

    // 4. Step B: Evaluate Risk Limits via RiskManagementEngine
    const riskResult = await riskManagementEngine.evaluateRisk(copyRule, parsedTx, portfolio, paperInputAmount);

    // Record Risk Evaluation Audit Log
    let riskEvalRecord = null;
    try {
      riskEvalRecord = await riskEvaluationRepository.recordEvaluation({
        userId,
        traderId,
        copyRuleId: ruleId,
        sourceParsedTransactionId: txId,
        network: parsedTx.network,
        proposedAllocation: paperInputAmount,
        decision: riskResult.decision,
        checks: riskResult.checks,
        reasons: riskResult.reasons,
        evaluatedAt: riskResult.evaluatedAt
      });
    } catch (evalErr) {
      logger.warn(`Failed to persist risk evaluation audit record: ${evalErr.message}`);
    }

    // If Risk Blocked: Do NOT modify portfolio balance, log as RISK_BLOCKED
    if (riskResult.decision === RISK_DECISION.BLOCKED) {
      const primaryReason = riskResult.reasons[0] || 'RISK_BLOCKED';
      const paperTrade = await paperTradeRepository.createOrIgnore({
        userId,
        traderId,
        copyRuleId: ruleId,
        sourceParsedTransactionId: txId,
        riskEvaluationId: riskEvalRecord?._id || null,
        network: parsedTx.network,
        status: TRADE_STATUS.RISK_BLOCKED,
        classification: parsedTx.classification || 'SWAP',
        inputToken,
        outputToken,
        allocationMode: copyRule.allocationMode,
        allocationValue: copyRule.allocationValue,
        paperInputAmount: 0,
        paperOutputAmount: 0,
        skipReason: primaryReason,
        riskReasons: riskResult.reasons,
        simulatedAt: new Date()
      });

      logger.info(`[SIMULATION BLOCKED - RISK] User ${userId} trade blocked by Risk Engine: ${riskResult.reasons.join(', ')}`);
      return paperTrade;
    }

    // 5. Step C: Execute Approved Paper Trade (Atomic virtual accounting)
    let paperOutputAmount = 1.0;
    if (outputToken.amount && inputToken.amount && Number(inputToken.amount) > 0) {
      const ratio = Number(outputToken.amount) / Number(inputToken.amount);
      paperOutputAmount = paperInputAmount * ratio;
    } else {
      paperOutputAmount = paperInputAmount; // 1:1 fallback
    }

    try {
      await paperPortfolioRepository.updateBalancesAndHoldings(
        userId,
        -paperInputAmount,
        outputToken.address ? {
          tokenAddress: outputToken.address,
          network: parsedTx.network,
          symbol: outputToken.symbol || 'TOKEN',
          quantityDelta: paperOutputAmount,
          costDelta: paperInputAmount
        } : null
      );

      const paperTrade = await paperTradeRepository.createOrIgnore({
        userId,
        traderId,
        copyRuleId: ruleId,
        sourceParsedTransactionId: txId,
        riskEvaluationId: riskEvalRecord?._id || null,
        network: parsedTx.network,
        status: TRADE_STATUS.SIMULATED,
        classification: parsedTx.classification || 'SWAP',
        inputToken,
        outputToken,
        allocationMode: copyRule.allocationMode,
        allocationValue: copyRule.allocationValue,
        paperInputAmount,
        paperOutputAmount,
        skipReason: null,
        riskReasons: [],
        simulatedAt: new Date()
      });

      logger.info(`[SIMULATION SUCCESS] User ${userId} paper copied trader with ${paperInputAmount} Paper USDC`);
      return paperTrade;
    } catch (err) {
      logger.warn(`Failed to update portfolio for paper trade: ${err.message}`);
      return await paperTradeRepository.createOrIgnore({
        userId,
        traderId,
        copyRuleId: ruleId,
        sourceParsedTransactionId: txId,
        network: parsedTx.network,
        status: TRADE_STATUS.SKIPPED,
        classification: parsedTx.classification || 'SWAP',
        inputToken,
        outputToken,
        allocationMode: copyRule.allocationMode,
        allocationValue: copyRule.allocationValue,
        paperInputAmount: 0,
        paperOutputAmount: 0,
        skipReason: 'INSUFFICIENT_PAPER_BALANCE',
        simulatedAt: new Date()
      });
    }
  }
}

module.exports = new PaperTradingEngine();
