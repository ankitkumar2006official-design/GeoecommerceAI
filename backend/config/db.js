const path = require('path');
if (process.env.NODE_ENV === 'test') {
  require('dotenv').config({ path: path.resolve(__dirname, '../.env.test'), override: true });
}
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config();
const mongoose = require('mongoose');
const { assertIsolatedTestDatabase } = require('./testDbGuard');
const { isProtectedEnv, isTest, getEnvironment } = require('./environment');

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
  connectionAttempted = true;
  let customUri = process.env.MONGODB_URI;

  // In test environment, enforce strict fail-closed database isolation
  if (process.env.NODE_ENV === 'test') {
    const testUri = process.env.MONGODB_TEST_URI || process.env.MONGODB_URI;
    try {
      assertIsolatedTestDatabase(testUri);
      customUri = testUri;
    } catch (isolationErr) {
      lastError = isolationErr.message;
      console.error(isolationErr.message);
      throw isolationErr;
    }
  }

  if (!customUri || !customUri.startsWith('mongodb')) {
    const errorMsg = '[MongoDB] MONGODB_URI is required and must begin with mongodb:// or mongodb+srv://';
    lastError = errorMsg;
    console.error(errorMsg);
    if (isProtectedEnv() || isTest()) {
      throw new Error(errorMsg);
    }
    return;
  }

  try {
    // Mask password and user in console logs for strict privacy
    const sanitizedUri = customUri.replace(/\/\/[^@]+@/, '//***:***@');
    console.log(`[MongoDB] Connecting to database cluster at: ${sanitizedUri}`);

    await mongoose.connect(customUri, {
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
      maxPoolSize: 30, // Optimized connection pool for production concurrency
      minPoolSize: 5,
      retryWrites: true
    });

    isConnected = true;
    console.log(`[MongoDB] Database connection verified on database "${mongoose.connection.name}".`);
  } catch (err) {
    lastError = err.message;
    console.error(`[MongoDB] Database connection failed (${err.message}).`);
    if (isProtectedEnv() || isTest()) {
      throw new Error(`[MongoDB] Fatal: Failed to connect to database in ${getEnvironment()}: ${err.message}`);
    }
  }
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
    database: connected ? mongoose.connection.name : 'disconnected',
    clusterHost: safeHost,
    mode: connected ? 'MongoDB Atlas (Persistent Cloud Cluster)' : 'Disconnected (Offline)',
    connectionAttempted,
    lastError: lastError ? 'Connection challenge encountered (credentials/network)' : null,
    timestamp: new Date().toISOString()
  };
}

module.exports = { connectDB, closeDB, getDbStatus };
