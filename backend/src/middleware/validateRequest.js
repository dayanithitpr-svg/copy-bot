const { validationResult } = require('express-validator');
const ApiError = require('../utils/apiError');
const { ERROR_CODES } = require('../config/constants');

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((err) => ({
      field: err.path || err.param,
      message: err.msg,
      value: err.value && typeof err.value === 'string' && err.path === 'password' ? '***' : err.value
    }));

    throw ApiError.badRequest('Validation failed for one or more fields', ERROR_CODES.VALIDATION_ERROR, formattedErrors);
  }
  next();
};

module.exports = validateRequest;
