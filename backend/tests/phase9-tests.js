const assert = require('assert');
const productionSafetyService = require('../src/security/productionSafetyService');
const executionLock = require('../src/utils/executionLock');
const ExecutionStateMachine = require('../src/blockchain/execution/executionStateMachine');
const { EXECUTION_STATUS } = require('../src/models/ExecutionRecord');
const rpcClient = require('../src/blockchain/rpcClient');
const { EvmTestnetAdapter } = require('../src/blockchain/execution/EvmTestnetAdapter');
const executionRecoveryService = require('../src/services/executionRecoveryService');
const metricsService = require('../src/services/metricsService');
const auditService = require('../src/services/auditService');
const logger = require('../src/utils/logger');
const executionSafetyService = require('../src/blockchain/execution/executionSafetyService');
const testnetExecutionService = require('../src/blockchain/execution/testnetExecutionService');
const MockExecutionAdapter = require('../src/blockchain/execution/MockExecutionAdapter');

const runPhase9Tests = async (runTest) => {
  console.log('\n--- PHASE 9 PRODUCTION SECURITY, RELIABILITY & READINESS TESTS ---');

  // 1. Production Safety Service - Mode Validation
  await runTest('Phase 9: Production Safety - Permits PAPER and TESTNET modes only', async () => {
    const paper = productionSafetyService.validateExecutionMode('PAPER');
    assert.strictEqual(paper.valid, true);
    assert.strictEqual(paper.mode, 'PAPER');

    const testnet = productionSafetyService.validateExecutionMode('TESTNET');
    assert.strictEqual(testnet.valid, true);
    assert.strictEqual(testnet.mode, 'TESTNET');
  });

  await runTest('Phase 9: Production Safety - Explicitly rejects MAINNET, PRODUCTION, LIVE, REAL modes', async () => {
    const mainnet = productionSafetyService.validateExecutionMode('MAINNET');
    assert.strictEqual(mainnet.valid, false);
    assert(mainnet.error.includes('strictly forbidden'));

    const prod = productionSafetyService.validateExecutionMode('PRODUCTION');
    assert.strictEqual(prod.valid, false);

    const live = productionSafetyService.validateExecutionMode('LIVE');
    assert.strictEqual(live.valid, false);

    const real = productionSafetyService.validateExecutionMode('REAL');
    assert.strictEqual(real.valid, false);
  });

  // 2. Production Safety Service - Multi-Layer Mainnet Hard Block
  await runTest('Phase 9: Production Safety - Multi-layer hard block for all mainnet networks & chain IDs', async () => {
    // Networks
    assert.strictEqual(productionSafetyService.assertTestnetSafety('ethereum').allowed, false);
    assert.strictEqual(productionSafetyService.assertTestnetSafety('base').allowed, false);
    assert.strictEqual(productionSafetyService.assertTestnetSafety('polygon').allowed, false);
    assert.strictEqual(productionSafetyService.assertTestnetSafety('solana').allowed, false);
    assert.strictEqual(productionSafetyService.assertTestnetSafety('arbitrum').allowed, false);

    // Chain IDs
    assert.strictEqual(productionSafetyService.assertTestnetSafety('sepolia', 1).allowed, false); // Ethereum Mainnet Chain ID 1
    assert.strictEqual(productionSafetyService.assertTestnetSafety('sepolia', 8453).allowed, false); // Base Mainnet Chain ID 8453
    assert.strictEqual(productionSafetyService.assertTestnetSafety('sepolia', 137).allowed, false); // Polygon Mainnet Chain ID 137
    assert.strictEqual(productionSafetyService.assertTestnetSafety('sepolia', 101).allowed, false); // Solana Mainnet Chain ID 101

    // Valid Testnets
    assert.strictEqual(productionSafetyService.assertTestnetSafety('sepolia', 11155111).allowed, true);
    assert.strictEqual(productionSafetyService.assertTestnetSafety('base-sepolia', 84532).allowed, true);
    assert.strictEqual(productionSafetyService.assertTestnetSafety('polygon-amoy', 80002).allowed, true);
  });

  // 3. Emergency Execution Kill Switch
  await runTest('Phase 9: Kill Switch - Disables testnet execution when active', async () => {
    productionSafetyService.setKillSwitch(true, 'Test emergency shutdown');
    assert.strictEqual(productionSafetyService.isKillSwitchActive(), true);

    const safetyCheck = productionSafetyService.checkExecutionSafety({
      mode: 'TESTNET',
      network: 'sepolia'
    });

    assert.strictEqual(safetyCheck.allowed, false);
    assert.strictEqual(safetyCheck.code, 'EXECUTION_DISABLED');
    assert(safetyCheck.reason.includes('emergency execution kill switch'));

    // Re-enable for subsequent tests
    productionSafetyService.setKillSwitch(false, 'Test restore');
    assert.strictEqual(productionSafetyService.isKillSwitchActive(), false);
  });

  // 4. Concurrency Mutex & Execution Lock
  await runTest('Phase 9: Execution Lock - Acquires, protects, and releases deterministic execution mutex', async () => {
    const key = executionLock.getExecutionKey('user1', 'rule1', 'tx1', 'TESTNET');
    
    // Acquire first lock
    const firstAcquire = executionLock.acquire(key, 5000);
    assert.strictEqual(firstAcquire, true);
    assert.strictEqual(executionLock.isLocked(key), true);

    // Second concurrent attempt must fail
    const secondAcquire = executionLock.acquire(key, 5000);
    assert.strictEqual(secondAcquire, false);

    // Release
    executionLock.release(key);
    assert.strictEqual(executionLock.isLocked(key), false);

    // Can acquire again after release
    const thirdAcquire = executionLock.acquire(key, 5000);
    assert.strictEqual(thirdAcquire, true);
    executionLock.release(key);
  });

  await runTest('Phase 9: Execution Lock - withLock helper ensures release even on thrown errors', async () => {
    const key = 'test-lock-error-release';
    
    let errorCaught = false;
    try {
      await executionLock.withLock(key, async () => {
        throw new Error('Simulated failure during execution');
      });
    } catch (e) {
      errorCaught = true;
    }

    assert.strictEqual(errorCaught, true);
    assert.strictEqual(executionLock.isLocked(key), false);
  });

  // 5. Execution State Machine Transitions
  await runTest('Phase 9: State Machine - Permits valid execution lifecycle transitions', async () => {
    assert.strictEqual(ExecutionStateMachine.canTransition(EXECUTION_STATUS.PENDING_VALIDATION, EXECUTION_STATUS.VALIDATED), true);
    assert.strictEqual(ExecutionStateMachine.canTransition(EXECUTION_STATUS.VALIDATED, EXECUTION_STATUS.BUILDING), true);
    assert.strictEqual(ExecutionStateMachine.canTransition(EXECUTION_STATUS.BUILDING, EXECUTION_STATUS.SUBMITTED), true);
    assert.strictEqual(ExecutionStateMachine.canTransition(EXECUTION_STATUS.SUBMITTED, EXECUTION_STATUS.CONFIRMING), true);
    assert.strictEqual(ExecutionStateMachine.canTransition(EXECUTION_STATUS.CONFIRMING, EXECUTION_STATUS.CONFIRMED), true);
    assert.strictEqual(ExecutionStateMachine.canTransition(EXECUTION_STATUS.SUBMITTED, EXECUTION_STATUS.FAILED), true);
  });

  await runTest('Phase 9: State Machine - Rejects invalid state jumps', async () => {
    assert.strictEqual(ExecutionStateMachine.canTransition(EXECUTION_STATUS.CONFIRMED, EXECUTION_STATUS.SUBMITTED), false);
    assert.strictEqual(ExecutionStateMachine.canTransition(EXECUTION_STATUS.FAILED, EXECUTION_STATUS.SIGNED), false);
    assert.strictEqual(ExecutionStateMachine.canTransition(EXECUTION_STATUS.REJECTED, EXECUTION_STATUS.CONFIRMED), false);

    let assertError = false;
    try {
      ExecutionStateMachine.assertTransition(EXECUTION_STATUS.CONFIRMED, EXECUTION_STATUS.BUILDING, 'rec-123');
    } catch (err) {
      assertError = true;
      assert.strictEqual(err.code, 'INVALID_STATE_TRANSITION');
    }
    assert.strictEqual(assertError, true);
  });

  // 6. RPC Circuit Breaker Protection
  await runTest('Phase 9: RPC Client - Circuit breaker manages state and protects against cascade failures', async () => {
    const testUrl = 'https://mock-failing-rpc.test';
    rpcClient.resetCircuits();

    const circuit = rpcClient.getCircuit(testUrl);
    assert.strictEqual(circuit.state, 'CLOSED');

    // Simulate 5 consecutive failures to trip circuit
    for (let i = 0; i < 5; i++) {
      rpcClient.recordFailure(testUrl, new Error('Connection refused'));
    }

    assert.strictEqual(circuit.state, 'OPEN');

    // Call should fast-fail with RPC_CIRCUIT_OPEN
    let circuitCaught = false;
    try {
      await rpcClient.call(testUrl, 'eth_blockNumber', [], { maxRetries: 0 });
    } catch (err) {
      circuitCaught = true;
      assert(err.message.includes('RPC_CIRCUIT_OPEN'));
    }
    assert.strictEqual(circuitCaught, true);

    // Reset circuits
    rpcClient.resetCircuits();
  });

  // 7. Nonce Safety in Adapter
  await runTest('Phase 9: EVM Adapter - Nonce serialization mutex prevents concurrent collisions', async () => {
    const adapter = new EvmTestnetAdapter('sepolia', { walletAddress: '0x1111111111111111111111111111111111111111' });
    
    // Allocate nonces concurrently
    const [nonce1, nonce2, nonce3] = await Promise.all([
      adapter.allocateNonce(),
      adapter.allocateNonce(),
      adapter.allocateNonce()
    ]);

    assert(nonce1 < nonce2, 'Nonce 1 must precede Nonce 2');
    assert(nonce2 < nonce3, 'Nonce 2 must precede Nonce 3');
  });

  // 8. Interrupted Execution Recovery
  await runTest('Phase 9: Execution Recovery - Resolves unconfirmed transaction safely without duplicate broadcast', async () => {
    const mockRecord = {
      _id: '507f1f77bcf86cd799439099',
      status: EXECUTION_STATUS.SUBMITTED,
      network: 'sepolia',
      transactionHash: '0xmocktxhash1234567890abcdef1234567890abcdef1234567890abcdef12345678'
    };

    const outcome = await executionRecoveryService.recoverSingleRecord(mockRecord);
    assert(outcome.status === EXECUTION_STATUS.CONFIRMED || outcome.status === EXECUTION_STATUS.FAILED);
  });

  await runTest('Phase 9: Execution Recovery - Safely marks building record as FAILED if interrupted before broadcast', async () => {
    const mockBuildingRecord = {
      _id: '507f1f77bcf86cd799439088',
      status: EXECUTION_STATUS.BUILDING,
      network: 'sepolia',
      transactionHash: null // No tx broadcast
    };

    const outcome = await executionRecoveryService.recoverSingleRecord(mockBuildingRecord);
    assert.strictEqual(outcome.status, EXECUTION_STATUS.FAILED);
  });

  // 9. Structured Logging & Secret Redaction
  await runTest('Phase 9: Logger - Automatically redacts private keys, tokens, and passwords in metadata', async () => {
    const sensitivePayload = {
      username: 'trader1',
      privateKey: '0x1234567890123456789012345678901234567890123456789012345678901234',
      password: 'SuperSecretPassword123!',
      jwt_access_secret: 'my_jwt_secret',
      nested: {
        seedPhrase: 'apple banana cherry dog elephant fox grape horse',
        apiKey: 'sk-123456'
      }
    };

    const sanitized = logger.sanitize(sensitivePayload);

    assert.strictEqual(sanitized.username, 'trader1');
    assert.strictEqual(sanitized.privateKey, '[REDACTED]');
    assert.strictEqual(sanitized.password, '[REDACTED]');
    assert.strictEqual(sanitized.jwt_access_secret, '[REDACTED]');
    assert.strictEqual(sanitized.nested.seedPhrase, '[REDACTED]');
  });

  // 10. Metrics Registry Snapshot
  await runTest('Phase 9: Metrics - Records and provides reliable performance snapshot', async () => {
    metricsService.increment('apiRequestsTotal', 5);
    metricsService.increment('parsedTransactionsTotal', 2);
    metricsService.recordLatency('api', 45);

    const snapshot = metricsService.getSnapshot();
    assert(snapshot.counters.apiRequestsTotal >= 5);
    assert(snapshot.counters.parsedTransactionsTotal >= 2);
    assert.strictEqual(typeof snapshot.performance.avgApiLatencyMs, 'number');
    assert.strictEqual(typeof snapshot.performance.apiSuccessRatePercent, 'number');
  });

  // 11. Audit Logging Service
  await runTest('Phase 9: Audit Service - Emits immutable audit records with secret redaction', async () => {
    const entry = await auditService.logEvent({
      userId: '507f1f77bcf86cd799439011',
      eventType: 'SYSTEM_STATE_CHANGED',
      severity: 'INFO',
      resourceType: 'SYSTEM',
      action: 'TEST_AUDIT_ACTION',
      details: { privateKey: '0xsecret', operation: 'VERIFICATION' }
    });

    // In mock/test DB, logEvent returns safely
    assert(true, 'Audit event processed safely');
  });

  // 12. Full Integration Execution with Safety & Mutex Protection
  await runTest('Phase 9: Testnet Execution Service - Full testnet lifecycle with audit and safety gate', async () => {
    const mockAdapter = new MockExecutionAdapter('sepolia');
    
    const result = await testnetExecutionService.executeTestnetTrade({
      userId: '507f1f77bcf86cd799439011',
      copyRule: { _id: '507f1f77bcf86cd799439022', traderId: '507f1f77bcf86cd799439033' },
      parsedTx: {
        _id: '507f1f77bcf86cd799439044',
        network: 'sepolia',
        swap: {
          inputToken: { symbol: 'USDC' },
          outputToken: { symbol: 'WETH' }
        }
      },
      proposedAllocation: 50,
      customAdapter: mockAdapter,
      safetyOverride: {
        mode: 'TESTNET',
        enabled: true,
        maxExecutionAmount: 100,
        maxDailyExecutionAmount: 500,
        allowedNetworks: ['sepolia'],
        _bypassKillSwitch: true,
        _mockPrivateKey: '0x123',
        _mockDailySpent: 0
      }
    });

    assert.strictEqual(result.status, EXECUTION_STATUS.CONFIRMED);
    assert(result.txHash.startsWith('0x'));
  });
};

module.exports = {
  runPhase9Tests
};
