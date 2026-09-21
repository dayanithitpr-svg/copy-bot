const ApiError = require('../utils/apiError');

/**
 * Middleware factory to enforce Role-Based Access Control (RBAC)
 * @param  {...string} allowedRoles 
 */
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        ApiError.forbidden(`Access restricted. Requires one of the following roles: ${allowedRoles.join(', ')}`)
      );
    }

    next();
  };
};

module.exports = {
  requireRole
};
