const assert = require('assert');
const { ProtocolRegistry } = require('../src/blockchain/protocols/ProtocolRegistry');
const { TransactionParser, CLASSIFICATION, CONFIDENCE } = require('../src/blockchain/parser/TransactionParser');
const { ParsedTransaction } = require('../src/models/ParsedTransaction');

const runPhase4Tests = async (runTest) => {
  // 1. Protocol Registry
  await runTest('ProtocolRegistry resolves known DEX routers on Ethereum, Base, Polygon, Solana', async () => {
    const uniEth = ProtocolRegistry.getProtocol('ethereum', '0x7a250d5630b4cf539739df2c5dacb4c659f2488d');
    assert.ok(uniEth);
    assert.strictEqual(uniEth.name, 'Uniswap V2');

    const aeroBase = ProtocolRegistry.getProtocol('base', '0xcf77a3ba9a5ca399b7c97c74d54e5b1beb874e43');
    assert.ok(aeroBase);
    assert.strictEqual(aeroBase.name, 'Aerodrome');

    const quickPoly = ProtocolRegistry.getProtocol('polygon', '0xa5e0829caced8ffdd4de3c43696c57f7d7a678ff');
    assert.ok(quickPoly);
    assert.strictEqual(quickPoly.name, 'QuickSwap');

    const raySol = ProtocolRegistry.getProtocol('solana', '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8');
    assert.ok(raySol);
    assert.strictEqual(raySol.name, 'Raydium AMM');
  });

  // 2. EVM Native Transfer Parsing
  await runTest('TransactionParser correctly classifies pure native ETH/POL transfer', async () => {
    const rawTx = {
      hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      from: '0x1111111111111111111111111111111111111111',
      to: '0x2222222222222222222222222222222222222222',
      value: '1000000000000000000', // 1 ETH
      input: '0x',
      blockNumber: 19000000,
      timestamp: new Date('2026-03-01T12:00:00Z')
    };

    const parsed = TransactionParser.parseTransaction(rawTx, 'ethereum', '0x1111111111111111111111111111111111111111');
    assert.strictEqual(parsed.classification, CLASSIFICATION.TRANSFER);
    assert.strictEqual(parsed.confidence, CONFIDENCE.HIGH);
    assert.strictEqual(parsed.transfers.length, 1);
    assert.strictEqual(parsed.transfers[0].type, 'NATIVE');
    assert.strictEqual(parsed.transfers[0].tokenSymbol, 'ETH');
    assert.strictEqual(parsed.transfers[0].amount, '1.000000');
  });

  // 3. ERC-20 Transfer Parsing
  await runTest('TransactionParser correctly parses ERC-20 transfer calldata', async () => {
    // transfer(address to, uint256 amount)
    // selector: 0xa9059cbb, to: 0x3333333333333333333333333333333333333333, amount: 1000000
    const recipientPadded = '0000000000000000000000003333333333333333333333333333333333333333';
    const amountPadded = '00000000000000000000000000000000000000000000000000000000000f4240';
    const input = `0xa9059cbb${recipientPadded}${amountPadded}`;

    const rawTx = {
      hash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      from: '0x1111111111111111111111111111111111111111',
      to: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC Contract
      value: '0x0',
      input,
      blockNumber: 19000005
    };

    const parsed = TransactionParser.parseTransaction(rawTx, 'ethereum', '0x1111111111111111111111111111111111111111');
    assert.strictEqual(parsed.classification, CLASSIFICATION.TOKEN_TRANSFER);
    assert.strictEqual(parsed.transfers.length, 1);
    assert.strictEqual(parsed.transfers[0].type, 'TOKEN');
    assert.strictEqual(parsed.transfers[0].tokenAddress.toLowerCase(), '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48');
    assert.strictEqual(parsed.transfers[0].amount, '1000000');
  });

  // 4. ERC-20 Approval Parsing
  await runTest('TransactionParser correctly parses ERC-20 approve calldata', async () => {
    // approve(address spender, uint256 amount)
    const spenderPadded = '0000000000000000000000007a250d5630b4cf539739df2c5dacb4c659f2488d';
    const amountPadded = 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    const input = `0x095ea7b3${spenderPadded}${amountPadded}`;

    const rawTx = {
      hash: '0x9999991234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      from: '0x1111111111111111111111111111111111111111',
      to: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      value: '0x0',
      input
    };

    const parsed = TransactionParser.parseTransaction(rawTx, 'ethereum', '0x1111111111111111111111111111111111111111');
    assert.strictEqual(parsed.classification, CLASSIFICATION.APPROVAL);
  });

  // 5. DEX Swap Detection with Protocol Identification
  await runTest('TransactionParser detects DEX swap on known Uniswap / Aerodrome router', async () => {
    // swapExactTokensForTokens selector: 0x38ed1739
    const input = '0x38ed17390000000000000000000000000000000000000000000000000000000000000020';

    const rawTx = {
      hash: '0xswaphsh1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      from: '0x1111111111111111111111111111111111111111',
      to: '0x7a250d5630b4cf539739df2c5dacb4c659f2488d', // Uniswap V2 Router
      value: '0x0',
      input
    };

    const parsed = TransactionParser.parseTransaction(rawTx, 'ethereum', '0x1111111111111111111111111111111111111111');
    assert.strictEqual(parsed.classification, CLASSIFICATION.SWAP);
    assert.strictEqual(parsed.confidence, CONFIDENCE.HIGH);
    assert.strictEqual(parsed.protocol, 'Uniswap V2');
    assert.ok(parsed.swap);
  });

  // 6. EVM Logs Swap & Token Transfer Extraction
  await runTest('TransactionParser extracts structured token swap from event logs', async () => {
    const rawTx = {
      hash: '0xreceipttx1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      from: '0x1111111111111111111111111111111111111111',
      to: '0xcf77a3ba9a5ca399b7c97c74d54e5b1beb874e43', // Aerodrome Router on Base
      value: '0x0',
      input: '0x38ed1739000000',
      receipt: {
        logs: [
          // Transfer Log 1 (USDC)
          {
            address: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
            topics: [
              '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
              '0x0000000000000000000000001111111111111111111111111111111111111111',
              '0x000000000000000000000000cf77a3ba9a5ca399b7c97c74d54e5b1beb874e43'
            ],
            data: '0x0000000000000000000000000000000000000000000000000000000005f5e100' // 100,000,000
          },
          // Uniswap V2 Swap Event
          {
            address: '0xpooladdress11111111111111111111111111111111',
            topics: [
              '0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822',
              '0x000000000000000000000000cf77a3ba9a5ca399b7c97c74d54e5b1beb874e43',
              '0x0000000000000000000000001111111111111111111111111111111111111111'
            ],
            data: '0x0000000000000000000000000000000000000000000000000000000000000000'
          },
          // Transfer Log 2 (WETH)
          {
            address: '0x4200000000000000000000000000000000000006',
            topics: [
              '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
              '0x000000000000000000000000cf77a3ba9a5ca399b7c97c74d54e5b1beb874e43',
              '0x0000000000000000000000001111111111111111111111111111111111111111'
            ],
            data: '0x000000000000000000000000000000000000000000000000002386f26fc10000'
          }
        ]
      }
    };

    const parsed = TransactionParser.parseTransaction(rawTx, 'base', '0x1111111111111111111111111111111111111111');
    assert.strictEqual(parsed.classification, CLASSIFICATION.SWAP);
    assert.strictEqual(parsed.protocol, 'Aerodrome');
    assert.ok(parsed.swap);
    assert.strictEqual(parsed.swap.inputToken.address, '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913');
    assert.strictEqual(parsed.swap.outputToken.address, '0x4200000000000000000000000000000000000006');
    assert.strictEqual(parsed.transfers.length, 2);
  });

  // 7. Unknown Smart Contract Call Fallback
  await runTest('TransactionParser classifies unknown smart contract calls as CONTRACT_INTERACTION with LOW confidence', async () => {
    const rawTx = {
      hash: '0xunknowncall1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      from: '0x1111111111111111111111111111111111111111',
      to: '0x9999999999999999999999999999999999999999',
      value: '0x0',
      input: '0xdeadbeef123456'
    };

    const parsed = TransactionParser.parseTransaction(rawTx, 'polygon', '0x1111111111111111111111111111111111111111');
    assert.strictEqual(parsed.classification, CLASSIFICATION.CONTRACT_INTERACTION);
    assert.strictEqual(parsed.confidence, CONFIDENCE.LOW);
    assert.strictEqual(parsed.protocol, null);
  });

  // 8. Solana Raydium Swap Detection
  await runTest('TransactionParser detects Solana Raydium program interaction as SWAP', async () => {
    const rawTx = {
      signature: '5K9Y8QZ1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      slot: 250000000,
      programId: '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8' // Raydium AMM
    };

    const parsed = TransactionParser.parseTransaction(rawTx, 'solana', '6vjWc64CcmWjD7D4dF661kQ2V8pG5xN7test');
    assert.strictEqual(parsed.classification, CLASSIFICATION.SWAP);
    assert.strictEqual(parsed.protocol, 'Raydium AMM');
    assert.strictEqual(parsed.confidence, CONFIDENCE.HIGH);
  });

  // 9. Fault Tolerance & Deterministic Reprocessing
  await runTest('TransactionParser handles null/malformed payload gracefully and produces deterministic re-parsing', async () => {
    const malformed = TransactionParser.parseTransaction(null, 'ethereum', '0x123');
    assert.strictEqual(malformed.classification, CLASSIFICATION.UNKNOWN);
    assert.strictEqual(malformed.confidence, CONFIDENCE.LOW);

    const normalTx = {
      hash: '0xreprocess123',
      from: '0x111',
      to: '0x222',
      value: '500000000000000000',
      input: '0x'
    };

    const parse1 = TransactionParser.parseTransaction(normalTx, 'ethereum', '0x111');
    const parse2 = TransactionParser.parseTransaction(normalTx, 'ethereum', '0x111');
    assert.deepStrictEqual(parse1, parse2);
  });
};

module.exports = {
  runPhase4Tests
};
