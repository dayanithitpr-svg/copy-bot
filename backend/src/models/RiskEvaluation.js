const mongoose = require('mongoose');

const RISK_DECISION = {
  APPROVED: 'APPROVED',
  BLOCKED: 'BLOCKED'
};

const CHECK_STATUS = {
  PASS: 'PASS',
  BLOCK: 'BLOCK',
  UNSUPPORTED: 'UNSUPPORTED'
};

const riskCheckSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: Object.values(CHECK_STATUS),
      required: true
    },
    detail: {
      type: String,
      default: ''
    }
  },
  { _id: false }
);

const riskEvaluationSchema = new mongoose.Schema(
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
    network: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true
    },
    proposedAllocation: {
      type: Number,
      required: true,
      default: 0
    },
    decision: {
      type: String,
      enum: Object.values(RISK_DECISION),
      required: true,
      index: true
    },
    checks: {
      type: [riskCheckSchema],
      default: []
    },
    reasons: {
      type: [String],
      default: []
    },
    evaluatedAt: {
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

// Unique compound index for idempotency
riskEvaluationSchema.index(
  { userId: 1, copyRuleId: 1, sourceParsedTransactionId: 1 },
  { unique: true }
);

// Query indexes for fast filtering
riskEvaluationSchema.index({ userId: 1, evaluatedAt: -1 });
riskEvaluationSchema.index({ userId: 1, decision: 1, evaluatedAt: -1 });
riskEvaluationSchema.index({ traderId: 1, evaluatedAt: -1 });

riskEvaluationSchema.methods.toSafeObject = function () {
  return {
    id: this._id.toString(),
    userId: this.userId.toString(),
    traderId: this.traderId.toString(),
    copyRuleId: this.copyRuleId.toString(),
    sourceParsedTransactionId: this.sourceParsedTransactionId.toString(),
    network: this.network,
    proposedAllocation: Number(this.proposedAllocation.toFixed(2)),
    decision: this.decision,
    checks: this.checks,
    reasons: this.reasons,
    evaluatedAt: this.evaluatedAt,
    createdAt: this.createdAt
  };
};

const RiskEvaluation = mongoose.model('RiskEvaluation', riskEvaluationSchema);

module.exports = {
  RiskEvaluation,
  RISK_DECISION,
  CHECK_STATUS
};
