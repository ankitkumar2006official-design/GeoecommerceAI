const { generateCopilotResponse } = require('../services/geminiService');

exports.askCopilot = async (req, res) => {
  try {
    const message = req.body.message || req.body.prompt || req.body.question || req.body.query;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message cannot be empty.' });
    }

    const sellerId = req.sellerId;
    const datasetId = req.body.datasetId || req.headers['x-dataset-id'] || null;
    const response = await generateCopilotResponse(sellerId, message.trim(), datasetId);
    return res.json(response);
  } catch (err) {
    console.error('[Copilot Controller] Error:', err);
    return res.status(500).json({ error: err.message || 'Internal AI Copilot error' });
  }
};
