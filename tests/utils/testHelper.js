/**
 * Test Database Helper
 * 
 * This module handles database setup for tests
 * It ensures the database is connected before importing the app
 */

// Load environment variables FIRST
require('dotenv').config({ path: '.env.test' });

// Ensure test environment is set
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET_KEY = process.env.TEST_JWT_SECRET_KEY || 'test-jwt-secret-key';
process.env.JWT_REFRESH_SECRET_KEY = process.env.TEST_JWT_REFRESH_SECRET_KEY || 'test-jwt-refresh-secret-key';

const { MongoMemoryServer } = require('mongodb-memory-server');

let isSetupComplete = false;
let mongoose;
let mongod;

/**
 * Clear all module require caches related to backend and mongoose
 */
function clearBackendCache() {
  // Clear mongoose first to get a fresh instance
  delete require.cache[require.resolve('mongoose')];
  
  Object.keys(require.cache).forEach(key => {
    if (key.includes('/backend/') || key.includes('\\backend\\') || 
        key.includes('/models/') || key.includes('\\models\\')) {
      delete require.cache[key];
    }
  });
}

/**
 * Setup the test database
 */
async function setupTestDB() {
  if (isSetupComplete) {
    return;
  }

  // Clear any cached backend modules
  clearBackendCache();
  
  // Get fresh mongoose instance
  mongoose = require('mongoose');

  try {
    // Start in-memory MongoDB server
    mongod = await MongoMemoryServer.create();
    const mongoUri = mongod.getUri();
    
    // Set the MONGO_URI environment variable so backend can use it
    process.env.MONGO_URI = mongoUri;
    
    // Connect to the in-memory database
    await mongoose.connect(mongoUri);
    
    console.log('Test database connected to:', mongoUri);
    console.log('Mongoose connection state:', mongoose.connection.readyState);
    isSetupComplete = true;
  } catch (error) {
    console.error('Failed to connect to test database:', error.message);
    throw error;
  }
}

/**
 * Clear all collections
 */
async function clearCollections() {
  if (!mongoose || mongoose.connection.readyState !== 1) {
    console.log('Database not connected, skipping clear. State:', mongoose?.connection?.readyState);
    return;
  }
  
  const collections = mongoose.connection.collections;
  
  for (const key in collections) {
    const collection = collections[key];
    try {
      await collection.deleteMany({});
    } catch (err) {
      console.log(`Error clearing collection ${key}:`, err.message);
    }
  }
}

/**
 * Teardown the test database
 */
async function teardownTestDB() {
  if (mongoose && mongoose.connection.readyState === 1) {
    await mongoose.disconnect();
    console.log('Test database disconnected');
    isSetupComplete = false;
  }
  
  if (mongod) {
    await mongod.stop();
    console.log('In-memory MongoDB server stopped');
  }
}

/**
 * Get the app - imports it fresh after database is set up
 */
function getApp() {
  return require('../../backend/index');
}

/**
 * Get a model - imports it fresh
 */
function getModel(modelName) {
  return require(`../../backend/models/${modelName}`);
}

/**
 * Get mongoose instance
 */
function getMongoose() {
  return mongoose;
}

module.exports = {
  setupTestDB,
  clearCollections,
  teardownTestDB,
  getApp,
  getModel,
  getMongoose
};