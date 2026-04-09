const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { VALID_ROLES } = require('../models/User');
const { protect } = require('../middleware/auth');
const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail');

const router = express.Router();

const generateToken = (id) => {
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET environment variable is not set');
    }
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '2h'
    });
};

// Reusable password validation chain
const passwordValidation = (fieldName = 'password') =>
    body(fieldName)
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
        .matches(/[a-z]/).withMessage('Please add at least one lowercase letter to your password combination')
        .matches(/[A-Z]/).withMessage('Please add at least one uppercase letter to your password combination')
        .matches(/\d/).withMessage('Please add at least one number to your password combination');

// Validation middleware
const validateSignup = [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    passwordValidation('password'),
    body('role').optional().isIn(VALID_ROLES)
        .withMessage(`Role must be one of: ${VALID_ROLES.join(', ')}`)
];

const validateLogin = [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required')
];

const validatePasswordChange = [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    passwordValidation('newPassword')
];

const validateForgotPassword = [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required')
];

const validateResetPassword = [
    body('token').notEmpty().withMessage('Token is required'),
    passwordValidation('newPassword')
];

// Validation result handler
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

// @desc    Register a new user
// @route   POST /api/auth/signup
// @access  Public
router.post('/signup', validateSignup, handleValidationErrors, async (req, res) => {
    try {
        const { name, password, role, parishId, areaId, zonalId } = req.body;
        const email = req.body.email ? req.body.email.trim().toLowerCase() : '';
        const isValidated = role === 'super_admin';

        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({
                errors: [
                    {
                        type: 'field',
                        value: email,
                        msg: 'User already exists',
                        path: 'email',
                        location: 'body'
                    }
                ]
            });
        }

        const user = await User.create({
            name,
            email,
            passwordHash: password, // Pre-save hook will hash this
            role,
            parishId,
            areaId,
            zonalId,
            isValidated
        });

        if (user) {
            res.status(201).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                token: generateToken(user._id)
            });
        } else {
            res.status(400).json({
                errors: [
                    {
                        type: 'request',
                        msg: 'Invalid user data',
                        location: 'body'
                    }
                ]
            });
        }
    } catch (error) {
        res.status(500).json({
            errors: [
                {
                    type: 'server',
                    msg: error.message
                }
            ]
        });
    }
});

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
router.post('/login', validateLogin, handleValidationErrors, async (req, res) => {
    try {
        const email = req.body.email ? req.body.email.trim().toLowerCase() : '';
        const password = req.body.password || '';

        const user = await User.findOne({ email });

        if (user && (await user.comparePassword(password))) {
            if (!user.isValidated) {
                return res.status(403).json({
                    code: 'ACCOUNT_PENDING_VALIDATION',
                    message: 'Your account is pending validation by a Super Admin'
                });
            }
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                token: generateToken(user._id)
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get user profile
// @route   GET /api/user/profile
// @access  Private
router.get('/profile', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (user) {
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                notificationPreferences: user.notificationPreferences
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Change user password
// @route   POST /api/auth/change-password
// @access  Private
router.post('/change-password', protect, validatePasswordChange, handleValidationErrors, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await User.findById(req.user._id);

        if (user && (await user.comparePassword(currentPassword))) {
            user.passwordHash = newPassword;
            await user.save();
            res.json({ message: 'Password updated successfully' });
        } else {
            res.status(401).json({ message: 'Incorrect current password' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Forgot Password
// @route   POST /api/auth/forgot-password
// @access  Public
router.post('/forgot-password', validateForgotPassword, handleValidationErrors, async (req, res) => {
    try {
        const user = await User.findOne({ email: req.body.email });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Get reset token
        const resetToken = user.getResetPasswordToken();

        // Save user (disable validation for other fields if necessary, but here we just save)
        await user.save({ validateBeforeSave: false });

        // Create reset url
        // Assuming frontend is running on a specific port, or we just send the token.
        // The user asked for a link or code. I'll send a link.
        // Since I don't know the exact frontend URL, I'll use a placeholder or req.headers.origin
        // fallback to localhost:3000 if origin not set
        const frontendUrl = req.headers.origin || 'http://localhost:3000';
        const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

        const message = `You are receiving this email because you (or someone else) has requested the reset of a password. Please make a PUT request to: \n\n ${resetUrl}`;

        try {
            await sendEmail({
                email: user.email,
                subject: 'Password Reset Token',
                message
            });

            res.status(200).json({ success: true, data: 'Email sent' });
        } catch (error) {
            user.resetPasswordToken = undefined;
            user.resetPasswordExpire = undefined;

            await user.save({ validateBeforeSave: false });

            return res.status(500).json({ message: 'Email could not be sent', error: error.message });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Reset Password
// @route   POST /api/auth/reset-password
// @access  Public
router.post('/reset-password', validateResetPassword, handleValidationErrors, async (req, res) => {
    try {
        // Get hashed token
        const resetPasswordToken = crypto
            .createHash('sha256')
            .update(req.body.token)
            .digest('hex');

        const user = await User.findOne({
            resetPasswordToken,
            resetPasswordExpire: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid token' });
        }

        // Set new password
        user.passwordHash = req.body.newPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;

        await user.save();

        res.status(200).json({ success: true, data: 'Password updated success' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
