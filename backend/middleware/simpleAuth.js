/**
 * Simple JWT authentication middleware for testing
 * This bypasses the complex passport setup for basic functionality testing
 */

const jwt = require('jsonwebtoken');

const simpleAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authorization token required' 
      });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    
    // Add user info to request
    req.user = {
      id: decoded.userId,
      username: decoded.username || decoded.email,
      email: decoded.email
    };
    
    next();
  } catch (error) {
    return res.status(401).json({ 
      success: false, 
      message: 'Invalid or expired token' 
    });
  }
};

module.exports = simpleAuth;