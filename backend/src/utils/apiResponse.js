/**
 * Standardized API Response Builders
 */

class ApiResponse {
  static success(res, { statusCode = 200, message = 'Success', data = null, meta = null }) {
    const payload = {
      success: true,
      message
    };

    if (data !== null && data !== undefined) {
      payload.data = data;
    }

    if (meta) {
      payload.meta = meta;
    }

    return res.status(statusCode).json(payload);
  }

  static error(res, { statusCode = 500, message = 'An error occurred', error = {} }) {
    const payload = {
      success: false,
      message,
      error: {
        code: error.code || 'INTERNAL_ERROR',
        details: error.details || []
      }
    };

    if (process.env.NODE_ENV === 'development' && error.stack) {
      payload.error.stack = error.stack;
    }

    return res.status(statusCode).json(payload);
  }
}

module.exports = ApiResponse;
