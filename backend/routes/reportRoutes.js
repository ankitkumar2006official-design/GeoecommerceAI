const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

router.get('/export-csv', reportController.exportCSV);
router.get('/export-pdf', reportController.exportPDF);

module.exports = router;

