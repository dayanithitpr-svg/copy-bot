const assert = require('assert');
const executionNetworkRegistry = require('../src/blockchain/execution/executionNetworkRegistry');
const testnetTokenRegistry = require('../src/blockchain/execution/testnetTokenRegistry');
const { EvmTestnetAdapter, toBaseUnitString } = require('../src/blockchain/execution/EvmTestnetAdapter');
const MockExecutionAdapter = require('../src/blockchain/execution/MockExecutionAdapter');
const executionSafetyService = require('../src/blockchain/execution/executionSafetyService');
const testnetExecutionService = require('../src/blockchain/execution/testnetExecutionService');
const { validateExecutionConfigUpdate } = require('../src/validators/executionValidator');
const { EXECUTION_STATUS } = require('../src/models/ExecutionRecord');

const runPhase8Tests = async (runTest) => {
  console.log('\n--- PHASE 8 TESTNET EXECUTION & SAFETY GATE TESTS ---');

  // 1. Network Registry - Strict Testnet Allowlist & Mainnet Block
  await runTest('Phase 8: Network Registry - Testnet allowlist verification', async () => {
    assert.strictEqual(executionNetworkRegistry.isExecutionAllowed('sepolia'), true);
    assert.strictEqual(executionNetworkRegistry.isExecutionAllowed('base-sepolia'), true);
    assert.strictEqual(executionNetworkRegistry.isExecutionAllowed('polygon-amoy'), true);
    assert.strictEqual(executionNetworkRegistry.isExecutionAllowed('SEPOLIA'), true); // Case insensitive
  });

  await runTest('Phase 8: Network Registry - Strict Mainnet Hard-Block Guard', async () => {
    assert.strictEqual(executionNetworkRegistry.isExecutionAllowed('ethereum'), false);
    assert.strictEqual(executionNetworkRegistry.isExecutionAllowed('base'), false);
    assert.strictEqual(executionNetworkRegistry.isExecutionAllowed('polygon'), false);
    assert.strictEqual(executionNetworkRegistry.isExecutionAllowed('solana'), false);
    assert.strictEqual(executionNetworkRegistry.isExecutionAllowed('mainnet'), false);
    assert.strictEqual(executionNetworkRegistry.isExecutionAllowed('arbitrum'), false);
  });

  // 2. Token Registry Verification
  await runTest('Phase 8: Testnet Token Registry - Token resolution & validation', async () => {
    const sepoliaWeth = testnetTokenRegistry.getTokenBySymbol('sepolia', 'WETH');
    assert(sepoliaWeth !== null);
    assert.strictEqual(sepoliaWeth.symbol, 'WETH');
    assert.strictEqual(sepoliaWeth.decimals, 18);

    const sepoliaUsdc = testnetTokenRegistry.getTokenBySymbol('sepolia', 'USDC');
    assert(sepoliaUsdc !== null);
    assert.strictEqual(sepoliaUsdc.decimals, 6);

    const unknownToken = testnetTokenRegistry.getTokenBySymbol('sepolia', 'UNKNOWN_TOKEN_XYZ');
    assert.strictEqual(unknownToken, null);

    const mainnetToken = testnetTokenRegistry.getTokenBySymbol('ethereum', 'USDC');
    assert.strictEqual(mainnetToken, null); // Ethereum mainnet has no testnet tokens
  });

  // 3. Exact Base Unit String Precision Math
  await runTest('Phase 8: Base unit conversion precision without floating point inaccuracies', async () => {
    assert.strictEqual(toBaseUnitString('1', 18), '1000000000000000000');
    assert.strictEqual(toBaseUnitString('0.5', 18), '500000000000000000');
    assert.strictEqual(toBaseUnitString('100.25', 6), '100250000');
    assert.strictEqual(toBaseUnitString('0.000001', 6), '1');
    assert.strictEqual(toBaseUnitString('0', 18), '0');
  });

  // 4. Mock Execution Adapter Lifecycle
  await runTest('Phase 8: MockExecutionAdapter swap execution and receipt polling', async () => {
    const adapter = new MockExecutionAdapter('sepolia');
    assert(adapter.getExecutionWalletAddress().startsWith('0x'));

    const gas = await adapter.estimateGas({});
    assert.strictEqual(gas.gasLimit, 150000);
    assert.strictEqual(gas.gasPriceGwei, 25);

    const swapResult = await adapter.executeSwap({
      amountInBaseUnits: '100000000',
      minimumAmountOutBaseUnits: '99000000'
    });

    assert(swapResult.transactionHash.startsWith('0x'));
    assert.strictEqual(swapResult.amountInBaseUnits, '100000000');

    const receipt = await adapter.waitForReceipt(swapResult.transactionHash);
    assert.strictEqual(receipt.confirmed, true);
    assert.strictEqual(receipt.status, 1);
    assert.strictEqual(receipt.gasUsed, 124500);
  });

  await runTest('Phase 8: MockExecutionAdapter simulated failure handling', async () => {
    const failAdapter = new MockExecutionAdapter('sepolia', { shouldFail: true, failureError: 'Slippage limit exceeded' });
    
    let caught = false;
    try {
      await failAdapter.executeSwap({});
    } catch (e) {
      caught = true;
      assert.strictEqual(e.message, 'Slippage limit exceeded');
    }
    assert.strictEqual(caught, true);
  });

  // 5. Execution Safety Gate - Mode & Kill Switch Checks
  await runTest('Phase 8: Safety Gate - Rejects when user mode is PAPER', async () => {
    const check = await executionSafetyService.validateExecution({
      userId: 'user-123',
      copyRule: { id: 'rule-1' },
      parsedTx: { network: 'sepolia' },
      proposedAmount: 50,
      executionNetwork: 'sepolia',
      executionConfigOverride: {
        mode: 'PAPER',
        enabled: true,
        _bypassKillSwitch: true,
        _mockPrivateKey: '0x123'
      }
    });

    assert.strictEqual(check.allowed, false);
    assert.strictEqual(check.reason, 'TESTNET_MODE_NOT_ENABLED');
  });

  await runTest('Phase 8: Safety Gate - Rejects when testnet is disabled for user', async () => {
    const check = await executionSafetyService.validateExecution({
      userId: 'user-123',
      copyRule: { id: 'rule-1' },
      parsedTx: { network: 'sepolia' },
      proposedAmount: 50,
      executionNetwork: 'sepolia',
      executionConfigOverride: {
        mode: 'TESTNET',
        enabled: false,
        _bypassKillSwitch: true,
        _mockPrivateKey: '0x123'
      }
    });

    assert.strictEqual(check.allowed, false);
    assert.strictEqual(check.reason, 'TESTNET_MODE_NOT_ENABLED');
  });

  // 6. Execution Safety Gate - Mainnet Rejection Trap
  await runTest('Phase 8: Safety Gate - Hard-blocks Ethereum/Base/Polygon Mainnet transactions', async () => {
    const check = await executionSafetyService.validateExecution({
      userId: 'user-123',
      copyRule: { id: 'rule-1' },
      parsedTx: { network: 'ethereum' },
      proposedAmount: 50,
      executionNetwork: 'ethereum',
      executionConfigOverride: {
        mode: 'TESTNET',
        enabled: true,
        allowedNetworks: ['ethereum', 'sepolia'],
        _bypassKillSwitch: true,
        _mockPrivateKey: '0x123'
      }
    });

    assert.strictEqual(check.allowed, false);
    assert.strictEqual(check.reason, 'UNAPPROVED_OR_MAINNET_NETWORK');
  });

  // 7. Execution Safety Gate - Unregistered Token Check
  await runTest('Phase 8: Safety Gate - Rejects unregistered tokens', async () => {
    const check = await executionSafetyService.validateExecution({
      userId: 'user-123',
      copyRule: { id: 'rule-1' },
      parsedTx: {
        network: 'sepolia',
        swap: {
          inputToken: { symbol: 'FAKE_SCAM_TOKEN', address: '0x999999999' },
          outputToken: { symbol: 'WETH' }
        }
      },
      proposedAmount: 50,
      executionNetwork: 'sepolia',
      executionConfigOverride: {
        mode: 'TESTNET',
        enabled: true,
        allowedNetworks: ['sepolia'],
        _bypassKillSwitch: true,
        _mockPrivateKey: '0x123'
      }
    });

    assert.strictEqual(check.allowed, false);
    assert.strictEqual(check.reason, 'UNREGISTERED_TESTNET_TOKEN');
  });

  // 8. Execution Safety Gate - Max Trade Amount & Daily Budget Check
  await runTest('Phase 8: Safety Gate - Enforces single trade max ceiling', async () => {
    const check = await executionSafetyService.validateExecution({
      userId: 'user-123',
      copyRule: { id: 'rule-1' },
      parsedTx: {
        network: 'sepolia',
        swap: {
          inputToken: { symbol: 'USDC' },
          outputToken: { symbol: 'WETH' }
        }
      },
      proposedAmount: 250, // Exceeds max 100
      executionNetwork: 'sepolia',
      executionConfigOverride: {
        mode: 'TESTNET',
        enabled: true,
        maxExecutionAmount: 100,
        allowedNetworks: ['sepolia'],
        _bypassKillSwitch: true,
        _mockPrivateKey: '0x123'
      }
    });

    assert.strictEqual(check.allowed, false);
    assert.strictEqual(check.reason, 'MAX_EXECUTION_AMOUNT_EXCEEDED');
  });

  await runTest('Phase 8: Safety Gate - Enforces 24h daily budget ceiling', async () => {
    const check = await executionSafetyService.validateExecution({
      userId: 'user-123',
      copyRule: { id: 'rule-1' },
      parsedTx: {
        network: 'sepolia',
        swap: {
          inputToken: { symbol: 'USDC' },
          outputToken: { symbol: 'WETH' }
        }
      },
      proposedAmount: 80,
      executionNetwork: 'sepolia',
      executionConfigOverride: {
        mode: 'TESTNET',
        enabled: true,
        maxExecutionAmount: 100,
        maxDailyExecutionAmount: 500,
        _mockDailySpent: 450, // 450 + 80 = 530 > 500
        allowedNetworks: ['sepolia'],
        _bypassKillSwitch: true,
        _mockPrivateKey: '0x123'
      }
    });

    assert.strictEqual(check.allowed, false);
    assert.strictEqual(check.reason, 'MAX_DAILY_EXECUTION_BUDGET_EXCEEDED');
  });

  // 9. Execution Safety Gate - Complete Valid Approval
  await runTest('Phase 8: Safety Gate - Approves compliant trade with all 10 checks passing', async () => {
    const check = await executionSafetyService.validateExecution({
      userId: 'user-123',
      copyRule: { id: 'rule-1' },
      parsedTx: {
        network: 'sepolia',
        swap: {
          inputToken: { symbol: 'USDC' },
          outputToken: { symbol: 'WETH' }
        }
      },
      proposedAmount: 50,
      executionNetwork: 'sepolia',
      executionConfigOverride: {
        mode: 'TESTNET',
        enabled: true,
        maxExecutionAmount: 100,
        maxDailyExecutionAmount: 500,
        maxSlippageBps: 100,
        _mockDailySpent: 50,
        allowedNetworks: ['sepolia'],
        _bypassKillSwitch: true,
        _mockPrivateKey: '0x123'
      }
    });

    assert.strictEqual(check.allowed, true);
    assert.strictEqual(check.reason, null);
    assert.strictEqual(check.reasons.length, 0);
    assert(check.checkDetails.every((c) => c.status === 'PASS'));
  });

  // 10. TestnetExecutionService - Full Lifecycle with Mock Adapter
  await runTest('Phase 8: TestnetExecutionService - Executes trade, confirms receipt, and tracks status', async () => {
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
    assert.strictEqual(result.receipt.status, 1);
  });

  // 11. Configuration Validator Verification
  await runTest('Phase 8: Validator - Validates execution config updates', async () => {
    const valid = validateExecutionConfigUpdate({
      mode: 'TESTNET',
      enabled: true,
      allowedNetworks: ['sepolia', 'base-sepolia'],
      maxExecutionAmount: 150,
      maxDailyExecutionAmount: 800,
      maxGasCostGwei: 60,
      maxSlippageBps: 150
    });
    assert.strictEqual(valid.isValid, true);

    const invalidMode = validateExecutionConfigUpdate({ mode: 'INVALID_MODE' });
    assert.strictEqual(invalidMode.isValid, false);

    const invalidNetwork = validateExecutionConfigUpdate({ allowedNetworks: ['ethereum', 'sepolia'] });
    assert.strictEqual(invalidNetwork.isValid, false);
    assert(invalidNetwork.errors[0].includes('not an approved testnet'));

    const invalidSlippage = validateExecutionConfigUpdate({ maxSlippageBps: 1000 }); // > 500 bps (5%)
    assert.strictEqual(invalidSlippage.isValid, false);
  });
};

module.exports = {
  runPhase8Tests
};
