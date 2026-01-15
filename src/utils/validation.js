const logger = require('./logger');

/**
 * Validates that all required environment variables are set
 * @returns {Object} { isValid: boolean, errors: string[] }
 */
const validateEnvironmentVariables = () => {
  const errors = [];
  
  // Required environment variables
  const required = [
    'NODE_ENV',
    'PORT',
    'MONGODB_URI',
    'JWT_SECRET',
    'FRONTEND_URL'
  ];

  // Check for missing required variables
  required.forEach(varName => {
    if (!process.env[varName]) {
      errors.push(`Missing required environment variable: ${varName}`);
    }
  });

  // Validate MongoDB URI format
  if (process.env.MONGODB_URI) {
    const mongoUriPattern = /^mongodb(\+srv)?:\/\/.+/;
    if (!mongoUriPattern.test(process.env.MONGODB_URI)) {
      errors.push('Invalid MONGODB_URI format. Should start with mongodb:// or mongodb+srv://');
    }
  }

  // Validate PORT is a number
  if (process.env.PORT && isNaN(parseInt(process.env.PORT, 10))) {
    errors.push('PORT must be a valid number');
  }

  // Validate NODE_ENV
  const validEnvironments = ['development', 'production', 'staging', 'test'];
  if (process.env.NODE_ENV && !validEnvironments.includes(process.env.NODE_ENV)) {
    errors.push(`NODE_ENV must be one of: ${validEnvironments.join(', ')}`);
  }

  // Validate JWT_SECRET strength (at least 32 characters in production)
  if (process.env.NODE_ENV === 'production' && process.env.JWT_SECRET) {
    if (process.env.JWT_SECRET.length < 32) {
      errors.push('JWT_SECRET must be at least 32 characters long in production');
    }
    if (process.env.JWT_SECRET === 'your-super-secret-jwt-key-change-this-in-production') {
      errors.push('JWT_SECRET must be changed from default value in production');
    }
  }

  // Warn about email configuration (not critical but important)
  if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
    logger.warn('Email credentials not configured. Email features will be disabled.');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validates MongoDB URI connectivity
 * @param {string} uri - MongoDB connection string
 * @returns {boolean}
 */
const validateMongoDBUri = (uri) => {
  if (!uri) return false;
  
  const mongoUriPattern = /^mongodb(\+srv)?:\/\/[^\s]+/;
  return mongoUriPattern.test(uri);
};

/**
 * Validates email address format
 * @param {string} email - Email address
 * @returns {boolean}
 */
const validateEmail = (email) => {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailPattern.test(email);
};

/**
 * Validates URL format
 * @param {string} url - URL string
 * @returns {boolean}
 */
const validateUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Sanitizes sensitive data for logging
 * @param {Object} data - Data object
 * @returns {Object} - Sanitized data
 */
const sanitizeForLogging = (data) => {
  const sensitive = ['password', 'token', 'secret', 'key', 'authorization'];
  const sanitized = { ...data };
  
  Object.keys(sanitized).forEach(key => {
    if (sensitive.some(word => key.toLowerCase().includes(word))) {
      sanitized[key] = '[REDACTED]';
    }
  });
  
  return sanitized;
};

module.exports = {
  validateEnvironmentVariables,
  validateMongoDBUri,
  validateEmail,
  validateUrl,
  sanitizeForLogging
};
