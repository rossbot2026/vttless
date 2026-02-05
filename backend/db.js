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

// Only connect to MongoDB if not in test mode
// Test mode uses MongoDB Memory Server setup in tests/setup.js
if (process.env.NODE_ENV !== 'test') {
  db.mongoose.connect(process.env.MONGO_URI, { }).then( () => {
    console.log("Successfully connected to MongoDB");
  }).catch(err => {
    console.error("Database connection error", err);
    process.exit();
  });
}
