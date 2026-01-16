const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// Exported roles enum for single source of truth
const VALID_ROLES = ['soul_winner', 'parish_admin', 'area_admin', 'zonal_admin', 'super_admin'];

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        index: true
    },
    passwordHash: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: VALID_ROLES,
        default: 'soul_winner'
    },
    parishId: {
        type: String
    },
    areaId: {
        type: String
    },
    zonalId: {
        type: String
    },
    notificationPreferences: {
        followUpReminders: { type: Boolean, default: true },
        pendingActions: { type: Boolean, default: true },
        newConverts: { type: Boolean, default: true },
        weeklyReports: { type: Boolean, default: true }
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date
});

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('passwordHash')) return next();
    try {
        this.passwordHash = await bcrypt.hash(this.passwordHash, 10);
        next();
    } catch (error) {
        next(error);
    }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.passwordHash);
};

// Generate and hash password reset token
userSchema.methods.getResetPasswordToken = function () {
    // Generate token
    const resetToken = crypto.randomBytes(20).toString('hex');

    // Hash token and set to resetPasswordToken field
    this.resetPasswordToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');

    // Set expire (10 minutes)
    this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

    return resetToken;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
module.exports.VALID_ROLES = VALID_ROLES;
