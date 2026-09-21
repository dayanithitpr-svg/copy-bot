const mongoose = require('mongoose');
const { SUPPORTED_NETWORKS } = require('../networks');

const ACTIVITY_TYPE = {
  TRANSACTION: 'TRANSACTION',
  TOKEN_TRANSFER: 'TOKEN_TRANSFER',
  CONTRACT_INTERACTION: 'CONTRACT_INTERACTION',
  UNKNOWN: 'UNKNOWN'
};

const ACTIVITY_STATUS = {
  CONFIRMED: 'CONFIRMED',
  FAILED: 'FAILED',
  PENDING: 'PENDING'
};

const walletActivitySchema = new mongoose.Schema(
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
    nativeValue: {
      type: String,
      default: '0'
    },
    status: {
      type: String,
      enum: Object.values(ACTIVITY_STATUS),
      default: ACTIVITY_STATUS.CONFIRMED,
      index: true
    },
    activityType: {
      type: String,
      enum: Object.values(ACTIVITY_TYPE),
      default: ACTIVITY_TYPE.TRANSACTION,
      index: true
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

// Compound Unique Index: Prevent duplicate storage of the same tx for the same trader
walletActivitySchema.index({ traderId: 1, transactionHash: 1 }, { unique: true });

// Compound indexes for user and trader activity queries
walletActivitySchema.index({ userId: 1, timestamp: -1 });
walletActivitySchema.index({ traderId: 1, timestamp: -1 });
walletActivitySchema.index({ network: 1, timestamp: -1 });

walletActivitySchema.methods.toSafeObject = function () {
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
    from: this.from,
    to: this.to,
    nativeValue: this.nativeValue,
    status: this.status,
    activityType: this.activityType,
    rawMetadata: this.rawMetadata || {},
    createdAt: this.createdAt
  };
};

const WalletActivity = mongoose.model('WalletActivity', walletActivitySchema);

module.exports = {
  WalletActivity,
  ACTIVITY_TYPE,
  ACTIVITY_STATUS
};
