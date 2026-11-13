/**
 * Environment Policy & Security Guard
 * Enforces unified policies for protected (production, staging) and non-protected environments.
 */

function getEnvironment() {
  return (process.env.NODE_ENV || 'development').trim().toLowerCase();
}

function isProduction(env) {
  const target = env ? String(env).trim().toLowerCase() : getEnvironment();
  return target === 'production';
}

function isStaging(env) {
  const target = env ? String(env).trim().toLowerCase() : getEnvironment();
  return target === 'staging';
}

function isProtectedEnv(env) {
  const target = env ? String(env).trim().toLowerCase() : getEnvironment();
  return target === 'production' || target === 'staging';
}

function isTest(env) {
  const target = env ? String(env).trim().toLowerCase() : getEnvironment();
  return target === 'test';
}

function isDevelopment(env) {
  const target = env ? String(env).trim().toLowerCase() : getEnvironment();
  return target === 'development' || target === 'dev';
}

const INSECURE_DEFAULT_SECRETS = new Set([
  'geocommerce_super_secret_jwt_key_2026',
  'your_jwt_secret_key_here',
  'secret',
  'jwtsecret',
  'changeme',
  'default_secret',
  'testsecret'
]);

function assertProtectedEnvironment(env) {
  const targetEnv = env || getEnvironment();
  if (!isProtectedEnv(targetEnv)) return;

  // 1. JWT Secret Validation
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret || INSECURE_DEFAULT_SECRETS.has(jwtSecret.trim())) {
    throw new Error(
      `[Security Guard] FATAL: Strong JWT_SECRET must be explicitly provided in ${targetEnv}. Default or sample keys are strictly prohibited.`
    );
  }
  if (jwtSecret.length < 32) {
    throw new Error(
      `[Security Guard] FATAL: JWT_SECRET in ${targetEnv} must be at least 32 characters in length (received ${jwtSecret.length}).`
    );
  }

  // 2. Validate MONGODB_URI presence
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri || !mongoUri.startsWith('mongodb')) {
    throw new Error(
      `[Security Guard] FATAL: Valid MONGODB_URI (mongodb:// or mongodb+srv://) is required in ${targetEnv}.`
    );
  }
}

module.exports = {
  getEnvironment,
  isProduction,
  isStaging,
  isProtectedEnv,
  isTest,
  isDevelopment,
  INSECURE_DEFAULT_SECRETS,
  assertProtectedEnvironment
};
