const express = require('express');
const Convert = require('../models/Convert');
const { protect } = require('../middleware/auth');

const router = express.Router();

// @desc    Get aggregate stats
// @route   GET /api/dashboard/stats
// @access  Private
router.get('/stats', protect, async (req, res) => {
    try {
        const filter = {};
        if (req.user.role === 'soul_winner') {
            filter.soulWinnerId = req.user._id;
        }

        const totalConverts = await Convert.countDocuments(filter);
        const activeConverts = await Convert.countDocuments({ ...filter, status: 'Active' });
        const completedConverts = await Convert.countDocuments({ ...filter, status: 'Completed' });

        // Pending follow-ups (overdue or due today)
        const pendingFilter = {
            ...filter,
            'followUpVisits': {
                $elemMatch: {
                    visitDate: { $lte: new Date() },
                    isCompleted: false
                }
            }
        };
        const pendingFollowupsCount = await Convert.countDocuments(pendingFilter);

        // Simple retention rate calculation (Active / Total)
        const retentionRate = totalConverts > 0 ? (activeConverts / totalConverts) * 100 : 0;

        res.json({
            totalConverts,
            activeConverts,
            completedConverts,
            pendingFollowupsCount,
            retentionRate: retentionRate.toFixed(2)
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get trends (Time-series data)
// @route   GET /api/dashboard/trends
// @access  Private
router.get('/trends', protect, async (req, res) => {
    try {
        const filter = {};
        if (req.user.role === 'soul_winner') {
            filter.soulWinnerId = req.user._id;
        }

        // Aggregate converts by month
        const trends = await Convert.aggregate([
            { $match: filter },
            {
                $group: {
                    _id: { $month: "$createdAt" },
                    count: { $sum: 1 }
                }
            },
            { $sort: { "_id": 1 } }
        ]);

        res.json(trends);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get pending follow-ups
// @route   GET /api/dashboard/pending-followups
// @access  Private
router.get('/pending-followups', protect, async (req, res) => {
    try {
        const filter = {
            'followUpVisits': {
                $elemMatch: {
                    visitDate: { $lt: new Date() },
                    isCompleted: false
                }
            }
        };

        if (req.user.role === 'soul_winner') {
            filter.soulWinnerId = req.user._id;
        }

        const pending = await Convert.find(filter);
        res.json(pending);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
