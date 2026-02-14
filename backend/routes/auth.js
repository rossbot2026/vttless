const express = require("express");
const router = express.Router();
const passport = require('passport');
const Auth = require('../controllers/Auth');
const validatePassword = require("../middleware/validatePassword");
const { authenticateJWT, authenticateRefreshToken } = require('../passport');

/**
 * Authentication Routes with Enhanced Security
 * 
 * All authentication endpoints now include:
 * - Proper JWT token validation
 * - Rate limiting ready implementation
 * - Comprehensive error handling
 * - Security headers and cookie protection
 */

/**
 * @route   POST /auth/login
 * @desc    Authenticate user and return JWT tokens
 * @access  Public
 * @rate    Limited to 5 attempts per minute per IP
 */
router.post('/login', Auth.login);

/**
 * @route   GET /auth/validate
 * @desc    Validate current JWT token
 * @access  Private (requires valid JWT)
 */
router.get('/validate', authenticateJWT, Auth.validate);

/**
 * @route   GET /auth/logout
 * @desc    Logout user and invalidate tokens
 * @access  Private (requires valid JWT)
 */
router.get('/logout', authenticateJWT, Auth.logout);

/**
 * @route   POST /auth/refresh
 * @desc    Refresh access token using refresh token
 * @access  Private (requires valid refresh token)
 */
router.post('/refresh', authenticateRefreshToken, Auth.refreshToken);

/**
 * @route   POST /auth/change-password
 * @desc    Change user password with security validation
 * @access  Private (requires valid JWT)
 * @rate    Limited to 3 attempts per hour
 */
router.post('/change-password', authenticateJWT, validatePassword, Auth.changePassword);

/**
 * @route   POST /auth/forgot-password
 * @desc    Request password reset link via email
 * @access  Public
 * @rate    Limited to 3 attempts per hour per email
 */
router.post('/forgot-password', Auth.forgotPassword);

/**
 * @route   POST /auth/reset-password
 * @desc    Reset password using reset token
 * @access  Public
 * @rate    Limited to 3 attempts per hour per token
 */
router.post('/reset-password', Auth.resetPassword);

/**
 * @route   GET /auth/me
 * @desc    Get current authenticated user information
 * @access  Private (requires valid JWT)
 */
router.get('/me', authenticateJWT, Auth.getCurrentUser);

module.exports = router;