const express = require('express');
const Convert = require('../models/Convert');
const User = require('../models/User');
const { Zone, Area, Parish } = require('../models/Hierarchy');
const { protect } = require('../middleware/auth');

const router = express.Router();

async function buildHierarchyFilter(query) {
    const { zoneId, areaId, parishId } = query;
    let filter = {};

    // Clean up potentially stringified "null", "undefined", or empty strings from the frontend
    const cleanId = (id) => id && id !== 'null' && id !== 'undefined' && id.trim() !== '' ? id : null;

    const pId = cleanId(parishId);
    const aId = cleanId(areaId);
    const zId = cleanId(zoneId);

    if (pId) {
        filter.parishId = pId;
    } else if (aId) {
        const parishes = await Parish.find({ areaId: aId }).select('_id');
        filter.parishId = { $in: parishes.map(p => p._id.toString()) };
    } else if (zId) {
        const areas = await Area.find({ zoneId: zId }).select('_id');
        const areaIds = areas.map(a => a._id.toString());
        const parishes = await Parish.find({ areaId: { $in: areaIds } }).select('_id');
        filter.parishId = { $in: parishes.map(p => p._id.toString()) };
    }

    return filter;
}

// @desc    Get aggregate stats
// @route   GET /api/dashboard/stats
// @access  Private
router.get('/stats', protect, async (req, res) => {
    try {
        const hierarchyFilter = await buildHierarchyFilter(req.query);
        const filter = { ...hierarchyFilter };
        
        // Apply role-based filtering
        if (req.user.role === 'soul_winner') {
            filter.soulWinnerId = req.user._id;
        } else if (req.user.role === 'parish_admin') {
            // Parish admin should only see converts in their parish
            if (req.user.parishId) {
                filter.parishId = req.user.parishId;
            }
        } else if (req.user.role === 'area_admin') {
            // Area admin should see converts in any parish within their area
            if (req.user.areaId && !filter.parishId) {
                const parishes = await Parish.find({ areaId: req.user.areaId }).select('_id');
                filter.parishId = { $in: parishes.map(p => p._id.toString()) };
            }
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

        // For parish admins, include pending soul winners to validate
        let pendingSoulWinnersCount = 0;
        if (req.user.role === 'parish_admin') {
            pendingSoulWinnersCount = await User.countDocuments({
                role: 'soul_winner',
                isValidated: false,
                parishId: req.user.parishId
            });
        }

        res.json({
            totalConverts,
            activeConverts,
            completedConverts,
            pendingFollowupsCount,
            retentionRate: retentionRate.toFixed(2),
            ...(req.user.role === 'parish_admin' && { pendingSoulWinnersCount })
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
        const hierarchyFilter = await buildHierarchyFilter(req.query);
        let filter = { ...hierarchyFilter };

        // Apply role-based filtering
        if (req.user.role === 'soul_winner') {
            filter.soulWinnerId = req.user._id;
        } else if (req.user.role === 'parish_admin') {
            // Parish admin should only see trends for their parish
            if (req.user.parishId) {
                filter.parishId = req.user.parishId;
            }
        } else if (req.user.role === 'area_admin') {
            // Area admin should see trends for any parish within their area
            if (req.user.areaId && !filter.parishId) {
                const parishes = await Parish.find({ areaId: req.user.areaId }).select('_id');
                filter.parishId = { $in: parishes.map(p => p._id.toString()) };
            }
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
        const hierarchyFilter = await buildHierarchyFilter(req.query);
        let filter = { ...hierarchyFilter };

        // Apply role-based filtering
        if (req.user.role === 'soul_winner') {
            filter.soulWinnerId = req.user._id;
        } else if (req.user.role === 'parish_admin') {
            // Parish admin should only see follow-ups in their parish
            if (req.user.parishId) {
                filter.parishId = req.user.parishId;
            }
        } else if (req.user.role === 'area_admin') {
            // Area admin should see follow-ups in any parish within their area
            if (req.user.areaId && !filter.parishId) {
                const parishes = await Parish.find({ areaId: req.user.areaId }).select('_id');
                filter.parishId = { $in: parishes.map(p => p._id.toString()) };
            }
        }

        filter.followUpVisits = {
            $elemMatch: {
                visitDate: { $lt: new Date() },
                isCompleted: false
            }
        };

        const pending = await Convert.find(filter);
        res.json(pending);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
