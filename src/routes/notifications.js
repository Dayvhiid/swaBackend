const express = require('express');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();

// @desc    Get user notifications
// @route   GET /api/user/notifications
// @access  Private
router.get('/notifications', protect, async (req, res) => {
    try {
        const notifications = await Notification.find({ userId: req.user._id }).sort({ createdAt: -1 });
        res.json(notifications);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Update notification settings
// @route   PATCH /api/user/notifications/settings
// @access  Private
router.patch('/notifications/settings', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (user) {
            user.notificationPreferences = {
                ...user.notificationPreferences,
                ...req.body
            };
            await user.save();
            res.json(user.notificationPreferences);
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

module.exports = router;
