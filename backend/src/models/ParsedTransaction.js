const mongoose = require('mongoose');
const { SUPPORTED_NETWORKS } = require('../networks');
const { CLASSIFICATION, CONFIDENCE } = require('../blockchain/parser/TransactionParser');

const tokenTransferSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['NATIVE', 'TOKEN'],
      default: 'TOKEN'
    },
    tokenAddress: {
      type: String,
      default: null,
      trim: true
    },
    tokenSymbol: {
      type: String,
      default: null,
      trim: true
    },
    tokenDecimals: {
      type: Number,
      default: null
    },
    from: {
      type: String,
      trim: true,
      default: ''
    },
    to: {
      type: String,
      trim: true,
      default: ''
    },
    amount: {
      type: String,
      default: '0'
    },
    rawAmount: {
      type: String,
      default: '0'
    }
  },
  { _id: false }
);

const swapSchema = new mongoose.Schema(
  {
    inputToken: {
      address: { type: String, default: null },
      symbol: { type: String, default: null },
      decimals: { type: Number, default: null },
      amount: { type: String, default: null }
    },
    outputToken: {
      address: { type: String, default: null },
      symbol: { type: String, default: null },
      decimals: { type: Number, default: null },
      amount: { type: String, default: null }
    },
    protocol: {
      type: String,
      default: null
    },
    routerAddress: {
      type: String,
      default: null
    }
  },
  { _id: false }
);

const parsedTransactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true
    },
    traderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trader',
      required: [true, 'Trader ID is required'],
      index: true
    },
    network: {
      type: String,
      required: [true, 'Blockchain network is required'],
      enum: SUPPORTED_NETWORKS,
      lowercase: true,
      trim: true,
      index: true
    },
    walletAddress: {
      type: String,
      required: [true, 'Wallet address is required'],
      trim: true,
      index: true
    },
    transactionHash: {
      type: String,
      required: [true, 'Transaction hash or signature is required'],
      trim: true
    },
    blockNumber: {
      type: Number,
      default: null,
      index: true
    },
    slot: {
      type: Number,
      default: null
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true
    },
    classification: {
      type: String,
      enum: Object.values(CLASSIFICATION),
      default: CLASSIFICATION.UNKNOWN,
      index: true
    },
    confidence: {
      type: String,
      enum: Object.values(CONFIDENCE),
      default: CONFIDENCE.LOW,
      index: true
    },
    status: {
      type: String,
      enum: ['CONFIRMED', 'FAILED', 'PENDING'],
      default: 'CONFIRMED',
      index: true
    },
    from: {
      type: String,
      trim: true,
      default: ''
    },
    to: {
      type: String,
      trim: true,
      default: ''
    },
    contractAddress: {
      type: String,
      default: null,
      trim: true
    },
    protocol: {
      type: String,
      default: null,
      trim: true
    },
    nativeValue: {
      type: String,
      default: '0'
    },
    transfers: [tokenTransferSchema],
    swap: {
      type: swapSchema,
      default: null
    },
    rawMetadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Compound Unique Index: Idempotency guarantee for transaction ingestion per trader
parsedTransactionSchema.index({ traderId: 1, transactionHash: 1 }, { unique: true });

// Compound indexes for query optimization
parsedTransactionSchema.index({ userId: 1, timestamp: -1 });
parsedTransactionSchema.index({ traderId: 1, timestamp: -1 });
parsedTransactionSchema.index({ network: 1, classification: 1, timestamp: -1 });
parsedTransactionSchema.index({ userId: 1, classification: 1, timestamp: -1 });

parsedTransactionSchema.methods.toSafeObject = function () {
  return {
    id: this._id.toString(),
    userId: this.userId.toString(),
    traderId: this.traderId.toString(),
    network: this.network,
    walletAddress: this.walletAddress,
    transactionHash: this.transactionHash,
    blockNumber: this.blockNumber,
    slot: this.slot,
    timestamp: this.timestamp,
    classification: this.classification,
    confidence: this.confidence,
    status: this.status,
    from: this.from,
    to: this.to,
    contractAddress: this.contractAddress,
    protocol: this.protocol,
    nativeValue: this.nativeValue,
    transfers: this.transfers || [],
    swap: this.swap || null,
    rawMetadata: this.rawMetadata || {},
    createdAt: this.createdAt
  };
};

const ParsedTransaction = mongoose.model('ParsedTransaction', parsedTransactionSchema);

module.exports = {
  ParsedTransaction
};
