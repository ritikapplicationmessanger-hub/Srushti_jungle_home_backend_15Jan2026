require('dotenv').config();

const app = require('./src/app');
const connectDB = require('./src/config/database');
const logger = require('./src/utils/logger');
const { validateStartup, startResourceMonitoring } = require('./src/config/startup');

const PORT = process.env.PORT || 5000;

// Reference to server instance
let server;

// Graceful shutdown handlers
const gracefulShutdown = (signal) => {
  logger.info(`${signal} received: initiating graceful shutdown`);
  
  // Set timeout for forced shutdown
  const forceShutdownTimeout = setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000); // 30 seconds timeout

  if (server) {
    server.close(() => {
      logger.info('HTTP server closed');
      
      // Close MongoDB connection
      require('mongoose').connection.close(false, () => {
        logger.info('MongoDB connection closed');
        clearTimeout(forceShutdownTimeout);
        logger.info('Graceful shutdown completed');
        process.exit(0);
      });
    });
  } else {
    logger.warn('No server instance to close');
    process.exit(0);
  }

  // Stop accepting new connections immediately
  if (server) {
    server.getConnections((err, count) => {
      if (err) {
        logger.error('Error getting connection count:', err);
      } else {
        logger.info(`Active connections: ${count}`);
      }
    });
  }
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', {
    message: err.message,
    stack: err.stack
  });
  
  // Attempt graceful shutdown
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Promise Rejection:', {
    reason: reason,
    promise: promise
  });
  
  // Attempt graceful shutdown
  gracefulShutdown('UNHANDLED_REJECTION');
});

// Start server
const startServer = async () => {
  try {
    logger.info('='.repeat(60));
    logger.info('Initializing Hotel Management API Server');
    logger.info('='.repeat(60));
    
    // Log environment info
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`Node.js Version: ${process.version}`);
    logger.info(`Platform: ${process.platform}`);
    logger.info(`Process ID: ${process.pid}`);

    // Connect to MongoDB
    logger.info('Connecting to MongoDB...');
    await connectDB();

    // Run startup validation
    const validation = await validateStartup();
    
    if (!validation.success) {
      logger.error('Startup validation failed. Shutting down...');
      process.exit(1);
    }

    // Create default super admin if no users exist
    const User = require('./src/models/User');
    const userCount = await User.countDocuments({});
    
    if (userCount === 0) {
      try {
        const superAdmin = new User({
          name: process.env.SUPER_ADMIN_NAME || 'Super Admin',
          email: process.env.SUPER_ADMIN_EMAIL || 'admin@corepench.com',
          role: 'admin',
          isActive: true,
        });
        await superAdmin.save();
        
        logger.info(`Super Admin user created: ${superAdmin.email}`);
      } catch (err) {
        logger.error('Failed to create super admin:', err.message);
      }
    } else {
      logger.info(`Database initialized with ${userCount} user(s)`);
    }

    // Start Express server
    server = app.listen(PORT, () => {
      logger.info('='.repeat(60));
      logger.info(`✓ Server is running on port ${PORT}`);
      logger.info(`✓ API Base URL: ${process.env.API_BASE_URL || `http://localhost:${PORT}`}`);
      logger.info(`✓ Health Check: http://localhost:${PORT}/health`);
      logger.info(`✓ API Endpoints: http://localhost:${PORT}/api/v1`);
      logger.info('='.repeat(60));
      logger.info('Server is ready to accept connections');
      logger.info('Press Ctrl+C to stop the server');
      logger.info('='.repeat(60));
    });

    // Set server timeout
    const requestTimeout = parseInt(process.env.REQUEST_TIMEOUT || '30000', 10);
    server.timeout = requestTimeout;
    server.keepAliveTimeout = 65000; // slightly higher than typical load balancer timeout
    server.headersTimeout = 66000; // slightly higher than keepAliveTimeout

    // Start resource monitoring
    if (process.env.NODE_ENV === 'production') {
      startResourceMonitoring();
    }

    // Log memory usage on startup
    const memUsage = process.memoryUsage();
    logger.info(`Initial Memory Usage: RSS=${Math.round(memUsage.rss / 1024 / 1024)}MB, Heap=${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`);

  } catch (error) {
    logger.error('Failed to start server:', {
      message: error.message,
      stack: error.stack
    });
    process.exit(1);
  }
};

// Handle process warnings
process.on('warning', (warning) => {
  logger.warn('Process Warning:', {
    name: warning.name,
    message: warning.message,
    stack: warning.stack
  });
});

// Run the server
startServer();
