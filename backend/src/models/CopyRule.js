const mongoose = require('mongoose');
const { SUPPORTED_NETWORKS } = require('../networks');

const ALLOCATION_MODE = {
  FIXED_AMOUNT: 'FIXED_AMOUNT',
  PERCENTAGE: 'PERCENTAGE'
};

const copyRuleSchema = new mongoose.Schema(
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
    enabled: {
      type: Boolean,
      default: true,
      index: true
    },
    allocationMode: {
      type: String,
      enum: Object.values(ALLOCATION_MODE),
      default: ALLOCATION_MODE.FIXED_AMOUNT
    },
    allocationValue: {
      type: Number,
      required: [true, 'Allocation value is required'],
      min: [0.01, 'Allocation value must be greater than 0']
    },
    maxTradeAmount: {
      type: Number,
      default: 1000,
      min: [1, 'Maximum trade amount must be at least 1']
    },
    maxDailyAmount: {
      type: Number,
      default: 5000,
      min: [1, 'Maximum daily allocation must be at least 1']
    },
    allowedNetworks: {
      type: [String],
      default: SUPPORTED_NETWORKS,
      validate: {
        validator: function (nets) {
          return nets.every((n) => SUPPORTED_NETWORKS.includes(n.toLowerCase()));
        },
        message: 'Contains unsupported blockchain network'
      }
    },
    allowedTokens: {
      type: [String],
      default: []
    },
    blockedTokens: {
      type: [String],
      default: []
    },
    minConfidence: {
      type: String,
      enum: ['HIGH', 'MEDIUM', 'LOW'],
      default: 'MEDIUM'
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

// Compound Index: One copy rule per user per trader
copyRuleSchema.index({ userId: 1, traderId: 1 }, { unique: true });

copyRuleSchema.methods.toSafeObject = function () {
  return {
    id: this._id.toString(),
    userId: this.userId.toString(),
    traderId: this.traderId.toString(),
    enabled: this.enabled,
    allocationMode: this.allocationMode,
    allocationValue: this.allocationValue,
    maxTradeAmount: this.maxTradeAmount,
    maxDailyAmount: this.maxDailyAmount,
    allowedNetworks: this.allowedNetworks,
    allowedTokens: this.allowedTokens || [],
    blockedTokens: this.blockedTokens || [],
    minConfidence: this.minConfidence,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

const CopyRule = mongoose.model('CopyRule', copyRuleSchema);

module.exports = {
  CopyRule,
  ALLOCATION_MODE
};
