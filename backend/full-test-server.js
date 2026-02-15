#!/usr/bin/env node

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const AWS = require('aws-sdk');
const app = require('./index.js');

async function startFullTest() {
  console.log('🚀 Starting full test environment...');
  
  try {
    // Start MongoDB Memory Server
    const mongod = await MongoMemoryServer.create({
      instance: {
        dbName: 'vttless-test',
        port: 27017,
        storageEngine: 'ephemeralForTest',
      },
    });
    
    console.log('✅ MongoDB Memory Server started');
    
    // Connect to MongoDB
    await mongoose.connect(mongod.getUri());
    console.log('✅ Connected to MongoDB');
    
    // Create test user
    const User = require('./models/user');
    const testUser = new User({
      username: 'testuser',
      email: 'test@example.com',
      password: await require('bcryptjs').hash('SecurePassword123!@#', 10),
      roles: []
    });
    await testUser.save();
    console.log('✅ Test user created');
    
    // Test S3 configuration (mock)
    console.log('📦 Testing S3 configuration...');
    process.env.AWS_S3_BUCKET_NAME = 'vttless-dev';
    process.env.AWS_ACCESS_KEY_ID = 'test';
    process.env.AWS_SECRET_ACCESS_KEY = 'test';
    process.env.AWS_REGION = 'us-east-1';
    process.env.S3_ENDPOINT_URL = 'http://localhost:4566';
    
    console.log('✅ S3 configuration ready');
    
    // Start the server
    const PORT = process.env.PORT || 5000;
    const server = app.listen(PORT, () => {
      console.log(`🎉 Full test environment ready!`);
      console.log(`📍 Backend: http://localhost:${PORT}`);
      console.log(`📍 Health check: http://localhost:${PORT}/health`);
      console.log(`📍 Login test: curl -X POST http://localhost:${PORT}/auth/login -H 'Content-Type: application/json' -d '{\"email\":\"test@example.com\", \"password\":\"SecurePassword123!@#\"}'`);
      console.log(`📍 Event server: http://localhost:4001`);
      console.log(`📍 Client: http://localhost:3000`);
      console.log(`📍 Test user: testuser@example.com / SecurePassword123!@#`);
    });
    
    // Handle shutdown
    process.on('SIGTERM', async () => {
      console.log('🛑 Shutting down test environment...');
      server.close();
      await mongoose.disconnect();
      await mongod.stop();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('❌ Failed to start test environment:', error);
    process.exit(1);
  }
}

startFullTest();