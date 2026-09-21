const copyRuleRepository = require('../repositories/copyRuleRepository');
const paperPortfolioRepository = require('../repositories/paperPortfolioRepository');
const paperTradeRepository = require('../repositories/paperTradeRepository');
const riskEvaluationRepository = require('../repositories/riskEvaluationRepository');
const executionConfigRepository = require('../repositories/executionConfigRepository');
const testnetExecutionService = require('../blockchain/execution/testnetExecutionService');
const traderRepository = require('../repositories/traderRepository');
const copyRuleEngine = require('./copyRuleEngine');
const riskManagementEngine = require('./riskManagementEngine');
const { TRADE_STATUS, SKIP_REASON } = require('../models/PaperTrade');
const { RISK_DECISION } = require('../models/RiskEvaluation');
const env = require('../config/env');
const logger = require('../utils/logger');

class CopyTradingEngine {
  /**
   * Main entry point: Processes a newly parsed on-chain transaction across all eligible copy rules.
   * Connects: Trader Validation → Classification Check → CopyRuleEngine → RiskManagementEngine → Paper Execution.
   * 
   * @param {Object} parsedTx - ParsedTransaction document
   * @returns {Promise<Array<Object>>} Array of generated PaperTrade decision records
   */
  async processTransactionForRules(parsedTx) {
    if (!parsedTx || !parsedTx.traderId) return [];

    const traderId = parsedTx.traderId;
    const txId = parsedTx._id || parsedTx.id;
    const decisions = [];

    try {
      // 1. Trader Eligibility Check
      let trader = null;
      try {
        trader = await traderRepository.findById(traderId);
      } catch (err) {
        // Fallback for tests or disconnected DB
      }

      if (trader) {
        if (trader.status !== 'ACTIVE') {
          logger.debug(`[COPY ENGINE SKIPPED] Trader ${traderId} is not ACTIVE (status: ${trader.status})`);
          return [];
        }
        if (!trader.trackingEnabled) {
          logger.debug(`[COPY ENGINE SKIPPED] Trader ${traderId} tracking is disabled`);
          return [];
        }
      }

      // 2. Discover Active Copy Rules for this Trader
      let activeRules = [];
      try {
        activeRules = await copyRuleRepository.findActiveRulesForTrader(traderId);
      } catch (err) {
        // Fallback if DB is unavailable
      }

      if (!activeRules || activeRules.length === 0) {
        return [];
      }

      logger.info(`[COPY ENGINE] Processing ${activeRules.length} active copy rule(s) for tx ${parsedTx.transactionHash || txId} (${parsedTx.network})`);

      // 3. Process Each Active Rule with Failure Isolation
      for (const rule of activeRules) {
        try {
          const decision = await this.evaluateAndExecute(rule, parsedTx, trader);
          if (decision) {
            decisions.push(decision);
          }
        } catch (ruleErr) {
          logger.warn(`[COPY ENGINE ERROR] Error evaluating rule ${rule._id}: ${ruleErr.message}`);
        }
      }

      return decisions;
    } catch (err) {
      logger.error(`[COPY ENGINE FATAL] Fatal error for transaction ${txId}: ${err.message}`);
      return [];
    }
  }

  /**
   * Evaluates a single copy rule and proposed transaction through the complete multi-layer pipeline
   * 
   * @param {Object} copyRule - CopyRule document
   * @param {Object} parsedTx - ParsedTransaction document
   * @param {Object} [trader] - Trader document
   * @returns {Promise<Object>} PaperTrade decision record
   */
  async evaluateAndExecute(copyRule, parsedTx, trader = null) {
    const userId = copyRule.userId;
    const traderId = copyRule.traderId;
    const ruleId = copyRule._id;
    const txId = parsedTx._id || parsedTx.id;

    // 1. Idempotency Check
    try {
      const existing = await paperTradeRepository.findExisting(userId, ruleId, txId);
      if (existing) {
        logger.debug(`[COPY ENGINE IDEMPOTENT] Tx ${txId} already processed for rule ${ruleId}`);
        return existing;
      }
    } catch (err) {
      // Offline fallback
    }

    const inputToken = parsedTx.swap?.inputToken || { address: null, symbol: 'IN', amount: '0' };
    const outputToken = parsedTx.swap?.outputToken || { address: null, symbol: 'OUT', amount: '0' };

    // 2. Transaction Classification Eligibility Check (SWAP supported in Phase 7)
    if (parsedTx.classification !== 'SWAP' && !parsedTx.swap) {
      try {
        return await paperTradeRepository.createOrIgnore({
          userId,
          traderId,
          copyRuleId: ruleId,
          sourceParsedTransactionId: txId,
          network: parsedTx.network,
          status: TRADE_STATUS.SKIPPED,
          classification: parsedTx.classification || 'UNKNOWN',
          inputToken,
          outputToken,
          allocationMode: copyRule.allocationMode,
          allocationValue: copyRule.allocationValue,
          paperInputAmount: 0,
          paperOutputAmount: 0,
          skipReason: SKIP_REASON.UNSUPPORTED_TRANSACTION_TYPE,
          simulatedAt: new Date()
        });
      } catch (e) {
        return null;
      }
    }

    // 3. User Virtual Portfolio
    let portfolio = { virtualCashBalance: 10000, holdings: [] };
    try {
      portfolio = await paperPortfolioRepository.getOrCreatePortfolio(userId);
    } catch (err) {
      // Default virtual portfolio
    }

    // 4. Step A: CopyRuleEngine Evaluation
    const ruleEvaluation = await copyRuleEngine.evaluateRule(copyRule, parsedTx, portfolio);

    if (ruleEvaluation.decision !== 'COPY') {
      try {
        const skippedTrade = await paperTradeRepository.createOrIgnore({
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
        logger.debug(`[COPY ENGINE SKIPPED - RULE] Rule ${ruleId} skipped trade: ${ruleEvaluation.reason}`);
        return skippedTrade;
      } catch (e) {
        return null;
      }
    }

    // 5. Calculate Proposed Allocation (with Multiplier if configured)
    let proposedAllocation = ruleEvaluation.calculatedAllocation;
    if (copyRule.multiplier && Number(copyRule.multiplier) > 0) {
      proposedAllocation = Math.round(proposedAllocation * Number(copyRule.multiplier) * 100) / 100;
    }

    // 6. Step B: RiskManagementEngine Evaluation
    const riskResult = await riskManagementEngine.evaluateRisk(copyRule, parsedTx, portfolio, proposedAllocation);

    // Persist Risk Evaluation Audit Log
    let riskEvalRecord = null;
    try {
      riskEvalRecord = await riskEvaluationRepository.recordEvaluation({
        userId,
        traderId,
        copyRuleId: ruleId,
        sourceParsedTransactionId: txId,
        network: parsedTx.network,
        proposedAllocation,
        decision: riskResult.decision,
        checks: riskResult.checks,
        reasons: riskResult.reasons,
        evaluatedAt: riskResult.evaluatedAt
      });
    } catch (evalErr) {
      logger.warn(`Failed to persist risk evaluation record: ${evalErr.message}`);
    }

    // 7. Handle Risk Blocked Decision
    if (riskResult.decision === RISK_DECISION.BLOCKED) {
      const primaryReason = riskResult.reasons[0] || 'RISK_BLOCKED';
      try {
        const blockedTrade = await paperTradeRepository.createOrIgnore({
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
        logger.info(`[COPY ENGINE BLOCKED - RISK] User ${userId} trade blocked: ${riskResult.reasons.join(', ')}`);
        return blockedTrade;
      } catch (e) {
        return null;
      }
    }

    // 8. Step C: Execution Branch (TESTNET vs PAPER Simulation)
    let execConfig = null;
    try {
      execConfig = await executionConfigRepository.getOrCreateForUser(userId);
    } catch (e) {
      execConfig = { mode: 'PAPER', enabled: false };
    }

    if (execConfig && execConfig.mode === 'TESTNET' && execConfig.enabled) {
      logger.info(`[COPY ENGINE] Executing TESTNET trade for user ${userId} on ${parsedTx.network}`);
      const testnetResult = await testnetExecutionService.executeTestnetTrade({
        userId,
        copyRule,
        parsedTx,
        proposedAllocation
      });

      // Maintain simulated trade record for historical dashboard continuity
      const paperTrade = await paperTradeRepository.createOrIgnore({
        userId,
        traderId,
        copyRuleId: ruleId,
        sourceParsedTransactionId: txId,
        riskEvaluationId: riskEvalRecord?._id || null,
        network: parsedTx.network,
        status: testnetResult.status === 'CONFIRMED' || testnetResult.status === 'SUBMITTED' ? TRADE_STATUS.SIMULATED : TRADE_STATUS.FAILED,
        classification: parsedTx.classification || 'SWAP',
        inputToken,
        outputToken,
        allocationMode: copyRule.allocationMode,
        allocationValue: copyRule.allocationValue,
        paperInputAmount: proposedAllocation,
        paperOutputAmount: proposedAllocation,
        skipReason: testnetResult.status === 'REJECTED' ? testnetResult.reason : null,
        riskReasons: [],
        simulatedAt: new Date()
      });

      return {
        ...(paperTrade?.toSafeObject ? paperTrade.toSafeObject() : paperTrade),
        testnetExecution: testnetResult
      };
    }

    // Default: Paper Trading Virtual Simulation Execution (Atomic accounting)
    let paperOutputAmount = 1.0;
    if (outputToken.amount && inputToken.amount && Number(inputToken.amount) > 0) {
      const ratio = Number(outputToken.amount) / Number(inputToken.amount);
      paperOutputAmount = proposedAllocation * ratio;
    } else {
      paperOutputAmount = proposedAllocation; // 1:1 fallback
    }

    try {
      await paperPortfolioRepository.updateBalancesAndHoldings(
        userId,
        -proposedAllocation,
        outputToken.address ? {
          tokenAddress: outputToken.address,
          network: parsedTx.network,
          symbol: outputToken.symbol || 'TOKEN',
          quantityDelta: paperOutputAmount,
          costDelta: proposedAllocation
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
        paperInputAmount: proposedAllocation,
        paperOutputAmount,
        skipReason: null,
        riskReasons: [],
        simulatedAt: new Date()
      });

      logger.info(`[COPY ENGINE EXECUTED] User ${userId} successfully copied trade with ${proposedAllocation} Paper USDC`);
      return paperTrade;
    } catch (execErr) {
      logger.warn(`Failed to update portfolio for simulated copy trade: ${execErr.message}`);
      try {
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
          skipReason: SKIP_REASON.INSUFFICIENT_PAPER_BALANCE,
          simulatedAt: new Date()
        });
      } catch (e) {
        return null;
      }
    }
  }

  /**
   * Returns operational status and active rule summary for current user
   * @param {string} userId 
   */
  async getEngineStatus(userId) {
    let activeRulesCount = 0;
    let trackedTradersCount = 0;
    let execConfig = null;

    try {
      const rules = await copyRuleRepository.listByUser(userId, { enabled: true });
      activeRulesCount = rules.length;
    } catch (err) {
      activeRulesCount = 0;
    }

    try {
      const summary = await traderRepository.getSummary(userId);
      trackedTradersCount = summary.activeTraders || 0;
    } catch (err) {
      trackedTradersCount = 0;
    }

    try {
      execConfig = await executionConfigRepository.getOrCreateForUser(userId);
    } catch (err) {
      execConfig = null;
    }

    return {
      status: 'ACTIVE',
      mode: execConfig?.mode === 'TESTNET' ? 'TESTNET' : 'SIMULATION_ONLY',
      executionMode: execConfig?.mode || 'PAPER',
      executionEnabled: Boolean(execConfig?.enabled),
      testnetExecutionAllowed: Boolean(env.TESTNET_EXECUTION_ENABLED),
      activeRulesCount,
      trackedTradersCount,
      environment: 'CryptoCopy Phase 8 Execution Engine'
    };
  }

  /**
   * Returns aggregate copy trading statistics for current user
   * @param {string} userId 
   */
  async getDecisionsSummary(userId) {
    return await paperTradeRepository.getTradeSummary(userId);
  }
}

module.exports = new CopyTradingEngine();
