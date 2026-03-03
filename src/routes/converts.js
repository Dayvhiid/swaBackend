const express = require('express');
const Convert = require('../models/Convert');
const { Zone, Area, Parish } = require('../models/Hierarchy');
const { protect, authorize } = require('../middleware/auth');

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

// Build a filter based on the requesting user's role and assigned parish/area
async function buildRoleFilterForUser(user) {
    const filter = {};

    if (!user || !user.role) return filter;

    if (user.role === 'soul_winner') {
        filter.soulWinnerId = user._id;
    } else if (user.role === 'parish_admin') {
        // Parish admin should only see converts in their parish
        if (user.parishId) filter.parishId = user.parishId;
    } else if (user.role === 'area_admin') {
        // Area admin should see converts in any parish within their area
        if (user.areaId) {
            const parishes = await Parish.find({ areaId: user.areaId }).select('_id');
            filter.parishId = { $in: parishes.map(p => p._id.toString()) };
        }
    }

    return filter;
}

// Helper to check access for a specific convert document
async function ensureUserCanAccessConvert(user, convert) {
    if (!user) return false;
    if (!convert) return false;

    if (user.role === 'super_admin' || user.role === 'zonal_admin') return true;

    if (user.role === 'soul_winner') return convert.soulWinnerId && convert.soulWinnerId.toString() === user._id.toString();

    if (user.role === 'parish_admin') return convert.parishId === user.parishId;

    if (user.role === 'area_admin') {
        if (!user.areaId) return false;
        const parishes = await Parish.find({ areaId: user.areaId }).select('_id');
        return parishes.map(p => p._id.toString()).includes(convert.parishId);
    }

    // Default deny
    return false;
}

// @desc    Get all converts (filtered by role)
// @route   GET /api/converts
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        const pageSize = Number(req.query.pageSize) || Number(req.query.limit) || 10;
        const page = Number(req.query.pageNumber) || Number(req.query.page) || 1;

        const keyword = req.query.keyword
            ? {
                name: {
                    $regex: req.query.keyword,
                    $options: 'i'
                }
            }
            : {};

        const hierarchyFilter = await buildHierarchyFilter(req.query);

        // RBAC logic: Combine query-level hierarchy filters, any explicit query params,
        // and role-based restrictions based on the requesting user's assigned parish/area.
        const roleFilter = await buildRoleFilterForUser(req.user);
        const filter = { ...keyword, ...hierarchyFilter, ...roleFilter };

        const count = await Convert.countDocuments(filter);
        const converts = await Convert.find(filter)
            .populate('soulWinnerId', 'name')
            .limit(pageSize)
            .skip(pageSize * (page - 1))
            .sort({ createdAt: -1 });

        res.json({ converts, page, pages: Math.ceil(count / pageSize) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Create new convert
// @route   POST /api/converts
// @access  Private
router.post('/', protect, async (req, res) => {
    try {
        const {
            name, phone, whatsapp, houseAddress, dateBornAgain,
            ageGroup, gender, maritalStatus, career
        } = req.body;

        const convert = new Convert({
            soulWinnerId: req.user._id,
            parishId: req.user.parishId,
            name,
            phone,
            whatsapp,
            houseAddress,
            dateBornAgain,
            ageGroup,
            gender,
            maritalStatus,
            career
        });

        const createdConvert = await convert.save();
        res.status(201).json(createdConvert);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// @desc    Get convert by ID
// @route   GET /api/converts/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
    try {
        const convert = await Convert.findById(req.params.id);
        if (convert) {
            const canAccess = await ensureUserCanAccessConvert(req.user, convert);
            if (!canAccess) return res.status(403).json({ message: 'Forbidden' });
            res.json(convert);
        } else {
            res.status(404).json({ message: 'Convert not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Update convert
// @route   PUT /api/converts/:id
// @access  Private
router.put('/:id', protect, async (req, res) => {
    try {
        const convert = await Convert.findById(req.params.id);
        if (convert) {
            const canAccess = await ensureUserCanAccessConvert(req.user, convert);
            if (!canAccess) return res.status(403).json({ message: 'Forbidden' });
            convert.name = req.body.name || convert.name;
            convert.phone = req.body.phone || convert.phone;
            convert.whatsapp = req.body.whatsapp || convert.whatsapp;
            convert.houseAddress = req.body.houseAddress || convert.houseAddress;
            convert.dateBornAgain = req.body.dateBornAgain || convert.dateBornAgain;
            convert.ageGroup = req.body.ageGroup || convert.ageGroup;
            convert.gender = req.body.gender || convert.gender;
            convert.maritalStatus = req.body.maritalStatus || convert.maritalStatus;
            convert.career = req.body.career || convert.career;
            convert.status = req.body.status || convert.status;

            const updatedConvert = await convert.save();
            res.json(updatedConvert);
        } else {
            res.status(404).json({ message: 'Convert not found' });
        }
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// @desc    Toggle visit completion
// @route   PATCH /api/converts/:id/visits/:num
// @access  Private
router.patch('/:id/visits/:num', protect, async (req, res) => {
    try {
        const convert = await Convert.findById(req.params.id);
        if (convert) {
            const canAccess = await ensureUserCanAccessConvert(req.user, convert);
            if (!canAccess) return res.status(403).json({ message: 'Forbidden' });
            const visit = convert.followUpVisits.find(v => v.visitNumber === parseInt(req.params.num));
            if (visit) {
                visit.isCompleted = !visit.isCompleted;
                visit.completedAt = visit.isCompleted ? new Date() : null;
                await convert.save();
                res.json(convert);
            } else {
                res.status(404).json({ message: 'Visit not found' });
            }
        } else {
            res.status(404).json({ message: 'Convert not found' });
        }
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// @desc    Update milestones
// @route   PATCH /api/converts/:id/milestones
// @access  Private
router.patch('/:id/milestones', protect, async (req, res) => {
    try {
        const convert = await Convert.findById(req.params.id);
        if (convert) {
            const canAccess = await ensureUserCanAccessConvert(req.user, convert);
            if (!canAccess) return res.status(403).json({ message: 'Forbidden' });
            convert.spiritualGrowth.believerClass = req.body.believerClass || convert.spiritualGrowth.believerClass;
            convert.spiritualGrowth.waterBaptism = req.body.waterBaptism || convert.spiritualGrowth.waterBaptism;
            convert.spiritualGrowth.workersTraining = req.body.workersTraining || convert.spiritualGrowth.workersTraining;

            await convert.save();
            res.json(convert);
        } else {
            res.status(404).json({ message: 'Convert not found' });
        }
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

module.exports = router;
