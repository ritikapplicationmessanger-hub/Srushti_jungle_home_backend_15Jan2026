
// const mongoose = require('mongoose');
// const logger = require('../utils/logger');

// const connectDB = async () => {
//   try {
//     const conn = await mongoose.connect(process.env.MONGODB_URI);
//     // No options needed anymore!

//     logger.info(`MongoDB Connected: ${conn.connection.host}`);

//     // Connection events
//     mongoose.connection.on('disconnected', () => {
//       logger.warn('MongoDB disconnected');
//     });

//     mongoose.connection.on('reconnected', () => {
//       logger.info('MongoDB reconnected');
//     });

//     mongoose.connection.on('error', (err) => {
//       logger.error(`MongoDB connection error: ${err.message}`);
//     });

//   } catch (error) {
//     logger.error(`Failed to connect to MongoDB: ${error.message}`);
//     process.exit(1);
//   }
// };


// module.exports = connectDB;





const mongoose = require("mongoose");
const logger = require("../utils/logger");
console.log("MONGODB_URI:", process.env.MONGODB_URI ? "FOUND" : "MISSING");

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

// Disable buffering → fail fast instead of timing out
mongoose.set("bufferCommands", false);

const connectDB = async () => {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(process.env.MONGODB_URI)
      .then((mongooseInstance) => {
        logger.info(
          `MongoDB Connected: ${mongooseInstance.connection.host}`
        );
        return mongooseInstance;
      })
      .catch((err) => {
        logger.error(`MongoDB connection failed: ${err.message}`);
        cached.promise = null;
        throw err;
      });
  }

  cached.conn = await cached.promise;

  // Connection events (safe to attach once)
  mongoose.connection.on("disconnected", () => {
    logger.warn("MongoDB disconnected");
  });

  mongoose.connection.on("reconnected", () => {
    logger.info("MongoDB reconnected");
  });

  mongoose.connection.on("error", (err) => {
    logger.error(`MongoDB connection error: ${err.message}`);
  });

  return cached.conn;
};

module.exports = connectDB;

