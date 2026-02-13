// Load environment variables
if (process.env.NODE_ENV === 'test') {
  require('dotenv').config({ path: '.env.test' });
} else {
  require('dotenv').config();
}

const mongoose = require("mongoose");
const db = require("./models");
const Role = db.Role;
const User = db.User

// Connect to MongoDB if MONGO_URI is provided
// In test mode, this allows tests to provide their own MongoDB Memory Server URI
if (process.env.MONGO_URI) {
  db.mongoose.connect(process.env.MONGO_URI, { }).then( () => {
    console.log("Successfully connected to MongoDB");
  }).catch(err => {
    console.error("Database connection error", err);
    // Don't exit in development, just log the error
    console.log("Continuing without database connection");
  });
} else {
  console.log("Skipping database connection (no MONGO_URI)");
}