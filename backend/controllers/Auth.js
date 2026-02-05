const passport = require('passport');
const jwt = require('jsonwebtoken');
const { 
  generateAccessToken, 
  generateRefreshToken,
  getSecureCookieOptions,
  tokenBlacklist 
} = require('../utils/jwtSecurity');

/**
 * Enhanced Authentication Controller with security improvements
 * 
 * Features:
 * - Secure JWT token generation with proper claims
 * - Refresh token mechanism
 * - Token blacklist for logout functionality
 * - Proper error handling without exposing sensitive information
 * - Rate limiting ready implementation
 */

/**
 * User Login
 * Authenticates user and returns JWT tokens
 */
exports.login = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    
    // Basic input validation
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required',
        code: 'MISSING_CREDENTIALS'
      });
    }

    passport.authenticate('local', { session: false }, (err, user, info) => {
      if (err) {
        console.error('Login error:', err);
        return res.status(500).json({
          success: false,
          message: 'Authentication service error',
          code: 'AUTH_SERVICE_ERROR'
        });
      }
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: info?.message || 'Invalid credentials',
          code: 'INVALID_CREDENTIALS'
        });
      }
      
      // Generate tokens
      const accessToken = generateAccessToken({
        id: user.id,
        username: user.username,
        email: user.email,
        roles: user.roles
      });
      
      const refreshToken = generateRefreshToken({
        id: user.id,
        username: user.username
      });
      
      // Set secure cookies
      const cookieOptions = getSecureCookieOptions();
      
      // Set access token cookie
      res.cookie('vttless-jwt', accessToken, {
        ...cookieOptions,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      });
      
      // Set refresh token cookie
      res.cookie('vttless-refresh', refreshToken, {
        ...cookieOptions,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        httpOnly: true,
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production'
      });
      
      // Return user info (excluding sensitive data)
      const userInfo = {
        id: user.id,
        username: user.username,
        email: user.email,
        roles: user.roles,
        lastLogin: new Date()
      };
      
      console.log(`User ${user.username} logged in successfully`);
      
      res.status(200).json({
        success: true,
        message: 'Login successful',
        user: userInfo,
        tokens: {
          accessToken,
          refreshToken
        }
      });
      
    })(req, res, next);
    
  } catch (error) {
    console.error('Login controller error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during authentication',
      code: 'INTERNAL_ERROR'
    });
  }
};

/**
 * Validate JWT Token
 * Validates the current token and returns user information
 */
exports.validate = async (req, res, next) => {
  try {
    const { user } = req;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'No valid authentication found',
        code: 'NO_AUTHENTICATION'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Token is valid',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        roles: user.roles
      }
    });
    
  } catch (err) {
    console.error('Token validation error:', err);
    res.status(500).json({
      success: false,
      message: 'Error validating token',
      code: 'VALIDATION_ERROR'
    });
  }
};

/**
 * User Logout
 * Invalidates tokens and clears cookies
 */
exports.logout = async (req, res, next) => {
  try {
    const { user } = req;
    
    if (user) {
      // Add current tokens to blacklist if available
      const accessToken = req.cookies['vttless-jwt'];
      const refreshToken = req.cookies['vttless-refresh'];
      
      if (accessToken) {
        // Calculate expiration time for blacklist
        const decodedToken = jwt.decode(accessToken);
        const expiresAt = decodedToken.exp * 1000 || (Date.now() + 24 * 60 * 60 * 1000);
        
        tokenBlacklist.blacklistToken(accessToken, expiresAt);
      }
      
      if (refreshToken) {
        const decodedToken = jwt.decode(refreshToken);
        const expiresAt = decodedToken.exp * 1000 || (Date.now() + 7 * 24 * 60 * 60 * 1000);
        
        tokenBlacklist.blacklistToken(refreshToken, expiresAt);
      }
      
      console.log(`User ${user.username} logged out successfully`);
    }
    
    // Clear cookies
    const cookieOptions = getSecureCookieOptions();
    
    res.clearCookie('vttless-jwt', cookieOptions);
    res.clearCookie('vttless-refresh', {
      ...cookieOptions,
      path: '/'
    });
    
    res.status(202).json({
      success: true,
      message: 'Successfully logged out',
      code: 'LOGOUT_SUCCESS'
    });
    
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({
      success: false,
      message: 'Error during logout',
      code: 'LOGOUT_ERROR'
    });
  }
};

/**
 * Refresh Access Token
 * Uses refresh token to generate new access token
 */
exports.refreshToken = async (req, res, next) => {
  try {
    const { user } = req;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token',
        code: 'INVALID_REFRESH_TOKEN'
      });
    }
    
    // Generate new access token
    const newAccessToken = generateAccessToken({
      id: user.id,
      username: user.username,
      email: user.email,
      roles: user.roles
    });
    
    // Update access token cookie
    const cookieOptions = getSecureCookieOptions();
    res.cookie('vttless-jwt', newAccessToken, {
      ...cookieOptions,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });
    
    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      accessToken: newAccessToken
    });
    
  } catch (err) {
    console.error('Token refresh error:', err);
    res.status(500).json({
      success: false,
      message: 'Error refreshing token',
      code: 'TOKEN_REFRESH_ERROR'
    });
  }
};

/**
 * Change Password
 * Updates user password with security validation
 */
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = req.user;

    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required',
        code: 'MISSING_PASSWORDS'
      });
    }

    // Verify current password
    const isValidPassword = await user.isValidPassword(currentPassword);
    if (!isValidPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect',
        code: 'INVALID_CURRENT_PASSWORD'
      });
    }

    // Check if new password was previously used
    const wasUsedBefore = await user.checkPasswordHistory(newPassword);
    if (wasUsedBefore) {
      return res.status(400).json({
        success: false,
        message: 'This password was previously used. Please choose a different password.',
        code: 'PASSWORD_REUSED'
      });
    }

    // Validate new password strength (using existing validator if available)
    if (typeof passwordValidator !== 'undefined') {
      const validation = await passwordValidator.validate(newPassword, user.email, user.username);
      
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Password validation failed',
          errors: validation.errors,
          strengthScore: validation.score,
          suggestions: validation.feedback?.suggestions || [],
          code: 'PASSWORD_VALIDATION_FAILED'
        });
      }
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Log password change for security
    console.log(`Password changed for user: ${user.username}`);

    res.json({
      success: true,
      message: 'Password updated successfully',
      code: 'PASSWORD_UPDATE_SUCCESS'
    });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({
      success: false,
      message: 'Error changing password',
      error: error.message,
      code: 'PASSWORD_CHANGE_ERROR'
    });
  }
};

/**
 * Get Current User Information
 * Returns non-sensitive user data
 */
exports.getCurrentUser = async (req, res) => {
  try {
    const { user } = req;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'No authenticated user found',
        code: 'NO_USER_FOUND'
      });
    }
    
    // Return user information without sensitive data
    const userInfo = {
      id: user.id,
      username: user.username,
      email: user.email,
      roles: user.roles,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
    
    res.status(200).json({
      success: true,
      user: userInfo,
      code: 'USER_INFO_RETRIEVED'
    });
    
  } catch (err) {
    console.error('Get current user error:', err);
    res.status(500).json({
      success: false,
      message: 'Error retrieving user information',
      code: 'USER_INFO_ERROR'
    });
  }
};