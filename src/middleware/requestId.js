const crypto = require('crypto');

/**
 * Request ID middleware
 * Generates a unique ID for each request for tracking and logging
 */
const requestId = (req, res, next) => {
  // Check if request ID is provided in header
  const existingId = req.get('X-Request-ID');
  
  // Generate new ID if not provided
  const requestId = existingId || crypto.randomUUID();
  
  // Attach to request object
  req.id = requestId;
  
  // Add to response headers
  res.setHeader('X-Request-ID', requestId);
  
  // Log request with ID
  req.requestStartTime = Date.now();
  
  // Override res.json to log response time
  const originalJson = res.json.bind(res);
  res.json = function (body) {
    const duration = Date.now() - req.requestStartTime;
    res.setHeader('X-Response-Time', `${duration}ms`);
    return originalJson(body);
  };
  
  next();
};

module.exports = requestId;
