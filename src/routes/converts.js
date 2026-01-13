const express = require('express');
const Convert = require('../models/Convert');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// @desc    Get all converts (filtered by role)
// @route   GET /api/converts
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        const pageSize = 10;
        const page = Number(req.query.pageNumber) || 1;

        const keyword = req.query.keyword
            ? {
                name: {
                    $regex: req.query.keyword,
                    $options: 'i'
                }
            }
            : {};

        // RBAC logic: Convert visibility (Soul Winners see only their own, Admins see all)
        const filter = { ...keyword };
        if (req.user.role === 'soul_winner') {
            filter.soulWinnerId = req.user._id;
        }

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
