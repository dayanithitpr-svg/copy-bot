const mongoose = require('mongoose');

const EXECUTION_STATUS = {
  PENDING_VALIDATION: 'PENDING_VALIDATION',
  VALIDATED: 'VALIDATED',
  BUILDING: 'BUILDING',
  AWAITING_SIGNATURE: 'AWAITING_SIGNATURE',
  SIGNED: 'SIGNED',
  SUBMITTED: 'SUBMITTED',
  CONFIRMING: 'CONFIRMING',
  CONFIRMED: 'CONFIRMED',
  FAILED: 'FAILED',
  REJECTED: 'REJECTED',
  DUPLICATE: 'DUPLICATE'
};

const executionRecordSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true
    },
    sourceParsedTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ParsedTransaction',
      required: [true, 'Source Parsed Transaction ID is required'],
      index: true
    },
    copyRuleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CopyRule',
      required: [true, 'Copy Rule ID is required'],
      index: true
    },
    traderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trader',
      required: [true, 'Trader ID is required'],
      index: true
    },
    executionMode: {
      type: String,
      enum: ['TESTNET'],
      default: 'TESTNET',
      index: true
    },
    network: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true
    },
    chainId: {
      type: Number,
      required: true
    },
    executionWalletAddress: {
      type: String,
      required: true,
      trim: true
    },
    protocol: {
      type: String,
      required: true,
      default: 'UNISWAP_V2_TESTNET'
    },
    routerAddress: {
      type: String,
      default: null
    },
    tokenIn: {
      address: { type: String, default: null },
      symbol: { type: String, default: null },
      amount: { type: String, default: null }
    },
    tokenOut: {
      address: { type: String, default: null },
      symbol: { type: String, default: null },
      minimumAmount: { type: String, default: null }
    },
    amountInBaseUnits: {
      type: String,
      default: '0'
    },
    minimumAmountOutBaseUnits: {
      type: String,
      default: '0'
    },
    nonce: {
      type: Number,
      default: null
    },
    gasLimit: {
      type: Number,
      default: null
    },
    gasPriceGwei: {
      type: Number,
      default: null
    },
    gasUsed: {
      type: Number,
      default: null
    },
    transactionHash: {
      type: String,
      default: null,
      index: true
    },
    status: {
      type: String,
      enum: Object.values(EXECUTION_STATUS),
      default: EXECUTION_STATUS.PENDING_VALIDATION,
      index: true
    },
    errorCode: {
      type: String,
      default: null
    },
    errorMessage: {
      type: String,
      default: null
    },
    explorerUrl: {
      type: String,
      default: null
    },
    submittedAt: {
      type: Date,
      default: null
    },
    confirmedAt: {
      type: Date,
      default: null
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

// Compound Unique Index: Prevents duplicate execution for the same source transaction and rule in testnet mode
executionRecordSchema.index(
  { userId: 1, copyRuleId: 1, sourceParsedTransactionId: 1, executionMode: 1 },
  { unique: true }
);

// Query indexes
executionRecordSchema.index({ userId: 1, createdAt: -1 });
executionRecordSchema.index({ userId: 1, status: 1, createdAt: -1 });

executionRecordSchema.methods.toSafeObject = function () {
  return {
    id: this._id.toString(),
    userId: this.userId.toString(),
    sourceParsedTransactionId: this.sourceParsedTransactionId.toString(),
    copyRuleId: this.copyRuleId.toString(),
    traderId: this.traderId.toString(),
    executionMode: this.executionMode,
    network: this.network,
    chainId: this.chainId,
    executionWalletAddress: this.executionWalletAddress,
    protocol: this.protocol,
    tokenIn: this.tokenIn,
    tokenOut: this.tokenOut,
    amountInBaseUnits: this.amountInBaseUnits,
    minimumAmountOutBaseUnits: this.minimumAmountOutBaseUnits,
    gasLimit: this.gasLimit,
    gasPriceGwei: this.gasPriceGwei,
    gasUsed: this.gasUsed,
    transactionHash: this.transactionHash,
    status: this.status,
    errorCode: this.errorCode,
    errorMessage: this.errorMessage,
    explorerUrl: this.explorerUrl,
    submittedAt: this.submittedAt,
    confirmedAt: this.confirmedAt,
    createdAt: this.createdAt
  };
};

const ExecutionRecord = mongoose.model('ExecutionRecord', executionRecordSchema);

module.exports = {
  ExecutionRecord,
  EXECUTION_STATUS
};
