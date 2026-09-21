const mongoose = require('mongoose');

const AUDIT_EVENT_TYPE = {
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILURE: 'LOGIN_FAILURE',
  LOGOUT: 'LOGOUT',
  TRADER_CREATED: 'TRADER_CREATED',
  TRADER_UPDATED: 'TRADER_UPDATED',
  TRADER_DELETED: 'TRADER_DELETED',
  COPY_RULE_CREATED: 'COPY_RULE_CREATED',
  COPY_RULE_UPDATED: 'COPY_RULE_UPDATED',
  COPY_RULE_DELETED: 'COPY_RULE_DELETED',
  RISK_CONFIG_UPDATED: 'RISK_CONFIG_UPDATED',
  EXECUTION_MODE_CHANGED: 'EXECUTION_MODE_CHANGED',
  EXECUTION_KILL_SWITCH_CHANGED: 'EXECUTION_KILL_SWITCH_CHANGED',
  EXECUTION_REQUESTED: 'EXECUTION_REQUESTED',
  EXECUTION_REJECTED: 'EXECUTION_REJECTED',
  EXECUTION_CONFIRMED: 'EXECUTION_CONFIRMED',
  EXECUTION_FAILED: 'EXECUTION_FAILED',
  RECOVERY_ATTEMPTED: 'RECOVERY_ATTEMPTED',
  SYSTEM_STATE_CHANGED: 'SYSTEM_STATE_CHANGED'
};

const AUDIT_SEVERITY = {
  INFO: 'INFO',
  WARN: 'WARN',
  SECURITY: 'SECURITY',
  CRITICAL: 'CRITICAL'
};

const auditLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true
    },
    eventType: {
      type: String,
      enum: Object.values(AUDIT_EVENT_TYPE),
      required: true,
      index: true
    },
    severity: {
      type: String,
      enum: Object.values(AUDIT_SEVERITY),
      default: AUDIT_SEVERITY.INFO,
      index: true
    },
    resourceType: {
      type: String,
      enum: ['USER', 'TRADER', 'COPY_RULE', 'RISK', 'EXECUTION', 'SYSTEM', 'AUTH'],
      required: true,
      index: true
    },
    resourceId: {
      type: String,
      default: null
    },
    action: {
      type: String,
      required: true
    },
    ipAddress: {
      type: String,
      default: 'Unknown'
    },
    userAgent: {
      type: String,
      default: 'Unknown'
    },
    requestId: {
      type: String,
      default: null,
      index: true
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // Immutable: no updatedAt
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

// Indexes for high-frequency audit queries
auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ eventType: 1, createdAt: -1 });
auditLogSchema.index({ severity: 1, createdAt: -1 });

auditLogSchema.methods.toSafeObject = function () {
  return {
    id: this._id.toString(),
    userId: this.userId ? this.userId.toString() : null,
    eventType: this.eventType,
    severity: this.severity,
    resourceType: this.resourceType,
    resourceId: this.resourceId,
    action: this.action,
    ipAddress: this.ipAddress,
    userAgent: this.userAgent,
    requestId: this.requestId,
    details: this.details,
    createdAt: this.createdAt
  };
};

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = {
  AuditLog,
  AUDIT_EVENT_TYPE,
  AUDIT_SEVERITY
};
