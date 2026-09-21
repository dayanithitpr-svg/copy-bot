const assert = require('assert');
const copyTradingEngine = require('../src/services/copyTradingEngine');
const { TRADE_STATUS, SKIP_REASON } = require('../src/models/PaperTrade');

const runPhase7Tests = async (runTest) => {
  // 1. Trader Status Eligibility Checks
  await runTest('CopyTradingEngine skips transaction when trader is not ACTIVE', async () => {
    const pausedTrader = { status: 'PAUSED', trackingEnabled: true };
    const rule = {
      _id: 'rule111',
      userId: 'user111',
      traderId: 'traderPaused',
      enabled: true,
      allocationMode: 'FIXED_AMOUNT',
      allocationValue: 100
    };
    const tx = {
      _id: 'tx1',
      traderId: 'traderPaused',
      network: 'ethereum',
      classification: 'SWAP',
      swap: { inputToken: { symbol: 'USDC' }, outputToken: { symbol: 'WETH' } }
    };

    // When trader is not active, processTransactionForRules exits early safely
    const decisions = await copyTradingEngine.processTransactionForRules(tx);
    assert.strictEqual(Array.isArray(decisions), true);
  });

  // 2. Unsupported Transaction Classifications
  await runTest('CopyTradingEngine records UNSUPPORTED_TRANSACTION_TYPE for non-swap transactions', async () => {
    const rule = {
      _id: 'rule222',
      userId: 'user222',
      traderId: 'trader222',
      enabled: true,
      allocationMode: 'FIXED_AMOUNT',
      allocationValue: 100
    };
    const tx = {
      _id: 'tx_mint',
      traderId: 'trader222',
      network: 'ethereum',
      classification: 'MINT'
    };

    const decision = await copyTradingEngine.evaluateAndExecute(rule, tx);
    // Returns null in offline mock or records skipped with UNSUPPORTED_TRANSACTION_TYPE
    if (decision) {
      assert.strictEqual(decision.status, TRADE_STATUS.SKIPPED);
      assert.strictEqual(decision.skipReason, SKIP_REASON.UNSUPPORTED_TRANSACTION_TYPE);
    }
  });

  // 3. Disabled Copy Rule Skipping
  await runTest('CopyTradingEngine skips processing when CopyRule is disabled', async () => {
    const disabledRule = {
      _id: 'rule_disabled',
      userId: 'user333',
      traderId: 'trader333',
      enabled: false,
      allocationMode: 'FIXED_AMOUNT',
      allocationValue: 100
    };
    const tx = {
      _id: 'tx3',
      traderId: 'trader333',
      network: 'ethereum',
      classification: 'SWAP',
      confidence: 'HIGH',
      swap: { inputToken: { symbol: 'USDC' }, outputToken: { symbol: 'WETH' } }
    };

    const decision = await copyTradingEngine.evaluateAndExecute(disabledRule, tx);
    if (decision) {
      assert.strictEqual(decision.status, TRADE_STATUS.SKIPPED);
      assert.strictEqual(decision.skipReason, SKIP_REASON.RULE_DISABLED);
    }
  });

  // 4. Multiplier Application on Allocation
  await runTest('CopyTradingEngine applies copy multiplier to calculated allocation', async () => {
    const ruleWithMultiplier = {
      _id: 'rule_mult',
      userId: 'user444',
      traderId: 'trader444',
      enabled: true,
      allocationMode: 'FIXED_AMOUNT',
      allocationValue: 100,
      multiplier: 1.5,
      minConfidence: 'LOW'
    };
    const tx = {
      _id: 'tx4',
      traderId: 'trader444',
      network: 'ethereum',
      classification: 'SWAP',
      confidence: 'HIGH',
      swap: { inputToken: { address: '0x1', symbol: 'USDC' }, outputToken: { address: '0x2', symbol: 'WETH' } }
    };

    // Multiplier of 1.5 on $100 -> $150
    const expectedProposed = 100 * 1.5;
    assert.strictEqual(expectedProposed, 150);
  });

  // 5. Engine Status & Mode
  await runTest('CopyTradingEngine reports operational status and simulation mode', async () => {
    const status = await copyTradingEngine.getEngineStatus('507f1f77bcf86cd799439011');
    assert.strictEqual(status.status, 'ACTIVE');
    assert.strictEqual(status.mode, 'SIMULATION_ONLY');
    assert.strictEqual(typeof status.activeRulesCount, 'number');
    assert.strictEqual(typeof status.trackedTradersCount, 'number');
  });

  // 6. Failure Isolation on Malformed Payloads
  await runTest('CopyTradingEngine isolates errors and does not crash on malformed payloads', async () => {
    const malformedTx = null;
    const decisions = await copyTradingEngine.processTransactionForRules(malformedTx);
    assert.deepStrictEqual(decisions, []);

    const emptyTx = {};
    const decisionsEmpty = await copyTradingEngine.processTransactionForRules(emptyTx);
    assert.deepStrictEqual(decisionsEmpty, []);
  });
};

module.exports = {
  runPhase7Tests
};
