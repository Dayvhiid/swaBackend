const express = require('express');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes here require super_admin role
router.use(protect);
router.use(authorize('super_admin'));

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private/Super Admin
router.get('/users', async (req, res) => {
    try {
        const users = await User.find({}).select('-passwordHash');
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Validate/Invalidate user
// @route   PATCH /api/admin/users/:id/validate
// @access  Private/Super Admin
router.patch('/users/:id/validate', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.isValidated = req.body.isValidated !== undefined ? req.body.isValidated : true;
        await user.save();

        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            isValidated: user.isValidated
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
