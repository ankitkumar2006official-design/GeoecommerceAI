const test = require('node:test');
const assert = require('node:assert/strict');
const axios = require('c:/e-commerce ai sales data/backend/node_modules/axios');

const API_BASE = 'http://localhost:5000/api';

test('GeoCommerce AI - Forgot Password & Reset Password Suite', async (t) => {
  const testEmail = `forgot_test_${Date.now()}@ecommerceseller.in`;
  const initialPassword = 'InitialSecretPass123!';
  const updatedPassword = 'NewSecurePass2026!';
  let rawResetToken = '';

  await t.test('1. Register test merchant for password reset flow', async () => {
    const res = await axios.post(`${API_BASE}/auth/register`, {
      name: 'Password Test Seller',
      email: testEmail,
      password: initialPassword,
      storeName: 'Reset Testing Store'
    });
    assert.equal(res.status, 201);
    assert.ok(res.data.token, 'Should return JWT token');
  });

  await t.test('2. Reject empty email for forgot-password', async () => {
    try {
      await axios.post(`${API_BASE}/auth/forgot-password`, { email: '' });
      assert.fail('Should have rejected empty email');
    } catch (err) {
      assert.equal(err.response.status, 400);
      assert.match(err.response.data.error, /email.*required/i);
    }
  });

  await t.test('3. Handle non-existent email safely without leaking enumeration', async () => {
    const res = await axios.post(`${API_BASE}/auth/forgot-password`, {
      email: 'nonexistent_ghost_seller@nowhere.com'
    });
    assert.equal(res.status, 200);
    assert.equal(res.data.sent, false);
    assert.match(res.data.message, /instructions have been sent/i);
  });

  await t.test('4. Successfully request password reset for existing merchant', async () => {
    const res = await axios.post(`${API_BASE}/auth/forgot-password`, {
      email: testEmail
    });
    assert.equal(res.status, 200);
    assert.equal(res.data.sent, true);
    assert.equal(res.data.email, testEmail);
    assert.ok(res.data.previewResetUrl, 'Should return preview URL in dev mode');
    assert.match(res.data.previewResetUrl, /reset-password\?token=/);

    // Extract raw token from preview URL
    const url = new URL(res.data.previewResetUrl);
    rawResetToken = url.searchParams.get('token');
    assert.ok(rawResetToken, 'Token should be present in reset URL');
    assert.equal(rawResetToken.length, 64, 'Token should be 32 bytes hex (64 chars)');
  });

  await t.test('5. Reject invalid or tampered reset token verification', async () => {
    try {
      await axios.get(`${API_BASE}/auth/verify-reset-token/tampered_or_invalid_token_12345`);
      assert.fail('Should have failed token verification');
    } catch (err) {
      assert.equal(err.response.status, 400);
      assert.equal(err.response.data.valid, false);
      assert.match(err.response.data.error, /invalid or has expired/i);
    }
  });

  await t.test('6. Successfully verify valid reset token', async () => {
    const res = await axios.get(`${API_BASE}/auth/verify-reset-token/${rawResetToken}`);
    assert.equal(res.status, 200);
    assert.equal(res.data.valid, true);
    assert.equal(res.data.email, testEmail);
  });

  await t.test('7. Reject short new password (< 6 chars)', async () => {
    try {
      await axios.post(`${API_BASE}/auth/reset-password`, {
        token: rawResetToken,
        newPassword: 'short'
      });
      assert.fail('Should have rejected short password');
    } catch (err) {
      assert.equal(err.response.status, 400);
      assert.match(err.response.data.error, /at least 6 characters/i);
    }
  });

  await t.test('8. Successfully reset password with valid token', async () => {
    const res = await axios.post(`${API_BASE}/auth/reset-password`, {
      token: rawResetToken,
      newPassword: updatedPassword
    });
    assert.equal(res.status, 200);
    assert.match(res.data.message, /successfully reset/i);
  });

  await t.test('9. Prevent token reuse after password has been reset', async () => {
    try {
      await axios.post(`${API_BASE}/auth/reset-password`, {
        token: rawResetToken,
        newPassword: 'AnotherPassword999!'
      });
      assert.fail('Should not allow token reuse');
    } catch (err) {
      assert.equal(err.response.status, 400);
      assert.match(err.response.data.error, /invalid or has expired/i);
    }
  });

  await t.test('10. Old password no longer works for login', async () => {
    try {
      await axios.post(`${API_BASE}/auth/login`, {
        email: testEmail,
        password: initialPassword
      });
      assert.fail('Old password should be rejected');
    } catch (err) {
      assert.equal(err.response.status, 401);
      assert.match(err.response.data.error, /invalid email or password/i);
    }
  });

  await t.test('11. New password successfully logs in and returns valid JWT session', async () => {
    const res = await axios.post(`${API_BASE}/auth/login`, {
      email: testEmail,
      password: updatedPassword
    });
    assert.equal(res.status, 200);
    assert.ok(res.data.token, 'Should return new JWT auth token');
    assert.equal(res.data.user.email, testEmail);
  });
});

