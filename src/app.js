const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

const logger = require('./utils/logger');
const { apiLimiter } = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');
const requestTimeout = require('./middleware/requestTimeout');
const requestId = require('./middleware/requestId');
const routes = require('./routes/index');

// Initialize Express app
const app = express();

// Trust proxy - important for rate limiting and IP detection behind reverse proxy
app.set('trust proxy', 1);

// Request ID tracking (must be first to track all requests)
app.use(requestId);

// Security middleware with enhanced configuration
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  frameguard: {
    action: 'deny' // X-Frame-Options: DENY
  },
  noSniff: true, // X-Content-Type-Options: nosniff
  xssFilter: true, // X-XSS-Protection
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin'
  }
}));

// CORS configuration - environment-specific
const getCorsOptions = () => {
  const allowedOrigins = [process.env.FRONTEND_URL || 'http://localhost:3000'];
  
  // Add additional origins from environment variable
  if (process.env.ALLOWED_ORIGINS) {
    const additionalOrigins = process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim());
    allowedOrigins.push(...additionalOrigins);
  }

  return {
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);
      
      if (process.env.NODE_ENV === 'development') {
        // Allow all origins in development
        return callback(null, true);
      }
      
      // Check if origin is in allowed list for production
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        logger.warn(`CORS blocked request from origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    exposedHeaders: ['X-Request-ID', 'X-Response-Time'],
    maxAge: 86400 // 24 hours
  };
};

app.use(cors(getCorsOptions()));

// Request logging (use winston in production, morgan in dev)
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', { 
    stream: { write: (msg) => logger.info(msg.trim()) },
    skip: (req) => req.url === '/health' // Skip health check logs in production
  }));
}

// Request timeout middleware
const timeoutMs = parseInt(process.env.REQUEST_TIMEOUT || '30000', 10);
app.use(requestTimeout(timeoutMs));

// Body parsers with size limits
const bodyLimit = process.env.REQUEST_BODY_LIMIT || '10mb';
app.use(express.json({ limit: bodyLimit }));
app.use(express.urlencoded({ extended: true, limit: bodyLimit }));

// Static files (for uploads)
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
  maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0,
  etag: true,
  lastModified: true
}));

// Rate limiting
app.use('/api', apiLimiter);

// Welcome route (before API routes for proper ordering)
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to The Core Pench Hotel Management API',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    docs: '/api/v1',
    health: '/health',
    timestamp: new Date().toISOString()
  });
});

// Enhanced health check endpoint
app.get('/health', async (req, res) => {
  const mongoose = require('mongoose');
  const { verifyEmailConfig } = require('./config/email');
  
  const healthData = {
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  };

  // Detailed health check if enabled
  if (process.env.DETAILED_HEALTH_CHECK === 'true') {
    const services = {};

    // Check MongoDB connection
    try {
      const dbState = mongoose.connection.readyState;
      const dbStates = {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting'
      };
      
      services.database = {
        status: dbState === 1 ? 'healthy' : 'unhealthy',
        state: dbStates[dbState] || 'unknown',
        host: dbState === 1 ? mongoose.connection.host : null
      };

      if (dbState !== 1) {
        healthData.success = false;
        healthData.status = 'unhealthy';
      }
    } catch (error) {
      services.database = {
        status: 'unhealthy',
        error: error.message
      };
      healthData.success = false;
      healthData.status = 'unhealthy';
    }

    // Check email service (non-critical)
    try {
      const emailHealthy = await verifyEmailConfig();
      services.email = {
        status: emailHealthy ? 'healthy' : 'unavailable',
        configured: !!(process.env.EMAIL_USER && process.env.EMAIL_APP_PASSWORD)
      };
    } catch (error) {
      services.email = {
        status: 'unavailable',
        error: 'Email service not configured'
      };
    }

    // Memory usage
    const memUsage = process.memoryUsage();
    services.memory = {
      rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
      external: `${Math.round(memUsage.external / 1024 / 1024)}MB`
    };

    healthData.services = services;
  }

  const statusCode = healthData.success ? 200 : 503;
  res.status(statusCode).json(healthData);
});

// API Routes
app.use('/api/v1', routes);

// Handle 404 - Route not found
app.use((req, res) => {
  logger.warn(`404 Not Found: ${req.method} ${req.originalUrl}`, {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  
  res.status(404).json({
    success: false,
    message: `Cannot ${req.method} ${req.originalUrl} - Route not found`,
    error: 'NOT_FOUND'
  });
});

// Global error handler (must be last)
app.use(errorHandler);

module.exports = app;
