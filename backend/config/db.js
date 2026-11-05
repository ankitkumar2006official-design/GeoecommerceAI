const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config();
const mongoose = require('mongoose');
const { setInMemoryMode } = require('../models/modelFactory');

let isConnected = false;
let connectionAttempted = false;
let lastError = null;

// Configure connection event listeners
mongoose.connection.on('connected', () => {
  isConnected = true;
  lastError = null;
  console.log(`[MongoDB] Successfully connected to database: ${mongoose.connection.name}`);
});

mongoose.connection.on('error', (err) => {
  isConnected = false;
  lastError = err.message;
  console.error(`[MongoDB] Connection error: ${err.message}`);
});

mongoose.connection.on('disconnected', () => {
  isConnected = false;
  console.warn('[MongoDB] Disconnected from database.');
});

async function connectDB() {
  const customUri = process.env.MONGODB_URI;
  connectionAttempted = true;

  if (customUri && customUri.startsWith('mongodb')) {
    try {
      // Mask password and user in console logs for strict privacy
      const sanitizedUri = customUri.replace(/\/\/[^@]+@/, '//***:***@');
      console.log(`[MongoDB] Connecting to MongoDB Atlas cluster at: ${sanitizedUri}`);

      await mongoose.connect(customUri, {
        serverSelectionTimeoutMS: 15000,
        socketTimeoutMS: 45000,
        maxPoolSize: 10,
        retryWrites: true
      });

      isConnected = true;
      setInMemoryMode(false);
      console.log(`[MongoDB] MongoDB Atlas connection verified on database "${mongoose.connection.name}".`);
      return;
    } catch (err) {
      lastError = err.message;
      console.warn(`[MongoDB] MongoDB Atlas connection failed (${err.message}).`);
    }
  }

  // Graceful fallback to high-performance embedded in-memory mode if Atlas is unreachable
  setInMemoryMode(true);
  console.log('[MongoDB] GeoCommerce AI initialized with embedded high-performance In-Memory Database store.');
}

async function closeDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    isConnected = false;
  }
}

function getDbStatus() {
  const readyState = mongoose.connection.readyState;
  const stateLabels = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  const activeState = stateLabels[readyState] || 'unknown';
  const connected = readyState === 1;

  // Mask host without revealing credentials
  let safeHost = 'unknown';
  if (mongoose.connection.host) {
    safeHost = mongoose.connection.host.replace(/:.*/, '');
  }

  return {
    connected,
    status: activeState,
    database: connected ? mongoose.connection.name : (readyState === 0 ? 'in-memory-store' : 'none'),
    clusterHost: safeHost,
    mode: connected ? 'MongoDB Atlas (Persistent Cloud Cluster)' : 'In-Memory Fallback',
    connectionAttempted,
    lastError: lastError ? 'Connection challenge encountered (credentials/network)' : null,
    timestamp: new Date().toISOString()
  };
}

module.exports = { connectDB, closeDB, getDbStatus };
