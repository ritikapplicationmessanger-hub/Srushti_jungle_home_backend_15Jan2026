const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

const signToken = (payload, secret, options = {}) => {
  try {
    return jwt.sign(payload, secret, options);
  } catch (error) {
    logger.error('JWT signing failed:', error.message);
    throw error;
  }
};

const verifyToken = (token, secret) => {
  try {
    return jwt.verify(token, secret);
  } catch (error) {
    logger.warn('JWT verification failed:', error.message);
    return null;
  }
};

const generateAccessToken = (userId, role) => {
  return signToken(
    { id: userId, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m' }
  );
};

const generateRefreshToken = (userId) => {
  return signToken(
    { id: userId },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d' }
  );
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
};