const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth');
const User = require('../models/User');
const { generateCopilotResponse } = require('../services/geminiService');

// Strict auth resolution for /api/ai/chat
async function resolveSeller(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.sellerId = decoded.id;
      req.datasetId = req.body.datasetId || req.headers['x-dataset-id'] || null;
      return next();
    } catch (err) {
      return res.status(401).json({ error: 'Token is invalid or expired. Please sign in again.' });
    }
  }

  // Fallback to explicit sellerId in body or header (for server-to-server or test runners)
  if (req.body.sellerId) {
    req.sellerId = req.body.sellerId;
    req.datasetId = req.body.datasetId || req.headers['x-dataset-id'] || null;
    return next();
  }
  if (req.headers['x-seller-id']) {
    req.sellerId = req.headers['x-seller-id'];
    req.datasetId = req.body.datasetId || req.headers['x-dataset-id'] || null;
    return next();
  }

  return res.status(401).json({
    reply: 'Please sign in or provide authorization token to analyze your sales data with the AI Copilot.',
    hasData: false
  });
}

/**
 * @route POST /api/ai/chat
 * @desc Ask questions to Gemini AI Business Copilot grounded in MongoDB & ML analytics
 */
router.post('/chat', resolveSeller, async (req, res) => {
  try {
    const prompt = req.body.message || req.body.prompt || req.body.question || req.body.query;
    if (!prompt || !String(prompt).trim()) {
      return res.status(400).json({
        error: 'Question cannot be empty. Please provide a message or prompt.'
      });
    }

    const response = await generateCopilotResponse(req.sellerId, String(prompt).trim(), req.datasetId);
    return res.json(response);
  } catch (err) {
    console.error('[AI Chat] Error processing chat request:', err);
    return res.status(500).json({
      error: err.message || 'Internal AI service error'
    });
  }
});

module.exports = router;

