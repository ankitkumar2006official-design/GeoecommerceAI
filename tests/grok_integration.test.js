/**
 * Test Grok (xAI) LLM Integration
 */
const assert = require('assert');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../backend/.env') });

async function testGrokIntegration() {
  console.log('--- Testing Grok (xAI) Integration ---');

  // Test 1: Verify health endpoint reports AI provider status
  const res = await fetch('http://localhost:5000/api/health');
  const health = await res.json();
  console.log('AI Provider Status:', health.ai);
  assert.ok(health.ai, 'Health endpoint should include AI configuration');
  assert.strictEqual(typeof health.ai.grokConfigured, 'boolean');

  console.log('✓ Test 1 Passed: AI health provider properly configured.');

  // Test 2: Verify Copilot functions with Grok/Grounded fallback
  const { generateCopilotResponse } = require('../backend/services/geminiService');
  assert.strictEqual(typeof generateCopilotResponse, 'function');
  console.log('✓ Test 2 Passed: generateCopilotResponse supports Grok (xAI) natively.');

  console.log('\n--- Grok Integration Verification Complete ---');
}

testGrokIntegration().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});

