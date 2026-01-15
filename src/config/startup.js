const mongoose = require('mongoose');
const logger = require('../utils/logger');
const { validateEnvironmentVariables } = require('../utils/validation');
const { verifyEmailConfig } = require('./email');

/**
 * Validates all dependencies and configurations on startup
 * @returns {Promise<Object>} { success: boolean, errors: string[] }
 */
const validateStartup = async () => {
  const errors = [];
  const warnings = [];

  logger.info('='.repeat(60));
  logger.info('Starting Application Startup Validation...');
  logger.info('='.repeat(60));

  // 1. Validate environment variables
  logger.info('Validating environment variables...');
  const envValidation = validateEnvironmentVariables();
  if (!envValidation.isValid) {
    errors.push(...envValidation.errors);
    envValidation.errors.forEach(error => logger.error(`ENV ERROR: ${error}`));
  } else {
    logger.info('✓ Environment variables validated successfully');
  }

  // 2. Validate MongoDB connection
  logger.info('Validating MongoDB connection...');
  try {
    const dbState = mongoose.connection.readyState;
    if (dbState === 1) {
      logger.info(`✓ MongoDB connected successfully to: ${mongoose.connection.host}`);
    } else {
      errors.push('MongoDB connection is not ready');
      logger.error('✗ MongoDB connection failed');
    }
  } catch (error) {
    errors.push(`MongoDB validation error: ${error.message}`);
    logger.error(`✗ MongoDB validation error: ${error.message}`);
  }

  // 3. Validate email configuration (non-critical)
  logger.info('Validating email configuration...');
  try {
    const emailValid = await verifyEmailConfig();
    if (emailValid) {
      logger.info('✓ Email configuration verified successfully');
    } else {
      warnings.push('Email configuration not available or invalid');
      logger.warn('⚠ Email configuration validation failed (non-critical)');
    }
  } catch (error) {
    warnings.push(`Email validation error: ${error.message}`);
    logger.warn(`⚠ Email validation error: ${error.message} (non-critical)`);
  }

  // 4. Check critical directories exist
  logger.info('Checking critical directories...');
  const fs = require('fs');
  const path = require('path');
  
  const directories = [
    { path: path.join(__dirname, '../logs'), name: 'Logs directory' },
    { path: path.join(__dirname, '../../uploads'), name: 'Uploads directory' }
  ];

  directories.forEach(dir => {
    if (!fs.existsSync(dir.path)) {
      try {
        fs.mkdirSync(dir.path, { recursive: true });
        logger.info(`✓ Created ${dir.name}: ${dir.path}`);
      } catch (error) {
        warnings.push(`Failed to create ${dir.name}: ${error.message}`);
        logger.warn(`⚠ Failed to create ${dir.name}`);
      }
    } else {
      logger.info(`✓ ${dir.name} exists`);
    }
  });

  // 5. System resource check
  logger.info('Checking system resources...');
  const memoryUsage = process.memoryUsage();
  const memoryInMB = {
    rss: Math.round(memoryUsage.rss / 1024 / 1024),
    heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
    heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
    external: Math.round(memoryUsage.external / 1024 / 1024)
  };
  
  logger.info(`Memory Usage: RSS=${memoryInMB.rss}MB, Heap=${memoryInMB.heapUsed}/${memoryInMB.heapTotal}MB`);
  
  // 6. Node.js version check
  const nodeVersion = process.version;
  logger.info(`Node.js Version: ${nodeVersion}`);
  
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0], 10);
  if (majorVersion < 18) {
    warnings.push(`Node.js version ${nodeVersion} is below recommended v18+`);
    logger.warn(`⚠ Node.js version ${nodeVersion} is below recommended v18+`);
  } else {
    logger.info('✓ Node.js version is compatible');
  }

  // Summary
  logger.info('='.repeat(60));
  if (errors.length === 0) {
    logger.info('✓ Startup validation completed successfully');
    if (warnings.length > 0) {
      logger.warn(`⚠ ${warnings.length} warning(s) detected (non-critical)`);
      warnings.forEach(warning => logger.warn(`  - ${warning}`));
    }
  } else {
    logger.error('✗ Startup validation failed');
    logger.error(`${errors.length} critical error(s) detected:`);
    errors.forEach(error => logger.error(`  - ${error}`));
  }
  logger.info('='.repeat(60));

  return {
    success: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * Monitors system resources periodically
 */
const startResourceMonitoring = () => {
  const interval = parseInt(process.env.HEALTH_CHECK_INTERVAL || '60', 10) * 1000;
  
  setInterval(() => {
    const memoryUsage = process.memoryUsage();
    const memoryInMB = {
      rss: Math.round(memoryUsage.rss / 1024 / 1024),
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024)
    };
    
    const uptime = Math.round(process.uptime());
    
    logger.debug(`Resource Monitor - Uptime: ${uptime}s, Memory: ${memoryInMB.heapUsed}/${memoryInMB.heapTotal}MB (RSS: ${memoryInMB.rss}MB)`);
    
    // Alert if memory usage is too high
    const heapPercentage = (memoryInMB.heapUsed / memoryInMB.heapTotal) * 100;
    if (heapPercentage > 90) {
      logger.warn(`High memory usage detected: ${heapPercentage.toFixed(2)}% of heap used`);
    }
  }, interval);
  
  logger.info(`Resource monitoring started (interval: ${interval / 1000}s)`);
};

module.exports = {
  validateStartup,
  startResourceMonitoring
};
