require('dotenv').config();
const passport = require("passport");
const LocalStrategy = require('passport-local');
const JWTStrategy = require("passport-jwt").Strategy;
const User = require('./models/user');
const bcrypt = require("bcryptjs");
const { 
  verifyAccessToken, 
  verifyRefreshToken, 
  extractTokenFromRequest,
  validateTokenSecurity,
  tokenBlacklist 
} = require('./utils/jwtSecurity');

// Cookie extractor for JWT tokens
const cookieExtractor = function(req) {
  return extractTokenFromRequest(req);
};

// JWT Configuration
console.log('JWT_SECRET_KEY:', process.env.JWT_SECRET_KEY);
const jwtOptions = {
  jwtFromRequest: cookieExtractor,
  secretOrKey: process.env.JWT_SECRET_KEY || process.env.TEST_JWT_SECRET_KEY,
  algorithms: ['HS256'],
  issuer: process.env.JWT_ISSUER || process.env.TEST_JWT_ISSUER || 'vttless',
  audience: process.env.JWT_AUDIENCE || process.env.TEST_JWT_AUDIENCE || 'vttless-app'
};

// Local Strategy for username/password authentication
passport.use(new LocalStrategy(async function verify(username, password, cb) {
  console.log('Attempting to authenticate user:', username);
  
  try {
    const user = await User.findOne({ username }).populate('roles');
    
    if (!user) {
      console.log('Authentication failed: User not found');
      return cb(null, false, { message: 'Invalid username or password' });
    }
    
    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      console.log(`Authentication failed: Invalid password for user: ${username}`);
      return cb(null, false, { message: 'Invalid username or password' });
    }
    
    // Check if account is active (optional future feature)
    // if (user.isBanned || user.isSuspended) {
    //   return cb(null, false, { message: 'Account is not available' });
    // }
    
    console.log(`Authentication successful for user: ${username}`);
    
    return cb(null, {
      id: user._id,
      username: user.username,
      email: user.email,
      roles: user.roles
    });
    
  } catch (err) {
    console.error('Authentication error:', err);
    return cb(err);
  }
}));

// JWT Strategy for token-based authentication
passport.use(new JWTStrategy({
  jwtFromRequest: cookieExtractor,
  secretOrKey: process.env.JWT_SECRET_KEY || process.env.TEST_JWT_SECRET_KEY,
  algorithms: ['HS256'],
  issuer: process.env.JWT_ISSUER || process.env.TEST_JWT_ISSUER || 'vttless',
  audience: process.env.JWT_AUDIENCE || process.env.TEST_JWT_AUDIENCE || 'vttless-app'
}, async (jwtPayload, done) => {
  try {
    // Check if token is blacklisted (for logout functionality)
    if (tokenBlacklist.isTokenBlacklisted(jwtPayload.token)) {
      return done(null, false, { message: 'Token has been revoked' });
    }
    
    // Additional security validation
    const securityValidation = validateTokenSecurity(jwtPayload);
    if (!securityValidation.isValid) {
      console.warn('JWT security validation failed:', securityValidation.errors);
      return done(null, false, { message: 'Invalid token security' });
    }
    
    // Find user by username from token payload
    const user = await User.findOne({ username: jwtPayload.username })
      .populate('roles')
      .select('-password'); // Don't return password in user object
    
    if (!user) {
      console.warn('User not found for token:', jwtPayload.username);
      return done(null, false);
    }
    
    // Optional: Check if user account is still active
    // if (user.isBanned || user.isSuspended) {
    //   return done(null, false, { message: 'Account is not available' });
    // }
    
    return done(null, user);
    
  } catch (err) {
    console.error('JWT strategy error:', err);
    return done(err);
  }
}));

// JWT Refresh Token Strategy (for token refresh functionality)
passport.use('jwt-refresh', new JWTStrategy({
  jwtFromRequest: cookieExtractor,
  secretOrKey: process.env.JWT_REFRESH_SECRET_KEY || process.env.TEST_JWT_REFRESH_SECRET_KEY || process.env.TEST_JWT_SECRET_KEY,
  algorithms: ['HS256'],
  issuer: process.env.JWT_ISSUER || process.env.TEST_JWT_ISSUER || 'vttless',
  audience: process.env.JWT_AUDIENCE || process.env.TEST_JWT_AUDIENCE || 'vttless-app',
}, async (jwtPayload, done) => {
  try {
    // Security validation for refresh tokens
    const securityValidation = validateTokenSecurity(jwtPayload);
    if (!securityValidation.isValid || jwtPayload.type !== 'refresh') {
      return done(null, false, { message: 'Invalid refresh token' });
    }
    
    // Find user by username from refresh token payload
    const user = await User.findOne({ username: jwtPayload.username })
      .populate('roles');
    
    if (!user) {
      return done(null, false);
    }
    
    return done(null, user);
    
  } catch (err) {
    console.error('JWT refresh strategy error:', err);
    return done(err);
  }
}));

// Serialize user for session storage
passport.serializeUser(function(user, cb) {
  process.nextTick(function() {
    // Store minimal user data in session
    cb(null, { 
      id: user.id, 
      username: user.username,
      roles: user.roles 
    });
  });
});

// Deserialize user from session
passport.deserializeUser(function(user, cb) {
  process.nextTick(function() {
    return cb(null, user);
  });
});

/**
 * Middleware to authenticate JWT tokens with additional security checks
 */
const authenticateJWT = (req, res, next) => {
  passport.authenticate('jwt', { session: false }, (err, user, info) => {
    if (err) {
      return res.status(500).json({ 
        success: false, 
        message: 'Authentication error',
        error: err.message 
      });
    }
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: info?.message || 'Invalid or expired token' 
      });
    }
    
    // Attach user to request object
    req.user = user;
    req.token = extractTokenFromRequest(req);
    
    next();
  })(req, res, next);
};

/**
 * Middleware to authenticate refresh tokens
 */
const authenticateRefreshToken = (req, res, next) => {
  passport.authenticate('jwt-refresh', { session: false }, (err, user, info) => {
    if (err) {
      return res.status(500).json({ 
        success: false, 
        message: 'Refresh token error',
        error: err.message 
      });
    }
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: info?.message || 'Invalid or expired refresh token' 
      });
    }
    
    // Attach user to request object
    req.user = user;
    
    next();
  })(req, res, next);
};

/**
 * Middleware to check if user has specific roles
 */
const requireRoles = (roles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }
    
    const userRoles = req.user.roles.map(role => role.name);
    const hasRequiredRole = roles.some(role => userRoles.includes(role));
    
    if (!hasRequiredRole) {
      return res.status(403).json({ 
        success: false, 
        message: 'Insufficient permissions',
        requiredRoles: roles,
        userRoles: userRoles 
      });
    }
    
    next();
  };
};

/**
 * Middleware to check if user is the owner of a resource
 */
const isResourceOwner = (resourceIdField = 'userId') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }
    
    const resourceId = req.params[resourceIdField] || req.body[resourceIdField];
    const userId = req.user.id.toString();
    
    // Check if user is the owner or has admin role
    if (userId !== resourceId && !req.user.roles.some(role => role.name === 'admin')) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied: Not the resource owner' 
      });
    }
    
    next();
  };
};

module.exports = {
  passport,
  authenticateJWT,
  authenticateRefreshToken,
  requireRoles,
  isResourceOwner,
  tokenBlacklist,
};