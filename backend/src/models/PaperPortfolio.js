const mongoose = require('mongoose');

const paperHoldingSchema = new mongoose.Schema(
  {
    tokenAddress: {
      type: String,
      required: true,
      trim: true
    },
    network: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    symbol: {
      type: String,
      default: 'UNKNOWN'
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    averageEntryPrice: {
      type: Number,
      default: 0
    },
    totalCost: {
      type: Number,
      default: 0
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);

const paperPortfolioSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      unique: true,
      index: true
    },
    baseCurrency: {
      type: String,
      default: 'PAPER_USDC'
    },
    virtualCashBalance: {
      type: Number,
      default: 10000.0,
      min: [0, 'Virtual cash balance cannot be negative']
    },
    initialBalance: {
      type: Number,
      default: 10000.0
    },
    holdings: [paperHoldingSchema]
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

paperPortfolioSchema.methods.toSafeObject = function () {
  return {
    id: this._id.toString(),
    userId: this.userId.toString(),
    baseCurrency: this.baseCurrency,
    virtualCashBalance: Number(this.virtualCashBalance.toFixed(2)),
    initialBalance: this.initialBalance,
    holdings: (this.holdings || []).map((h) => ({
      tokenAddress: h.tokenAddress,
      network: h.network,
      symbol: h.symbol,
      quantity: Number(h.quantity.toFixed(6)),
      averageEntryPrice: Number(h.averageEntryPrice.toFixed(4)),
      totalCost: Number(h.totalCost.toFixed(2)),
      lastUpdated: h.lastUpdated
    })),
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

const PaperPortfolio = mongoose.model('PaperPortfolio', paperPortfolioSchema);

module.exports = {
  PaperPortfolio
};
