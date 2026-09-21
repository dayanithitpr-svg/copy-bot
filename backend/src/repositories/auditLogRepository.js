const { AuditLog } = require('../models/AuditLog');
const { getDBStatus } = require('../config/database');
const logger = require('../utils/logger');

class AuditLogRepository {
  /**
   * Appends an immutable audit log entry
   */
  async createLog(logData) {
    const dbStatus = getDBStatus();
    if (dbStatus.status !== 'healthy') {
      logger.warn(`[AUDIT] Database unavailable. Logged in-memory: ${logData.eventType} - ${logData.action}`);
      return null;
    }

    try {
      const entry = new AuditLog(logData);
      return await entry.save();
    } catch (err) {
      logger.error(`Failed to persist audit log: ${err.message}`);
      return null;
    }
  }

  /**
   * Queries paginated audit logs for a user or system
   */
  async listLogs({ userId = null, eventType = null, severity = null, resourceType = null, page = 1, limit = 20 } = {}) {
    const dbStatus = getDBStatus();
    if (dbStatus.status !== 'healthy') {
      return { items: [], total: 0, page: 1, pages: 1 };
    }

    const query = {};
    if (userId) query.userId = userId;
    if (eventType) query.eventType = eventType;
    if (severity) query.severity = severity;
    if (resourceType) query.resourceType = resourceType;

    const skip = (Math.max(1, page) - 1) * limit;

    const [items, total] = await Promise.all([
      AuditLog.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(query)
    ]);

    return {
      items,
      total,
      page: Math.max(1, page),
      pages: Math.ceil(total / limit) || 1
    };
  }
}

module.exports = new AuditLogRepository();
