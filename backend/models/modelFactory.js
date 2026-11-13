const mongoose = require('mongoose');
const { isProtectedEnv, getEnvironment } = require('../config/environment');

// Deprecated in-memory proxy wrapper removed for production-grade database integrity.
// Directly returns standard Mongoose model ensuring all queries route through MongoDB Atlas.
function setInMemoryMode(enabled) {
  if (enabled && isProtectedEnv()) {
    throw new Error(`[DB Security] In-memory database fallback is strictly prohibited in ${getEnvironment()} mode.`);
  }
}

function getModel(name, mongooseModel) {
  return mongooseModel;
}

module.exports = { getModel, setInMemoryMode };

