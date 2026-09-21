const mongoose = require('mongoose');

const riskConfigSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      unique: true,
      index: true
    },
    enabled: {
      type: Boolean,
      default: true
    },
    // Max Paper USDC per single trade
    maxTradeExposure: {
      type: Number,
      default: 1000,
      min: [1, 'Max trade exposure must be at least 1 Paper USDC']
    },
    // Max Paper USDC spent across all trades in a rolling 24h period
    maxDailyExposure: {
      type: Number,
      default: 3000,
      min: [1, 'Max daily exposure must be at least 1 Paper USDC']
    },
    // Max % of total portfolio allowed in a single trade
    maxPortfolioExposure: {
      type: Number,
      default: 40,
      min: [1, 'Max portfolio exposure must be at least 1%'],
      max: [100, 'Max portfolio exposure cannot exceed 100%']
    },
    // Max % of total portfolio exposed to a single tracked trader
    maxTraderAllocation: {
      type: Number,
      default: 30,
      min: [1, 'Max trader allocation must be at least 1%'],
      max: [100, 'Max trader allocation cannot exceed 100%']
    },
    // Max % of total portfolio exposed to a single token
    maxTokenAllocation: {
      type: Number,
      default: 25,
      min: [1, 'Max token allocation must be at least 1%'],
      max: [100, 'Max token allocation cannot exceed 100%']
    },
    // Max distinct token holdings allowed simultaneously in portfolio
    maxOpenPositions: {
      type: Number,
      default: 10,
      min: [1, 'Max open positions must be at least 1'],
      max: [50, 'Max open positions cannot exceed 50']
    },
    // Minimum parser confidence required to approve a trade
    minConfidence: {
      type: String,
      enum: ['HIGH', 'MEDIUM', 'LOW'],
      default: 'MEDIUM'
    },
    // Networks allowed for copy-trading
    allowedNetworks: {
      type: [String],
      default: ['ethereum', 'base', 'polygon', 'solana']
    },
    // Blocklist of token contract addresses
    blockedTokens: {
      type: [String],
      default: []
    },
    // Optional allowlist of token contract addresses
    allowedTokens: {
      type: [String],
      default: []
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

riskConfigSchema.methods.toSafeObject = function () {
  return {
    id: this._id.toString(),
    userId: this.userId.toString(),
    enabled: this.enabled,
    maxTradeExposure: this.maxTradeExposure,
    maxDailyExposure: this.maxDailyExposure,
    maxPortfolioExposure: this.maxPortfolioExposure,
    maxTraderAllocation: this.maxTraderAllocation,
    maxTokenAllocation: this.maxTokenAllocation,
    maxOpenPositions: this.maxOpenPositions,
    minConfidence: this.minConfidence,
    allowedNetworks: this.allowedNetworks,
    blockedTokens: this.blockedTokens,
    allowedTokens: this.allowedTokens,
    updatedAt: this.updatedAt,
    createdAt: this.createdAt
  };
};

const RiskConfig = mongoose.model('RiskConfig', riskConfigSchema);

module.exports = RiskConfig;
