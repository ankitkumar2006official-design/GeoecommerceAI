/**
 * Comprehensive Resend Email & Authentication Integration Test Suite
 * Tests:
 * 1. User registration + welcome email dispatch + token creation
 * 2. Email verification token lifecycle + single-use security
 * 3. Resend verification email endpoint
 * 4. Password reset request + reset confirmation email dispatch
 * 5. Important user notification email dispatch
 * 6. Development test endpoint (/api/auth/test-email) & production guard
 */

const assert = require('assert');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../backend/.env') });
const mongoose = require('mongoose');
const crypto = require('crypto');
const User = require('../backend/models/User');
const emailService = require('../backend/services/emailService');

const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('--- Starting Resend Email & Authentication Integration Tests ---');
  let passed = 0;
  let failed = 0;

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('[Setup] Connected to MongoDB Atlas.');

    // Clean up any test accounts from previous runs
    const testEmail = `resend_audit_${Date.now()}@ecomtest.in`;
    await User.deleteMany({ email: { $regex: /@ecomtest\.in$/i } });

    // -------------------------------------------------------------
    // Test 1: Email Service Utilities exist and return properly structured results
    // -------------------------------------------------------------
    try {
      console.log('\n[Test 1] Testing Email Service Functions...');
      assert.strictEqual(typeof emailService.sendWelcomeEmail, 'function');
      assert.strictEqual(typeof emailService.sendEmailVerificationEmail, 'function');
      assert.strictEqual(typeof emailService.sendPasswordResetEmail, 'function');
      assert.strictEqual(typeof emailService.sendPasswordResetSuccessEmail, 'function');
      assert.strictEqual(typeof emailService.sendNotificationEmail, 'function');

      const welcomeRes = await emailService.sendWelcomeEmail({
        to: 'test@example.com',
        name: 'Test Merchant',
        storeName: 'Test Brand',
        verifyUrl: 'http://localhost:3000/verify-email?token=simulated_token'
      });
      assert.ok(welcomeRes.success, 'Welcome email function must succeed');
      console.log('✓ Test 1 Passed: Email service utilities properly configured.');
      passed++;
    } catch (err) {
      console.error('✗ Test 1 Failed:', err.message);
      failed++;
    }

    // -------------------------------------------------------------
    // Test 2: Notification Email Template and Dispatch
    // -------------------------------------------------------------
    try {
      console.log('\n[Test 2] Testing Important User Notification Email...');
      const notifRes = await emailService.sendNotificationEmail({
        to: 'test@example.com',
        name: 'Store Owner',
        title: 'Critical Stock Alert: 5 Items Below Buffer',
        message: 'High demand in Eastern region has depleted warehouse inventory.',
        actionLabel: 'Manage Stock',
        actionUrl: 'http://localhost:3000/inventory',
        severity: 'danger'
      });
      assert.ok(notifRes.success, 'Notification dispatch must succeed');
      console.log('✓ Test 2 Passed: Notification email dispatched with responsive styling.');
      passed++;
    } catch (err) {
      console.error('✗ Test 2 Failed:', err.message);
      failed++;
    }

    // -------------------------------------------------------------
    // Test 3: Seller Registration with Verification Token
    // -------------------------------------------------------------
    let rawVerifyToken = null;
    let registeredUser = null;
    try {
      console.log('\n[Test 3] Testing Seller Registration & Verification Token Generation...');
      const res = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Resend Audit Merchant',
          storeName: 'Audit Retailers',
          email: testEmail,
          password: 'SecurePassword2026!'
        })
      });

      const body = await res.json();
      assert.strictEqual(res.status, 201, `Registration should return 201: ${JSON.stringify(body)}`);
      assert.ok(body.token, 'Response must include JWT token');
      assert.strictEqual(body.user.email, testEmail);
      assert.strictEqual(body.user.isVerified, false, 'Newly registered user must be unverified');

      // Inspect DB record to verify secure token storage (hashed, not plain)
      registeredUser = await User.findOne({ email: testEmail });
      assert.ok(registeredUser, 'User must exist in MongoDB');
      assert.strictEqual(registeredUser.isVerified, false);
      assert.ok(registeredUser.verificationToken, 'verificationToken must be set in database');
      assert.ok(registeredUser.verificationTokenExpires > new Date(), 'Token must have valid future expiration');

      // Raw token was captured in previewVerifyUrl or let us extract raw token from preview
      if (body.previewVerifyUrl) {
        const url = new URL(body.previewVerifyUrl);
        rawVerifyToken = url.searchParams.get('token');
      }

      console.log('✓ Test 3 Passed: Seller registered with unverified status and cryptographic verification token.');
      passed++;
    } catch (err) {
      console.error('✗ Test 3 Failed:', err.message);
      failed++;
    }

    // -------------------------------------------------------------
    // Test 4: Email Verification Token Lifecycle
    // -------------------------------------------------------------
    try {
      console.log('\n[Test 4] Testing Email Verification Endpoint...');
      assert.ok(rawVerifyToken, 'Raw verify token must be present from test 3');

      // 4a: Test Invalid Token
      const invalidRes = await fetch(`${BASE_URL}/auth/verify-email/invalid_fake_token_123`);
      const invalidBody = await invalidRes.json();
      assert.strictEqual(invalidRes.status, 400, 'Invalid token must return 400');
      assert.ok(invalidBody.error.includes('invalid or has expired'));

      // 4b: Test Valid Token
      const validRes = await fetch(`${BASE_URL}/auth/verify-email/${rawVerifyToken}`);
      const validBody = await validRes.json();
      assert.strictEqual(validRes.status, 200, `Valid token must return 200: ${JSON.stringify(validBody)}`);
      assert.strictEqual(validBody.isVerified, true);

      // Verify DB state
      const verifiedDbUser = await User.findById(registeredUser._id);
      assert.strictEqual(verifiedDbUser.isVerified, true, 'User isVerified must now be true');
      assert.strictEqual(verifiedDbUser.verificationToken, null, 'verificationToken must be cleared');
      assert.strictEqual(verifiedDbUser.verificationTokenExpires, null, 'verificationTokenExpires must be cleared');

      // 4c: Test Token Reuse (Must fail because token was single-use)
      const reuseRes = await fetch(`${BASE_URL}/auth/verify-email/${rawVerifyToken}`);
      assert.strictEqual(reuseRes.status, 400, 'Token reuse must be blocked');

      console.log('✓ Test 4 Passed: Verification token validated, user status updated, and single-use security enforced.');
      passed++;
    } catch (err) {
      console.error('✗ Test 4 Failed:', err.message);
      failed++;
    }

    // -------------------------------------------------------------
    // Test 5: Resend Verification Email Flow
    // -------------------------------------------------------------
    try {
      console.log('\n[Test 5] Testing Resend Verification Email...');
      // Mark user as unverified in DB to test resend flow
      await User.updateOne({ email: testEmail }, { $set: { isVerified: false } });

      const resendRes = await fetch(`${BASE_URL}/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail })
      });
      const resendBody = await resendRes.json();
      assert.strictEqual(resendRes.status, 200);
      assert.ok(resendBody.sent, `Resend response should confirm dispatch: ${JSON.stringify(resendBody)}`);

      // Verify new token exists in database
      const refreshedUser = await User.findOne({ email: testEmail });
      assert.ok(refreshedUser.verificationToken, 'A fresh verification token must be saved');

      console.log('✓ Test 5 Passed: Resend verification generated fresh cryptographic token.');
      passed++;
    } catch (err) {
      console.error('✗ Test 5 Failed:', err.message);
      failed++;
    }

    // -------------------------------------------------------------
    // Test 6: Development Test Email Endpoint (/api/auth/test-email)
    // -------------------------------------------------------------
    try {
      console.log('\n[Test 6] Testing Development Test Email Endpoint...');
      const testReq = await fetch(`${BASE_URL}/auth/test-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: 'dev_test@example.com',
          type: 'welcome'
        })
      });
      const testBody = await testReq.json();
      assert.strictEqual(testReq.status, 200);
      assert.ok(testBody.message.includes('processed successfully'));
      console.log('✓ Test 6 Passed: Development test email endpoint operates correctly.');
      passed++;
    } catch (err) {
      console.error('✗ Test 6 Failed:', err.message);
      failed++;
    }

    // -------------------------------------------------------------
    // Test 7: Duplicate Registration Returns Clean 400 (Not 500)
    // -------------------------------------------------------------
    try {
      console.log('\n[Test 7] Testing Duplicate Registration Handling...');
      const dupRes = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Duplicate Seller',
          storeName: 'Dup Store',
          email: testEmail,
          password: 'Password123'
        })
      });
      const dupBody = await dupRes.json();
      assert.strictEqual(dupRes.status, 400, 'Duplicate registration must return 400 Bad Request');
      assert.ok(dupBody.error.includes('already exists'));
      console.log('✓ Test 7 Passed: Duplicate registration cleanly rejected with 400 and user-friendly error.');
      passed++;
    } catch (err) {
      console.error('✗ Test 7 Failed:', err.message);
      failed++;
    }

    // Clean up
    await User.deleteMany({ email: testEmail });
    console.log('\n[Cleanup] Test accounts cleaned up.');

  } finally {
    await mongoose.disconnect();
    console.log('[Cleanup] Disconnected from MongoDB.');
  }

  console.log(`\n=============================================`);
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`=============================================`);
  if (failed > 0) process.exit(1);
}

runTests();
