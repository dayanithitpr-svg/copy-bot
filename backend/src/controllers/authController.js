const authService = require('../services/authService');
const auditService = require('../services/auditService');
const { AUDIT_EVENT_TYPE, AUDIT_SEVERITY } = require('../models/AuditLog');
const ApiResponse = require('../utils/apiResponse');
const TokenSecurity = require('../security/tokenSecurity');

const getClientInfo = (req) => ({
  userAgent: req.headers['user-agent'] || 'Unknown',
  ipAddress: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Unknown'
});

class AuthController {
  async register(req, res, next) {
    try {
      const { email, password, displayName } = req.body;
      const clientInfo = getClientInfo(req);

      const result = await authService.register({ email, password, displayName }, clientInfo);

      // Set secure HTTP-only refresh token cookie
      res.cookie('refreshToken', result.refreshToken, TokenSecurity.getRefreshTokenCookieOptions());

      await auditService.logEvent({
        userId: result.user.id,
        eventType: AUDIT_EVENT_TYPE.LOGIN_SUCCESS,
        severity: AUDIT_SEVERITY.INFO,
        resourceType: 'AUTH',
        resourceId: result.user.id,
        action: 'USER_REGISTERED',
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent,
        requestId: req.id,
        details: { email: result.user.email }
      });

      return ApiResponse.success(res, {
        statusCode: 201,
        message: 'Account registered successfully',
        data: {
          user: result.user,
          accessToken: result.accessToken
        }
      });
    } catch (err) {
      next(err);
    }
  }

  async login(req, res, next) {
    const clientInfo = getClientInfo(req);
    try {
      const { email, password } = req.body;

      const result = await authService.login({ email, password }, clientInfo);

      // Set secure HTTP-only refresh token cookie
      res.cookie('refreshToken', result.refreshToken, TokenSecurity.getRefreshTokenCookieOptions());

      await auditService.logEvent({
        userId: result.user.id,
        eventType: AUDIT_EVENT_TYPE.LOGIN_SUCCESS,
        severity: AUDIT_SEVERITY.INFO,
        resourceType: 'AUTH',
        resourceId: result.user.id,
        action: 'USER_LOGGED_IN',
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent,
        requestId: req.id,
        details: { email: result.user.email }
      });

      return ApiResponse.success(res, {
        statusCode: 200,
        message: 'Authentication successful',
        data: {
          user: result.user,
          accessToken: result.accessToken
        }
      });
    } catch (err) {
      await auditService.logEvent({
        eventType: AUDIT_EVENT_TYPE.LOGIN_FAILURE,
        severity: AUDIT_SEVERITY.WARN,
        resourceType: 'AUTH',
        action: 'LOGIN_FAILED',
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent,
        requestId: req.id,
        details: { email: req.body?.email || 'Unknown', error: err.message }
      });
      next(err);
    }
  }

  async refresh(req, res, next) {
    try {
      const rawRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
      const clientInfo = getClientInfo(req);

      const result = await authService.refresh(rawRefreshToken, clientInfo);

      // Rotate cookie
      res.cookie('refreshToken', result.refreshToken, TokenSecurity.getRefreshTokenCookieOptions());

      return ApiResponse.success(res, {
        statusCode: 200,
        message: 'Tokens rotated successfully',
        data: {
          user: result.user,
          accessToken: result.accessToken
        }
      });
    } catch (err) {
      next(err);
    }
  }

  async logout(req, res, next) {
    try {
      const rawRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
      const clientInfo = getClientInfo(req);

      if (rawRefreshToken) {
        await authService.logout(rawRefreshToken);
      }

      // Clear cookie
      res.clearCookie('refreshToken', TokenSecurity.getClearCookieOptions());

      if (req.user?.id) {
        await auditService.logEvent({
          userId: req.user.id,
          eventType: AUDIT_EVENT_TYPE.LOGOUT,
          severity: AUDIT_SEVERITY.INFO,
          resourceType: 'AUTH',
          resourceId: req.user.id,
          action: 'USER_LOGGED_OUT',
          ipAddress: clientInfo.ipAddress,
          userAgent: clientInfo.userAgent,
          requestId: req.id
        });
      }

      return ApiResponse.success(res, {
        statusCode: 200,
        message: 'Logged out successfully'
      });
    } catch (err) {
      next(err);
    }
  }

  async getCurrentUser(req, res, next) {
    try {
      return ApiResponse.success(res, {
        statusCode: 200,
        message: 'User session verified',
        data: {
          user: req.user
        }
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AuthController();
