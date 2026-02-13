/**
 * Authentication Controller
 * Contains all authentication methods needed by the application
 */

const User = require('../models/user');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { generateAccessToken, generateRefreshToken } = require('../utils/jwtSecurity');

/**
 * Login user and return JWT tokens
 */
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Validate input
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required',
                code: 'MISSING_CREDENTIALS'
            });
        }
        
        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password',
                code: 'INVALID_CREDENTIALS'
            });
        }
        
        // Check password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password',
                code: 'INVALID_CREDENTIALS'
            });
        }
        
        // Generate tokens using jwtSecurity module for proper claims
        const token = generateAccessToken({
            userId: user._id.toString(),
            username: user.username,
            email: user.email
        });
        
        const refreshToken = generateRefreshToken({
            userId: user._id.toString(),
            username: user.username,
            email: user.email
        });
        
        res.json({
            success: true,
            token,
            refreshToken,
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        });
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            code: 'SERVER_ERROR'
        });
    }
};

/**
 * Validate current JWT token
 */
exports.validate = async (req, res) => {
    try {
        res.json({
            success: true,
            user: req.user
        });
    } catch (error) {
        console.error('Validation error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            code: 'SERVER_ERROR'
        });
    }
};

/**
 * Logout user and invalidate tokens
 */
exports.logout = async (req, res) => {
    try {
        // In a real implementation, you would add the token to a blacklist
        res.json({
            success: true,
            message: 'Logged out successfully'
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            code: 'SERVER_ERROR'
        });
    }
};

/**
 * Refresh access token using refresh token
 */
exports.refreshToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        
        if (!refreshToken) {
            return res.status(401).json({
                success: false,
                message: 'Refresh token is required',
                code: 'MISSING_REFRESH_TOKEN'
            });
        }
        
        // Verify refresh token
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET_KEY);
        
        // Generate new access token
        const token = jwt.sign(
            { userId: decoded.userId, email: decoded.email },
            process.env.JWT_SECRET_KEY,
            { expiresIn: process.env.JWT_EXPIRATION_MS || '1h' }
        );
        
        res.json({
            success: true,
            token
        });
        
    } catch (error) {
        console.error('Token refresh error:', error);
        res.status(401).json({
            success: false,
            message: 'Invalid refresh token',
            code: 'INVALID_REFRESH_TOKEN'
        });
    }
};

/**
 * Change user password
 */
exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user._id || req.user.id;
        
        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Current password and new password are required',
                code: 'MISSING_CREDENTIALS'
            });
        }
        
        if (newPassword.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'New password must be at least 8 characters long',
                code: 'WEAK_PASSWORD'
            });
        }
        
        // Find user
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
                code: 'USER_NOT_FOUND'
            });
        }
        
        // Verify current password
        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!isCurrentPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Current password is incorrect',
                code: 'INVALID_CURRENT_PASSWORD'
            });
        }
        
        // Hash new password
        const newPasswordHash = await bcrypt.hash(newPassword, 10);
        
        // Update password
        user.password = newPasswordHash;
        await user.save();
        
        res.json({
            success: true,
            message: 'Password changed successfully'
        });
        
    } catch (error) {
        console.error('Password change error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            code: 'SERVER_ERROR'
        });
    }
};

/**
 * Forgot Password
 * Sends password reset email with token
 */
exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        
        // Validate email
        if (!email || !email.includes('@')) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid email address',
                code: 'INVALID_EMAIL'
            });
        }
        
        // Find user by email
        const user = await User.findOne({ email });
        
        // If user doesn't exist, don't reveal this information
        if (!user) {
            return res.status(200).json({
                success: true,
                message: 'If an account exists with this email, a password reset link has been sent',
                code: 'EMAIL_SENT'
            });
        }
        
        // Generate password reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
        
        // Set token expiration (1 hour)
        const resetTokenExpiry = Date.now() + 60 * 60 * 1000;
        
        // Update user with reset token
        user.passwordResetToken = resetTokenHash;
        user.passwordResetTokenExpiry = resetTokenExpiry;
        await user.save();
        
        // Prepare email
        const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/password-reset?token=${resetToken}`;
        
        const emailBody = `
            <p>Hi ${user.username},</p>
            <p>You requested a password reset. Click the link below to reset your password:</p>
            <p><a href="${resetUrl}">${resetUrl}</a></p>
            <p>This link will expire in 1 hour.</p>
            <p>If you didn't request this password reset, please ignore this email.</p>
            <p>Best regards,<br/>
The VTTless Team</p>
        `;
        
        // Send email using Resend
        try {
            const { Resend } = require('resend');
            const resend = new Resend(process.env.RESEND_API_KEY);
            
            const { error } = await resend.emails.send({
                from: process.env.EMAIL_FROM || 'noreply@vttless.com',
                to: [email],
                subject: 'VTTless Password Reset',
                html: emailBody,
            });
            
            if (error) {
                console.error('Resend email error:', error);
                
                // Clear reset token on email failure
                user.passwordResetToken = undefined;
                user.passwordResetTokenExpiry = undefined;
                await user.save();
                
                return res.status(500).json({
                    success: false,
                    message: 'Failed to send password reset email. Please try again later.',
                    code: 'EMAIL_SEND_ERROR'
                });
            }
            
            console.log(`Password reset email sent to ${email}`);
            
            return res.status(200).json({
                success: true,
                message: 'If an account exists with this email, a password reset link has been sent',
                code: 'EMAIL_SENT'
            });
            
        } catch (emailError) {
            console.error('Email sending error:', emailError);
            
            // Clear reset token on email failure
            user.passwordResetToken = undefined;
            user.passwordResetTokenExpiry = undefined;
            await user.save();
            
            return res.status(500).json({
                success: false,
                message: 'Failed to send password reset email. Please try again later.',
                code: 'EMAIL_SEND_ERROR'
            });
        }
        
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            code: 'SERVER_ERROR'
        });
    }
};

/**
 * Reset password using reset token
 */
exports.resetPassword = async (req, res) => {
    try {
        const { token, password } = req.body;
        
        // Validate input
        if (!token || !password) {
            return res.status(400).json({
                success: false,
                message: 'Token and new password are required',
                code: 'MISSING_CREDENTIALS'
            });
        }
        
        // Hash the provided token
        const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');
        
        // Find user with valid token
        const user = await User.findOne({
            passwordResetToken: resetTokenHash,
            passwordResetTokenExpiry: { $gt: Date.now() }
        });
        
        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired password reset token',
                code: 'INVALID_TOKEN'
            });
        }
        
        // Validate new password strength
        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 8 characters long',
                code: 'WEAK_PASSWORD'
            });
        }
        
        // Update password
        user.password = await bcrypt.hash(password, 10);
        user.passwordResetToken = undefined;
        user.passwordResetTokenExpiry = undefined;
        
        // Add to password history for security
        user.passwordHistory = [
            ...user.passwordHistory.slice(-4), // Keep last 4 passwords
            { passwordHash: user.password, changedAt: new Date() }
        ];
        
        await user.save();
        
        console.log(`Password reset successful for user: ${user.username}`);
        
        return res.status(200).json({
            success: true,
            message: 'Password reset successfully. Please log in with your new password.',
            code: 'PASSWORD_RESET_SUCCESS'
        });
        
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            code: 'SERVER_ERROR'
        });
    }
};

/**
 * Get current authenticated user information
 */
exports.getCurrentUser = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('-password');
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
                code: 'USER_NOT_FOUND'
            });
        }
        
        res.json({
            success: true,
            user
        });
    } catch (error) {
        console.error('Get current user error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            code: 'SERVER_ERROR'
        });
    }
};