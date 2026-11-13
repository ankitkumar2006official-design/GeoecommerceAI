const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');

test('Unit & Security Isolation Suite (Zero-Network Sandboxed)', async (t) => {

  // =========================================================================
  // 1. Database Isolation Guard Tests
  // =========================================================================
  await t.test('1. testDbGuard - URI Parsing and Prohibited Database Rejection', () => {
    const { extractDatabaseName, assertIsolatedTestDatabase } = require('../backend/config/testDbGuard');

    // Valid extraction
    assert.equal(extractDatabaseName('mongodb://localhost:27017/tracker_test'), 'tracker_test');
    assert.equal(extractDatabaseName('mongodb+srv://user:pass@cluster0.abc.mongodb.net/tracker_test?retryWrites=true'), 'tracker_test');

    // Accepts valid test databases
    assert.equal(assertIsolatedTestDatabase('mongodb://localhost:27017/tracker_test'), 'tracker_test');
    assert.equal(assertIsolatedTestDatabase('mongodb+srv://user:pass@cluster0.abc.mongodb.net/unit_test_db?retryWrites=true'), 'unit_test_db');

    // Throws on prohibited production database names
    const prohibited = ['tracker', 'tracker_staging', 'staging', 'production', 'prod', 'live', 'main', 'geocommerce_prod'];
    for (const p of prohibited) {
      assert.throws(
        () => assertIsolatedTestDatabase(`mongodb://localhost:27017/${p}`),
        /SECURITY REJECTION/,
        `Must throw security rejection for prohibited database "${p}"`
      );
    }

    // Throws on databases without 'test'
    assert.throws(
      () => assertIsolatedTestDatabase('mongodb://localhost:27017/sales_ecommerce'),
      /not verified as isolated/,
      'Must reject database name without "test"'
    );
  });

  // =========================================================================
  // 2. Binary Signature / Magic Byte Upload Validation
  // =========================================================================
  await t.test('2. fileValidator - Magic Byte Detection & Spoofing Mitigation', () => {
    const { validateFileSignature } = require('../backend/utils/fileValidator');
    const tempDir = path.resolve(__dirname, 'temp_test_files');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

    const exeFile = path.join(tempDir, 'test_fake.csv');
    const elfFile = path.join(tempDir, 'test_elf.csv');
    const nullByteCsv = path.join(tempDir, 'test_null.csv');
    const validCsv = path.join(tempDir, 'test_valid.csv');
    const invalidXlsx = path.join(tempDir, 'test_fake.xlsx');
    const validXlsx = path.join(tempDir, 'test_valid.xlsx');
    const emptyFile = path.join(tempDir, 'test_empty.csv');

    try {
      // 1. DOS/PE MZ header
      fs.writeFileSync(exeFile, Buffer.from([0x4D, 0x5A, 0x90, 0x00, 0x03]));
      assert.throws(
        () => validateFileSignature(exeFile, '.csv'),
        /Executable binary detected/,
        'Must reject MZ executable renamed to .csv'
      );

      // 2. ELF header
      fs.writeFileSync(elfFile, Buffer.from([0x7F, 0x45, 0x4C, 0x46, 0x02]));
      assert.throws(
        () => validateFileSignature(elfFile, '.csv'),
        /Linux executable binary detected/,
        'Must reject ELF binary renamed to .csv'
      );

      // 3. Null bytes in CSV
      fs.writeFileSync(nullByteCsv, Buffer.from([0x48, 0x65, 0x6C, 0x00, 0x6F]));
      assert.throws(
        () => validateFileSignature(nullByteCsv, '.csv'),
        /Binary null bytes detected in text content/,
        'Must reject CSV with embedded null bytes'
      );

      // 4. Valid clean CSV
      fs.writeFileSync(validCsv, 'OrderID,Product,Sales,City\n101,Desk,450,Mumbai\n');
      assert.equal(validateFileSignature(validCsv, '.csv'), true);

      // 5. Invalid XLSX (missing PK header)
      fs.writeFileSync(invalidXlsx, 'Not a real zip archive');
      assert.throws(
        () => validateFileSignature(invalidXlsx, '.xlsx'),
        /Invalid Excel \(\.xlsx\) file signature/,
        'Must reject non-zip XLSX'
      );

      // 6. Valid XLSX zip signature (PK\x03\x04)
      fs.writeFileSync(validXlsx, Buffer.from([0x50, 0x4B, 0x03, 0x04, 0x00, 0x00]));
      assert.equal(validateFileSignature(validXlsx, '.xlsx'), true);

      // 7. Empty file rejection
      fs.writeFileSync(emptyFile, Buffer.alloc(0));
      assert.throws(
        () => validateFileSignature(emptyFile, '.csv'),
        /Uploaded file is empty/,
        'Must reject 0-byte file'
      );

    } finally {
      // Cleanup
      const files = [exeFile, elfFile, nullByteCsv, validCsv, invalidXlsx, validXlsx, emptyFile];
      for (const f of files) {
        if (fs.existsSync(f)) fs.unlinkSync(f);
      }
      if (fs.existsSync(tempDir)) fs.rmdirSync(tempDir);
    }
  });

  // =========================================================================
  // 3. In-Memory Database Mode Prohibition in Production
  // =========================================================================
  await t.test('3. modelFactory - Enforce Prohibition of RAM Fallback in Production', () => {
    const { setInMemoryMode } = require('../backend/models/modelFactory');
    const origEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    try {
      assert.throws(
        () => setInMemoryMode(true),
        /strictly prohibited in production mode/,
        'setInMemoryMode(true) must be blocked when NODE_ENV is production'
      );
    } finally {
      process.env.NODE_ENV = origEnv;
    }
  });

  // =========================================================================
  // 4. Frontend Bundle Size & Code-Splitting Verification
  // =========================================================================
  await t.test('4. Frontend Bundle Distribution - Verification of Code Splitting', () => {
    const distAssetsDir = path.resolve(__dirname, '../frontend/dist/assets');
    assert.ok(fs.existsSync(distAssetsDir), 'frontend/dist/assets must exist');

    const files = fs.readdirSync(distAssetsDir);
    const jsFiles = files.filter(f => f.endsWith('.js'));
    assert.ok(jsFiles.length >= 10, 'Expected multiple lazy-loaded chunk files');

    // Confirm that the initial shell is tiny (< 100 kB uncompressed)
    const indexBundle = jsFiles.find(f => f.startsWith('index-'));
    assert.ok(indexBundle, 'Main index bundle must exist');
    const indexStats = fs.statSync(path.join(distAssetsDir, indexBundle));
    const indexKb = indexStats.size / 1024;
    assert.ok(indexKb < 100, `Main index bundle must be < 100 kB, got ${indexKb.toFixed(2)} kB`);

    // Confirm vendor-charts is isolated into its own chunk
    const chartChunk = jsFiles.find(f => f.startsWith('vendor-charts-'));
    assert.ok(chartChunk, 'vendor-charts chunk must exist as isolated lazy chunk');

    // Confirm vendor-maps is isolated into its own chunk
    const mapChunk = jsFiles.find(f => f.startsWith('vendor-maps-'));
    assert.ok(mapChunk, 'vendor-maps chunk must exist as isolated lazy chunk');
  });

  // =========================================================================
  // 5. SafeMarkdown & XSS Protection Code Audit
  // =========================================================================
  await t.test('5. SafeMarkdown - DOMPurify Integration & Dangerous Pattern Audit', () => {
    const safeMarkdownPath = path.resolve(__dirname, '../frontend/src/components/common/SafeMarkdown.jsx');
    assert.ok(fs.existsSync(safeMarkdownPath), 'SafeMarkdown component must exist');

    const code = fs.readFileSync(safeMarkdownPath, 'utf8');
    assert.ok(code.includes('DOMPurify.sanitize'), 'Must use DOMPurify.sanitize');
    assert.ok(!code.includes('eval('), 'Must not use eval');

    // Audit AICopilot.jsx
    const copilotPath = path.resolve(__dirname, '../frontend/src/pages/AICopilot.jsx');
    const copilotCode = fs.readFileSync(copilotPath, 'utf8');
    assert.ok(!copilotCode.includes('dangerouslySetInnerHTML'), 'AICopilot must not use raw dangerouslySetInnerHTML');
    assert.ok(copilotCode.includes('<SafeMarkdown'), 'AICopilot must render through SafeMarkdown');
  });
});

