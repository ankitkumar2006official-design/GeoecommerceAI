require('./setupTestEnv');
const { startServer } = require('../backend/server');
const { spawn } = require('child_process');

function runCommand(cmd, args) {
  return new Promise((resolve) => {
    const proc = spawn(process.execPath, args, { stdio: 'inherit' });
    proc.on('close', (code) => resolve(code));
  });
}

(async () => {
  console.log('========================================================');
  console.log('  GeoCommerce AI - Comprehensive Full Regression Suite  ');
  console.log('========================================================\n');

  let server;
  try {
    server = await startServer();
  } catch (e) {
    console.error('Failed to start server:', e.message);
    process.exit(1);
  }

  const suites = [
    { name: '1. Production Hardening Suite', cmd: 'node', args: ['--test', 'tests/production_hardening.test.js'] },
    { name: '2. Staging Remediation & Isolation Suite', cmd: 'node', args: ['--test', 'tests/staging_readiness_remediation.test.js'] },
    { name: '3. Forgot & Reset Password Security Suite', cmd: 'node', args: ['--test', 'tests/forgot_password.test.js'] },
    { name: '4. Copilot Dataset Isolation Suite', cmd: 'node', args: ['--test', 'tests/copilot_dataset_isolation.test.js'] },
    { name: '5. Resend Email & Token Lifecycle Suite', cmd: 'node', args: ['tests/email_resend_integration.test.js'] }
  ];

  const results = [];

  for (const suite of suites) {
    console.log(`\n>>> Running: ${suite.name} <<<\n`);
    const code = await runCommand(suite.cmd, suite.args);
    results.push({ name: suite.name, code, passed: code === 0 });
  }

  console.log('\n========================================================');
  console.log('                FINAL TEST EXECUTION SUMMARY            ');
  console.log('========================================================');
  let allPassed = true;
  for (const r of results) {
    const status = r.passed ? 'PASSED (0)' : `FAILED (${r.code})`;
    console.log(`- ${r.name.padEnd(45)}: ${status}`);
    if (!r.passed) allPassed = false;
  }
  console.log('========================================================');
  console.log(`Overall Status: ${allPassed ? 'ALL SUITES PASSED' : 'SOME SUITES FAILED'}\n`);

  if (server && server.close) {
    server.close();
  }

  process.exit(allPassed ? 0 : 1);
})();
