const mongoose = require('mongoose');

/**
 * Connect to MongoDB instance using Mongoose
 * Falls back to mongodb-memory-server if local MongoDB service is not running
 */
const connectDB = async () => {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/chatroom';
  
  try {
    // Attempt connecting to configured MONGO_URI
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 2000
    });
    console.log(`[MongoDB] Connected successfully: ${conn.connection.host}`);
    return conn;
  } catch (primaryErr) {
    console.warn(`[MongoDB Warning] Primary connection (${uri}) failed: ${primaryErr.message}`);
    console.log('[MongoDB] Initializing lightweight in-memory MongoDB server fallback...');

    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongoServer = await MongoMemoryServer.create({
        binary: {
          version: '6.0.14'
        }
      });
      const memoryUri = mongoServer.getUri();

      const conn = await mongoose.connect(memoryUri);
      console.log(`[MongoDB Memory Server] Connected successfully to in-memory database!`);
      return conn;
    } catch (fallbackErr) {
      console.error(`[MongoDB Fallback Error] ${fallbackErr.message}`);
    }
  }
};

module.exports = connectDB;
