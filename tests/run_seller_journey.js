const { startServer } = require('../backend/server');
const { spawn } = require('child_process');

(async () => {
  console.log('========================================================');
  console.log('   Starting GeoCommerce AI Seller Journey Test Runner   ');
  console.log('========================================================\n');

  let server;
  try {
    server = await startServer();
  } catch (e) {
    console.error('Failed to start server:', e.message);
    process.exit(1);
  }

  console.log('\n--- Executing 14-Step Seller Journey Test Suite ---\n');

  const testProc = spawn('node', ['--test', 'tests/seller_journey.test.js'], {
    stdio: 'inherit'
  });

  testProc.on('close', (code) => {
    console.log(`\nSeller Journey Test Suite finished with exit code: ${code}`);
    if (server && server.close) {
      server.close();
    }
    process.exit(code);
  });
})();
