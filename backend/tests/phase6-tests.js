const assert = require('assert');
const riskManagementEngine = require('../src/services/riskManagementEngine');
const { RISK_DECISION, CHECK_STATUS } = require('../src/models/RiskEvaluation');
const { SKIP_REASON } = require('../src/models/PaperTrade');
const { validateRiskUpdate } = require('../src/validators/riskValidator');

const runPhase6Tests = async (runTest) => {
  // 1. Validator Tests
  await runTest('RiskValidator accepts valid configuration parameters', async () => {
    const validConfig = {
      enabled: true,
      maxTradeExposure: 500,
      maxDailyExposure: 2000,
      maxPortfolioExposure: 30,
      maxTraderAllocation: 20,
      maxTokenAllocation: 15,
      maxOpenPositions: 8,
      minConfidence: 'HIGH',
      allowedNetworks: ['ethereum', 'base'],
      blockedTokens: ['0x111']
    };
    const res = validateRiskUpdate(validConfig);
    assert.strictEqual(res.isValid, true);
    assert.strictEqual(res.errors.length, 0);
  });

  await runTest('RiskValidator rejects invalid percentages and out-of-range limits', async () => {
    const invalidConfig = {
      maxTradeExposure: -10,
      maxPortfolioExposure: 150, // Invalid: > 100
      maxTraderAllocation: 0,    // Invalid: < 1
      minConfidence: 'INVALID_CONF',
      maxOpenPositions: 99       // Invalid: > 50
    };
    const res = validateRiskUpdate(invalidConfig);
    assert.strictEqual(res.isValid, false);
    assert(res.errors.length >= 4);
  });

  // 2. Risk Engine - Master Switch Disabled
  await runTest('RiskEngine blocks trade when risk configuration is disabled', async () => {
    const riskConfig = {
      enabled: false,
      maxTradeExposure: 1000
    };
    const copyRule = { userId: '507f1f77bcf86cd799439011' };
    const tx = { network: 'ethereum', confidence: 'HIGH', swap: {} };
    const portfolio = { virtualCashBalance: 10000, holdings: [] };

    const result = await riskManagementEngine.evaluateRisk(copyRule, tx, portfolio, 500, riskConfig);
    assert.strictEqual(result.decision, RISK_DECISION.BLOCKED);
    assert(result.reasons.includes(SKIP_REASON.RISK_CONFIG_DISABLED));
  });

  // 3. Risk Engine - Parser Confidence Check
  await runTest('RiskEngine passes trade meeting confidence threshold and blocks below threshold', async () => {
    const riskConfig = {
      enabled: true,
      minConfidence: 'HIGH',
      maxTradeExposure: 1000,
      maxDailyExposure: 5000,
      maxPortfolioExposure: 100,
      maxTraderAllocation: 100,
      maxTokenAllocation: 100,
      maxOpenPositions: 10,
      allowedNetworks: ['ethereum']
    };
    const copyRule = { userId: '507f1f77bcf86cd799439011' };
    const portfolio = { virtualCashBalance: 10000, holdings: [] };

    // Medium confidence should BLOCK when HIGH is required
    const txMedium = { network: 'ethereum', confidence: 'MEDIUM', swap: {} };
    const resMedium = await riskManagementEngine.evaluateRisk(copyRule, txMedium, portfolio, 100, riskConfig);
    assert.strictEqual(resMedium.decision, RISK_DECISION.BLOCKED);
    assert(resMedium.reasons.includes(SKIP_REASON.PARSER_CONFIDENCE_TOO_LOW));

    // High confidence should PASS
    const txHigh = { network: 'ethereum', confidence: 'HIGH', swap: {} };
    const resHigh = await riskManagementEngine.evaluateRisk(copyRule, txHigh, portfolio, 100, riskConfig);
    assert.strictEqual(resHigh.decision, RISK_DECISION.APPROVED);
  });

  // 4. Risk Engine - Network Restriction Check
  await runTest('RiskEngine enforces network allowlist restrictions', async () => {
    const riskConfig = {
      enabled: true,
      minConfidence: 'LOW',
      maxTradeExposure: 1000,
      maxDailyExposure: 5000,
      maxPortfolioExposure: 100,
      maxTraderAllocation: 100,
      maxTokenAllocation: 100,
      maxOpenPositions: 10,
      allowedNetworks: ['ethereum', 'base']
    };
    const copyRule = { userId: '507f1f77bcf86cd799439011' };
    const portfolio = { virtualCashBalance: 10000, holdings: [] };

    // Polygon should be blocked
    const txPolygon = { network: 'polygon', confidence: 'HIGH', swap: {} };
    const resPoly = await riskManagementEngine.evaluateRisk(copyRule, txPolygon, portfolio, 100, riskConfig);
    assert.strictEqual(resPoly.decision, RISK_DECISION.BLOCKED);
    assert(resPoly.reasons.includes(SKIP_REASON.NETWORK_NOT_ALLOWED));

    // Base should be approved
    const txBase = { network: 'base', confidence: 'HIGH', swap: {} };
    const resBase = await riskManagementEngine.evaluateRisk(copyRule, txBase, portfolio, 100, riskConfig);
    assert.strictEqual(resBase.decision, RISK_DECISION.APPROVED);
  });

  // 5. Risk Engine - Token Blocklist & Allowlist
  await runTest('RiskEngine blocks trades involving blocked tokens or unallowed tokens', async () => {
    const blockedAddr = '0xbadtoken00000000000000000000000000000001';
    const riskConfig = {
      enabled: true,
      minConfidence: 'LOW',
      maxTradeExposure: 1000,
      maxDailyExposure: 5000,
      maxPortfolioExposure: 100,
      maxTraderAllocation: 100,
      maxTokenAllocation: 100,
      maxOpenPositions: 10,
      allowedNetworks: ['ethereum'],
      blockedTokens: [blockedAddr]
    };
    const copyRule = { userId: '507f1f77bcf86cd799439011' };
    const portfolio = { virtualCashBalance: 10000, holdings: [] };

    const txBlocked = {
      network: 'ethereum',
      confidence: 'HIGH',
      swap: {
        inputToken: { address: '0xsafe111', symbol: 'SAFE' },
        outputToken: { address: blockedAddr, symbol: 'SCAM' }
      }
    };
    const res = await riskManagementEngine.evaluateRisk(copyRule, txBlocked, portfolio, 100, riskConfig);
    assert.strictEqual(res.decision, RISK_DECISION.BLOCKED);
    assert(res.reasons.includes(SKIP_REASON.TOKEN_BLOCKED));
  });

  // 6. Risk Engine - Maximum Trade Exposure Check
  await runTest('RiskEngine passes trade within maxTradeExposure and blocks when exceeded', async () => {
    const riskConfig = {
      enabled: true,
      minConfidence: 'LOW',
      maxTradeExposure: 800,
      maxDailyExposure: 5000,
      maxPortfolioExposure: 100,
      maxTraderAllocation: 100,
      maxTokenAllocation: 100,
      maxOpenPositions: 10,
      allowedNetworks: ['ethereum']
    };
    const copyRule = { userId: '507f1f77bcf86cd799439011' };
    const tx = { network: 'ethereum', confidence: 'HIGH', swap: {} };
    const portfolio = { virtualCashBalance: 10000, holdings: [] };

    // $500 proposed allocation <= $800 -> PASS
    const passRes = await riskManagementEngine.evaluateRisk(copyRule, tx, portfolio, 500, riskConfig);
    assert.strictEqual(passRes.decision, RISK_DECISION.APPROVED);

    // $900 proposed allocation > $800 -> BLOCK
    const blockRes = await riskManagementEngine.evaluateRisk(copyRule, tx, portfolio, 900, riskConfig);
    assert.strictEqual(blockRes.decision, RISK_DECISION.BLOCKED);
    assert(blockRes.reasons.includes(SKIP_REASON.MAX_TRADE_EXPOSURE_EXCEEDED));
  });

  // 7. Risk Engine - Portfolio Concentration Exposure Check
  await runTest('RiskEngine enforces maxPortfolioExposure percentage ceiling', async () => {
    const riskConfig = {
      enabled: true,
      minConfidence: 'LOW',
      maxTradeExposure: 5000,
      maxDailyExposure: 10000,
      maxPortfolioExposure: 30, // Max 30% of portfolio
      maxTraderAllocation: 100,
      maxTokenAllocation: 100,
      maxOpenPositions: 10,
      allowedNetworks: ['ethereum']
    };
    const copyRule = { userId: '507f1f77bcf86cd799439011' };
    const tx = { network: 'ethereum', confidence: 'HIGH', swap: {} };
    const portfolio = { virtualCashBalance: 1000, holdings: [] }; // $1,000 portfolio, 30% = $300 limit

    // $200 trade (20%) -> PASS
    const passRes = await riskManagementEngine.evaluateRisk(copyRule, tx, portfolio, 200, riskConfig);
    assert.strictEqual(passRes.decision, RISK_DECISION.APPROVED);

    // $350 trade (35%) -> BLOCK
    const blockRes = await riskManagementEngine.evaluateRisk(copyRule, tx, portfolio, 350, riskConfig);
    assert.strictEqual(blockRes.decision, RISK_DECISION.BLOCKED);
    assert(blockRes.reasons.includes(SKIP_REASON.MAX_PORTFOLIO_EXPOSURE_EXCEEDED));
  });

  // 8. Risk Engine - Token Concentration Check
  await runTest('RiskEngine enforces single token exposure limit', async () => {
    const tokenAddr = '0xtoken999999999999999999999999999999999999';
    const riskConfig = {
      enabled: true,
      minConfidence: 'LOW',
      maxTradeExposure: 5000,
      maxDailyExposure: 10000,
      maxPortfolioExposure: 100,
      maxTraderAllocation: 100,
      maxTokenAllocation: 25, // Max 25% in a single token
      maxOpenPositions: 10,
      allowedNetworks: ['ethereum']
    };
    const copyRule = { userId: '507f1f77bcf86cd799439011' };
    const tx = {
      network: 'ethereum',
      confidence: 'HIGH',
      swap: { outputToken: { address: tokenAddr, symbol: 'ASSET' } }
    };

    // Existing portfolio has $8,000 cash + $2,000 already in token ($10,000 total)
    const portfolio = {
      virtualCashBalance: 8000,
      holdings: [{ tokenAddress: tokenAddr, totalCost: 2000, quantity: 50 }]
    };

    // Proposed new purchase of $800 ($2,000 + $800 = $2,800 / $10,000 = 28% > 25%) -> BLOCK
    const blockRes = await riskManagementEngine.evaluateRisk(copyRule, tx, portfolio, 800, riskConfig);
    assert.strictEqual(blockRes.decision, RISK_DECISION.BLOCKED);
    assert(blockRes.reasons.includes(SKIP_REASON.MAX_TOKEN_EXPOSURE_EXCEEDED));
  });

  // 9. Risk Engine - Max Open Positions Limit
  await runTest('RiskEngine blocks trade when maxOpenPositions count is reached for a new token', async () => {
    const riskConfig = {
      enabled: true,
      minConfidence: 'LOW',
      maxTradeExposure: 1000,
      maxDailyExposure: 5000,
      maxPortfolioExposure: 100,
      maxTraderAllocation: 100,
      maxTokenAllocation: 100,
      maxOpenPositions: 2, // Max 2 open positions
      allowedNetworks: ['ethereum']
    };
    const copyRule = { userId: '507f1f77bcf86cd799439011' };
    // Portfolio already has 2 active holdings
    const portfolio = {
      virtualCashBalance: 5000,
      holdings: [
        { tokenAddress: '0xaaa', quantity: 10, totalCost: 100 },
        { tokenAddress: '0xbbb', quantity: 20, totalCost: 200 }
      ]
    };

    // Buying existing token '0xaaa' should PASS
    const txExisting = {
      network: 'ethereum',
      confidence: 'HIGH',
      swap: { outputToken: { address: '0xaaa', symbol: 'A' } }
    };
    const passRes = await riskManagementEngine.evaluateRisk(copyRule, txExisting, portfolio, 100, riskConfig);
    assert.strictEqual(passRes.decision, RISK_DECISION.APPROVED);

    // Buying new 3rd token '0xccc' should BLOCK due to position limits
    const txNew = {
      network: 'ethereum',
      confidence: 'HIGH',
      swap: { outputToken: { address: '0xccc', symbol: 'C' } }
    };
    const blockRes = await riskManagementEngine.evaluateRisk(copyRule, txNew, portfolio, 100, riskConfig);
    assert.strictEqual(blockRes.decision, RISK_DECISION.BLOCKED);
    assert(blockRes.reasons.includes(SKIP_REASON.MAX_POSITIONS_EXCEEDED));
  });

  // 10. Risk Engine - Insufficient Virtual Cash Balance
  await runTest('RiskEngine blocks trade when available paper cash is less than proposed allocation', async () => {
    const riskConfig = {
      enabled: true,
      minConfidence: 'LOW',
      maxTradeExposure: 1000,
      maxDailyExposure: 5000,
      maxPortfolioExposure: 100,
      maxTraderAllocation: 100,
      maxTokenAllocation: 100,
      maxOpenPositions: 10,
      allowedNetworks: ['ethereum']
    };
    const copyRule = { userId: '507f1f77bcf86cd799439011' };
    const tx = { network: 'ethereum', confidence: 'HIGH', swap: {} };
    const portfolio = { virtualCashBalance: 50, holdings: [] }; // Only $50 cash available

    const blockRes = await riskManagementEngine.evaluateRisk(copyRule, tx, portfolio, 200, riskConfig);
    assert.strictEqual(blockRes.decision, RISK_DECISION.BLOCKED);
    assert(blockRes.reasons.includes(SKIP_REASON.INSUFFICIENT_PAPER_BALANCE));
  });

  // 11. Multi-check Simultaneous Failure Reporting
  await runTest('RiskEngine reports multiple simultaneous check failures in reasons array', async () => {
    const blockedToken = '0xscam';
    const riskConfig = {
      enabled: true,
      minConfidence: 'HIGH',
      maxTradeExposure: 200,
      maxDailyExposure: 5000,
      maxPortfolioExposure: 100,
      maxTraderAllocation: 100,
      maxTokenAllocation: 100,
      maxOpenPositions: 10,
      allowedNetworks: ['ethereum'],
      blockedTokens: [blockedToken]
    };
    const copyRule = { userId: '507f1f77bcf86cd799439011' };
    // Violates: 1. Low confidence, 2. Blocked token, 3. Trade exposure ($500 > $200), 4. Insufficient cash ($100 < $500)
    const tx = {
      network: 'ethereum',
      confidence: 'LOW',
      swap: { outputToken: { address: blockedToken, symbol: 'SCAM' } }
    };
    const portfolio = { virtualCashBalance: 100, holdings: [] };

    const result = await riskManagementEngine.evaluateRisk(copyRule, tx, portfolio, 500, riskConfig);
    assert.strictEqual(result.decision, RISK_DECISION.BLOCKED);
    assert(result.reasons.includes(SKIP_REASON.PARSER_CONFIDENCE_TOO_LOW));
    assert(result.reasons.includes(SKIP_REASON.TOKEN_BLOCKED));
    assert(result.reasons.includes(SKIP_REASON.MAX_TRADE_EXPOSURE_EXCEEDED));
    assert(result.reasons.includes(SKIP_REASON.INSUFFICIENT_PAPER_BALANCE));
    assert(result.checks.length >= 7);
  });

  // 12. Risk Evaluation Side-Effect Free Guarantee
  await runTest('RiskEngine execution is strictly side-effect free on portfolio balance', async () => {
    const riskConfig = { enabled: true, maxTradeExposure: 1000, allowedNetworks: ['ethereum'] };
    const copyRule = { userId: '507f1f77bcf86cd799439011' };
    const tx = { network: 'ethereum', confidence: 'HIGH', swap: {} };
    const portfolio = { virtualCashBalance: 10000, holdings: [] };

    const balanceBefore = portfolio.virtualCashBalance;
    await riskManagementEngine.evaluateRisk(copyRule, tx, portfolio, 500, riskConfig);
    assert.strictEqual(portfolio.virtualCashBalance, balanceBefore, 'Portfolio balance must remain unchanged');
    assert.strictEqual(portfolio.holdings.length, 0, 'Portfolio holdings must remain unchanged');
  });
};

module.exports = {
  runPhase6Tests
};
