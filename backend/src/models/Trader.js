const mongoose = require('mongoose');
const { SUPPORTED_NETWORKS } = require('../networks');

const TRADER_STATUS = {
  ACTIVE: 'ACTIVE',
  PAUSED: 'PAUSED',
  INVALID: 'INVALID',
  ERROR: 'ERROR'
};

const traderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true
    },
    displayName: {
      type: String,
      required: [true, 'Trader display name is required'],
      trim: true,
      minlength: [2, 'Display name must be at least 2 characters'],
      maxlength: [60, 'Display name cannot exceed 60 characters']
    },
    walletAddress: {
      type: String,
      required: [true, 'Public wallet address is required'],
      trim: true
    },
    network: {
      type: String,
      required: [true, 'Blockchain network is required'],
      enum: {
        values: SUPPORTED_NETWORKS,
        message: 'Unsupported blockchain network'
      },
      lowercase: true,
      trim: true
    },
    status: {
      type: String,
      enum: Object.values(TRADER_STATUS),
      default: TRADER_STATUS.ACTIVE,
      index: true
    },
    trackingEnabled: {
      type: Boolean,
      default: true,
      index: true
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
      default: ''
    },
    // Phase 3 Monitoring State & Checkpoints
    monitoringStatus: {
      type: String,
      enum: ['IDLE', 'SCANNING', 'ACTIVE', 'ERROR', 'PAUSED'],
      default: 'IDLE',
      index: true
    },
    lastScannedBlock: {
      type: Number,
      default: null
    },
    lastScannedSignature: {
      type: String,
      default: null
    },
    lastCheckedAt: {
      type: Date,
      default: null
    },
    lastSuccessfulCheckAt: {
      type: Date,
      default: null
    },
    lastErrorAt: {
      type: Date,
      default: null
    },
    lastErrorMessage: {
      type: String,
      default: null
    },
    lastActivityAt: {
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

// Compound Unique Index: A user cannot track the exact same wallet on the same network twice
traderSchema.index({ userId: 1, network: 1, walletAddress: 1 }, { unique: true });

// Filter indexes for fast dashboard queries
traderSchema.index({ userId: 1, trackingEnabled: 1 });
traderSchema.index({ userId: 1, createdAt: -1 });

traderSchema.methods.toSafeObject = function () {
  return {
    id: this._id.toString(),
    userId: this.userId.toString(),
    displayName: this.displayName,
    walletAddress: this.walletAddress,
    network: this.network,
    status: this.status,
    trackingEnabled: this.trackingEnabled,
    notes: this.notes,
    monitoringStatus: this.monitoringStatus,
    lastScannedBlock: this.lastScannedBlock,
    lastScannedSignature: this.lastScannedSignature,
    lastCheckedAt: this.lastCheckedAt,
    lastSuccessfulCheckAt: this.lastSuccessfulCheckAt,
    lastErrorAt: this.lastErrorAt,
    lastErrorMessage: this.lastErrorMessage,
    lastActivityAt: this.lastActivityAt,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

const Trader = mongoose.model('Trader', traderSchema);

module.exports = {
  Trader,
  TRADER_STATUS
};
