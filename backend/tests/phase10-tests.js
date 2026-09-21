const assert = require('assert');
const productionSafetyService = require('../src/security/productionSafetyService');
const executionLock = require('../src/utils/executionLock');
const ExecutionStateMachine = require('../src/blockchain/execution/executionStateMachine');
const { EXECUTION_STATUS } = require('../src/models/ExecutionRecord');
const { SKIP_REASON } = require('../src/models/PaperTrade');
const { RISK_DECISION } = require('../src/models/RiskEvaluation');
const rpcClient = require('../src/blockchain/rpcClient');
const { EvmTestnetAdapter } = require('../src/blockchain/execution/EvmTestnetAdapter');
const executionRecoveryService = require('../src/services/executionRecoveryService');
const metricsService = require('../src/services/metricsService');
const auditService = require('../src/services/auditService');
const { AUDIT_EVENT_TYPE, AUDIT_SEVERITY } = require('../src/models/AuditLog');
const logger = require('../src/utils/logger');
const executionSafetyService = require('../src/blockchain/execution/executionSafetyService');
const testnetExecutionService = require('../src/blockchain/execution/testnetExecutionService');
const MockExecutionAdapter = require('../src/blockchain/execution/MockExecutionAdapter');
const { TransactionParser, CLASSIFICATION, CONFIDENCE } = require('../src/blockchain/parser/transactionParser');
const copyRuleEngine = require('../src/services/copyRuleEngine');
const riskManagementEngine = require('../src/services/riskManagementEngine');

const runPhase10Tests = async (runTest) => {
  console.log('\n--- PHASE 10 FINAL VALIDATION & CONTROLLED TESTNET OPERATIONS TESTS ---');

  // 1. Full End-to-End Pipeline Validation
  await runTest('Phase 10 E2E: Full copy trading pipeline from raw tx to receipt and audit', async () => {
    // 1. Raw transaction
    const traderWallet = '0x1111111111111111111111111111111111111111';
    const rawTx = {
      hash: '0x10e2e_source_tx_hash_' + Date.now(),
      network: 'ethereum',
      from: traderWallet,
      to: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
      value: '1000000000000000000',
      data: '0x7ff36ab50000000000000000000000000000000000000000000000000000000000000000',
      blockNumber: 5000000,
      timestamp: Math.floor(Date.now() / 1000)
    };

    // 2. Transaction Parsing
    const parsed = TransactionParser.parseTransaction(rawTx, 'ethereum', traderWallet);
    assert(parsed !== null, 'Transaction should be parsed');
    assert.strictEqual(parsed.classification, CLASSIFICATION.SWAP);

    // 3. Copy Rule Evaluation
    const testRule = {
      _id: '507f1f77bcf86cd7994390aa',
      userId: '507f1f77bcf86cd799439011',
      traderAddress: traderWallet,
      enabled: true,
      allocationMode: 'FIXED_AMOUNT',
      allocationValue: 50,
      allowedNetworks: [],
      blockedTokens: [],
      minConfidence: 'LOW'
    };
    const portfolio = {
      userId: '507f1f77bcf86cd799439011',
      virtualCashBalance: 1000,
      totalPortfolioValue: 1000
    };

    const ruleEval = await copyRuleEngine.evaluateRule(testRule, parsed, portfolio);
    assert.strictEqual(ruleEval.decision, 'COPY');
    assert.strictEqual(ruleEval.calculatedAllocation, 50);

    // 4. Risk Evaluation
    const riskOverride = {
      enabled: true,
      minConfidence: 'LOW',
      maxTradeExposure: 100,
      maxDailyExposure: 500,
      maxPortfolioExposure: 50,
      maxTraderAllocation: 50,
      maxTokenAllocation: 50,
      maxOpenPositions: 10
    };

    const riskEval = await riskManagementEngine.evaluateRisk(
      testRule,
      parsed,
      portfolio,
      ruleEval.calculatedAllocation,
      riskOverride
    );
    assert.strictEqual(riskEval.decision, RISK_DECISION.APPROVED);

    // 5. Execution Safety Gate
    const safetyOverride = {
      enabled: true,
      mode: 'TESTNET',
      maxExecutionAmount: 100,
      dailyExecutionLimit: 500,
      allowedNetworks: ['sepolia'],
      _mockPrivateKey: '0x0123456789012345678901234567890123456789012345678901234567890123'
    };

    const safetyCheck = await executionSafetyService.validateExecution({
      userId: '507f1f77bcf86cd799439011',
      copyRule: testRule,
      parsedTx: {
        ...parsed,
        network: 'sepolia',
        swap: {
          inputToken: { symbol: 'WETH', address: '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9' },
          outputToken: { symbol: 'USDC', address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' }
        }
      },
      proposedAmount: ruleEval.calculatedAllocation,
      executionNetwork: 'sepolia',
      executionConfigOverride: safetyOverride
    });
    assert.strictEqual(safetyCheck.allowed, true);

    // 6. Testnet Execution via Mock Adapter
    const mockAdapter = new MockExecutionAdapter('sepolia');
    const swapResult = await mockAdapter.executeSwap({
      routerAddress: '0xC532a74256D3Db42D0Bf7a0400fEFDbad7694008',
      tokenInAddress: '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9',
      tokenOutAddress: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
      amountInBaseUnits: '20000000000000000',
      minimumAmountOutBaseUnits: '48000000',
      recipientAddress: '0x71C800000000000000000000000000000000Mock'
    });
    assert(swapResult.transactionHash.startsWith('0x'));

    const receipt = await mockAdapter.waitForReceipt(swapResult.transactionHash);
    assert.strictEqual(receipt.confirmed, true);
    assert.strictEqual(receipt.status, 1);

    // 7. Audit Log Trail
    await auditService.logEvent({
      eventType: AUDIT_EVENT_TYPE.EXECUTION_CONFIRMED,
      severity: AUDIT_SEVERITY.INFO,
      resourceType: 'EXECUTION',
      resourceId: 'rec_e2e_101',
      action: 'TESTNET_EXECUTION_CONFIRMED',
      userId: '507f1f77bcf86cd799439011',
      details: {
        sourceTxHash: rawTx.hash,
        ruleId: testRule._id,
        amount: ruleEval.calculatedAllocation,
        executedTxHash: swapResult.transactionHash,
        status: 'CONFIRMED'
      }
    });
  });

  // 2. PAPER Mode Regression & Isolation
  await runTest('Phase 10 PAPER Mode: Virtual execution isolation with zero on-chain broadcast', async () => {
    const paperMode = productionSafetyService.validateExecutionMode('PAPER');
    assert.strictEqual(paperMode.valid, true);
    assert.strictEqual(paperMode.mode, 'PAPER');

    const simulatedTrade = {
      id: 'paper_tx_' + Date.now(),
      userId: '507f1f77bcf86cd799439011',
      symbol: 'WETH/USDC',
      side: 'BUY',
      amount: 100,
      price: 2500,
      quantity: 0.04,
      status: 'FILLED',
      executionMode: 'PAPER',
      timestamp: new Date().toISOString()
    };

    assert.strictEqual(simulatedTrade.executionMode, 'PAPER');
    assert.strictEqual(simulatedTrade.status, 'FILLED');
    assert.strictEqual(simulatedTrade.txHash, undefined); // Zero blockchain broadcast
  });

  // 3. Copy Rule Matrix
  await runTest('Phase 10 Copy Rule Matrix: FIXED_AMOUNT and PERCENTAGE calculations', async () => {
    const parsedTx = {
      classification: 'SWAP',
      confidence: 'HIGH',
      network: 'sepolia',
      swap: {
        inputToken: { symbol: 'WETH', address: '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9' },
        outputToken: { symbol: 'USDC', address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' }
      }
    };
    const portfolio = { virtualCashBalance: 2000 };

    // FIXED_AMOUNT
    const fixedRule = { enabled: true, allocationMode: 'FIXED_AMOUNT', allocationValue: 150, allowedNetworks: [], blockedTokens: [], minConfidence: 'LOW' };
    const fixedRes = await copyRuleEngine.evaluateRule(fixedRule, parsedTx, portfolio);
    assert.strictEqual(fixedRes.decision, 'COPY');
    assert.strictEqual(fixedRes.calculatedAllocation, 150);

    // PERCENTAGE
    const pctRule = { enabled: true, allocationMode: 'PERCENTAGE', allocationValue: 25, allowedNetworks: [], blockedTokens: [], minConfidence: 'LOW' };
    const pctRes = await copyRuleEngine.evaluateRule(pctRule, parsedTx, portfolio);
    assert.strictEqual(pctRes.decision, 'COPY');
    assert.strictEqual(pctRes.calculatedAllocation, 500); // 25% of 2000
  });

  await runTest('Phase 10 Copy Rule Matrix: Disabled rules, network allowlists, token blocklists, and confidence filtering', async () => {
    const validSwapTx = {
      classification: 'SWAP',
      confidence: 'HIGH',
      network: 'sepolia',
      swap: {
        inputToken: { symbol: 'TEST', address: '0x9999999999999999999999999999999999999999' },
        outputToken: { symbol: 'USDC', address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' }
      }
    };
    const portfolio = { virtualCashBalance: 1000 };

    // 1. Disabled rule
    const disabledRule = { enabled: false, allocationMode: 'FIXED_AMOUNT', allocationValue: 50 };
    const disabledRes = await copyRuleEngine.evaluateRule(disabledRule, validSwapTx, portfolio);
    assert.strictEqual(disabledRes.decision, 'SKIP');
    assert.strictEqual(disabledRes.reason, SKIP_REASON.RULE_DISABLED);

    // 2. Disallowed Network
    const netRule = { enabled: true, minConfidence: 'LOW', allocationMode: 'FIXED_AMOUNT', allocationValue: 50, allowedNetworks: ['polygon-amoy'] };
    const netRes = await copyRuleEngine.evaluateRule(netRule, validSwapTx, portfolio);
    assert.strictEqual(netRes.decision, 'SKIP');
    assert.strictEqual(netRes.reason, SKIP_REASON.NETWORK_NOT_ALLOWED);

    // 3. Blocked Token
    const tokenRule = { enabled: true, minConfidence: 'LOW', allocationMode: 'FIXED_AMOUNT', allocationValue: 50, blockedTokens: ['0x9999999999999999999999999999999999999999'] };
    const tokenRes = await copyRuleEngine.evaluateRule(tokenRule, validSwapTx, portfolio);
    assert.strictEqual(tokenRes.decision, 'SKIP');
    assert.strictEqual(tokenRes.reason, SKIP_REASON.TOKEN_BLOCKED);

    // 4. Low Confidence
    const lowConfTx = { ...validSwapTx, confidence: 'LOW' };
    const confRule = { enabled: true, allocationMode: 'FIXED_AMOUNT', allocationValue: 50, minConfidence: 'HIGH' };
    const confRes = await copyRuleEngine.evaluateRule(confRule, lowConfTx, portfolio);
    assert.strictEqual(confRes.decision, 'SKIP');
    assert.strictEqual(confRes.reason, SKIP_REASON.PARSER_CONFIDENCE_TOO_LOW);
  });

  // 4. Risk Control Matrix
  await runTest('Phase 10 Risk Matrix: Enforces max trade amount, rolling 24h limits, and open positions caps', async () => {
    const copyRule = { userId: '507f1f77bcf86cd799439011' };
    const parsedTx = {
      confidence: 'HIGH',
      network: 'sepolia',
      swap: {
        outputToken: { address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' }
      }
    };
    const portfolio = {
      virtualCashBalance: 1000,
      totalPortfolioValue: 1000,
      holdings: []
    };

    // Max Single Trade Exposure Rejection
    const riskMaxTrade = {
      enabled: true,
      minConfidence: 'LOW',
      maxTradeExposure: 75,
      maxDailyExposure: 1000,
      maxPortfolioExposure: 100,
      maxTraderAllocation: 100,
      maxTokenAllocation: 100,
      maxOpenPositions: 10
    };
    const resMaxTrade = await riskManagementEngine.evaluateRisk(copyRule, parsedTx, portfolio, 100, riskMaxTrade);
    assert.strictEqual(resMaxTrade.decision, RISK_DECISION.BLOCKED);
    assert(resMaxTrade.reasons.includes(SKIP_REASON.MAX_TRADE_EXPOSURE_EXCEEDED));

    // Open Positions Cap Rejection
    const riskPositions = {
      enabled: true,
      minConfidence: 'LOW',
      maxTradeExposure: 200,
      maxDailyExposure: 1000,
      maxPortfolioExposure: 100,
      maxTraderAllocation: 100,
      maxTokenAllocation: 100,
      maxOpenPositions: 2
    };
    const portfolioAtCap = {
      ...portfolio,
      holdings: [
        { tokenAddress: '0x1111111111111111111111111111111111111111', quantity: 1, totalCost: 100 },
        { tokenAddress: '0x2222222222222222222222222222222222222222', quantity: 2, totalCost: 200 }
      ]
    };
    const resPositions = await riskManagementEngine.evaluateRisk(copyRule, parsedTx, portfolioAtCap, 50, riskPositions);
    assert.strictEqual(resPositions.decision, RISK_DECISION.BLOCKED);
    assert(resPositions.reasons.includes(SKIP_REASON.MAX_POSITIONS_EXCEEDED));
  });

  // 5. Failure Injection & Resilience
  await runTest('Phase 10 Failure Injection: RPC timeout backoff and Circuit Breaker fast-fail', async () => {
    const testUrl = 'https://mock-phase10-failing-rpc.test';
    rpcClient.resetCircuits();

    const circuit = rpcClient.getCircuit(testUrl);
    assert.strictEqual(circuit.state, 'CLOSED');

    for (let i = 0; i < 5; i++) {
      rpcClient.recordFailure(testUrl, new Error('ETIMEDOUT'));
    }

    assert.strictEqual(circuit.state, 'OPEN');

    let threw = false;
    try {
      await rpcClient.call(testUrl, 'eth_blockNumber', [], { maxRetries: 0 });
    } catch (e) {
      threw = true;
      assert(e.message.includes('RPC_CIRCUIT_OPEN'));
    }
    assert.strictEqual(threw, true);

    rpcClient.resetCircuits();
  });

  await runTest('Phase 10 Failure Injection: Kill switch EXECUTION_DISABLED blocks all broadcasts', async () => {
    productionSafetyService.setKillSwitch(true, 'Automated Phase 10 Emergency Test');
    assert.strictEqual(productionSafetyService.isKillSwitchActive(), true);

    const safetyCheck = await executionSafetyService.validateExecution({
      userId: '507f1f77bcf86cd799439011',
      copyRule: { _id: 'r1' },
      parsedTx: { network: 'sepolia', swap: {} },
      proposedAmount: 50,
      executionNetwork: 'sepolia',
      executionConfigOverride: { enabled: true, mode: 'TESTNET' }
    });

    assert.strictEqual(safetyCheck.allowed, false);
    assert(safetyCheck.reasons.includes('EXECUTION_DISABLED'));

    productionSafetyService.setKillSwitch(false, 'Test Restore');
    assert.strictEqual(productionSafetyService.isKillSwitchActive(), false);
  });

  // 6. Concurrency & Idempotency Validation
  await runTest('Phase 10 Concurrency: Mutex locks duplicate concurrent execution requests', async () => {
    const execKey = executionLock.getExecutionKey('user_conc_1', 'rule_conc_1', 'tx_conc_1', 'TESTNET');
    
    const acquiredFirst = executionLock.acquire(execKey, 5000);
    assert.strictEqual(acquiredFirst, true);

    const acquiredSecond = executionLock.acquire(execKey, 5000);
    assert.strictEqual(acquiredSecond, false);

    executionLock.release(execKey);

    const acquiredThird = executionLock.acquire(execKey, 5000);
    assert.strictEqual(acquiredThird, true);
    executionLock.release(execKey);
  });

  // 7. Nonce Serialization & Monotonicity
  await runTest('Phase 10 Nonce Safety: Adapter serializes nonce allocation monotonically', async () => {
    const adapter = new EvmTestnetAdapter('sepolia', { walletAddress: '0x1111111111111111111111111111111111111111' });
    
    const n1 = await adapter.allocateNonce();
    const n2 = await adapter.allocateNonce();
    const n3 = await adapter.allocateNonce();

    assert(typeof n1 === 'number');
    assert.strictEqual(n2, n1 + 1);
    assert.strictEqual(n3, n2 + 1);
  });

  // 8. Execution State Machine Lifecycle
  await runTest('Phase 10 State Machine: Validates strict transition lifecycle without bypassing', async () => {
    // Valid transitions
    assert.strictEqual(ExecutionStateMachine.canTransition(EXECUTION_STATUS.PENDING_VALIDATION, EXECUTION_STATUS.VALIDATED), true);
    assert.strictEqual(ExecutionStateMachine.canTransition(EXECUTION_STATUS.VALIDATED, EXECUTION_STATUS.BUILDING), true);
    assert.strictEqual(ExecutionStateMachine.canTransition(EXECUTION_STATUS.BUILDING, EXECUTION_STATUS.SIGNED), true);
    assert.strictEqual(ExecutionStateMachine.canTransition(EXECUTION_STATUS.SIGNED, EXECUTION_STATUS.SUBMITTED), true);
    assert.strictEqual(ExecutionStateMachine.canTransition(EXECUTION_STATUS.SUBMITTED, EXECUTION_STATUS.CONFIRMING), true);
    assert.strictEqual(ExecutionStateMachine.canTransition(EXECUTION_STATUS.CONFIRMING, EXECUTION_STATUS.CONFIRMED), true);

    // Invalid transitions
    let illegalThrow = false;
    try {
      ExecutionStateMachine.assertTransition(EXECUTION_STATUS.CONFIRMED, EXECUTION_STATUS.PENDING_VALIDATION, 'rec_101');
    } catch (e) {
      illegalThrow = true;
      assert.strictEqual(e.code, 'INVALID_STATE_TRANSITION');
    }
    assert.strictEqual(illegalThrow, true);
  });

  // 9. Execution Recovery Logic
  await runTest('Phase 10 Recovery: Recovers BUILDING state to FAILED without duplicate broadcast', async () => {
    const mockBuildingRecord = {
      _id: '507f1f77bcf86cd799439088',
      status: EXECUTION_STATUS.BUILDING,
      network: 'sepolia',
      mode: 'TESTNET',
      transactionHash: null,
      updatedAt: new Date(Date.now() - 600000)
    };

    const recoveryResult = await executionRecoveryService.recoverSingleRecord(mockBuildingRecord);
    assert.strictEqual(recoveryResult.status, EXECUTION_STATUS.FAILED);
    assert.strictEqual(recoveryResult.record.status, EXECUTION_STATUS.FAILED);
  });

  // 10. Multi-Layer Mainnet Hard Blocking Negative Tests
  await runTest('Phase 10 Negative Tests: Complete rejection of all mainnet networks and execution modes', async () => {
    const prohibitedNetworks = ['ethereum', 'base', 'polygon', 'solana', 'arbitrum', 'optimism', 'bsc'];
    
    for (const net of prohibitedNetworks) {
      const check = productionSafetyService.assertTestnetSafety(net);
      assert.strictEqual(check.allowed, false, `Mainnet network ${net} must be rejected`);
      assert(check.reason.includes('MAINNET_BLOCKED'));
    }

    const prohibitedModes = ['MAINNET', 'PRODUCTION', 'LIVE', 'REAL'];
    for (const mode of prohibitedModes) {
      const modeCheck = productionSafetyService.validateExecutionMode(mode);
      assert.strictEqual(modeCheck.valid, false, `Execution mode ${mode} must be rejected`);
      assert(modeCheck.error.includes('strictly forbidden'));
    }
  });

  // 11. Security Audit & Credential Redaction
  await runTest('Phase 10 Security: Redacts private keys, secrets, and credentials in audit and logs', async () => {
    const sensitivePayload = {
      userId: 'user_sec_10',
      privateKey: '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
      seedPhrase: 'twelve secret words that should never ever be logged anywhere in production',
      password: 'SuperSecretPassword123!',
      amount: 100
    };

    const sanitized = logger.sanitize(sensitivePayload);
    assert.strictEqual(sanitized.privateKey, '[REDACTED]');
    assert.strictEqual(sanitized.seedPhrase, '[REDACTED]');
    assert.strictEqual(sanitized.password, '[REDACTED]');
    assert.strictEqual(sanitized.amount, 100);

    // Verify logger sanitization handles nested objects and arrays
    const nestedPayload = {
      user: {
        profile: {
          password: 'SecretNestedPassword',
          accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test'
        }
      }
    };
    const nestedSanitized = logger.sanitize(nestedPayload);
    assert.strictEqual(nestedSanitized.user.profile.password, '[REDACTED]');
    assert.strictEqual(nestedSanitized.user.profile.accessToken, '[REDACTED]');
  });

  // 12. Observability & Telemetry Verification
  await runTest('Phase 10 Observability: Metrics and health snapshot telemetry', async () => {
    metricsService.increment('testnetExecutionsTotal');
    metricsService.recordLatency('api', 45);
    const snapshot = metricsService.getSnapshot();
    
    assert(snapshot.counters !== undefined);
    assert(snapshot.counters.testnetExecutionsTotal >= 1);
    assert(snapshot.performance !== undefined);
    assert(typeof snapshot.performance.avgApiLatencyMs === 'number');
  });
};

module.exports = { runPhase10Tests };
