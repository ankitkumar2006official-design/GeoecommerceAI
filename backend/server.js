const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const { connectDB, closeDB, getDbStatus } = require('./config/db');
const { isProtectedEnv, assertProtectedEnvironment } = require('./config/environment');

// Enforce protected environment fail-fast constraints at startup
if (isProtectedEnv()) {
  assertProtectedEnvironment();
}

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

// Trust reverse proxy headers (Render, Vercel, Cloudflare, load balancers) for accurate client IP rate limiting
app.set('trust proxy', 1);

// Security headers with Helmet
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// Request Correlation ID tracking
app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] || crypto.randomUUID();
  res.setHeader('x-request-id', req.id);
  next();
});

// Strict CORS Configuration
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'https://geocommerce-ai.vercel.app',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000'
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (curl, server-to-server, test scripts)
    if (!origin) return callback(null, true);
    if (
      allowedOrigins.includes(origin) ||
      (!isProtectedEnv() && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin))
    ) {
      return callback(null, true);
    }
    const err = new Error(`Origin ${origin} not allowed by CORS policy.`);
    err.status = 403;
    return callback(err);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-seller-id', 'x-dataset-id', 'x-request-id']
};
app.use(cors(corsOptions));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Global API Rate Limiter: 1000 requests per 15 minutes per IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests from this IP. Please try again after 15 minutes.', statusCode: 429 }
});
app.use('/api', globalLimiter);

// Targeted Rate Limiter for Authentication: 30 attempts per 15 minutes per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please try again after 15 minutes.', statusCode: 429 }
});

// Targeted Rate Limiter for AI Copilot queries: 30 queries per minute per IP
const copilotLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'AI Copilot query limit exceeded. Please wait a minute before asking more questions.', statusCode: 429 }
});

// Targeted Rate Limiter for Dataset Uploads: 15 uploads per minute per IP
const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'File upload rate limit reached. Please wait a minute before uploading again.', statusCode: 429 }
});

// 1. Health check endpoints: Liveness, Readiness & General Status
const livenessHandler = (req, res) => {
  res.status(200).json({
    status: 'alive',
    service: 'GeoCommerce AI Node.js Backend',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
};

app.get('/health/live', livenessHandler);
app.get('/api/health/live', livenessHandler);

const readinessHandler = async (req, res) => {
  const dbStatus = getDbStatus();
  const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://127.0.0.1:8000';

  let mlStatus = { ready: false, status: 'unavailable' };
  const startTime = Date.now();
  try {
    const mlRes = await axios.get(`${mlServiceUrl}/health`, {
      timeout: 1500,
      headers: { 'User-Agent': 'GeoCommerce-Readiness-Probe/1.0' }
    });
    if (mlRes.status === 200) {
      mlStatus = {
        ready: true,
        status: 'available',
        latencyMs: Date.now() - startTime
      };
    }
  } catch (err) {
    mlStatus = {
      ready: false,
      status: 'unavailable',
      error: err.code === 'ECONNREFUSED' ? 'Connection refused' : (err.message || 'Probe failed')
    };
  }

  const isDbReady = dbStatus.connected;
  const overallReady = isDbReady;
  const statusCode = isDbReady ? 200 : 503;

  res.status(statusCode).json({
    status: !isDbReady ? 'unready' : (mlStatus.ready ? 'ready' : 'degraded'),
    ready: overallReady,
    dependencies: {
      database: {
        ready: isDbReady,
        status: dbStatus.status,
        mode: dbStatus.mode
      },
      mlMicroservice: mlStatus
    },
    timestamp: new Date().toISOString()
  });
};

app.get('/health/ready', readinessHandler);
app.get('/api/health/ready', readinessHandler);

const healthHandler = (req, res) => {
  const dbStatus = getDbStatus();
  const statusCode = dbStatus.connected ? 200 : 503;
  res.status(statusCode).json({
    status: dbStatus.connected ? 'healthy' : 'degraded',
    service: 'GeoCommerce AI Node.js Backend',
    database: {
      connected: dbStatus.connected,
      status: dbStatus.status,
      mode: dbStatus.mode
    },
    ai: {
      grokConfigured: !!(process.env.GROK_API_KEY && !process.env.GROK_API_KEY.includes('your_') && process.env.GROK_API_KEY.length > 15),
      grokModel: process.env.GROK_MODEL || 'openai/gpt-oss-120b',
      geminiConfigured: !!(process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes('your_')),
      geminiModel: 'gemini-3.8-flash',
      activeProvider: (process.env.GROK_API_KEY && !process.env.GROK_API_KEY.includes('your_') && process.env.GROK_API_KEY.length > 15) ? 'Groq Cloud / xAI' : 'Gemini / Grounded Engine'
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

// Database readiness check: Reject database-dependent API requests if MongoDB is offline
app.use('/api', (req, res, next) => {
  if (
    req.path === '/health' ||
    req.path.startsWith('/health/') ||
    req.path === '/db-status'
  ) {
    return next();
  }
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      error: 'Database service unavailable. Please retry shortly.',
      statusCode: 503,
      requestId: req.id
    });
  }
  next();
});

// API Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/sales/upload', uploadLimiter);
app.use('/api/sales', salesRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/ml', mlRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/copilot', copilotLimiter, copilotRoutes);
app.use('/api/scenarios', scenarioRoutes);
app.use('/api/reports', reportRoutes);

// Serve Frontend static assets in production if available
const frontendDist = path.resolve(__dirname, '../frontend/dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res, next) => {
    if (req.originalUrl.startsWith('/api') || req.originalUrl.startsWith('/health') || req.originalUrl.startsWith('/db-status')) {
      return next();
    }
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// Global 404 handler for unmatched API routes
app.use((req, res) => {
  res.status(404).json({
    error: `Route not found: ${req.method} ${req.originalUrl}`,
    statusCode: 404,
    requestId: req.id
  });
});

// Global Centralized Error Handler
app.use((err, req, res, next) => {
  const statusCode = err.status || err.statusCode || 500;
  if (statusCode === 500) {
    console.error(`[Server Error ${req.id || 'N/A'}]`, err);
  }
  const isProtected = isProtectedEnv();
  res.status(statusCode).json({
    error: (statusCode === 500 && isProtected)
      ? 'An unexpected internal error occurred. Please contact support.'
      : (err.message || 'Internal Server Error'),
    statusCode,
    requestId: req.id || null
  });
});

let activeServer = null;

// Graceful shutdown handler
const gracefulShutdown = async (signal) => {
  console.log(`\n[Process] Received ${signal}. Starting graceful shutdown...`);
  if (activeServer) {
    activeServer.close(async () => {
      console.log('[Process] HTTP server closed.');
      await closeDB();
      console.log('[Process] Database connection closed.');
      process.exit(0);
    });
  } else {
    await closeDB();
    process.exit(0);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start Server: Database connection established before accepting incoming requests
async function startServer() {
  try {
    await connectDB();
    activeServer = app.listen(PORT, '0.0.0.0', () => {
      console.log(`===============================================`);
      console.log(`GeoCommerce AI Backend running on port ${PORT}`);
      console.log(`REST APIs ready: http://localhost:${PORT}/api`);
      console.log(`===============================================`);
    });
    return activeServer;
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
