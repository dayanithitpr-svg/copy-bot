const { ProtocolRegistry, EVM_EVENT_TOPICS } = require('../protocols/ProtocolRegistry');
const logger = require('../../utils/logger');

const CLASSIFICATION = {
  TRANSFER: 'TRANSFER',
  TOKEN_TRANSFER: 'TOKEN_TRANSFER',
  SWAP: 'SWAP',
  CONTRACT_INTERACTION: 'CONTRACT_INTERACTION',
  APPROVAL: 'APPROVAL',
  MINT: 'MINT',
  BURN: 'BURN',
  STAKE: 'STAKE',
  UNSTAKE: 'UNSTAKE',
  UNKNOWN: 'UNKNOWN'
};

const CONFIDENCE = {
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW'
};

const NATIVE_SYMBOLS = {
  ethereum: 'ETH',
  base: 'ETH',
  polygon: 'POL',
  solana: 'SOL'
};

class TransactionParser {
  /**
   * Main deterministic parsing entry point for any blockchain transaction
   * @param {Object} rawTx - Raw transaction object from adapter/node
   * @param {string} network - Blockchain network (ethereum, base, polygon, solana)
   * @param {string} walletAddress - Monitored target wallet address
   * @returns {Object} Structured ParsedTransaction object
   */
  static parseTransaction(rawTx, network, walletAddress) {
    if (!rawTx) {
      return this._createFallbackTransaction({}, network, walletAddress, 'Invalid or null raw transaction payload');
    }

    try {
      const net = (network || 'ethereum').toLowerCase();
      if (net === 'solana') {
        return this._parseSolanaTransaction(rawTx, walletAddress);
      }
      return this._parseEvmTransaction(rawTx, net, walletAddress);
    } catch (err) {
      logger.warn(`TransactionParser error on ${network} (${rawTx.hash || rawTx.transactionHash}): ${err.message}`);
      return this._createFallbackTransaction(rawTx, network, walletAddress, err.message);
    }
  }

  /**
   * Parses EVM transactions (Ethereum, Base, Polygon)
   */
  static _parseEvmTransaction(rawTx, network, walletAddress) {
    const txHash = rawTx.hash || rawTx.transactionHash || '';
    const from = (rawTx.from || '').toLowerCase();
    const to = (rawTx.to || '').toLowerCase();
    const input = rawTx.input || rawTx.data || '0x';
    const blockNumber = rawTx.blockNumber ? (typeof rawTx.blockNumber === 'string' ? parseInt(rawTx.blockNumber, 16) : rawTx.blockNumber) : null;
    const timestamp = rawTx.timestamp instanceof Date ? rawTx.timestamp : rawTx.blockTimestamp ? new Date(rawTx.blockTimestamp) : new Date();

    // Value calculation
    const nativeSymbol = NATIVE_SYMBOLS[network] || 'ETH';
    let nativeValueStr = '0.000';
    let rawValueWei = '0';
    if (rawTx.value) {
      try {
        rawValueWei = BigInt(rawTx.value).toString();
        nativeValueStr = (Number(rawValueWei) / 1e18).toFixed(6);
      } catch (e) {
        nativeValueStr = '0.000';
      }
    }

    const transfers = [];
    let swap = null;
    let classification = CLASSIFICATION.UNKNOWN;
    let confidence = CONFIDENCE.LOW;
    let protocol = null;
    let contractAddress = null;

    // 1. Check if it is a pure native transfer (no calldata)
    if ((!input || input === '0x' || input === '0x00') && BigInt(rawValueWei) > 0n) {
      classification = CLASSIFICATION.TRANSFER;
      confidence = CONFIDENCE.HIGH;
      transfers.push({
        type: 'NATIVE',
        tokenAddress: null,
        tokenSymbol: nativeSymbol,
        tokenDecimals: 18,
        from: rawTx.from,
        to: rawTx.to,
        amount: nativeValueStr,
        rawAmount: rawValueWei
      });
      return {
        transactionHash: txHash,
        network,
        walletAddress,
        blockNumber,
        timestamp,
        from: rawTx.from,
        to: rawTx.to,
        contractAddress: null,
        protocol: null,
        nativeValue: `${nativeValueStr} ${nativeSymbol}`,
        classification,
        confidence,
        status: rawTx.status || 'CONFIRMED',
        transfers,
        swap: null,
        rawMetadata: this._sanitizeMetadata(rawTx)
      };
    }

    // 2. Identify protocol from recipient address
    const knownProtocol = ProtocolRegistry.getProtocol(network, to);
    if (knownProtocol) {
      protocol = knownProtocol.name;
    }

    // 3. Inspect method selector
    const selectorInfo = ProtocolRegistry.getSelectorInfo(input);

    if (selectorInfo) {
      classification = selectorInfo.classification || CLASSIFICATION.CONTRACT_INTERACTION;
      if (selectorInfo.protocol && !protocol) {
        protocol = selectorInfo.protocol;
      }
      confidence = knownProtocol ? CONFIDENCE.HIGH : CONFIDENCE.MEDIUM;

      // Extract details based on selector
      if (selectorInfo.name === 'transfer' && input.length >= 74) {
        // transfer(address to, uint256 amount)
        const recipientHex = '0x' + input.slice(34, 74);
        const amountHex = '0x' + input.slice(74, 138);
        let amountStr = '0';
        try {
          amountStr = BigInt(amountHex).toString();
        } catch (e) {}

        contractAddress = rawTx.to;
        transfers.push({
          type: 'TOKEN',
          tokenAddress: rawTx.to,
          tokenSymbol: null,
          tokenDecimals: null,
          from: rawTx.from,
          to: recipientHex,
          amount: amountStr,
          rawAmount: amountStr
        });
      } else if (selectorInfo.name === 'approve' && input.length >= 74) {
        const spenderHex = '0x' + input.slice(34, 74);
        const amountHex = '0x' + input.slice(74, 138);
        contractAddress = rawTx.to;
        classification = CLASSIFICATION.APPROVAL;
      }
    } else if (knownProtocol && knownProtocol.type.startsWith('DEX_')) {
      classification = CLASSIFICATION.SWAP;
      confidence = CONFIDENCE.HIGH;
    } else if (input && input !== '0x') {
      classification = CLASSIFICATION.CONTRACT_INTERACTION;
      contractAddress = rawTx.to;
      confidence = CONFIDENCE.LOW;
    }

    // 4. Inspect Receipts / Event Logs if present in rawTx
    if (rawTx.receipt && Array.isArray(rawTx.receipt.logs)) {
      const parsedLogs = this._parseEvmLogs(rawTx.receipt.logs, network);
      if (parsedLogs.transfers.length > 0) {
        transfers.push(...parsedLogs.transfers);
      }
      if (parsedLogs.isSwap) {
        classification = CLASSIFICATION.SWAP;
        confidence = CONFIDENCE.HIGH;
        if (parsedLogs.swap) {
          swap = {
            ...parsedLogs.swap,
            protocol: protocol || 'DEX Pool',
            routerAddress: rawTx.to
          };
        }
      }
    }

    // If classification is SWAP but swap object not yet structured, construct partial representation
    if (classification === CLASSIFICATION.SWAP && !swap) {
      swap = {
        inputToken: null,
        inputAmount: null,
        outputToken: null,
        outputAmount: null,
        protocol: protocol || 'Decentralized Exchange',
        routerAddress: rawTx.to
      };
    }

    return {
      transactionHash: txHash,
      network,
      walletAddress,
      blockNumber,
      timestamp,
      from: rawTx.from,
      to: rawTx.to || 'Contract Creation',
      contractAddress: contractAddress || (classification === CLASSIFICATION.CONTRACT_INTERACTION ? rawTx.to : null),
      protocol,
      nativeValue: `${nativeValueStr} ${nativeSymbol}`,
      classification,
      confidence,
      status: rawTx.status || 'CONFIRMED',
      transfers,
      swap,
      rawMetadata: this._sanitizeMetadata(rawTx)
    };
  }

  /**
   * Parses EVM Event Logs (ERC-20 Transfers, Approvals, DEX Swaps)
   */
  static _parseEvmLogs(logs, network) {
    const topics = ProtocolRegistry.getEventTopics();
    const transfers = [];
    let isSwap = false;
    let swap = null;

    for (const log of logs) {
      if (!log.topics || !Array.isArray(log.topics) || log.topics.length === 0) continue;

      const firstTopic = log.topics[0]?.toLowerCase();

      // ERC-20 Transfer Log
      if (firstTopic === topics.TRANSFER && log.topics.length >= 3) {
        const from = '0x' + log.topics[1].slice(26);
        const to = '0x' + log.topics[2].slice(26);
        let amount = '0';
        try {
          amount = BigInt(log.data || '0x0').toString();
        } catch (e) {}

        transfers.push({
          type: 'TOKEN',
          tokenAddress: log.address,
          tokenSymbol: null,
          tokenDecimals: null,
          from,
          to,
          amount,
          rawAmount: amount
        });
      }

      // Uniswap V2 / V3 Swap Event Log
      if (firstTopic === topics.UNISWAP_V2_SWAP || firstTopic === topics.UNISWAP_V3_SWAP) {
        isSwap = true;
      }
    }

    // If swap was detected and we have transfers, map input / output tokens
    if (isSwap && transfers.length >= 2) {
      swap = {
        inputToken: {
          address: transfers[0].tokenAddress,
          symbol: transfers[0].tokenSymbol,
          decimals: transfers[0].tokenDecimals,
          amount: transfers[0].amount
        },
        outputToken: {
          address: transfers[transfers.length - 1].tokenAddress,
          symbol: transfers[transfers.length - 1].tokenSymbol,
          decimals: transfers[transfers.length - 1].tokenDecimals,
          amount: transfers[transfers.length - 1].amount
        }
      };
    }

    return { transfers, isSwap, swap };
  }

  /**
   * Parses Solana transactions
   */
  static _parseSolanaTransaction(rawTx, walletAddress) {
    const signature = rawTx.signature || rawTx.transactionHash || '';
    const slot = rawTx.slot || rawTx.blockNumber || null;
    const timestamp = rawTx.timestamp instanceof Date ? rawTx.timestamp : rawTx.blockTime ? new Date(rawTx.blockTime * 1000) : new Date();
    const isFailed = Boolean(rawTx.err);

    let classification = CLASSIFICATION.TRANSACTION;
    let confidence = CONFIDENCE.MEDIUM;
    let protocol = null;
    const transfers = [];
    let swap = null;

    // Check program interactions if provided in logs or metadata
    const programId = rawTx.programId || rawTx.rawMetadata?.programId;
    if (programId) {
      const known = ProtocolRegistry.getProtocol('solana', programId);
      if (known) {
        protocol = known.name;
        if (known.type.startsWith('DEX_')) {
          classification = CLASSIFICATION.SWAP;
          confidence = CONFIDENCE.HIGH;
          swap = {
            inputToken: null,
            inputAmount: null,
            outputToken: null,
            outputAmount: null,
            protocol: known.name,
            routerAddress: programId
          };
        } else {
          classification = CLASSIFICATION.CONTRACT_INTERACTION;
        }
      }
    } else if (rawTx.activityType === 'TOKEN_TRANSFER' || rawTx.memo) {
      classification = CLASSIFICATION.TOKEN_TRANSFER;
      confidence = CONFIDENCE.MEDIUM;
    }

    // Capture native SOL transfer if amount is present
    if (rawTx.nativeValue && rawTx.nativeValue !== '0.000 SOL') {
      classification = CLASSIFICATION.TRANSFER;
      transfers.push({
        type: 'NATIVE',
        tokenAddress: null,
        tokenSymbol: 'SOL',
        tokenDecimals: 9,
        from: rawTx.from || walletAddress,
        to: rawTx.to || 'Solana Recipient',
        amount: rawTx.nativeValue.replace(' SOL', ''),
        rawAmount: '0'
      });
    }

    return {
      transactionHash: signature,
      network: 'solana',
      walletAddress,
      blockNumber: slot,
      slot,
      timestamp,
      from: rawTx.from || walletAddress,
      to: rawTx.to || 'Solana Program',
      contractAddress: programId || null,
      protocol,
      nativeValue: rawTx.nativeValue || '0.000 SOL',
      classification,
      confidence,
      status: isFailed ? 'FAILED' : 'CONFIRMED',
      transfers,
      swap,
      rawMetadata: this._sanitizeMetadata(rawTx)
    };
  }

  /**
   * Fallback constructor for malformed or unknown transactions
   */
  static _createFallbackTransaction(rawTx, network, walletAddress, reason) {
    return {
      transactionHash: rawTx.hash || rawTx.transactionHash || rawTx.signature || 'unknown_tx',
      network: (network || 'ethereum').toLowerCase(),
      walletAddress: walletAddress || 'unknown_wallet',
      blockNumber: rawTx.blockNumber || null,
      timestamp: rawTx.timestamp instanceof Date ? rawTx.timestamp : new Date(),
      from: rawTx.from || '',
      to: rawTx.to || '',
      contractAddress: null,
      protocol: null,
      nativeValue: rawTx.nativeValue || '0.000',
      classification: CLASSIFICATION.UNKNOWN,
      confidence: CONFIDENCE.LOW,
      status: rawTx.status || 'CONFIRMED',
      transfers: [],
      swap: null,
      rawMetadata: {
        error: reason,
        ...this._sanitizeMetadata(rawTx)
      }
    };
  }

  /**
   * Sanitizes raw metadata to avoid huge objects, RPC secrets, or private keys
   */
  static _sanitizeMetadata(rawTx) {
    if (!rawTx || typeof rawTx !== 'object') return {};
    const sanitized = { ...rawTx };

    // Strip sensitive or unnecessary bloat
    delete sanitized.r;
    delete sanitized.s;
    delete sanitized.v;
    delete sanitized.rpcUrl;
    delete sanitized.privateKey;
    delete sanitized.seed;
    delete sanitized.secret;

    return sanitized;
  }
}

module.exports = {
  TransactionParser,
  CLASSIFICATION,
  CONFIDENCE
};
