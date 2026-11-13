require('./setupTestEnv');
const { startServer } = require('../backend/server');
const { spawn } = require('child_process');

(async () => {
  console.log('========================================================');
  console.log('  GeoCommerce AI Production Hardening Test Runner       ');
  console.log('========================================================\n');

  let server;
  try {
    server = await startServer();
  } catch (e) {
    console.error('Failed to start server:', e.message);
    process.exit(1);
  }

  console.log('\n--- Executing Production Hardening Test Suite ---\n');

  const testProc = spawn('node', ['--test', 'tests/production_hardening.test.js'], {
    stdio: 'inherit'
  });

  testProc.on('close', (code) => {
    console.log(`\nProduction Hardening Test Suite finished with exit code: ${code}`);
    if (server && server.close) {
      server.close();
    }
    process.exit(code);
  });
})();

