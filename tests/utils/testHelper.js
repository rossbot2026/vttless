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

// Set AWS configuration for testing (mock values)
process.env.AWS_ACCESS_KEY_ID = process.env.TEST_AWS_ACCESS_KEY_ID || 'test-access-key';
process.env.AWS_SECRET_ACCESS_KEY = process.env.TEST_AWS_SECRET_ACCESS_KEY || 'test-secret-key';
process.env.AWS_REGION = process.env.TEST_AWS_REGION || 'us-east-1';
process.env.AWS_S3_BUCKET_NAME = process.env.TEST_AWS_S3_BUCKET_NAME || 'test-bucket';

const { GenericContainer } = require('testcontainers');
const { tokenBlacklist } = require('../../backend/utils/jwtSecurity');

let isSetupComplete = false;
let mongoose;
let mongoContainer;

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
    // Start MongoDB container using Testcontainers
    mongoContainer = await new GenericContainer('mongo')
      .withExposedPorts(27017)
      .start();
    
    const mappedPort = mongoContainer.getMappedPort(27017);
    const mongoHost = mongoContainer.getHost();
    const mongoUri = `mongodb://${mongoHost}:${mappedPort}/testdb`;
    
    // Set the MONGO_URI environment variable so backend can use it
    process.env.MONGO_URI = mongoUri;
    
    // Connect to the MongoDB container
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
  // Cleanup JWT blacklist timers
  try {
    const jwtSecurity = require('../../backend/utils/jwtSecurity');
    if (jwtSecurity.tokenBlacklist && typeof jwtSecurity.tokenBlacklist.shutdown === 'function') {
      jwtSecurity.tokenBlacklist.shutdown();
      console.log('JWT blacklist shutdown completed');
    }
  } catch (error) {
    console.log('Error during JWT blacklist shutdown:', error.message);
  }
  
  if (mongoose && mongoose.connection.readyState === 1) {
    await mongoose.disconnect();
    console.log('Test database disconnected');
    isSetupComplete = false;
  }
  
  if (mongoContainer) {
    await mongoContainer.stop();
    console.log('MongoDB container stopped');
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