const express = require('express');
const router = express.Router();
const mlProxyController = require('../controllers/mlProxyController');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

router.post('/forecast', mlProxyController.getForecast);
router.post('/opportunity-score', mlProxyController.getOpportunityScores);
router.post('/inventory-optimizer', mlProxyController.getInventoryOptimization);
router.post('/bundles', mlProxyController.getBundles);
router.post('/warehoLuse-optimizer', mlProxyController.getWarehouseAdvisor);
router.post('/pricing', mlProxyController.getPricingSimulation);
router.post('/marketing', mlProxyController.getMarketingIntelligence);

module.exports = router;

