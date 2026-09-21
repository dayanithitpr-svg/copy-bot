const assert = require('assert');
const copyRuleEngine = require('../src/services/copyRuleEngine');
const { SKIP_REASON } = require('../src/models/PaperTrade');
const { ALLOCATION_MODE } = require('../src/models/CopyRule');

const runPhase5Tests = async (runTest) => {
  // 1. Copy Rule Engine - Rule Disabled
  await runTest('CopyRuleEngine skips evaluation when rule is disabled', async () => {
    const rule = {
      enabled: false,
      allocationMode: 'FIXED_AMOUNT',
      allocationValue: 100,
      minConfidence: 'MEDIUM'
    };
    const tx = { classification: 'SWAP', confidence: 'HIGH', network: 'ethereum' };
    const portfolio = { virtualCashBalance: 10000 };

    const result = await copyRuleEngine.evaluateRule(rule, tx, portfolio);
    assert.strictEqual(result.decision, 'SKIP');
    assert.strictEqual(result.reason, SKIP_REASON.RULE_DISABLED);
  });

  // 2. Copy Rule Engine - Unsupported Non-Swap Transaction
  await runTest('CopyRuleEngine skips non-swap transactions', async () => {
    const rule = {
      enabled: true,
      allocationMode: 'FIXED_AMOUNT',
      allocationValue: 100,
      minConfidence: 'MEDIUM'
    };
    const tx = { classification: 'TRANSFER', confidence: 'HIGH', network: 'ethereum' };
    const portfolio = { virtualCashBalance: 10000 };

    const result = await copyRuleEngine.evaluateRule(rule, tx, portfolio);
    assert.strictEqual(result.decision, 'SKIP');
    assert.strictEqual(result.reason, SKIP_REASON.UNSUPPORTED_SWAP);
  });

  // 3. Copy Rule Engine - Low Confidence Parser Result
  await runTest('CopyRuleEngine skips transactions below rule minConfidence threshold', async () => {
    const rule = {
      enabled: true,
      allocationMode: 'FIXED_AMOUNT',
      allocationValue: 100,
      minConfidence: 'HIGH'
    };
    const tx = { classification: 'SWAP', confidence: 'MEDIUM', network: 'ethereum', swap: {} };
    const portfolio = { virtualCashBalance: 10000 };

    const result = await copyRuleEngine.evaluateRule(rule, tx, portfolio);
    assert.strictEqual(result.decision, 'SKIP');
    assert.strictEqual(result.reason, SKIP_REASON.PARSER_CONFIDENCE_TOO_LOW);
  });

  // 4. Copy Rule Engine - Network Filter
  await runTest('CopyRuleEngine skips transactions from unallowed networks', async () => {
    const rule = {
      enabled: true,
      allocationMode: 'FIXED_AMOUNT',
      allocationValue: 100,
      minConfidence: 'MEDIUM',
      allowedNetworks: ['ethereum', 'base']
    };
    const tx = { classification: 'SWAP', confidence: 'HIGH', network: 'polygon', swap: {} };
    const portfolio = { virtualCashBalance: 10000 };

    const result = await copyRuleEngine.evaluateRule(rule, tx, portfolio);
    assert.strictEqual(result.decision, 'SKIP');
    assert.strictEqual(result.reason, SKIP_REASON.NETWORK_NOT_ALLOWED);
  });

  // 5. Copy Rule Engine - Token Blocklist
  await runTest('CopyRuleEngine skips swaps involving blocked token addresses', async () => {
    const blockedToken = '0xblockedtoken111111111111111111111111111111';
    const rule = {
      enabled: true,
      allocationMode: 'FIXED_AMOUNT',
      allocationValue: 100,
      minConfidence: 'MEDIUM',
      blockedTokens: [blockedToken]
    };
    const tx = {
      classification: 'SWAP',
      confidence: 'HIGH',
      network: 'ethereum',
      swap: {
        inputToken: { address: blockedToken, symbol: 'BLOCKED' },
        outputToken: { address: '0xsafe222222222222222222222222222222222222', symbol: 'SAFE' }
      }
    };
    const portfolio = { virtualCashBalance: 10000 };

    const result = await copyRuleEngine.evaluateRule(rule, tx, portfolio);
    assert.strictEqual(result.decision, 'SKIP');
    assert.strictEqual(result.reason, SKIP_REASON.TOKEN_BLOCKED);
  });

  // 6. Copy Rule Engine - Fixed Amount Allocation & Insufficient Balance
  await runTest('CopyRuleEngine skips trade when virtual cash balance is insufficient', async () => {
    const rule = {
      enabled: true,
      allocationMode: 'FIXED_AMOUNT',
      allocationValue: 500,
      minConfidence: 'MEDIUM'
    };
    const tx = {
      classification: 'SWAP',
      confidence: 'HIGH',
      network: 'ethereum',
      swap: {
        inputToken: { address: '0x111', symbol: 'IN' },
        outputToken: { address: '0x222', symbol: 'OUT' }
      }
    };
    const portfolio = { virtualCashBalance: 100 }; // Only $100 available, needs $500

    const result = await copyRuleEngine.evaluateRule(rule, tx, portfolio);
    assert.strictEqual(result.decision, 'SKIP');
    assert.strictEqual(result.reason, SKIP_REASON.INSUFFICIENT_PAPER_BALANCE);
  });

  // 7. Copy Rule Engine - Percentage Allocation Mode
  await runTest('CopyRuleEngine correctly calculates percentage allocation of available paper cash', async () => {
    const rule = {
      enabled: true,
      allocationMode: 'PERCENTAGE',
      allocationValue: 15, // 15% of $10,000 = $1,500
      maxTradeAmount: 2000,
      minConfidence: 'MEDIUM'
    };
    const tx = {
      classification: 'SWAP',
      confidence: 'HIGH',
      network: 'ethereum',
      swap: {
        inputToken: { address: '0x111', symbol: 'IN' },
        outputToken: { address: '0x222', symbol: 'OUT' }
      }
    };
    const portfolio = { virtualCashBalance: 10000 };

    const result = await copyRuleEngine.evaluateRule(rule, tx, portfolio);
    assert.strictEqual(result.decision, 'COPY');
    assert.strictEqual(result.calculatedAllocation, 1500);
  });

  // 8. Copy Rule Engine - Max Trade Amount Cap
  await runTest('CopyRuleEngine caps percentage allocation to maxTradeAmount ceiling', async () => {
    const rule = {
      enabled: true,
      allocationMode: 'PERCENTAGE',
      allocationValue: 50, // 50% of $10,000 = $5,000
      maxTradeAmount: 1200, // Capped at $1,200
      minConfidence: 'MEDIUM'
    };
    const tx = {
      classification: 'SWAP',
      confidence: 'HIGH',
      network: 'ethereum',
      swap: {
        inputToken: { address: '0x111', symbol: 'IN' },
        outputToken: { address: '0x222', symbol: 'OUT' }
      }
    };
    const portfolio = { virtualCashBalance: 10000 };

    const result = await copyRuleEngine.evaluateRule(rule, tx, portfolio);
    assert.strictEqual(result.decision, 'COPY');
    assert.strictEqual(result.calculatedAllocation, 1200);
  });
};

module.exports = {
  runPhase5Tests
};
