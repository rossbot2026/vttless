#!/usr/bin/env node

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const app = require('./index.js');

async function startTestServer() {
  console.log('🚀 Starting test environment with MongoDB Memory Server...');
  
  try {
    // Start MongoDB Memory Server
    const mongod = await MongoMemoryServer.create({
      instance: {
        dbName: 'vttless-test',
        port: 27017,
        storageEngine: 'ephemeralForTest',
      },
    });
    
    console.log('✅ MongoDB Memory Server started at:', mongod.getUri());
    
    // Connect to MongoDB
    await mongoose.connect(mongod.getUri());
    console.log('✅ Connected to MongoDB');
    
    // Start the server
    const PORT = process.env.PORT || 5000;
    const server = app.listen(PORT, () => {
      console.log(`🎉 Backend server running on port ${PORT}`);
      console.log(`📍 Health check: http://localhost:${PORT}/health`);
      console.log(`📍 API base: http://localhost:${PORT}/`);
    });
    
    // Handle shutdown
    process.on('SIGTERM', async () => {
      console.log('🛑 Shutting down test server...');
      server.close();
      await mongoose.disconnect();
      await mongod.stop();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('❌ Failed to start test server:', error);
    process.exit(1);
  }
}

startTestServer();