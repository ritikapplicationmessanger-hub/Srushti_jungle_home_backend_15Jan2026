const logger = require('../utils/logger');

/**
 * Request timeout middleware
 * Terminates requests that exceed the configured timeout
 */
const requestTimeout = (timeoutMs = 30000) => {
  return (req, res, next) => {
    // Set timeout for the request
    req.setTimeout(timeoutMs, () => {
      logger.warn(`Request timeout: ${req.method} ${req.originalUrl} exceeded ${timeoutMs}ms`, {
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        userAgent: req.get('user-agent')
      });
      
      // Only send response if headers haven't been sent
      if (!res.headersSent) {
        res.status(408).json({
          success: false,
          message: 'Request timeout - The server took too long to respond',
          error: 'REQUEST_TIMEOUT'
        });
      }
    });

    // Also set response timeout
    res.setTimeout(timeoutMs, () => {
      logger.warn(`Response timeout: ${req.method} ${req.originalUrl}`, {
        method: req.method,
        url: req.originalUrl,
        ip: req.ip
      });
    });

    next();
  };
};

module.exports = requestTimeout;
