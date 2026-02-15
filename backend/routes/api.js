const express = require("express");
const router = express.Router();
const Auth = require("../controllers/Auth");

/**
 * API Routes for VTTless Application
 * 
 * These routes provide the main API endpoints for the application
 * and are protected by JWT authentication.
 */

/**
 * @route   POST /api/forgot-password
 * @desc    Handle forgot password request (frontend API route)
 * @access  Public
 */
router.post("/forgot-password", Auth.forgotPassword);

/**
 * @route   POST /api/reset-password
 * @desc    Handle password reset request (frontend API route)
 * @access  Public
 */
router.post("/reset-password", Auth.resetPassword);

module.exports = router;