const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

router.get('/overview', analyticsController.getOverview);
router.get('/regional-demand', analyticsController.getRegionalDemand);
router.get('/product-analytics', analyticsController.getProductAnalytics);
router.get('/map-data', analyticsController.getMapData);

module.exports = router;

