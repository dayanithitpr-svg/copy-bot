const assert = require('assert');
const http = require('http');
const PasswordSecurity = require('../src/security/passwordSecurity');
const TokenSecurity = require('../src/security/tokenSecurity');
const mockBlockchainService = require('../src/blockchain/mockBlockchainService');
const { validateWalletAddress, normalizeWalletAddress, isValidNetwork, SUPPORTED_NETWORKS } = require('../src/networks');
const EvmAdapter = require('../src/blockchain/adapters/EvmAdapter');
const SolanaAdapter = require('../src/blockchain/adapters/SolanaAdapter');
const MockAdapter = require('../src/blockchain/adapters/MockAdapter');
const blockchainService = require('../src/blockchain/blockchainService');
const monitoringScheduler = require('../src/services/monitoringScheduler');
const { runPhase4Tests } = require('./phase4-tests');
const { runPhase5Tests } = require('./phase5-tests');
const { runPhase6Tests } = require('./phase6-tests');
const { runPhase7Tests } = require('./phase7-tests');
const { runPhase8Tests } = require('./phase8-tests');
const { runPhase9Tests } = require('./phase9-tests');
const { runPhase10Tests } = require('./phase10-tests');
const app = require('../src/app');

let passedTests = 0;
let totalTests = 0;

const runTest = async (name, testFn) => {
  totalTests++;
  try {
    await testFn();
    console.log(`  ✓ [TEST ${totalTests}] ${name} ... PASSED`);
    passedTests++;
  } catch (err) {
    console.log(`  ✗ [TEST ${totalTests}] ${name} ... FAILED`);
    console.error(`     Error: ${err.message}`);
  }
};

const makeRequest = (server, path, options = {}) => {
  return new Promise((resolve, reject) => {
    const port = server.address().port;
    const req = http.request(
      {
        host: '127.0.0.1',
        port,
        path,
        method: options.method || 'GET',
        headers: {
          Connection: 'close',
          ...(options.headers || {})
        },
        agent: false
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(data);
          } catch (e) {
            parsed = data;
          }
          resolve({ statusCode: res.statusCode, headers: res.headers, body: parsed });
        });
      }
    );

    req.on('error', reject);
    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
};

const main = async () => {
  console.log('\n====================================================');
  console.log('  RUNNING COMPLETE VERIFICATION SUITE (PHASES 1 - 7)');
  console.log('====================================================\n');

  // --- PHASE 1 TESTS ---

  // 1. Password Security Test
  await runTest('Password Hashing & Verification (Argon2id)', async () => {
    const password = 'StrongPassword!123';
    const hash = await PasswordSecurity.hash(password);
    assert(typeof hash === 'string', 'Hash should be a string');
    assert(PasswordSecurity.isArgon2(hash), 'Hash should be Argon2 format');
    
    const isValid = await PasswordSecurity.verify(password, hash);
    assert.strictEqual(isValid, true, 'Verification should return true for correct password');

    const isInvalid = await PasswordSecurity.verify('WrongPassword', hash);
    assert.strictEqual(isInvalid, false, 'Verification should return false for incorrect password');
  });

  // 2. Token Security Test
  await runTest('JWT Token Generation & Verification', async () => {
    const payload = { userId: '507f1f77bcf86cd799439011', email: 'trader@example.com', role: 'USER' };
    const token = TokenSecurity.generateAccessToken(payload);
    assert(typeof token === 'string', 'Token should be a string');

    const decoded = TokenSecurity.verifyAccessToken(token);
    assert.strictEqual(decoded.sub, payload.userId);
    assert.strictEqual(decoded.email, payload.email);
    assert.strictEqual(decoded.role, 'USER');

    const rawRefresh = TokenSecurity.generateRefreshToken();
    const hash = TokenSecurity.hashToken(rawRefresh);
    assert.strictEqual(typeof hash, 'string');
    assert.strictEqual(hash.length, 64);
  });

  // --- PHASE 2 NETWORK & VALIDATION TESTS ---

  // 3. Supported Networks Registry
  await runTest('Supported Networks Registry contains ETH, Base, Polygon, Solana', async () => {
    assert(SUPPORTED_NETWORKS.includes('ethereum'));
    assert(SUPPORTED_NETWORKS.includes('base'));
    assert(SUPPORTED_NETWORKS.includes('polygon'));
    assert(SUPPORTED_NETWORKS.includes('solana'));
    assert.strictEqual(isValidNetwork('ethereum'), true);
    assert.strictEqual(isValidNetwork('bitcoin'), false);
  });

  // 4. EVM Address Validation (Ethereum, Base, Polygon)
  await runTest('EVM Address Validation for Ethereum, Base, Polygon', async () => {
    const validEth = '0x71C7656EC7ab88b098defB751B7401B5f6d8976F';
    const invalidEth = '0x71C7656EC7ab88b098defB751B7401B5f6d8976'; // 39 chars

    assert.strictEqual(validateWalletAddress('ethereum', validEth).isValid, true);
    assert.strictEqual(validateWalletAddress('base', validEth).isValid, true);
    assert.strictEqual(validateWalletAddress('polygon', validEth).isValid, true);
    assert.strictEqual(validateWalletAddress('ethereum', invalidEth).isValid, false);
  });

  // 5. Solana Base58 Address Validation
  await runTest('Solana Base58 Address Validation & Rejection of Invalid Chars', async () => {
    const validSolana = '6vjWc64CcmWjD7D4dF661kQ2V8pG5xN7gM3s4L5k8h1M';
    const invalidSolana = '6vjW0OIl'; // Contains illegal Base58 chars 0, O, I, l

    assert.strictEqual(validateWalletAddress('solana', validSolana).isValid, true);
    assert.strictEqual(validateWalletAddress('solana', invalidSolana).isValid, false);
  });

  // 6. Address Normalization Logic
  await runTest('Address Normalization (Lowercases EVM, Preserves Solana Case)', async () => {
    const evmUpper = '0x71C7656EC7ab88b098defB751B7401B5f6d8976F';
    const normalizedEvm = normalizeWalletAddress('ethereum', evmUpper);
    assert.strictEqual(normalizedEvm, '0x71c7656ec7ab88b098defb751b7401b5f6d8976f');

    const solanaCase = '6vjWc64CcmWjD7D4dF661kQ2V8pG5xN7gM3s4L5k8h1M';
    const normalizedSol = normalizeWalletAddress('solana', solanaCase);
    assert.strictEqual(normalizedSol, solanaCase);
  });

  // --- PHASE 3 READ-ONLY MONITORING TESTS ---

  // 7. EVM Adapter Construction & Interface
  await runTest('EvmAdapter instantiation and network bindings', async () => {
    const ethAdapter = new EvmAdapter('ethereum');
    const baseAdapter = new EvmAdapter('base');
    const polyAdapter = new EvmAdapter('polygon');

    assert.strictEqual(ethAdapter.networkId, 'ethereum');
    assert.strictEqual(baseAdapter.networkId, 'base');
    assert.strictEqual(polyAdapter.networkId, 'polygon');
    assert.strictEqual(typeof ethAdapter.getLatestBlockNumber, 'function');
    assert.strictEqual(typeof ethAdapter.scanWalletActivity, 'function');
  });

  // 8. Solana Adapter Construction & Interface
  await runTest('SolanaAdapter instantiation and method signatures', async () => {
    const solAdapter = new SolanaAdapter();
    assert.strictEqual(solAdapter.networkId, 'solana');
    assert.strictEqual(typeof solAdapter.getLatestSlot, 'function');
    assert.strictEqual(typeof solAdapter.getSignaturesForAddress, 'function');
    assert.strictEqual(typeof solAdapter.scanWalletActivity, 'function');
  });

  // 9. MockAdapter Multi-Chain Deterministic Activity Simulation
  await runTest('MockAdapter deterministic activity generation', async () => {
    const mock = new MockAdapter('ethereum');
    const block = await mock.getLatestBlockNumber();
    assert(typeof block === 'number');

    const activities = await mock.scanWalletActivity(
      'http://mock-rpc',
      '0x71c7656ec7ab88b098defb751b7401b5f6d8976f',
      block,
      block
    );

    assert(Array.isArray(activities));
    assert.strictEqual(activities.length, 1);
    assert.strictEqual(activities[0].status, 'CONFIRMED');
    assert.strictEqual(activities[0].activityType, 'TRANSACTION');
    assert(activities[0].transactionHash.startsWith('0xmock_tx'));
  });

  // 10. BlockchainService Registry & Custom Adapter Swapping
  await runTest('BlockchainService registry & adapter dispatching', async () => {
    assert(blockchainService.getAdapter('ethereum') instanceof EvmAdapter);
    assert(blockchainService.getAdapter('base') instanceof EvmAdapter);
    assert(blockchainService.getAdapter('polygon') instanceof EvmAdapter);
    assert(blockchainService.getAdapter('solana') instanceof SolanaAdapter);

    // Swap in mock adapter for testing
    const testMock = new MockAdapter('ethereum');
    blockchainService.setAdapter('ethereum', testMock);
    assert.strictEqual(blockchainService.getAdapter('ethereum'), testMock);

    // Restore real adapter
    blockchainService.setAdapter('ethereum', new EvmAdapter('ethereum'));
  });

  // 11. Monitoring Scheduler Lifecycle & Overlap Protection
  await runTest('MonitoringScheduler lifecycle & overlap prevention guard', async () => {
    const status = monitoringScheduler.getStatus();
    assert.strictEqual(typeof status.enabled, 'boolean');
    assert.strictEqual(typeof status.isRunning, 'boolean');
    assert.strictEqual(typeof status.isCycleRunning, 'boolean');

    // Simulate overlap guard
    monitoringScheduler.isCycleRunning = true;
    await monitoringScheduler.executeCycle();
    monitoringScheduler.isCycleRunning = false;
  });

  // --- PHASE 4 TRANSACTION DETECTION & PARSING TESTS ---
  await runPhase4Tests(runTest);

  // --- PHASE 5 PAPER TRADING & COPY RULES TESTS ---
  await runPhase5Tests(runTest);

  // --- PHASE 6 RISK MANAGEMENT TESTS ---
  await runPhase6Tests(runTest);

  // --- PHASE 7 COPY TRADING ENGINE TESTS ---
  await runPhase7Tests(runTest);

  // --- PHASE 8 TESTNET EXECUTION TESTS ---
  await runPhase8Tests(runTest);

  // --- PHASE 9 PRODUCTION SECURITY & READINESS TESTS ---
  await runPhase9Tests(runTest);

  // --- PHASE 10 FINAL VALIDATION & CONTROLLED TESTNET OPERATIONS TESTS ---
  await runPhase10Tests(runTest);

  // --- HTTP SERVER INTEGRATION & IDOR TESTS ---
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

  try {
    // Health Check Endpoint
    await runTest('API Health Check Endpoint reports operational status (GET /api/v1/health)', async () => {
      const response = await makeRequest(server, '/api/v1/health');
      assert.strictEqual(response.statusCode, 200);
      assert.strictEqual(response.body.success, true);
      assert(response.body.data.services.blockchain !== undefined);
      assert(response.body.data.monitoring !== undefined);
    });

    // Phase 9: Liveness Probe
    await runTest('Phase 9: API Liveness Probe returns 200 UP (GET /api/v1/health/liveness)', async () => {
      const response = await makeRequest(server, '/api/v1/health/liveness');
      assert.strictEqual(response.statusCode, 200);
      assert.strictEqual(response.body.status, 'UP');
      assert.strictEqual(response.body.alive, true);
    });

    // Phase 9: Readiness Probe
    await runTest('Phase 9: API Readiness Probe returns status and safety overview (GET /api/v1/health/readiness)', async () => {
      const response = await makeRequest(server, '/api/v1/health/readiness');
      assert(response.statusCode === 200 || response.statusCode === 503);
      assert(response.body.components.productionSafety !== undefined);
      assert.strictEqual(response.body.components.productionSafety.mainnetBlocked, true);
    });

    // Phase 9: System Status Endpoint
    await runTest('Phase 9: System Status Endpoint reports safe operational status (GET /api/v1/system/status)', async () => {
      const response = await makeRequest(server, '/api/v1/system/status');
      assert.strictEqual(response.statusCode, 200);
      assert.strictEqual(response.body.success, true);
      assert.strictEqual(response.body.data.mainnetStatus, 'BLOCKED');
      assert.strictEqual(response.body.data.mainnetEnabled, false);
      assert(Array.isArray(response.body.data.supportedExecutionModes));
    });

    // Phase 9: System Metrics Endpoint
    await runTest('Phase 9: System Metrics Endpoint returns performance snapshot (GET /api/v1/system/metrics)', async () => {
      const response = await makeRequest(server, '/api/v1/system/metrics');
      assert.strictEqual(response.statusCode, 200);
      assert.strictEqual(response.body.success, true);
      assert(response.body.data.counters !== undefined);
      assert(response.body.data.performance !== undefined);
    });

    // Phase 9: Unauthenticated Audit Logs Endpoint Rejection
    await runTest('Phase 9: Unauthenticated Request Rejection for Audit Logs (GET /api/v1/audit/logs)', async () => {
      const response = await makeRequest(server, '/api/v1/audit/logs');
      assert.strictEqual(response.statusCode, 401);
      assert.strictEqual(response.body.success, false);
      assert.strictEqual(response.body.error.code, 'AUTHENTICATION_FAILED');
    });

    // Phase 9: Unauthenticated Kill Switch Control Rejection
    await runTest('Phase 9: Unauthenticated Request Rejection for Kill Switch Control (POST /api/v1/system/kill-switch)', async () => {
      const response = await makeRequest(server, '/api/v1/system/kill-switch', {
        method: 'POST',
        body: { active: true }
      });
      assert.strictEqual(response.statusCode, 401);
      assert.strictEqual(response.body.success, false);
      assert.strictEqual(response.body.error.code, 'AUTHENTICATION_FAILED');
    });

    // Phase 9: Unauthenticated Recovery Trigger Rejection
    await runTest('Phase 9: Unauthenticated Request Rejection for Recovery Trigger (POST /api/v1/system/recover)', async () => {
      const response = await makeRequest(server, '/api/v1/system/recover', {
        method: 'POST'
      });
      assert.strictEqual(response.statusCode, 401);
      assert.strictEqual(response.body.success, false);
      assert.strictEqual(response.body.error.code, 'AUTHENTICATION_FAILED');
    });

    // Unauthenticated Activity Request Rejection
    await runTest('Unauthenticated Request Rejection for Trader Activity (GET /api/v1/traders/507f1f77bcf86cd799439011/activity)', async () => {
      const response = await makeRequest(server, '/api/v1/traders/507f1f77bcf86cd799439011/activity');
      assert.strictEqual(response.statusCode, 401);
      assert.strictEqual(response.body.success, false);
      assert.strictEqual(response.body.error.code, 'AUTHENTICATION_FAILED');
    });

    // Phase 4: Unauthenticated Transactions Endpoint Rejection
    await runTest('Unauthenticated Request Rejection for Trader Transactions (GET /api/v1/traders/507f1f77bcf86cd799439011/transactions)', async () => {
      const response = await makeRequest(server, '/api/v1/traders/507f1f77bcf86cd799439011/transactions');
      assert.strictEqual(response.statusCode, 401);
      assert.strictEqual(response.body.success, false);
      assert.strictEqual(response.body.error.code, 'AUTHENTICATION_FAILED');
    });

    // Phase 4: Unauthenticated Swaps Endpoint Rejection
    await runTest('Unauthenticated Request Rejection for Trader Swaps (GET /api/v1/traders/507f1f77bcf86cd799439011/swaps)', async () => {
      const response = await makeRequest(server, '/api/v1/traders/507f1f77bcf86cd799439011/swaps');
      assert.strictEqual(response.statusCode, 401);
      assert.strictEqual(response.body.success, false);
      assert.strictEqual(response.body.error.code, 'AUTHENTICATION_FAILED');
    });

    // Phase 4: Unauthenticated Recent Transactions Feed Rejection
    await runTest('Unauthenticated Request Rejection for Recent Transactions (GET /api/v1/transactions/recent)', async () => {
      const response = await makeRequest(server, '/api/v1/transactions/recent');
      assert.strictEqual(response.statusCode, 401);
      assert.strictEqual(response.body.success, false);
      assert.strictEqual(response.body.error.code, 'AUTHENTICATION_FAILED');
    });

    // Phase 4: Unauthenticated Single Transaction Lookup Rejection
    await runTest('Unauthenticated Request Rejection for Single Transaction (GET /api/v1/transactions/507f1f77bcf86cd799439011)', async () => {
      const response = await makeRequest(server, '/api/v1/transactions/507f1f77bcf86cd799439011');
      assert.strictEqual(response.statusCode, 401);
      assert.strictEqual(response.body.success, false);
      assert.strictEqual(response.body.error.code, 'AUTHENTICATION_FAILED');
    });

    // Phase 5: Unauthenticated Copy Rules Endpoint Rejection
    await runTest('Unauthenticated Request Rejection for Copy Rules (GET /api/v1/copy-rules)', async () => {
      const response = await makeRequest(server, '/api/v1/copy-rules');
      assert.strictEqual(response.statusCode, 401);
      assert.strictEqual(response.body.success, false);
      assert.strictEqual(response.body.error.code, 'AUTHENTICATION_FAILED');
    });

    // Phase 5: Unauthenticated Paper Portfolio Endpoint Rejection
    await runTest('Unauthenticated Request Rejection for Paper Portfolio (GET /api/v1/paper/portfolio)', async () => {
      const response = await makeRequest(server, '/api/v1/paper/portfolio');
      assert.strictEqual(response.statusCode, 401);
      assert.strictEqual(response.body.success, false);
      assert.strictEqual(response.body.error.code, 'AUTHENTICATION_FAILED');
    });

    // Phase 5: Unauthenticated Paper Trades Endpoint Rejection
    await runTest('Unauthenticated Request Rejection for Paper Trades (GET /api/v1/paper/trades)', async () => {
      const response = await makeRequest(server, '/api/v1/paper/trades');
      assert.strictEqual(response.statusCode, 401);
      assert.strictEqual(response.body.success, false);
      assert.strictEqual(response.body.error.code, 'AUTHENTICATION_FAILED');
    });

    // Phase 5: Unauthenticated Paper Summary Endpoint Rejection
    await runTest('Unauthenticated Request Rejection for Paper Summary (GET /api/v1/paper/summary)', async () => {
      const response = await makeRequest(server, '/api/v1/paper/summary');
      assert.strictEqual(response.statusCode, 401);
      assert.strictEqual(response.body.success, false);
      assert.strictEqual(response.body.error.code, 'AUTHENTICATION_FAILED');
    });

    // Phase 6: Unauthenticated Risk Configuration Endpoint Rejection
    await runTest('Unauthenticated Request Rejection for Risk Config (GET /api/v1/risk)', async () => {
      const response = await makeRequest(server, '/api/v1/risk');
      assert.strictEqual(response.statusCode, 401);
      assert.strictEqual(response.body.success, false);
      assert.strictEqual(response.body.error.code, 'AUTHENTICATION_FAILED');
    });

    // Phase 6: Unauthenticated Risk Evaluation Endpoint Rejection
    await runTest('Unauthenticated Request Rejection for Risk Evaluation (POST /api/v1/risk/evaluate)', async () => {
      const response = await makeRequest(server, '/api/v1/risk/evaluate', { method: 'POST', body: { proposedAllocation: 100 } });
      assert.strictEqual(response.statusCode, 401);
      assert.strictEqual(response.body.success, false);
      assert.strictEqual(response.body.error.code, 'AUTHENTICATION_FAILED');
    });

    // Phase 6: Unauthenticated Risk History Endpoint Rejection
    await runTest('Unauthenticated Request Rejection for Risk History (GET /api/v1/risk/history)', async () => {
      const response = await makeRequest(server, '/api/v1/risk/history');
      assert.strictEqual(response.statusCode, 401);
      assert.strictEqual(response.body.success, false);
      assert.strictEqual(response.body.error.code, 'AUTHENTICATION_FAILED');
    });

    // Phase 7: Unauthenticated Copy Trading Status Endpoint Rejection
    await runTest('Unauthenticated Request Rejection for Copy Trading Status (GET /api/v1/copy-trading/status)', async () => {
      const response = await makeRequest(server, '/api/v1/copy-trading/status');
      assert.strictEqual(response.statusCode, 401);
      assert.strictEqual(response.body.success, false);
      assert.strictEqual(response.body.error.code, 'AUTHENTICATION_FAILED');
    });

    // Phase 7: Unauthenticated Copy Trading Summary Endpoint Rejection
    await runTest('Unauthenticated Request Rejection for Copy Trading Summary (GET /api/v1/copy-trading/summary)', async () => {
      const response = await makeRequest(server, '/api/v1/copy-trading/summary');
      assert.strictEqual(response.statusCode, 401);
      assert.strictEqual(response.body.success, false);
      assert.strictEqual(response.body.error.code, 'AUTHENTICATION_FAILED');
    });

    // Phase 7: Unauthenticated Copy Trading Decisions Endpoint Rejection
    await runTest('Unauthenticated Request Rejection for Copy Trading Decisions (GET /api/v1/copy-trading/decisions)', async () => {
      const response = await makeRequest(server, '/api/v1/copy-trading/decisions');
      assert.strictEqual(response.statusCode, 401);
      assert.strictEqual(response.body.success, false);
      assert.strictEqual(response.body.error.code, 'AUTHENTICATION_FAILED');
    });

    // Phase 7: Unauthenticated Copy Trading Manual Process Endpoint Rejection
    await runTest('Unauthenticated Request Rejection for Copy Trading Process (POST /api/v1/copy-trading/process/507f1f77bcf86cd799439011)', async () => {
      const response = await makeRequest(server, '/api/v1/copy-trading/process/507f1f77bcf86cd799439011', { method: 'POST' });
      assert.strictEqual(response.statusCode, 401);
      assert.strictEqual(response.body.success, false);
      assert.strictEqual(response.body.error.code, 'AUTHENTICATION_FAILED');
    });

    // Phase 8: Unauthenticated Execution Config Endpoint Rejection
    await runTest('Unauthenticated Request Rejection for Execution Config (GET /api/v1/execution/config)', async () => {
      const response = await makeRequest(server, '/api/v1/execution/config');
      assert.strictEqual(response.statusCode, 401);
      assert.strictEqual(response.body.success, false);
      assert.strictEqual(response.body.error.code, 'AUTHENTICATION_FAILED');
    });

    // Phase 8: Unauthenticated Execution Records Endpoint Rejection
    await runTest('Unauthenticated Request Rejection for Execution Records (GET /api/v1/execution/records)', async () => {
      const response = await makeRequest(server, '/api/v1/execution/records');
      assert.strictEqual(response.statusCode, 401);
      assert.strictEqual(response.body.success, false);
      assert.strictEqual(response.body.error.code, 'AUTHENTICATION_FAILED');
    });

    // Phase 8: Unauthenticated Execution Networks Endpoint Rejection
    await runTest('Unauthenticated Request Rejection for Execution Networks (GET /api/v1/execution/networks)', async () => {
      const response = await makeRequest(server, '/api/v1/execution/networks');
      assert.strictEqual(response.statusCode, 401);
      assert.strictEqual(response.body.success, false);
      assert.strictEqual(response.body.error.code, 'AUTHENTICATION_FAILED');
    });

  } finally {
    if (server.closeAllConnections) {
      server.closeAllConnections();
    }
    server.close();
  }

  console.log('\n====================================================');
  console.log(`  RESULTS: ${passedTests}/${totalTests} Tests Passed`);
  console.log('====================================================\n');

  process.exit(passedTests === totalTests ? 0 : 1);
};

main();
