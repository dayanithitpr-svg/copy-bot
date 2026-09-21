const auditService = require('../services/auditService');
const ApiResponse = require('../utils/apiResponse');

class AuditController {
  /**
   * GET /api/v1/audit/logs
   * Retrieves paginated, user-scoped audit trail of security and execution events
   */
  async getLogs(req, res, next) {
    try {
      const userId = req.user.id || req.user.userId;
      const { eventType, severity, resourceType, page = 1, limit = 20 } = req.query;

      const result = await auditService.listUserLogs(
        userId,
        { eventType, severity, resourceType },
        { page: parseInt(page, 10) || 1, limit: parseInt(limit, 10) || 20 }
      );

      return ApiResponse.success(res, {
        statusCode: 200,
        message: 'Audit logs retrieved successfully',
        data: {
          items: result.items,
          pagination: {
            total: result.total,
            page: result.page,
            pages: result.pages,
            limit: parseInt(limit, 10) || 20
          }
        }
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AuditController();
