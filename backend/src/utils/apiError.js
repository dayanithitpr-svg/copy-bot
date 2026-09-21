const { HTTP_STATUS, ERROR_CODES } = require('../config/constants');

class ApiError extends Error {
  constructor(statusCode, message, code = ERROR_CODES.INTERNAL_ERROR, details = []) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message = 'Bad Request', code = ERROR_CODES.VALIDATION_ERROR, details = []) {
    return new ApiError(HTTP_STATUS.BAD_REQUEST, message, code, details);
  }

  static unauthorized(message = 'Unauthorized', code = ERROR_CODES.AUTHENTICATION_FAILED, details = []) {
    return new ApiError(HTTP_STATUS.UNAUTHORIZED, message, code, details);
  }

  static forbidden(message = 'Forbidden resource access', code = ERROR_CODES.FORBIDDEN_RESOURCE, details = []) {
    return new ApiError(HTTP_STATUS.FORBIDDEN, message, code, details);
  }

  static notFound(message = 'Resource not found', code = ERROR_CODES.RESOURCE_NOT_FOUND, details = []) {
    return new ApiError(HTTP_STATUS.NOT_FOUND, message, code, details);
  }

  static conflict(message = 'Resource already exists', code = ERROR_CODES.RESOURCE_CONFLICT, details = []) {
    return new ApiError(HTTP_STATUS.CONFLICT, message, code, details);
  }

  static unprocessable(message = 'Unprocessable Entity', code = ERROR_CODES.VALIDATION_ERROR, details = []) {
    return new ApiError(HTTP_STATUS.UNPROCESSABLE_ENTITY, message, code, details);
  }

  static rateLimit(message = 'Too many requests, please try again later', code = ERROR_CODES.RATE_LIMIT_EXCEEDED) {
    return new ApiError(HTTP_STATUS.TOO_MANY_REQUESTS, message, code);
  }

  static databaseUnavailable(message = 'Database service is currently unavailable', details = []) {
    return new ApiError(HTTP_STATUS.SERVICE_UNAVAILABLE, message, ERROR_CODES.DATABASE_UNAVAILABLE, details);
  }

  static internal(message = 'Internal server error', details = []) {
    return new ApiError(HTTP_STATUS.INTERNAL_SERVER_ERROR, message, ERROR_CODES.INTERNAL_ERROR, details);
  }
}

module.exports = ApiError;
