const rateLimit = require('express-rate-limit');
const env = require('../config/env');
const ApiResponse = require('../utils/apiResponse');
const { HTTP_STATUS, ERROR_CODES } = require('../config/constants');
const metricsService = require('../services/metricsService');

const createLimiter = ({ windowMs, max, message }) => {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      metricsService.increment('apiErrorsTotal');
      return ApiResponse.error(res, {
        statusCode: HTTP_STATUS.TOO_MANY_REQUESTS,
        message,
        error: {
          code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
          details: [{ field: 'rate_limit', message: 'Too many requests. Please slow down.' }]
        }
      });
    }
  });
};

// 1. Global API Limiter
const globalLimiter = createLimiter({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  message: 'Too many requests from this IP address, please try again after 15 minutes.'
});

// 2. Strict Authentication Limiter
const authLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: env.AUTH_RATE_LIMIT_MAX,
  message: 'Too many authentication attempts. Please try again after 15 minutes.'
});

// 3. Strict Execution Limiter
const executionLimiter = createLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 30,             // 30 execution operations per minute
  message: 'Execution rate limit exceeded. Please wait a moment before sending additional execution commands.'
});

// 4. Dry-run safety simulation limiter
const dryRunLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 60,
  message: 'Simulation rate limit reached. Please throttle requests.'
});

module.exports = {
  globalLimiter,
  authLimiter,
  executionLimiter,
  dryRunLimiter
};
