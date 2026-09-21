const mongoose = require('mongoose');
const { ROLES, USER_STATUS } = require('../config/constants');

const refreshTokenSchema = new mongoose.Schema(
  {
    tokenHash: {
      type: String,
      required: true,
      index: true
    },
    expiresAt: {
      type: Date,
      required: true
    },
    userAgent: {
      type: String,
      default: 'Unknown'
    },
    ipAddress: {
      type: String,
      default: 'Unknown'
    }
  },
  { _id: true, timestamps: { createdAt: true, updatedAt: false } }
);

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    password: {
      type: String,
      required: [true, 'Password hash is required'],
      minlength: 60 // Hash length
    },
    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.USER,
      index: true
    },
    status: {
      type: String,
      enum: Object.values(USER_STATUS),
      default: USER_STATUS.ACTIVE,
      index: true
    },
    profile: {
      displayName: {
        type: String,
        trim: true,
        maxlength: 50,
        default: ''
      },
      avatarUrl: {
        type: String,
        default: ''
      }
    },
    preferences: {
      currency: {
        type: String,
        default: 'USD',
        uppercase: true
      },
      theme: {
        type: String,
        enum: ['dark', 'light'],
        default: 'dark'
      }
    },
    refreshTokens: [refreshTokenSchema],
    lastLoginAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        delete ret.password;
        delete ret.refreshTokens;
        delete ret.__v;
        ret.id = ret._id;
        delete ret._id;
        return ret;
      }
    }
  }
);

// Method to return safe public object
userSchema.methods.toSafeObject = function () {
  return {
    id: this._id.toString(),
    email: this.email,
    role: this.role,
    status: this.status,
    profile: {
      displayName: this.profile?.displayName || this.email.split('@')[0],
      avatarUrl: this.profile?.avatarUrl || ''
    },
    preferences: this.preferences,
    createdAt: this.createdAt,
    lastLoginAt: this.lastLoginAt
  };
};

const User = mongoose.model('User', userSchema);

module.exports = User;
