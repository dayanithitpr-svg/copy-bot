const ApiResponse = require('../utils/apiResponse');
const logger = require('../utils/logger');
const { HTTP_STATUS, ERROR_CODES } = require('../config/constants');
const metricsService = require('../services/metricsService');

const errorHandler = (err, req, res, next) => {
  metricsService.increment('apiErrorsTotal');

  let statusCode = err.statusCode;
  let message = err.message;
  let code = err.code;
  let details = err.details || [];
  let isOperational = err.isOperational || false;

  // 1. Mongoose Schema Validation Errors -> 400
  if (err.name === 'ValidationError') {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    code = ERROR_CODES.VALIDATION_ERROR;
    message = 'Validation failed for one or more fields';
    isOperational = true;
    details = Object.values(err.errors || {}).map((e) => ({
      field: e.path,
      message: e.message
    }));
  }

  // 2. Mongoose Duplicate Key Error (code 11000) -> 409
  else if (err.code === 11000 || (err.name === 'MongoServerError' && err.code === 11000)) {
    statusCode = HTTP_STATUS.CONFLICT;
    code = ERROR_CODES.RESOURCE_CONFLICT;
    message = 'A resource with this key already exists';
    isOperational = true;
    const field = Object.keys(err.keyValue || {})[0];
    if (field) {
      details = [{ field, message: `${field} already exists` }];
    }
  }

  // 3. Mongoose Cast Error (invalid ObjectId) -> 400
  else if (err.name === 'CastError') {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    code = ERROR_CODES.VALIDATION_ERROR;
    message = `Invalid format for field ${err.path}`;
    isOperational = true;
    details = [{ field: err.path, message: 'Invalid ID format' }];
  }

  // 4. JWT Verification / Expiry Errors -> 401
  else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    statusCode = HTTP_STATUS.UNAUTHORIZED;
    code = ERROR_CODES.AUTHENTICATION_FAILED;
    message = err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token signature';
    isOperational = true;
  }

  // 5. CORS Origin Policy Errors -> 403
  else if (message && typeof message === 'string' && message.includes('CORS policy violation')) {
    statusCode = HTTP_STATUS.FORBIDDEN;
    code = ERROR_CODES.FORBIDDEN_RESOURCE;
    isOperational = true;
  }

  // 6. JSON Body Parser Syntax Error -> 400
  else if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    code = ERROR_CODES.VALIDATION_ERROR;
    message = 'Malformed JSON payload in request body';
    isOperational = true;
  }

  // Default fallbacks
  statusCode = statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  message = message || 'Internal Server Error';
  code = code || ERROR_CODES.INTERNAL_ERROR;

  if (!isOperational && statusCode >= 500) {
    logger.error('Unhandled System Error:', {
      message: err.message,
      stack: err.stack,
      path: req.originalUrl,
      requestId: req.id
    });
  }

  // Hide internal stack trace and raw message in production for 500s unless operational
  const safeMessage = (!isOperational && process.env.NODE_ENV === 'production' && statusCode >= 500)
    ? 'An unexpected error occurred. Please try again later.'
    : message;

  return res.status(statusCode).json({
    success: false,
    message: safeMessage,
    error: {
      code,
      message: safeMessage,
      details,
      requestId: req.id || null
    },
    requestId: req.id || null
  });
};

module.exports = errorHandler;
