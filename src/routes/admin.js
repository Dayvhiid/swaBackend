const express = require('express');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// @desc    Get all users based on admin's scope
// @route   GET /api/admin/users
// @access  Private/Admin Roles
router.get('/users', protect, authorize('super_admin', 'zonal_admin', 'area_admin', 'parish_admin'), async (req, res) => {
    try {
        let filter = {};

        // Apply scope based on role
        if (req.user.role === 'zonal_admin') {
            filter = { zonalId: req.user.zonalId };
        } else if (req.user.role === 'area_admin') {
            filter = { areaId: req.user.areaId };
        } else if (req.user.role === 'parish_admin') {
            filter = { parishId: req.user.parishId };
        }
        // super_admin keeps filter = {}

        const users = await User.find(filter).select('-passwordHash');
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Validate/Invalidate user with scope check
// @route   PATCH /api/admin/users/:id/validate
// @access  Private/Admin Roles
router.patch('/users/:id/validate', protect, authorize('super_admin', 'zonal_admin', 'area_admin', 'parish_admin'), async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Permission Check: Verify target user is in the requester's scope
        const isSuperAdmin = req.user.role === 'super_admin';
        const isSameZone = req.user.role === 'zonal_admin' && user.zonalId === req.user.zonalId;
        const isSameArea = req.user.role === 'area_admin' && user.areaId === req.user.areaId;
        const isSameParish = req.user.role === 'parish_admin' && user.parishId === req.user.parishId;

        if (!isSuperAdmin && !isSameZone && !isSameArea && !isSameParish) {
            return res.status(403).json({ 
                message: 'Not authorized to validate users outside of your scope' 
            });
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
