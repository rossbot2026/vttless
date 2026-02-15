const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    email: { type: String, required: true, unique: true},
    roles: [
        { 
            type: mongoose.Schema.Types.ObjectId,
            ref: "Role"
        }
    ],
    photoUrl: {
        type: String,
        default: '' // or some default photo URL
    },
    passwordHistory: [{
        password: String,
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    passwordChangedAt: Date,
    passwordResetToken: { type: String, default: null },
    passwordResetTokenExpiry: { type: Date, default: null }
    
}, {timestamps: true});

// Index for password reset token lookups
UserSchema.index({ passwordResetToken: 1 });

UserSchema.virtual('friends', {
    ref: 'Friend',
    localField: '_id',
    foreignField: 'requestor',
    match: { confirmed: true }
});

UserSchema.pre('save', async function(next) {
    if (this.isModified('password')) {
        try {
            // Generate salt and hash password
            const salt = await bcrypt.genSalt(12);
            const hash = await bcrypt.hash(this.password, salt);

            // Add to password history
            this.passwordHistory.unshift({
                password: hash,
                createdAt: new Date()
            });

            // Keep only last 5 passwords
            if (this.passwordHistory.length > 5) {
                this.passwordHistory = this.passwordHistory.slice(0, 5);
            }

            this.password = hash;
            this.passwordChangedAt = new Date();
            next();
        } catch (error) {
            next(error);
        }
    } else {
        next();
    }
});


UserSchema.methods.checkPasswordHistory = async function(newPassword) {
    // Check last 5 passwords
    for (let i = 0; i < Math.min(this.passwordHistory.length, 5); i++) {
        const isMatch = await bcrypt.compare(newPassword, this.passwordHistory[i].password);
        if (isMatch) {
            return true; // Password was previously used
        }
    }
    return false;
};

UserSchema.methods.isValidPassword = async function(password) {
    return await bcrypt.compare(password, this.password);
};

UserSchema.methods.usernameExists = async function(username) {
    return await this.findOne({username});
}

UserSchema.methods.emailExists = async function(email) {
    return await this.findOne({email})
}


const User = mongoose.model('User', UserSchema);

module.exports = User;