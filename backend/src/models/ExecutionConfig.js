const mongoose = require('mongoose');

const EXECUTION_MODE = {
  PAPER: 'PAPER',
  TESTNET: 'TESTNET'
};

const executionConfigSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      unique: true,
      index: true
    },
    mode: {
      type: String,
      enum: Object.values(EXECUTION_MODE),
      default: EXECUTION_MODE.PAPER
    },
    enabled: {
      type: Boolean,
      default: false
    },
    allowedNetworks: {
      type: [String],
      default: ['sepolia', 'base-sepolia']
    },
    // Max testnet units per single execution
    maxExecutionAmount: {
      type: Number,
      default: 100,
      min: [0.001, 'Max execution amount must be positive']
    },
    // Rolling 24h testnet execution budget
    maxDailyExecutionAmount: {
      type: Number,
      default: 500,
      min: [0.001, 'Max daily execution amount must be positive']
    },
    // Gas cost ceiling in Gwei
    maxGasCostGwei: {
      type: Number,
      default: 50,
      min: [1, 'Max gas cost must be at least 1 Gwei']
    },
    // Max allowable slippage in Basis Points (100 = 1%)
    maxSlippageBps: {
      type: Number,
      default: 100,
      min: [10, 'Slippage must be at least 10 bps (0.1%)'],
      max: [500, 'Slippage cannot exceed 500 bps (5%)']
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

executionConfigSchema.methods.toSafeObject = function () {
  return {
    id: this._id.toString(),
    userId: this.userId.toString(),
    mode: this.mode,
    enabled: this.enabled,
    allowedNetworks: this.allowedNetworks,
    maxExecutionAmount: this.maxExecutionAmount,
    maxDailyExecutionAmount: this.maxDailyExecutionAmount,
    maxGasCostGwei: this.maxGasCostGwei,
    maxSlippageBps: this.maxSlippageBps,
    updatedAt: this.updatedAt,
    createdAt: this.createdAt
  };
};

const ExecutionConfig = mongoose.model('ExecutionConfig', executionConfigSchema);

module.exports = {
  ExecutionConfig,
  EXECUTION_MODE
};
