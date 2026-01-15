const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

// Create reusable transporter object using Gmail with App Password
const createTransporter = () => {
  return nodemailer.createTransporter({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_APP_PASSWORD,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
};

// Verify connection on startup
const verifyEmailConfig = async () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
    logger.warn('Email credentials not provided in .env');
    return false;
  }

  try {
    const transporter = createTransporter();
    await transporter.verify();
    logger.info('Email server connection verified successfully');
    return true;
  } catch (error) {
    logger.error('Email server connection failed:', error.message);
    return false;
  }
};

module.exports = {
  createTransporter,
  verifyEmailConfig,
};