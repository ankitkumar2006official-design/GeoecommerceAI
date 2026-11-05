const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { connectDB, getDbStatus } = require('./config/db');

// Route imports
const authRoutes = require('./routes/authRoutes');
const salesRoutes = require('./routes/salesRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const mlRoutes = require('./routes/mlRoutes');
const aiRoutes = require('./routes/aiRoutes');
const copilotRoutes = require('./routes/copilotRoutes');
const scenarioRoutes = require('./routes/scenarioRoutes');
const reportRoutes = require('./routes/reportRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-seller-id']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check endpoints
const healthHandler = (req, res) => {
  const dbStatus = getDbStatus();
  res.json({
    status: 'healthy',
    service: 'GeoCommerce AI Node.js Backend',
    database: {
      connected: dbStatus.connected,
      status: dbStatus.status,
      mode: dbStatus.mode
    },
    ai: {
      grokConfigured: !!(process.env.GROK_API_KEY && !process.env.GROK_API_KEY.includes('your_') && process.env.GROK_API_KEY.length > 15),
      grokModel: process.env.GROK_MODEL || 'grok-2-latest',
      geminiConfigured: !!(process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes('your_')),
      geminiModel: 'gemini-3.8-flash',
      activeProvider: (process.env.GROK_API_KEY && !process.env.GROK_API_KEY.includes('your_') && process.env.GROK_API_KEY.length > 15) ? 'Grok (xAI)' : 'Gemini / Grounded Engine'
    },
    timestamp: new Date().toISOString()
  });
};

app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

// Database status endpoint (reports connection without revealing credentials)
const dbStatusHandler = (req, res) => {
  res.json(getDbStatus());
};

app.get('/db-status', dbStatusHandler);
app.get('/api/db-status', dbStatusHandler);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/ml', mlRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/copilot', copilotRoutes);
app.use('/api/scenarios', scenarioRoutes);
app.use('/api/reports', reportRoutes);

// Global 404 handler
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

// Start Server: Database connection established before accepting incoming requests
async function startServer() {
  try {
    await connectDB();
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`===============================================`);
      console.log(`GeoCommerce AI Backend running on port ${PORT}`);
      console.log(`REST APIs ready: http://localhost:${PORT}/api`);
      console.log(`===============================================`);
    });
    return server;
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
