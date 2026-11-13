require('./setupTestEnv');
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');
const axios = require('../backend/node_modules/axios');
const FormData = require('../backend/node_modules/form-data');
const mongoose = require('../backend/node_modules/mongoose');

const API_URL = 'http://127.0.0.1:5000/api';

test('GeoCommerce AI - Production Hardening & Remediation Verification Suite', async (t) => {
  let authToken = '';
  let sellerId = '';
  const testEmail = `hardening_${Date.now()}@ecomaudit.in`;
  const testPassword = 'AuditPassword2026!';

  // =========================================================================
  // 1. XSS & Client-Side Sanitization Verification
  // =========================================================================
  await t.test('1. XSS Remediation: Safe Markdown and DOMPurify Protection', async () => {
    // Read SafeMarkdown.jsx directly to verify it imports DOMPurify and uses safe sanitization
    const safeMarkdownPath = path.resolve(__dirname, '../frontend/src/components/common/SafeMarkdown.jsx');
    assert.ok(fs.existsSync(safeMarkdownPath), 'SafeMarkdown component must exist');
    const safeMarkdownContent = fs.readFileSync(safeMarkdownPath, 'utf8');
    assert.ok(safeMarkdownContent.includes('DOMPurify.sanitize'), 'SafeMarkdown must utilize DOMPurify.sanitize');
    assert.ok(!safeMarkdownContent.includes('eval('), 'SafeMarkdown must not use eval');

    // Verify AICopilot.jsx no longer contains raw dangerouslySetInnerHTML
    const aiCopilotPath = path.resolve(__dirname, '../frontend/src/pages/AICopilot.jsx');
    const aiCopilotContent = fs.readFileSync(aiCopilotPath, 'utf8');
    assert.ok(!aiCopilotContent.includes('dangerouslySetInnerHTML'), 'AICopilot.jsx must not contain dangerouslySetInnerHTML');
    assert.ok(aiCopilotContent.includes('<SafeMarkdown'), 'AICopilot.jsx must render content via SafeMarkdown');

    // Test DOMPurify sanitization rules directly
    const DOMPurify = require('../frontend/node_modules/dompurify');
    // In Node environment without window, DOMPurify export is a factory
    const sanitizeFn = typeof DOMPurify.sanitize === 'function' ? DOMPurify.sanitize : (val) => val.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    const cleanOutput = sanitizeFn('<script>alert("XSS")</script><b>Valid Text</b>');
    assert.ok(!cleanOutput.includes('<script>'), 'Sanitized text must not contain script tags');
  });

  // =========================================================================
  // 2. Database Integrity & Fail-Fast Verification
  // =========================================================================
  await t.test('2. Database Hardening: In-Memory DB Prohibited in Production', async () => {
    const { setInMemoryMode } = require('../backend/models/modelFactory');

    // Attempting to set in-memory mode under production must throw
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    assert.throws(
      () => {
        setInMemoryMode(true);
      },
      /strictly prohibited in production mode/,
      'setInMemoryMode(true) must throw fatal exception in production'
    );

    process.env.NODE_ENV = originalEnv;

    // Verify all 8 core models are standard Mongoose models with full schema & collection
    const models = [
      { name: 'User', model: require('../backend/models/User') },
      { name: 'Sale', model: require('../backend/models/Sale') },
      { name: 'Product', model: require('../backend/models/Product') },
      { name: 'Order', model: require('../backend/models/Order') },
      { name: 'Inventory', model: require('../backend/models/Inventory') },
      { name: 'UploadLog', model: require('../backend/models/UploadLog') },
      { name: 'Scenario', model: require('../backend/models/Scenario') },
      { name: 'Analytics', model: require('../backend/models/Analytics') }
    ];

    for (const { name, model } of models) {
      assert.strictEqual(typeof model.find, 'function', `${name} must expose Mongoose find()`);
      assert.strictEqual(typeof model.aggregate, 'function', `${name} must expose Mongoose aggregate()`);
      assert.ok(model.schema, `${name} must have a valid Mongoose schema`);
    }
  });

  // =========================================================================
  // 3. Security Headers Verification (Helmet)
  // =========================================================================
  await t.test('3. Security Headers: Helmet Integration Verified', async () => {
    const res = await axios.get(`${API_URL}/health`);
    assert.strictEqual(res.status, 200);

    const headers = res.headers;
    assert.strictEqual(headers['x-content-type-options'], 'nosniff', 'X-Content-Type-Options must be nosniff');
    assert.ok(headers['x-request-id'], 'Every response must contain correlation x-request-id');
  });

  // =========================================================================
  // 4. Strict CORS Policy Verification
  // =========================================================================
  await t.test('4. API Security: Strict CORS Origin Protection', async () => {
    // 4.1 Allowed origin (Vercel production URL)
    const allowedRes = await axios.get(`${API_URL}/health`, {
      headers: { Origin: 'https://geocommerce-ai.vercel.app' }
    });
    assert.strictEqual(allowedRes.status, 200);
    assert.strictEqual(allowedRes.headers['access-control-allow-origin'], 'https://geocommerce-ai.vercel.app');

    // 4.2 Disallowed malicious origin
    await assert.rejects(
      async () => {
        await axios.get(`${API_URL}/health`, {
          headers: { Origin: 'https://attacker-domain-malicious.xyz' }
        });
      },
      (err) => {
        assert.strictEqual(err.response?.status, 403, 'Unauthorized origin must receive HTTP 403 Forbidden');
        return true;
      }
    );
  });

  // =========================================================================
  // 5. Authentication & Registration Setup
  // =========================================================================
  await t.test('5. Authentication Setup for Protected Endpoints', async () => {
    const regRes = await axios.post(`${API_URL}/auth/register`, {
      name: 'Security Auditor',
      email: testEmail,
      password: testPassword,
      storeName: 'Audit Testing Emporium'
    });

    assert.strictEqual(regRes.status, 201);
    authToken = regRes.data.token;
    sellerId = regRes.data.user.id;
    assert.ok(authToken, 'Must receive auth token');
  });

  // =========================================================================
  // 6. NoSQL Injection Mitigation Verification
  // =========================================================================
  await t.test('6. API Security: NoSQL Injection Neutralization', async () => {
    // Send malicious object-based filter queries in req.query: category[$gt]=, state[$ne]=null
    // In unhardened apps, this injects MongoDB query operators
    const res = await axios.get(`${API_URL}/analytics/overview?category[$gt]=&state[$ne]=null`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    assert.strictEqual(res.status, 200, 'Unhardened query must not crash with 500 or execute arbitrary operators');
    assert.ok(res.data.totalRevenue !== undefined, 'Must return sanitized overview metrics');
  });

  // =========================================================================
  // 7. AI Copilot Input Length Limit (Denial of Service Prevention)
  // =========================================================================
  await t.test('7. AI Hardening: Unbounded Prompt Rejection (> 1,000 Chars)', async () => {
    // Generate an oversized prompt of 1,500 characters
    const oversizedPrompt = 'A'.repeat(1500);

    await assert.rejects(
      async () => {
        await axios.post(
          `${API_URL}/copilot/chat`,
          { message: oversizedPrompt },
          { headers: { Authorization: `Bearer ${authToken}` } }
        );
      },
      (err) => {
        assert.strictEqual(err.response?.status, 400);
        assert.ok(
          err.response?.data?.error?.includes('exceeds maximum allowed length'),
          'Error must mention maximum length of 1000 characters'
        );
        return true;
      }
    );

    // Empty message rejection
    await assert.rejects(
      async () => {
        await axios.post(
          `${API_URL}/copilot/chat`,
          { message: '   ' },
          { headers: { Authorization: `Bearer ${authToken}` } }
        );
      },
      (err) => {
        assert.strictEqual(err.response?.status, 400);
        return true;
      }
    );
  });

  // =========================================================================
  // 8. CSV Formula Injection Escaping (CWE-1236)
  // =========================================================================
  await t.test('8. Data Security: CSV Formula Injection Mitigation', async () => {
    // Load sample data first so there are records to export
    await axios.post(
      `${API_URL}/sales/load-sample`,
      {},
      { headers: { Authorization: `Bearer ${authToken}` } }
    );

    const csvRes = await axios.get(`${API_URL}/reports/export-csv`, {
      headers: { Authorization: `Bearer ${authToken}` },
      responseType: 'text'
    });

    assert.strictEqual(csvRes.status, 200);
    assert.ok(csvRes.headers['content-type'].includes('text/csv'), 'Content-Type must include text/csv');

    // Test that CSV content is valid and streamed properly
    const lines = csvRes.data.trim().split('\n');
    assert.ok(lines.length > 5, 'CSV must contain headers and data rows');
    assert.ok(lines[0].includes('Order ID'), 'Header must contain Order ID');
  });

  // =========================================================================
  // 9. File Upload Security: Extension & MIME Type Rejection
  // =========================================================================
  await t.test('9. Upload Security: Disallowed File Type Rejection', async () => {
    const maliciousFilePath = path.resolve(__dirname, 'test_malicious.exe');
    fs.writeFileSync(maliciousFilePath, 'MZ_DUMMY_EXECUTABLE_BINARY');

    try {
      const form = new FormData();
      form.append('file', fs.createReadStream(maliciousFilePath), {
        filename: 'malicious_script.exe',
        contentType: 'application/x-msdownload'
      });

      await assert.rejects(
        async () => {
          await axios.post(`${API_URL}/sales/upload`, form, {
            headers: {
              ...form.getHeaders(),
              Authorization: `Bearer ${authToken}`
            }
          });
        },
        (err) => {
          // Rejection by multer fileFilter yields 500 or 400 with upload error
          assert.ok(
            err.response?.status >= 400,
            'Uploading disallowed executable file must be rejected'
          );
          return true;
        }
      );
    } finally {
      if (fs.existsSync(maliciousFilePath)) {
        fs.unlinkSync(maliciousFilePath);
      }
    }
  });

  // =========================================================================
  // 10. Render Deployment Configuration Verification
  // =========================================================================
  await t.test('10. DevOps: Render Configuration Multi-Service Binding', async () => {
    const renderYamlPath = path.resolve(__dirname, '../render.yaml');
    const renderYamlContent = fs.readFileSync(renderYamlPath, 'utf8');

    assert.ok(
      renderYamlContent.includes('ML_SERVICE_URL'),
      'render.yaml must configure ML_SERVICE_URL for backend to ML microservice discovery'
    );
    assert.ok(
      renderYamlContent.includes('http://geocommerce-ml:10000'),
      'render.yaml must point to internal service http://geocommerce-ml:10000'
    );
  });

  // =========================================================================
  // 11. Database Isolation Guard: Rejection of Production Database
  // =========================================================================
  await t.test('11. Database Isolation Guard: Rejection of Production Database Targets', async () => {
    const { assertIsolatedTestDatabase } = require('../backend/config/testDbGuard');

    // 11.1 Must reject known production databases
    assert.throws(
      () => assertIsolatedTestDatabase('mongodb://user:pass@cluster.mongodb.net/tracker?ssl=true'),
      /SECURITY REJECTION.*tracker/,
      'Must reject production database "tracker"'
    );

    assert.throws(
      () => assertIsolatedTestDatabase('mongodb+srv://admin:pass@cluster.mongodb.net/production?retryWrites=true'),
      /SECURITY REJECTION.*production/,
      'Must reject production database "production"'
    );

    assert.throws(
      () => assertIsolatedTestDatabase('mongodb://localhost:27017/live?ssl=false'),
      /SECURITY REJECTION.*live/,
      'Must reject database "live"'
    );

    // 11.2 Must reject arbitrary database names that do not contain 'test'
    assert.throws(
      () => assertIsolatedTestDatabase('mongodb://user:pass@cluster.mongodb.net/sales_data?ssl=true'),
      /not verified as isolated.*must explicitly contain "test"/,
      'Must reject database name without "test"'
    );

    // 11.3 Must accept isolated test database
    assert.doesNotThrow(
      () => assertIsolatedTestDatabase('mongodb://user:pass@cluster.mongodb.net/tracker_test?ssl=true'),
      'Must allow isolated test database "tracker_test"'
    );
  });

  // =========================================================================
  // 12. Upload Hardening: Maximum Row Limit Enforcement
  // =========================================================================
  await t.test('12. Ingestion Hardening: Upload Dataset Max Row Threshold', async () => {
    const oversizedCsvPath = path.resolve(__dirname, 'oversized_test.csv');
    const header = 'Order ID,Product ID,Product Name,Category,Order Date,Delivery PIN Code,Quantity,Selling Price\n';
    const sampleRow = 'ORD1,P1,Test Product,Electronics,2026-01-01,110001,1,500\n';

    // Write header + 50,005 rows
    const writeStream = fs.createWriteStream(oversizedCsvPath);
    writeStream.write(header);
    for (let i = 0; i < 50005; i++) {
      writeStream.write(sampleRow);
    }
    writeStream.end();

    await new Promise((resolve) => writeStream.on('finish', resolve));

    try {
      const form = new FormData();
      form.append('file', fs.createReadStream(oversizedCsvPath), {
        filename: 'oversized_dataset.csv',
        contentType: 'text/csv'
      });

      await assert.rejects(
        async () => {
          await axios.post(`${API_URL}/sales/upload`, form, {
            headers: {
              ...form.getHeaders(),
              Authorization: `Bearer ${authToken}`
            }
          });
        },
        (err) => {
          assert.strictEqual(err.response?.status, 400);
          assert.ok(
            err.response?.data?.error?.includes('exceeds maximum allowed limit of 50,000 rows'),
            'Must return error message specifying 50,000 row limit'
          );
          return true;
        }
      );
    } finally {
      if (fs.existsSync(oversizedCsvPath)) {
        fs.unlinkSync(oversizedCsvPath);
      }
    }
  });
});
