const express = require('express');
const router = express.Router();
const salesController = require('../controllers/salesController');
const { authMiddleware } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.use(authMiddleware);

router.post('/upload', upload.single('file'), salesController.uploadSalesFile);
router.get('/upload-history', salesController.getUploadHistory);
router.get('/datasets', salesController.listDatasets);
router.post('/active-dataset', salesController.setActiveDatasetEndpoint);
router.post('/load-sample', salesController.loadSampleData);
router.delete('/clear', salesController.clearSalesData);

module.exports = router;

