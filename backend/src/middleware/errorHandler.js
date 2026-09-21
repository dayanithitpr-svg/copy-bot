const ApiResponse = require('../utils/apiResponse');
const logger = require('../utils/logger');
const { HTTP_STATUS, ERROR_CODES } = require('../config/constants');
const metricsService = require('../services/metricsService');

const errorHandler = (err, req, res, next) => {
  metricsService.increment('apiErrorsTotal');

  const isOperational = err.isOperational || false;
  const statusCode = err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  const message = err.message || 'Internal Server Error';
  const code = err.code || ERROR_CODES.INTERNAL_ERROR;
  const details = err.details || [];

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
