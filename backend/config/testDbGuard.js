/**
 * Database Isolation Guard
 * Enforces strict boundaries to ensure test runners and integration suites
 * never execute against or connect to production database clusters or live data.
 */

const PROHIBITED_DATABASES = new Set([
  'tracker',
  'tracker_staging',
  'staging',
  'production',
  'prod',
  'live',
  'main',
  'geocommerce_prod',
  'geocommerce_staging',
  'geocommerce',
  'admin',
  'local',
  'config'
]);

/**
 * Extracts database name from MongoDB connection URI
 * Supports both standard (mongodb://) and SRV (mongodb+srv://) formats
 */
function extractDatabaseName(uri) {
  if (!uri || typeof uri !== 'string') return '';
  const match = uri.match(/(?:mongodb(?:\+srv)?:\/\/[^/]+\/)([^?]+)/i);
  return match ? match[1].trim() : '';
}

/**
 * Fail-closed validation for test database URIs.
 * Throws an unrecoverable exception if the URI targets a prohibited or production database.
 */
function assertIsolatedTestDatabase(uri) {
  if (!uri || typeof uri !== 'string' || !uri.startsWith('mongodb')) {
    throw new Error(
      '[DB ISOLATION GUARD] Fatal: MONGODB_TEST_URI must be configured with a valid mongodb:// or mongodb+srv:// connection string.'
    );
  }

  const dbName = extractDatabaseName(uri);
  if (!dbName) {
    throw new Error(
      '[DB ISOLATION GUARD] Fatal: MONGODB_TEST_URI must explicitly specify a database name (e.g. /tracker_test).'
    );
  }

  const normalizedDb = dbName.toLowerCase();

  // Fail-closed against prohibited / production database names
  if (PROHIBITED_DATABASES.has(normalizedDb)) {
    throw new Error(
      `[SECURITY REJECTION] Test runner REFUSED to execute against production/prohibited database "${dbName}". Tests must ONLY run against an isolated test database.`
    );
  }

  // Must contain 'test' in the database name for clear auditability
  if (!normalizedDb.includes('test')) {
    throw new Error(
      `[SECURITY REJECTION] Target database "${dbName}" is not verified as isolated. The database name must explicitly contain "test" (e.g. "tracker_test").`
    );
  }

  return dbName;
}

module.exports = {
  PROHIBITED_DATABASES,
  extractDatabaseName,
  assertIsolatedTestDatabase
};

