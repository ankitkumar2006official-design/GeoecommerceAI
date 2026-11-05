const express = require('express');
const router = express.Router();
const scenarioController = require('../controllers/scenarioController');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

router.post('/simulate', scenarioController.simulateScenario);
router.post('/save', scenarioController.saveScenario);
router.get('/saved', scenarioController.getSavedScenarios);

module.exports = router;

