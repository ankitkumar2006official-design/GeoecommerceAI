require('./setupTestEnv');
const { startServer } = require('../backend/server');
const { spawn } = require('child_process');

(async () => {
  console.log('--- Initializing GeoCommerce AI Backend for E2E Suite ---');
  let server;
  try {
    server = await startServer();
  } catch (e) {
    console.error('Failed to start test server:', e.message);
    process.exit(1);
  }

  console.log('--- Running E2E Test Suite ---');
  const testProc = spawn('node', ['--test', 'tests/e2e_workflow.test.js'], {
    stdio: 'inherit'
  });

  testProc.on('close', (code) => {
    console.log(`E2E Test Runner completed with exit code: ${code}`);
    if (server && server.close) {
      server.close();
    }
    process.exit(code);
  });
})();

