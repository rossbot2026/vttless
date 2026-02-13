const passwordValidator = require('../utils/passwordValidator');

const validatePasswordMiddleware = async (req, res, next) => {
    try {
        const { password, newPassword, email, username } = req.body;
        const passwordToValidate = password || newPassword;

        if (!passwordToValidate) {
            return res.status(400).json({
                success: false,
                message: 'Password is required'
            });
        }

        const validation = await passwordValidator.validate(passwordToValidate, email, username);

        if (!validation.isValid) {
            return res.status(400).json({
                success: false,
                message: 'Password validation failed',
                errors: validation.errors,
                strengthScore: validation.score,
                suggestions: validation.feedback.suggestions
            });
        }

        next();
    } catch (error) {
        next(error);
    }
};

module.exports = validatePasswordMiddleware;

