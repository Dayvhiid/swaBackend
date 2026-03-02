const { Zone, Area, Parish } = require('../models/Hierarchy');
const User = require('../models/User');
const Convert = require('../models/Convert');

/**
 * Public endpoint to fetch the full hierarchy tree (Zones -> Areas -> Parishes)
 * Primarily used by the frontend for user registration dropdowns.
 */
const getHierarchyTree = async (req, res) => {
    try {
        const zones = await Zone.find().lean();
        const areas = await Area.find().lean();
        const parishes = await Parish.find().lean();

        // Build the tree
        const tree = zones.map(zone => {
            return {
                ...zone,
                areas: areas
                    .filter(area => area.zoneId === zone._id.toString())
                    .map(area => ({
                        ...area,
                        parishes: parishes.filter(parish => parish.areaId === area._id.toString())
                    }))
            };
        });

        res.status(200).json({
            success: true,
            data: tree
        });
    } catch (error) {
        console.error('Error fetching hierarchy tree:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while fetching the hierarchy tree.'
        });
    }
};

/**
 * Admin endpoint: List all Areas and their directly nested Parishes.
 */
const getAreasList = async (req, res) => {
    try {
        const areas = await Area.find().lean();
        const parishes = await Parish.find().lean();

        const areasWithParishes = areas.map(area => ({
            ...area,
            parishes: parishes.filter(p => p.areaId === area._id.toString())
        }));

        res.status(200).json({
            success: true,
            data: areasWithParishes
        });
    } catch (error) {
        console.error('Error fetching areas list:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while fetching areas.'
        });
    }
};

/**
 * Admin endpoint: Get aggregate stats for a specific area (total soul winners, total converts)
 */
const getAreaStats = async (req, res) => {
    try {
        const { areaId } = req.params;

        const totalSoulWinners = await User.countDocuments({ areaId, role: 'soul_winner' });

        // Find all parishes in this area to query converts
        const parishesInArea = await Parish.find({ areaId }).select('_id');
        const parishIds = parishesInArea.map(p => p._id.toString());

        const totalConverts = await Convert.countDocuments({ parishId: { $in: parishIds } });

        res.status(200).json({
            success: true,
            data: {
                areaId,
                totalSoulWinners,
                totalConverts
            }
        });
    } catch (error) {
        console.error('Error fetching area stats:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while fetching area stats.'
        });
    }
};

/**
 * Admin endpoint: Get detailed lists (actual users and converts logs) for a specific area
 */
const getAreaDetails = async (req, res) => {
    try {
        const { areaId } = req.params;

        // Get Soul Winners
        const soulWinners = await User.find({ areaId, role: 'soul_winner' }).select('-passwordHash').lean();

        // Get Converts (Requires mapping via parishes)
        const parishesInArea = await Parish.find({ areaId }).select('_id');
        const parishIds = parishesInArea.map(p => p._id.toString());
        const converts = await Convert.find({ parishId: { $in: parishIds } }).lean();

        res.status(200).json({
            success: true,
            data: {
                areaId,
                soulWinners,
                converts
            }
        });

    } catch (error) {
        console.error('Error fetching area details:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while fetching area details.'
        });
    }
};

module.exports = {
    getHierarchyTree,
    getAreasList,
    getAreaStats,
    getAreaDetails
};
