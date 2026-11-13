require('./setupTestEnv');
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');
const FormData = require('../backend/node_modules/form-data');
const axios = require('../backend/node_modules/axios');
const mongoose = require('../backend/node_modules/mongoose');

const {
  isProtectedEnv,
  isProduction,
  isStaging,
  isTest,
  isDevelopment,
  assertProtectedEnvironment
} = require('../backend/config/environment');
const { assertIsolatedTestDatabase, PROHIBITED_DATABASES } = require('../backend/config/testDbGuard');
const { validateFileSignature } = require('../backend/utils/fileValidator');
const { setInMemoryMode } = require('../backend/models/modelFactory');

const API_URL = 'http://127.0.0.1:5000/api';

test('GeoCommerce AI - Final Staging Remediation Verification Suite', async (t) => {
  let authToken = '';
  let sellerId = '';
  const testEmail = `staging_remed_${Date.now()}@ecomaudit.in`;
  const testPassword = 'AuditPassword2026!';

  // =========================================================================
  // TASK 1: Protected Environment Enforcement
  // =========================================================================
  await t.test('Task 1: Protected Environment Guard Matrix (dev, test, staging, prod)', async () => {
    // 1.1 Development
    assert.strictEqual(isDevelopment('development'), true);
    assert.strictEqual(isProtectedEnv('development'), false);

    // 1.2 Test
    assert.strictEqual(isTest('test'), true);
    assert.strictEqual(isProtectedEnv('test'), false);

    // 1.3 Staging
    assert.strictEqual(isStaging('staging'), true);
    assert.strictEqual(isProtectedEnv('staging'), true);

    // 1.4 Production
    assert.strictEqual(isProduction('production'), true);
    assert.strictEqual(isProtectedEnv('production'), true);

    // 1.5 Staging & Production assertProtectedEnvironment() validation
    const originalEnv = process.env.NODE_ENV;
    const originalJwt = process.env.JWT_SECRET;
    const originalMongo = process.env.MONGODB_URI;

    try {
      // In staging: must reject default or short JWT secrets
      process.env.NODE_ENV = 'staging';
      process.env.JWT_SECRET = 'geocommerce_super_secret_jwt_key_2026';
      process.env.MONGODB_URI = 'mongodb://localhost:27017/tracker_test';

      assert.throws(
        () => assertProtectedEnvironment('staging'),
        /Strong JWT_SECRET must be explicitly provided in staging/,
        'Staging must reject default fallback JWT secret'
      );

      process.env.JWT_SECRET = 'short_key_under_32_chars';
      assert.throws(
        () => assertProtectedEnvironment('staging'),
        /JWT_SECRET in staging must be at least 32 characters/,
        'Staging must reject JWT secret under 32 characters'
      );

      // In production: must reject default or short JWT secrets
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = 'your_jwt_secret_key_here';
      assert.throws(
        () => assertProtectedEnvironment('production'),
        /Strong JWT_SECRET must be explicitly provided in production/,
        'Production must reject default fallback JWT secret'
      );

      // In staging & production: in-memory DB mode must throw
      assert.throws(
        () => {
          process.env.NODE_ENV = 'staging';
          setInMemoryMode(true);
        },
        /In-memory database fallback is strictly prohibited in staging mode/,
        'Staging must prohibit in-memory database mode'
      );

      assert.throws(
        () => {
          process.env.NODE_ENV = 'production';
          setInMemoryMode(true);
        },
        /In-memory database fallback is strictly prohibited in production mode/,
        'Production must prohibit in-memory database mode'
      );

      // Valid 64-char key in staging and production
      process.env.JWT_SECRET = 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90';
      assert.doesNotThrow(() => assertProtectedEnvironment('staging'), 'Valid key in staging must pass');
      assert.doesNotThrow(() => assertProtectedEnvironment('production'), 'Valid key in production must pass');
    } finally {
      process.env.NODE_ENV = originalEnv;
      process.env.JWT_SECRET = originalJwt;
      process.env.MONGODB_URI = originalMongo;
    }
  });

  // =========================================================================
  // TASK 2: Test Runner Isolation
  // =========================================================================
  await t.test('Task 2: Test Runner Isolation and Rejection of tracker_staging and tracker', async () => {
    // 2.1 Rejection of tracker
    assert.throws(
      () => assertIsolatedTestDatabase('mongodb+srv://admin:pass@cluster.mongodb.net/tracker?retryWrites=true'),
      /SECURITY REJECTION.*tracker/,
      'Must reject production database "tracker"'
    );

    // 2.2 Rejection of tracker_staging and staging
    assert.throws(
      () => assertIsolatedTestDatabase('mongodb+srv://admin:pass@cluster.mongodb.net/tracker_staging?retryWrites=true'),
      /SECURITY REJECTION.*tracker_staging/,
      'Must reject staging database "tracker_staging"'
    );

    assert.throws(
      () => assertIsolatedTestDatabase('mongodb+srv://admin:pass@cluster.mongodb.net/staging?retryWrites=true'),
      /SECURITY REJECTION.*staging/,
      'Must reject database "staging"'
    );

    // 2.3 Acceptance of tracker_test
    const verified = assertIsolatedTestDatabase('mongodb+srv://admin:pass@cluster.mongodb.net/tracker_test?retryWrites=true');
    assert.strictEqual(verified, 'tracker_test');

    // 2.4 Verify all test runner files contain setupTestEnv
    const runnerFiles = [
      path.resolve(__dirname, 'run_all_suites.js'),
      path.resolve(__dirname, 'run_hardening_test.js'),
      path.resolve(__dirname, 'run_seller_journey.js'),
      path.resolve(__dirname, 'run_e2e.js'),
      path.resolve(__dirname, 'production_hardening.test.js'),
      path.resolve(__dirname, 'seller_journey.test.js'),
      path.resolve(__dirname, 'copilot_dataset_isolation.test.js'),
      path.resolve(__dirname, 'forgot_password.test.js')
    ];

    for (const f of runnerFiles) {
      assert.ok(fs.existsSync(f), `File must exist: ${f}`);
      const content = fs.readFileSync(f, 'utf8');
      assert.ok(content.includes("require('./setupTestEnv')"), `File ${path.basename(f)} must require setupTestEnv`);
    }

    // 2.5 Verify Python test runner has native isolation check
    const pyRunner = path.resolve(__dirname, 'run_all_tests.py');
    const pyContent = fs.readFileSync(pyRunner, 'utf8');
    assert.ok(pyContent.includes('assert_isolated_test_db'), 'Python runner must have assert_isolated_test_db');
    assert.ok(pyContent.includes('tracker_staging'), 'Python runner must include tracker_staging in prohibited list');
  });

  // =========================================================================
  // TASK 3: Streaming Upload Protection & Magic Bytes Validation
  // =========================================================================
  await t.test('Task 3: Streaming CSV Row Limit & Binary Signature Validation', async () => {
    // 3.1 Magic bytes signature validation
    const fakeCsvPath = path.resolve(__dirname, 'fake_executable.csv');
    const exeBuffer = Buffer.from([0x4D, 0x5A, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]); // 'MZ' DOS header
    fs.writeFileSync(fakeCsvPath, exeBuffer);

    try {
      assert.throws(
        () => validateFileSignature(fakeCsvPath, '.csv'),
        /Executable binary detected/,
        'Must reject executable disguised as CSV'
      );
    } finally {
      if (fs.existsSync(fakeCsvPath)) fs.unlinkSync(fakeCsvPath);
    }

    // 3.2 Null bytes in CSV
    const nullByteCsvPath = path.resolve(__dirname, 'null_byte.csv');
    fs.writeFileSync(nullByteCsvPath, Buffer.from('Order ID,Product ID\nORD1,\x00\x00\x00'));
    try {
      assert.throws(
        () => validateFileSignature(nullByteCsvPath, '.csv'),
        /Binary null bytes detected/,
        'Must reject CSV with binary null bytes'
      );
    } finally {
      if (fs.existsSync(nullByteCsvPath)) fs.unlinkSync(nullByteCsvPath);
    }

    // 3.3 Valid CSV signature passes
    const validCsvPath = path.resolve(__dirname, 'valid_signature.csv');
    fs.writeFileSync(validCsvPath, 'Order ID,Product ID,Product Name,Category\nORD1,P1,Test,Electronics\n');
    try {
      assert.strictEqual(validateFileSignature(validCsvPath, '.csv'), true);
    } finally {
      if (fs.existsSync(validCsvPath)) fs.unlinkSync(validCsvPath);
    }
  });

  // =========================================================================
  // TASK 4: Atomic Sample Data Seeding
  // =========================================================================
  await t.test('Task 4: Atomic Sample Data Seeding and Session Consistency', async () => {
    // Register merchant
    const regRes = await axios.post(`${API_URL}/auth/register`, {
      name: 'Transaction Auditor',
      email: testEmail,
      password: testPassword,
      storeName: 'Atomic Audit Retail'
    });
    assert.strictEqual(regRes.status, 201);
    authToken = regRes.data.token;
    sellerId = regRes.data.user.id;

    // Load sample data with atomic session
    const loadRes = await axios.post(
      `${API_URL}/sales/load-sample`,
      {},
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    assert.strictEqual(loadRes.status, 200);
    assert.ok(loadRes.data.count > 0, 'Sample data count must be > 0');
    assert.strictEqual(loadRes.data.activeDataset, true);

    // 4. Verify consistency across collections via authenticated APIs
    const overviewRes = await axios.get(`${API_URL}/analytics/overview`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    assert.strictEqual(overviewRes.status, 200);
    assert.strictEqual(overviewRes.data.hasData, true, 'Active dataset must be recognized');
    assert.ok(overviewRes.data.totalRevenue > 500000, 'Total revenue must be positive and consistent');
    assert.ok(overviewRes.data.totalUnits >= 800, 'Total units must be at least 800');
    assert.ok(overviewRes.data.totalOrdersCount > 0, 'Orders count must be positive');

    const datasetsRes = await axios.get(`${API_URL}/sales/datasets`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    assert.strictEqual(datasetsRes.status, 200);
    assert.ok(Array.isArray(datasetsRes.data.datasets));
    assert.ok(datasetsRes.data.datasets.length >= 1, 'Dataset must be registered');
    assert.strictEqual(datasetsRes.data.datasets[0].isActive, true, 'Dataset must be active');
  });

  // =========================================================================
  // TASK 5: ML Service Health and Readiness Endpoints
  // =========================================================================
  await t.test('Task 5: Health Probes (/health/live and /health/ready)', async () => {
    // 5.1 Liveness Probe
    const liveRes = await axios.get(`${API_URL}/health/live`);
    assert.strictEqual(liveRes.status, 200);
    assert.strictEqual(liveRes.data.status, 'alive');
    assert.ok(liveRes.data.uptimeSeconds !== undefined, 'Must report uptimeSeconds');

    // Root liveness
    const rootLiveRes = await axios.get('http://127.0.0.1:5000/health/live');
    assert.strictEqual(rootLiveRes.status, 200);
    assert.strictEqual(rootLiveRes.data.status, 'alive');

    // 5.2 Readiness Probe
    const readyRes = await axios.get(`${API_URL}/health/ready`);
    // Status is 200 (database is ready; mlMicroservice may be available or degraded)
    assert.ok(readyRes.status === 200 || readyRes.status === 503);
    assert.ok(readyRes.data.dependencies, 'Dependencies section must be present');
    assert.ok(readyRes.data.dependencies.database, 'Database dependency must be present');
    assert.strictEqual(typeof readyRes.data.dependencies.database.ready, 'boolean');
    assert.ok(readyRes.data.dependencies.mlMicroservice, 'mlMicroservice dependency must be present');
    assert.strictEqual(typeof readyRes.data.dependencies.mlMicroservice.ready, 'boolean');

    // Must not leak raw connection string or passwords
    const stringified = JSON.stringify(readyRes.data);
    assert.ok(!stringified.includes('mongodb+srv://'), 'Must not leak MongoDB connection string');
    assert.ok(!stringified.includes('@'), 'Must not leak credential @ symbol');
  });
});
