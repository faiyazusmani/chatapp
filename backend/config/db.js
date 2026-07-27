const mongoose = require('mongoose');

/**
 * Connect to MongoDB Atlas cluster instance using Mongoose
 */
const connectDB = async () => {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/chat_application';
  const isProduction = process.env.NODE_ENV === 'production';

  // Event Listeners
  mongoose.connection.on('error', (err) => {
    console.error(`[MongoDB Error] Connection error: ${err.message}`);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('[MongoDB Warning] Disconnected from MongoDB cluster.');
  });

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000
    });
    console.log(`[MongoDB Atlas] Connected successfully to host: ${conn.connection.host} (DB: ${conn.connection.name})`);
    return conn;
  } catch (primaryErr) {
    console.warn(`[MongoDB Warning] Primary connection to Atlas failed: ${primaryErr.message}`);

    if (isProduction) {
      console.error('[MongoDB Error] Please verify Atlas Network Access allows 0.0.0.0/0 IP whitelist in MongoDB Cloud dashboard.');
      return null;
    }

    // In local dev fallback
    try {
      console.log('[MongoDB] Initializing lightweight in-memory MongoDB server fallback for dev...');
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
