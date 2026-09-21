const executionSafetyService = require('./executionSafetyService');
const executionNetworkRegistry = require('./executionNetworkRegistry');
const executionRecordRepository = require('../../repositories/executionRecordRepository');
const ExecutionStateMachine = require('./executionStateMachine');
const { EXECUTION_STATUS } = require('../../models/ExecutionRecord');
const { EvmTestnetAdapter } = require('./EvmTestnetAdapter');
const MockExecutionAdapter = require('./MockExecutionAdapter');
const executionLock = require('../../utils/executionLock');
const metricsService = require('../../services/metricsService');
const auditService = require('../../services/auditService');
const { AUDIT_EVENT_TYPE, AUDIT_SEVERITY } = require('../../models/AuditLog');
const env = require('../../config/env');
const logger = require('../../utils/logger');

class TestnetExecutionService {
  constructor() {
    this.adapters = new Map();
  }

  /**
   * Retrieves or instantiates an execution adapter for the target network
   * @param {string} network 
   * @returns {import('./IExecutionAdapter')}
   */
  getAdapter(network) {
    const netKey = (network || '').toLowerCase().trim();
    if (this.adapters.has(netKey)) {
      return this.adapters.get(netKey);
    }

    let adapter;
    if (process.env.USE_MOCK_EXECUTION === 'true' || (!env.TESTNET_SEPOLIA_RPC_URL && !env.TESTNET_EXECUTION_PRIVATE_KEY)) {
      adapter = new MockExecutionAdapter(netKey);
    } else {
      adapter = new EvmTestnetAdapter(netKey, {
        privateKey: env.TESTNET_EXECUTION_PRIVATE_KEY
      });
    }

    this.adapters.set(netKey, adapter);
    return adapter;
  }

  /**
   * Registers a custom or mock adapter for a network (useful for testing)
   */
  registerAdapter(network, adapter) {
    this.adapters.set((network || '').toLowerCase().trim(), adapter);
  }

  /**
   * Clears cached adapters
   */
  clearAdapters() {
    this.adapters.clear();
  }

  /**
   * Orchestrates the complete testnet execution lifecycle with safety checks & audit logging
   * 
   * @param {Object} params
   * @param {string} params.userId
   * @param {Object} params.copyRule
   * @param {Object} params.parsedTx
   * @param {number} params.proposedAllocation
   * @param {Object} [params.customAdapter]
   * @param {Object} [params.safetyOverride]
   * @returns {Promise<Object>} Execution result with audit record
   */
  async executeTestnetTrade({
    userId,
    copyRule,
    parsedTx,
    proposedAllocation,
    customAdapter = null,
    safetyOverride = null
  }) {
    metricsService.increment('testnetExecutionsTotal');

    const txId = parsedTx._id || parsedTx.id;
    const ruleId = copyRule._id || copyRule.id;
    const traderId = copyRule.traderId?._id || copyRule.traderId || parsedTx.traderId;
    const network = (parsedTx.network || 'sepolia').toLowerCase();
    const networkConfig = executionNetworkRegistry.getNetwork(network);

    // 1. Concurrency Mutex Lock (Idempotency Protection)
    const lockKey = executionLock.getExecutionKey(userId, ruleId, txId, 'TESTNET');
    const isLockAcquired = executionLock.acquire(lockKey, 45000);

    if (!isLockAcquired) {
      metricsService.increment('duplicatesPreventedTotal');
      logger.warn(`[EXECUTION DUPLICATE BLOCKED] Concurrent execution attempt blocked by mutex: ${lockKey}`);
      return {
        status: EXECUTION_STATUS.DUPLICATE,
        isDuplicate: true,
        reason: 'DUPLICATE_CONCURRENT_REQUEST'
      };
    }

    try {
      // 2. Database Idempotency Check
      try {
        const existing = await executionRecordRepository.findExisting(userId, ruleId, txId, 'TESTNET');
        if (existing) {
          metricsService.increment('duplicatesPreventedTotal');
          logger.info(`[EXECUTION IDEMPOTENT] Testnet trade already recorded for tx ${txId}`);
          return {
            status: existing.status,
            record: existing,
            isDuplicate: true
          };
        }
      } catch (err) {
        // Continue if offline/mock
      }

      // 3. Pre-Execution Safety Gate
      const safetyResult = await executionSafetyService.validateExecution({
        userId,
        copyRule,
        parsedTx,
        proposedAmount: proposedAllocation,
        executionNetwork: network,
        executionConfigOverride: safetyOverride
      });

      if (!safetyResult.allowed) {
        metricsService.increment('testnetExecutionsFailed');
        const primaryReason = safetyResult.reason || 'SAFETY_GATE_REJECTED';
        const blockDetails = safetyResult.checkDetails
          .filter((c) => c.status === 'BLOCK')
          .map((c) => c.detail)
          .join('; ');

        logger.warn(`[EXECUTION REJECTED] User ${userId} testnet trade rejected by safety gate: ${primaryReason}`);

        let rejectedRecord = null;
        try {
          rejectedRecord = await executionRecordRepository.createRecord({
            userId,
            sourceParsedTransactionId: txId,
            copyRuleId: ruleId,
            traderId,
            executionMode: 'TESTNET',
            network,
            chainId: networkConfig?.chainId || 0,
            executionWalletAddress: '0x0000000000000000000000000000000000000000',
            protocol: 'UNISWAP_V2_TESTNET',
            tokenIn: {
              symbol: parsedTx.swap?.inputToken?.symbol || 'UNKNOWN',
              address: parsedTx.swap?.inputToken?.address || null,
              amount: String(proposedAllocation)
            },
            tokenOut: {
              symbol: parsedTx.swap?.outputToken?.symbol || 'UNKNOWN',
              address: parsedTx.swap?.outputToken?.address || null
            },
            status: EXECUTION_STATUS.REJECTED,
            errorCode: primaryReason,
            errorMessage: blockDetails
          });
        } catch (err) {
          logger.warn(`Failed to save rejected execution record: ${err.message}`);
        }

        // Audit Log
        auditService.logEvent({
          userId,
          eventType: AUDIT_EVENT_TYPE.EXECUTION_REJECTED,
          severity: AUDIT_SEVERITY.WARN,
          resourceType: 'EXECUTION',
          resourceId: rejectedRecord?._id || txId,
          action: 'TESTNET_EXECUTION_REJECTED',
          details: { reason: primaryReason, network, proposedAllocation }
        });

        return {
          status: EXECUTION_STATUS.REJECTED,
          reason: primaryReason,
          record: rejectedRecord,
          safetyDetails: safetyResult.checkDetails
        };
      }

      // 4. Adapter Initialization
      const adapter = customAdapter || this.getAdapter(network);
      const executionWallet = adapter.getExecutionWalletAddress();
      const routerAddress = networkConfig?.uniswapV2Router || '0x0000000000000000000000000000000000000000';

      const inputToken = safetyResult.resolvedTokens.inputToken || parsedTx.swap?.inputToken || {};
      const outputToken = safetyResult.resolvedTokens.outputToken || parsedTx.swap?.outputToken || {};

      // 5. Initial Validated Record (State Transition: PENDING_VALIDATION -> BUILDING)
      let record = null;
      try {
        record = await executionRecordRepository.createRecord({
          userId,
          sourceParsedTransactionId: txId,
          copyRuleId: ruleId,
          traderId,
          executionMode: 'TESTNET',
          network,
          chainId: networkConfig ? networkConfig.chainId : 11155111,
          executionWalletAddress: executionWallet,
          protocol: 'UNISWAP_V2_TESTNET',
          routerAddress,
          tokenIn: {
            symbol: inputToken.symbol || 'TEST_IN',
            address: inputToken.address || null,
            amount: String(proposedAllocation)
          },
          tokenOut: {
            symbol: outputToken.symbol || 'TEST_OUT',
            address: outputToken.address || null
          },
          status: EXECUTION_STATUS.BUILDING
        });
      } catch (err) {
        logger.error(`Failed to initialize ExecutionRecord: ${err.message}`);
      }

      const recordId = record?._id || record?.id;

      // Audit Requested
      auditService.logEvent({
        userId,
        eventType: AUDIT_EVENT_TYPE.EXECUTION_REQUESTED,
        severity: AUDIT_SEVERITY.INFO,
        resourceType: 'EXECUTION',
        resourceId: recordId || txId,
        action: 'TESTNET_EXECUTION_INITIATED',
        details: { network, tokenIn: inputToken.symbol, tokenOut: outputToken.symbol, proposedAllocation }
      });

      // 6. Build & Submit Transaction
      try {
        logger.info(`[EXECUTION SUBMITTING] Submitting swap on ${network} for User ${userId}`);

        const executionResult = await adapter.executeSwap({
          routerAddress,
          tokenInAddress: inputToken.address,
          tokenOutAddress: outputToken.address,
          amountIn: proposedAllocation,
          tokenInDecimals: inputToken.decimals || 18,
          tokenOutDecimals: outputToken.decimals || 18,
          slippageBps: safetyResult.config?.maxSlippageBps || 100,
          recipientAddress: executionWallet
        });

        const txHash = executionResult.transactionHash;
        const explorerUrl = networkConfig?.explorerUrl ? `${networkConfig.explorerUrl}/tx/${txHash}` : null;

        // State Transition: BUILDING -> SUBMITTED
        ExecutionStateMachine.assertTransition(EXECUTION_STATUS.BUILDING, EXECUTION_STATUS.SUBMITTED, recordId);

        if (recordId) {
          record = await executionRecordRepository.updateStatus(recordId, {
            status: EXECUTION_STATUS.SUBMITTED,
            transactionHash: txHash,
            nonce: executionResult.nonce,
            gasLimit: executionResult.gasLimit,
            gasPriceGwei: executionResult.gasPriceGwei,
            amountInBaseUnits: executionResult.amountInBaseUnits,
            minimumAmountOutBaseUnits: executionResult.minimumAmountOutBaseUnits,
            explorerUrl,
            submittedAt: new Date()
          });
        }

        logger.info(`[EXECUTION SUBMITTED] Tx hash ${txHash} on ${network}`);

        // 7. Confirm Receipt (State Transition: SUBMITTED -> CONFIRMED or FAILED)
        const receipt = await adapter.waitForReceipt(txHash);

        if (receipt.confirmed) {
          metricsService.increment('testnetExecutionsConfirmed');
          ExecutionStateMachine.assertTransition(EXECUTION_STATUS.SUBMITTED, EXECUTION_STATUS.CONFIRMED, recordId);

          if (recordId) {
            record = await executionRecordRepository.updateStatus(recordId, {
              status: EXECUTION_STATUS.CONFIRMED,
              gasUsed: receipt.gasUsed,
              confirmedAt: new Date()
            });
          }

          auditService.logEvent({
            userId,
            eventType: AUDIT_EVENT_TYPE.EXECUTION_CONFIRMED,
            severity: AUDIT_SEVERITY.INFO,
            resourceType: 'EXECUTION',
            resourceId: recordId,
            action: 'TESTNET_EXECUTION_CONFIRMED',
            details: { txHash, network, blockNumber: receipt.blockNumber, gasUsed: receipt.gasUsed }
          });

          logger.info(`[EXECUTION CONFIRMED] Tx ${txHash} confirmed on block ${receipt.blockNumber}`);
          return {
            status: EXECUTION_STATUS.CONFIRMED,
            record,
            txHash,
            receipt
          };
        } else {
          metricsService.increment('testnetExecutionsFailed');
          ExecutionStateMachine.assertTransition(EXECUTION_STATUS.SUBMITTED, EXECUTION_STATUS.FAILED, recordId);

          if (recordId) {
            record = await executionRecordRepository.updateStatus(recordId, {
              status: EXECUTION_STATUS.FAILED,
              errorCode: 'TRANSACTION_REVERTED',
              errorMessage: receipt.error || 'On-chain execution transaction reverted'
            });
          }

          auditService.logEvent({
            userId,
            eventType: AUDIT_EVENT_TYPE.EXECUTION_FAILED,
            severity: AUDIT_SEVERITY.WARN,
            resourceType: 'EXECUTION',
            resourceId: recordId,
            action: 'TESTNET_EXECUTION_REVERTED',
            details: { txHash, error: receipt.error }
          });

          logger.warn(`[EXECUTION FAILED] Tx ${txHash} reverted on chain`);
          return {
            status: EXECUTION_STATUS.FAILED,
            record,
            txHash,
            error: receipt.error || 'Transaction reverted'
          };
        }
      } catch (execErr) {
        metricsService.increment('testnetExecutionsFailed');
        logger.error(`[EXECUTION ERROR] Testnet execution error: ${execErr.message}`);
        if (recordId) {
          try {
            record = await executionRecordRepository.updateStatus(recordId, {
              status: EXECUTION_STATUS.FAILED,
              errorCode: 'EXECUTION_ADAPTER_ERROR',
              errorMessage: execErr.message
            });
          } catch (e) {
            // Safe fallback
          }
        }

        auditService.logEvent({
          userId,
          eventType: AUDIT_EVENT_TYPE.EXECUTION_FAILED,
          severity: AUDIT_SEVERITY.ERROR,
          resourceType: 'EXECUTION',
          resourceId: recordId || txId,
          action: 'TESTNET_EXECUTION_EXCEPTION',
          details: { error: execErr.message }
        });

        return {
          status: EXECUTION_STATUS.FAILED,
          record,
          error: execErr.message
        };
      }
    } finally {
      executionLock.release(lockKey);
    }
  }
}

module.exports = new TestnetExecutionService();
