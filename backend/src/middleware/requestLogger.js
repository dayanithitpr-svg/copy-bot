const logger = require('../utils/logger');

const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      requestId: req.id,
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip
    };

    if (res.statusCode >= 500) {
      logger.error(`${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`, logData);
    } else if (res.statusCode >= 400) {
      logger.warn(`${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`, logData);
    } else {
      logger.info(`${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`, logData);
    }
  });

  next();
};

module.exports = requestLogger;
