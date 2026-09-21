const mongoose = require('mongoose');

const TRADE_STATUS = {
  SIMULATED: 'SIMULATED',
  SKIPPED: 'SKIPPED',
  RISK_BLOCKED: 'RISK_BLOCKED',
  FAILED: 'FAILED'
};

const SKIP_REASON = {
  RULE_DISABLED: 'RULE_DISABLED',
  NETWORK_NOT_ALLOWED: 'NETWORK_NOT_ALLOWED',
  TOKEN_BLOCKED: 'TOKEN_BLOCKED',
  TOKEN_NOT_ALLOWED: 'TOKEN_NOT_ALLOWED',
  TRADE_TOO_SMALL: 'TRADE_TOO_SMALL',
  TRADE_TOO_LARGE: 'TRADE_TOO_LARGE',
  DAILY_LIMIT_REACHED: 'DAILY_LIMIT_REACHED',
  INSUFFICIENT_PAPER_BALANCE: 'INSUFFICIENT_PAPER_BALANCE',
  UNSUPPORTED_SWAP: 'UNSUPPORTED_SWAP',
  UNSUPPORTED_TRANSACTION_TYPE: 'UNSUPPORTED_TRANSACTION_TYPE',
  TRADER_NOT_ACTIVE: 'TRADER_NOT_ACTIVE',
  TRADER_TRACKING_DISABLED: 'TRADER_TRACKING_DISABLED',
  PRICE_UNAVAILABLE: 'PRICE_UNAVAILABLE',
  ALREADY_PROCESSED: 'ALREADY_PROCESSED',
  PARSER_CONFIDENCE_TOO_LOW: 'PARSER_CONFIDENCE_TOO_LOW',
  MAX_TRADE_EXPOSURE_EXCEEDED: 'MAX_TRADE_EXPOSURE_EXCEEDED',
  MAX_DAILY_EXPOSURE_EXCEEDED: 'MAX_DAILY_EXPOSURE_EXCEEDED',
  MAX_PORTFOLIO_EXPOSURE_EXCEEDED: 'MAX_PORTFOLIO_EXPOSURE_EXCEEDED',
  MAX_TRADER_EXPOSURE_EXCEEDED: 'MAX_TRADER_EXPOSURE_EXCEEDED',
  MAX_TOKEN_EXPOSURE_EXCEEDED: 'MAX_TOKEN_EXPOSURE_EXCEEDED',
  MAX_POSITIONS_EXCEEDED: 'MAX_POSITIONS_EXCEEDED',
  RISK_CONFIG_DISABLED: 'RISK_CONFIG_DISABLED'
};

const paperTradeSchema = new mongoose.Schema(
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
    copyRuleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CopyRule',
      required: [true, 'Copy Rule ID is required'],
      index: true
    },
    sourceParsedTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ParsedTransaction',
      required: [true, 'Source Parsed Transaction ID is required'],
      index: true
    },
    riskEvaluationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RiskEvaluation',
      default: null,
      index: true
    },
    network: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true
    },
    status: {
      type: String,
      enum: Object.values(TRADE_STATUS),
      default: TRADE_STATUS.SIMULATED,
      index: true
    },
    classification: {
      type: String,
      default: 'SWAP'
    },
    inputToken: {
      address: { type: String, default: null },
      symbol: { type: String, default: null },
      amount: { type: String, default: null }
    },
    outputToken: {
      address: { type: String, default: null },
      symbol: { type: String, default: null },
      amount: { type: String, default: null }
    },
    allocationMode: {
      type: String,
      default: 'FIXED_AMOUNT'
    },
    allocationValue: {
      type: Number,
      default: 0
    },
    paperInputAmount: {
      type: Number,
      default: 0
    },
    paperOutputAmount: {
      type: Number,
      default: 0
    },
    skipReason: {
      type: String,
      enum: [...Object.values(SKIP_REASON), null],
      default: null,
      index: true
    },
    riskReasons: {
      type: [String],
      default: []
    },
    simulatedAt: {
      type: Date,
      default: Date.now,
      index: true
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

// Compound Unique Index: Strict Idempotency guarantee per user, copy rule, and parsed transaction
paperTradeSchema.index(
  { userId: 1, copyRuleId: 1, sourceParsedTransactionId: 1 },
  { unique: true }
);

// Query indexes
paperTradeSchema.index({ userId: 1, simulatedAt: -1 });
paperTradeSchema.index({ traderId: 1, simulatedAt: -1 });
paperTradeSchema.index({ userId: 1, status: 1, simulatedAt: -1 });

paperTradeSchema.methods.toSafeObject = function () {
  return {
    id: this._id.toString(),
    userId: this.userId.toString(),
    traderId: this.traderId.toString(),
    copyRuleId: this.copyRuleId.toString(),
    sourceParsedTransactionId: this.sourceParsedTransactionId.toString(),
    riskEvaluationId: this.riskEvaluationId ? this.riskEvaluationId.toString() : null,
    network: this.network,
    status: this.status,
    classification: this.classification,
    inputToken: this.inputToken,
    outputToken: this.outputToken,
    allocationMode: this.allocationMode,
    allocationValue: this.allocationValue,
    paperInputAmount: Number(this.paperInputAmount.toFixed(2)),
    paperOutputAmount: Number(this.paperOutputAmount.toFixed(6)),
    skipReason: this.skipReason,
    riskReasons: this.riskReasons,
    simulatedAt: this.simulatedAt,
    createdAt: this.createdAt
  };
};

const PaperTrade = mongoose.model('PaperTrade', paperTradeSchema);

module.exports = {
  PaperTrade,
  TRADE_STATUS,
  SKIP_REASON
};
