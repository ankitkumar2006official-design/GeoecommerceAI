const path = require('path');
const fs = require('fs');

// 1. Force NODE_ENV to 'test' before any backend or application module is imported
process.env.NODE_ENV = 'test';

// 2. Load dedicated test environment if present
const testEnvPath = path.resolve(__dirname, '../backend/.env.test');
if (fs.existsSync(testEnvPath)) {
  require('../backend/node_modules/dotenv').config({ path: testEnvPath, override: true });
}

// 3. If MONGODB_TEST_URI is not explicitly defined in .env.test, derive test database from .env
if (!process.env.MONGODB_TEST_URI) {
  const defaultEnvPath = path.resolve(__dirname, '../backend/.env');
  if (fs.existsSync(defaultEnvPath)) {
    const rawEnv = fs.readFileSync(defaultEnvPath, 'utf8');
    const parsed = require('../backend/node_modules/dotenv').parse(rawEnv);
    if (parsed.MONGODB_TEST_URI) {
      process.env.MONGODB_TEST_URI = parsed.MONGODB_TEST_URI;
    } else if (parsed.MONGODB_URI) {
      // Derive isolated test URI on the cluster by changing database to /tracker_test
      process.env.MONGODB_TEST_URI = parsed.MONGODB_URI.replace(/\/[^/?]+(?=\?|$)/, '/tracker_test');
    }
  }
}

// 4. Overwrite MONGODB_URI in memory so that any unpatched module cannot hit production
if (process.env.MONGODB_TEST_URI) {
  process.env.MONGODB_URI = process.env.MONGODB_TEST_URI;
}

// 5. Fail-closed verification
const { assertIsolatedTestDatabase } = require('../backend/config/testDbGuard');
try {
  const verifiedTestDb = assertIsolatedTestDatabase(process.env.MONGODB_TEST_URI);
  console.log(`[TEST ISOLATION] Test runner initialized with isolated database: "${verifiedTestDb}"`);
} catch (err) {
  console.error(`[TEST ISOLATION FATAL] ${err.message}`);
  process.exit(1);
}

module.exports = {
  testDatabase: process.env.MONGODB_TEST_URI
};

