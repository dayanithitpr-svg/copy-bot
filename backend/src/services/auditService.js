const auditLogRepository = require('../repositories/auditLogRepository');
const { AUDIT_EVENT_TYPE, AUDIT_SEVERITY } = require('../models/AuditLog');
const logger = require('../utils/logger');

class AuditService {
  /**
   * Records a security or operational audit event
   * 
   * @param {Object} params
   * @param {string} [params.userId]
   * @param {string} params.eventType
   * @param {string} [params.severity='INFO']
   * @param {string} params.resourceType
   * @param {string} [params.resourceId]
   * @param {string} params.action
   * @param {string} [params.ipAddress]
   * @param {string} [params.userAgent]
   * @param {string} [params.requestId]
   * @param {Object} [params.details]
   */
  async logEvent({
    userId = null,
    eventType,
    severity = AUDIT_SEVERITY.INFO,
    resourceType,
    resourceId = null,
    action,
    ipAddress = 'Unknown',
    userAgent = 'Unknown',
    requestId = null,
    details = {}
  }) {
    try {
      // Ensure all sensitive data in details is deeply redacted
      const safeDetails = logger.sanitize(details || {});

      const entry = await auditLogRepository.createLog({
        userId,
        eventType,
        severity,
        resourceType,
        resourceId: resourceId ? String(resourceId) : null,
        action,
        ipAddress,
        userAgent,
        requestId,
        details: safeDetails
      });

      logger.info(`[AUDIT] ${severity} - ${eventType} on ${resourceType}${resourceId ? ':' + resourceId : ''} (${action})`, {
        userId,
        requestId,
        eventType
      });

      return entry;
    } catch (err) {
      logger.error(`Error in audit service: ${err.message}`);
      return null;
    }
  }

  async listUserLogs(userId, filters = {}, pagination = {}) {
    return await auditLogRepository.listLogs({
      userId,
      ...filters,
      page: parseInt(pagination.page, 10) || 1,
      limit: parseInt(pagination.limit, 10) || 20
    });
  }

  async listSystemLogs(filters = {}, pagination = {}) {
    return await auditLogRepository.listLogs({
      ...filters,
      page: parseInt(pagination.page, 10) || 1,
      limit: parseInt(pagination.limit, 10) || 20
    });
  }
}

module.exports = new AuditService();
