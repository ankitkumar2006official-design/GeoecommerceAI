const { generateCopilotResponse } = require('../services/geminiService');

exports.askCopilot = async (req, res) => {
  try {
    const rawMessage = req.body.message ?? req.body.prompt ?? req.body.question ?? req.body.query;

    if (typeof rawMessage !== 'string' || !rawMessage.trim()) {
      return res.status(400).json({ error: 'Message must be a non-empty text string.' });
    }

    const message = rawMessage.trim();

    if (message.length > 1000) {
      return res.status(400).json({
        error: `Message exceeds maximum allowed length of 1000 characters (received ${message.length}). Please shorten your question.`
      });
    }

    const sellerId = req.sellerId;
    const rawDatasetId = req.body.datasetId || req.headers['x-dataset-id'] || null;
    const datasetId = (typeof rawDatasetId === 'string' && !rawDatasetId.startsWith('$'))
      ? rawDatasetId.trim()
      : null;

    const response = await generateCopilotResponse(sellerId, message, datasetId);
    return res.json(response);
  } catch (err) {
    console.error('[Copilot Controller] Error:', err);
    return res.status(500).json({ error: err.message || 'Internal AI Copilot error' });
  }
};
