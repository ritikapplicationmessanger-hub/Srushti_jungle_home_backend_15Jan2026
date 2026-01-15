#!/usr/bin/env node

/**
 * Startup Validation Script
 * Run this before deploying to production to validate configuration
 * Usage: node validate-startup.js
 */

require('dotenv').config();

const mongoose = require('mongoose');
const nodemailer = require('nodemailer');

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.cyan}ℹ${colors.reset} ${msg}`),
  section: (msg) => console.log(`\n${colors.blue}${msg}${colors.reset}`)
};

let hasErrors = false;
let hasWarnings = false;

/**
 * Validate environment variables
 */
function validateEnvironmentVariables() {
  log.section('='.repeat(60));
  log.section('Validating Environment Variables');
  log.section('='.repeat(60));

  const required = {
    NODE_ENV: 'Application environment',
    PORT: 'Server port',
    MONGODB_URI: 'MongoDB connection string',
    JWT_SECRET: 'JWT signing secret',
    FRONTEND_URL: 'Frontend application URL'
  };

  const optional = {
    EMAIL_USER: 'Email sender address',
    EMAIL_APP_PASSWORD: 'Email app password',
    API_BASE_URL: 'API base URL',
    ALLOWED_ORIGINS: 'Additional CORS origins',
    LOG_LEVEL: 'Logging level',
    REQUEST_TIMEOUT: 'Request timeout',
    DETAILED_HEALTH_CHECK: 'Detailed health check flag'
  };

  // Check required variables
  Object.entries(required).forEach(([key, description]) => {
    if (!process.env[key]) {
      log.error(`Missing required variable: ${key} (${description})`);
      hasErrors = true;
    } else {
      log.success(`${key}: ${description}`);
    }
  });

  // Check optional variables
  console.log('\nOptional Variables:');
  Object.entries(optional).forEach(([key, description]) => {
    if (!process.env[key]) {
      log.warn(`${key} not set (${description})`);
      hasWarnings = true;
    } else {
      log.success(`${key}: ${description}`);
    }
  });

  // Validate NODE_ENV
  if (process.env.NODE_ENV) {
    const validEnvs = ['development', 'production', 'staging', 'test'];
    if (!validEnvs.includes(process.env.NODE_ENV)) {
      log.error(`Invalid NODE_ENV: ${process.env.NODE_ENV}. Must be one of: ${validEnvs.join(', ')}`);
      hasErrors = true;
    }
  }

  // Validate PORT
  if (process.env.PORT && isNaN(parseInt(process.env.PORT, 10))) {
    log.error('PORT must be a valid number');
    hasErrors = true;
  }

  // Validate JWT_SECRET strength in production
  if (process.env.NODE_ENV === 'production' && process.env.JWT_SECRET) {
    if (process.env.JWT_SECRET.length < 32) {
      log.error('JWT_SECRET must be at least 32 characters in production');
      hasErrors = true;
    }
    if (process.env.JWT_SECRET === 'your-super-secret-jwt-key-change-this-in-production') {
      log.error('JWT_SECRET must be changed from default value in production');
      hasErrors = true;
    }
  }

  // Validate MongoDB URI format
  if (process.env.MONGODB_URI) {
    const mongoUriPattern = /^mongodb(\+srv)?:\/\/.+/;
    if (!mongoUriPattern.test(process.env.MONGODB_URI)) {
      log.error('Invalid MONGODB_URI format. Should start with mongodb:// or mongodb+srv://');
      hasErrors = true;
    } else {
      log.success('MongoDB URI format is valid');
    }
  }

  // Validate URLs
  if (process.env.FRONTEND_URL) {
    try {
      new URL(process.env.FRONTEND_URL);
      log.success('Frontend URL format is valid');
    } catch {
      log.error(`Invalid FRONTEND_URL format: ${process.env.FRONTEND_URL}`);
      hasErrors = true;
    }
  }
}

/**
 * Test MongoDB connection
 */
async function testMongoDBConnection() {
  log.section('\n' + '='.repeat(60));
  log.section('Testing MongoDB Connection');
  log.section('='.repeat(60));

  if (!process.env.MONGODB_URI) {
    log.error('Cannot test MongoDB connection: MONGODB_URI not set');
    hasErrors = true;
    return false;
  }

  try {
    log.info('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    
    const dbState = mongoose.connection.readyState;
    if (dbState === 1) {
      log.success(`MongoDB connected successfully to: ${mongoose.connection.host}`);
      log.info(`Database name: ${mongoose.connection.name}`);
      
      // Test a simple operation
      const collections = await mongoose.connection.db.listCollections().toArray();
      log.success(`Database has ${collections.length} collection(s)`);
      
      await mongoose.connection.close();
      log.success('MongoDB connection closed');
      return true;
    } else {
      log.error('MongoDB connection failed');
      hasErrors = true;
      return false;
    }
  } catch (error) {
    log.error(`MongoDB connection error: ${error.message}`);
    hasErrors = true;
    return false;
  }
}

/**
 * Test email configuration
 */
async function testEmailConfiguration() {
  log.section('\n' + '='.repeat(60));
  log.section('Testing Email Configuration');
  log.section('='.repeat(60));

  if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
    log.warn('Email credentials not provided. Email functionality will be disabled.');
    hasWarnings = true;
    return false;
  }

  try {
    log.info('Testing email server connection...');
    
    const transporter = nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    await transporter.verify();
    log.success('Email server connection verified successfully');
    log.info(`Email configured with: ${process.env.EMAIL_USER}`);
    return true;
  } catch (error) {
    log.error(`Email configuration error: ${error.message}`);
    log.warn('Email functionality will not work. Please check credentials.');
    hasWarnings = true;
    return false;
  }
}

/**
 * Check system requirements
 */
function checkSystemRequirements() {
  log.section('\n' + '='.repeat(60));
  log.section('Checking System Requirements');
  log.section('='.repeat(60));

  // Check Node.js version
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0], 10);
  
  log.info(`Node.js Version: ${nodeVersion}`);
  
  if (majorVersion < 18) {
    log.error(`Node.js version ${nodeVersion} is below required v18+`);
    hasErrors = true;
  } else {
    log.success('Node.js version meets requirements (v18+)');
  }

  // Check memory
  const memUsage = process.memoryUsage();
  const memInMB = {
    rss: Math.round(memUsage.rss / 1024 / 1024),
    heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
    heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024)
  };
  
  log.info(`Memory Usage: RSS=${memInMB.rss}MB, Heap=${memInMB.heapUsed}/${memInMB.heapTotal}MB`);
  
  if (memInMB.rss > 1024) {
    log.warn(`High initial memory usage: ${memInMB.rss}MB`);
    hasWarnings = true;
  } else {
    log.success('Memory usage is within normal range');
  }

  // Check platform
  log.info(`Platform: ${process.platform}`);
  log.info(`Architecture: ${process.arch}`);
}

/**
 * Check required directories
 */
function checkDirectories() {
  log.section('\n' + '='.repeat(60));
  log.section('Checking Required Directories');
  log.section('='.repeat(60));

  const fs = require('fs');
  const path = require('path');

  const directories = [
    { path: path.join(__dirname, 'src/logs'), name: 'Logs directory', create: true },
    { path: path.join(__dirname, 'uploads'), name: 'Uploads directory', create: true },
    { path: path.join(__dirname, 'node_modules'), name: 'Node modules', create: false },
    { path: path.join(__dirname, 'src'), name: 'Source directory', create: false }
  ];

  directories.forEach(dir => {
    if (fs.existsSync(dir.path)) {
      log.success(`${dir.name} exists: ${dir.path}`);
    } else {
      if (dir.create) {
        try {
          fs.mkdirSync(dir.path, { recursive: true });
          log.success(`Created ${dir.name}: ${dir.path}`);
        } catch (error) {
          log.error(`Failed to create ${dir.name}: ${error.message}`);
          hasErrors = true;
        }
      } else {
        log.error(`${dir.name} does not exist: ${dir.path}`);
        hasErrors = true;
      }
    }
  });
}

/**
 * Check required files
 */
function checkRequiredFiles() {
  log.section('\n' + '='.repeat(60));
  log.section('Checking Required Files');
  log.section('='.repeat(60));

  const fs = require('fs');
  const path = require('path');

  const files = [
    { path: path.join(__dirname, '.env'), name: '.env file' },
    { path: path.join(__dirname, 'server.js'), name: 'server.js' },
    { path: path.join(__dirname, 'src/app.js'), name: 'app.js' },
    { path: path.join(__dirname, 'package.json'), name: 'package.json' },
    { path: path.join(__dirname, 'ecosystem.config.js'), name: 'PM2 config' }
  ];

  files.forEach(file => {
    if (fs.existsSync(file.path)) {
      log.success(`${file.name} exists`);
    } else {
      if (file.path.includes('.env')) {
        log.error(`${file.name} not found. Copy .env.example to .env and configure it.`);
      } else {
        log.error(`${file.name} not found: ${file.path}`);
      }
      hasErrors = true;
    }
  });
}

/**
 * Main validation function
 */
async function runValidation() {
  console.log('\n');
  log.section('═'.repeat(60));
  log.section('  PRODUCTION READINESS VALIDATION');
  log.section('═'.repeat(60));

  try {
    // Run all validations
    validateEnvironmentVariables();
    checkSystemRequirements();
    checkDirectories();
    checkRequiredFiles();
    await testMongoDBConnection();
    await testEmailConfiguration();

    // Summary
    log.section('\n' + '═'.repeat(60));
    log.section('VALIDATION SUMMARY');
    log.section('═'.repeat(60));

    if (!hasErrors && !hasWarnings) {
      log.success('All validation checks passed! ✨');
      log.info('Your application is ready for deployment.');
    } else if (!hasErrors && hasWarnings) {
      log.warn(`Validation completed with ${hasWarnings ? 'warnings' : 'warning'}.`);
      log.info('Your application can be deployed, but review the warnings above.');
    } else {
      log.error(`Validation failed with ${hasErrors ? 'errors' : 'error'}.`);
      log.error('Please fix the errors above before deploying to production.');
      process.exit(1);
    }

    log.section('═'.repeat(60));
    console.log('\n');

  } catch (error) {
    log.error(`Validation error: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Run validation
runValidation().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
