// require('dotenv').config();

// const app = require('./src/app');
// const connectDB = require('./src/config/database');
// const logger = require('./src/utils/logger');
// const { verifyEmailConfig } = require('./src/config/email');

// const PORT = process.env.PORT || 5000;

// // Graceful shutdown handlers
// const gracefulShutdown = (signal) => {
//   logger.info(`${signal} received: closing HTTP server and database connection`);
//   server.close(() => {
//     logger.info('HTTP server closed');
//     // Close MongoDB connection
//     require('mongoose').connection.close(() => {
//       logger.info('MongoDB connection closed');
//       process.exit(0);
//     });
//   });
// };

// process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
// process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// // Start server
// const startServer = async () => {
//   try {
//     // Connect to MongoDB
//     await connectDB();
//     const User = require('./src/models/User');
//     const userCount = await User.countDocuments({});
    
//     if (userCount === 0) {
//       try {
//         const superAdmin = new User({
//           name: 'Super Admin',
//           email: 'admin@corepench.com',
//           role: 'admin',
//           isActive: true,
//         });
//         await superAdmin.save();
        
//         logger.info('Super Admin user created automatically: admin@corepench.com');
//       } catch (err) {
//         logger.error('Failed to create super admin:', err.message);
//       }
//     } else {
//       logger.info(`Users already exist (${userCount}). Skipping super admin creation.`);
//     }

//     // Verify email configuration (optional, non-blocking)
//     verifyEmailConfig();

//     // Start Express server
//     const server = app.listen(PORT, () => {
//       logger.info(`Server is running on port ${PORT}`);
//       logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
//       logger.info(`API Base URL: http://localhost:${PORT}/api/v1`);
//       logger.info(`Health Check: http://localhost:${PORT}/health`);
//     });

//     // Handle unhandled promise rejections
//     process.on('unhandledRejection', (err) => {
//       logger.error('Unhandled Promise Rejection:', err);
//       // Close server & exit process
//       server.close(() => {
//         process.exit(1);
//       });
//     });

//     // Handle uncaught exceptions
//     process.on('uncaughtException', (err) => {
//       logger.error('Uncaught Exception:', err);
//       process.exit(1);
//     });

//   } catch (error) {
//     logger.error('Failed to start server:', error.message);
//     process.exit(1);
//   }
// };

// // Run the server

// startServer();



require("dotenv").config();

const app = require("./src/app");
const connectDB = require("./src/config/database");
const logger = require("./src/utils/logger");
const { verifyEmailConfig } = require("./src/config/email");

let isInitialized = false;

/**
 * Initialize app resources (runs once per lambda lifecycle)
 */
const initApp = async () => {
  if (isInitialized) return;

  try {
    // Connect to MongoDB (cached connection)
    await connectDB();

    // Verify email config (non-blocking)
    try {
      await verifyEmailConfig();
    } catch (err) {
      logger.warn("Email config verification failed:", err.message);
    }

    isInitialized = true;
    logger.info("Application initialized successfully");
  } catch (err) {
    logger.error("Application initialization failed:", err.message);
    throw err;
  }
};

/**
 * Vercel Serverless Handler
 */
module.exports = async (req, res) => {
  try {
    await initApp();
    return app(req, res);
  } catch (err) {
    logger.error("Server handler error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
