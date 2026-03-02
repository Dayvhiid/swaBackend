const express = require('express');
const { getHierarchyTree, getAreasList, getAreaStats, getAreaDetails } = require('../controllers/hierarchyController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Public route for frontend sign-up selection
router.get('/tree', getHierarchyTree);

// Protected Admin Routes (Only accessible by Zonal and Super Admins)
router.use(protect);
router.use(authorize('zonal_admin', 'super_admin'));

router.get('/areas', getAreasList);
router.get('/areas/:areaId/stats', getAreaStats);
router.get('/areas/:areaId/details', getAreaDetails);

module.exports = router;
