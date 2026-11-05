const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const Sale = require('../models/Sale');
const { JWT_SECRET } = require('../middleware/auth');
const {
  sendWelcomeEmail,
  sendEmailVerificationEmail,
  sendPasswordResetEmail,
  sendPasswordResetSuccessEmail,
  sendNotificationEmail
} = require('../services/emailService');

exports.register = async (req, res) => {
  try {
    const { name, email, password, storeName } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    // Generate cryptographic verification token (valid 24h)
    const rawVerifyToken = crypto.randomBytes(32).toString('hex');
    const hashedVerifyToken = crypto.createHash('sha256').update(rawVerifyToken).digest('hex');

    const user = new User({
      name,
      email: email.toLowerCase(),
      password,
      storeName: storeName || `${name}'s Store`,
      isVerified: false,
      verificationToken: hashedVerifyToken,
      verificationTokenExpires: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });
    await user.save();

    const token = jwt.sign(
      { id: user._id, email: user.email, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Dispatch welcome & verification email
    const host = req.get('host') || 'localhost:5000';
    const frontendBase = process.env.FRONTEND_URL || (req.headers.origin ? req.headers.origin : `http://${host.replace(':5000', ':3000')}`);
    const verifyUrl = `${frontendBase}/verify-email?token=${rawVerifyToken}`;

    try {
      await sendWelcomeEmail({
        to: user.email,
        name: user.name,
        storeName: user.storeName,
        verifyUrl
      });
    } catch (mailErr) {
      console.warn('[Welcome Email Notice]:', mailErr.message);
    }

    res.status(201).json({
      message: 'Registration successful. Welcome to GeoCommerce AI!',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        storeName: user.storeName,
        role: user.role,
        isVerified: user.isVerified
      },
      previewVerifyUrl: process.env.NODE_ENV !== 'production' ? verifyUrl : undefined
    });
  } catch (err) {
    console.error('[Register Error]:', err);
    if (err.code === 11000) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }
    res.status(500).json({ error: err.message || 'Registration failed' });
  }
};

exports.verifyEmail = async (req, res) => {
  try {
    const token = req.params.token || req.body.token || req.query.token;
    if (!token) {
      return res.status(400).json({ error: 'Verification token is required.' });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      verificationToken: hashedToken,
      verificationTokenExpires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({
        error: 'Verification link is invalid or has expired. Please request a new verification email.'
      });
    }

    user.isVerified = true;
    user.verificationToken = null;
    user.verificationTokenExpires = null;
    await user.save();

    res.json({
      message: 'Email successfully verified! Your merchant workspace is active.',
      isVerified: true,
      email: user.email,
      name: user.name
    });
  } catch (err) {
    console.error('[Verify Email Error]:', err);
    res.status(500).json({ error: err.message || 'Failed to verify email.' });
  }
};

exports.resendVerification = async (req, res) => {
  try {
    const email = req.body.email || (req.sellerId ? (await User.findById(req.sellerId))?.email : null);
    if (!email) {
      return res.status(400).json({ error: 'Email address is required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.json({ message: 'If an account exists, a verification link has been sent.' });
    }

    if (user.isVerified) {
      return res.json({ message: 'Account is already verified.', isVerified: true });
    }

    const rawVerifyToken = crypto.randomBytes(32).toString('hex');
    const hashedVerifyToken = crypto.createHash('sha256').update(rawVerifyToken).digest('hex');

    user.verificationToken = hashedVerifyToken;
    user.verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save();

    const host = req.get('host') || 'localhost:5000';
    const frontendBase = process.env.FRONTEND_URL || (req.headers.origin ? req.headers.origin : `http://${host.replace(':5000', ':3000')}`);
    const verifyUrl = `${frontendBase}/verify-email?token=${rawVerifyToken}`;

    const mailResult = await sendEmailVerificationEmail({
      to: user.email,
      name: user.name,
      verifyUrl,
      token: rawVerifyToken
    });

    res.json({
      message: 'Verification link has been sent to your email address.',
      sent: true,
      email: user.email,
      mode: mailResult.mode,
      previewVerifyUrl: process.env.NODE_ENV !== 'production' ? verifyUrl : undefined
    });
  } catch (err) {
    console.error('[Resend Verification Error]:', err);
    res.status(500).json({ error: err.message || 'Error sending verification link.' });
  }
};

exports.testEmailEndpoint = async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'Test email endpoint is disabled in production.' });
    }

    const { to, type = 'welcome', title, message } = req.body;
    if (!to) {
      return res.status(400).json({ error: 'Recipient "to" email address is required.' });
    }

    const frontendBase = process.env.FRONTEND_URL || 'http://localhost:3000';
    let result;

    if (type === 'welcome') {
      result = await sendWelcomeEmail({
        to,
        name: 'Merchant Tester',
        storeName: 'Test Electronics & Apparel',
        verifyUrl: `${frontendBase}/verify-email?token=test_verify_token_123`
      });
    } else if (type === 'verification') {
      result = await sendEmailVerificationEmail({
        to,
        name: 'Merchant Tester',
        verifyUrl: `${frontendBase}/verify-email?token=test_verify_token_123`,
        token: 'test_verify_token_123'
      });
    } else if (type === 'password_reset') {
      result = await sendPasswordResetEmail({
        to,
        name: 'Merchant Tester',
        resetUrl: `${frontendBase}/reset-password?token=test_reset_token_123`,
        token: 'test_reset_token_123'
      });
    } else if (type === 'notification') {
      result = await sendNotificationEmail({
        to,
        name: 'Merchant Tester',
        title: title || 'Low Inventory Alert: 3 SKUs Critical',
        message: message || 'Your stock for high-demand regional SKUs is falling below recommended buffer thresholds.',
        actionLabel: 'Review Inventory',
        actionUrl: `${frontendBase}/inventory`,
        severity: 'warning'
      });
    } else {
      return res.status(400).json({ error: `Unknown email type: ${type}. Allowed: welcome, verification, password_reset, notification` });
    }

    res.json({
      message: `Test email (${type}) processed successfully.`,
      result
    });
  } catch (err) {
    console.error('[Test Email Error]:', err);
    res.status(500).json({ error: err.message || 'Error executing test email dispatch.' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        storeName: user.storeName,
        role: user.role
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.sellerId).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User profile not found.' });
    }

    const salesCount = await Sale.countDocuments({ sellerId: req.sellerId });

    res.json({
      user,
      stats: {
        totalSalesRecords: salesCount
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { name, storeName } = req.body;
    const user = await User.findById(req.sellerId);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (name) user.name = name;
    if (storeName) user.storeName = storeName;
    await user.save();

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        storeName: user.storeName
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email address is required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Standard security behavior: don't reveal whether user exists
      return res.json({
        message: 'If an account exists with that email address, password reset instructions have been sent.',
        sent: false
      });
    }

    // Generate random 32-byte token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    // Token valid for 60 minutes
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    // Construct reset link
    const host = req.get('host') || 'localhost:5000';
    const frontendBase = process.env.FRONTEND_URL || (req.headers.origin ? req.headers.origin : `http://${host.replace(':5000', ':3000')}`);
    const resetUrl = `${frontendBase}/reset-password?token=${rawToken}`;

    const emailResult = await sendPasswordResetEmail({
      to: user.email,
      name: user.name,
      resetUrl,
      token: rawToken
    });

    res.json({
      message: 'Password reset link has been dispatched to your email address.',
      sent: true,
      email: user.email,
      mode: emailResult.mode,
      previewResetUrl: !emailResult.delivered ? resetUrl : undefined
    });
  } catch (err) {
    console.error('[Forgot Password Error]:', err);
    res.status(500).json({ error: err.message || 'Error processing forgot password request.' });
  }
};

exports.verifyResetToken = async (req, res) => {
  try {
    const { token } = req.params;
    if (!token) {
      return res.status(400).json({ valid: false, error: 'Reset token is required.' });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() }
    }).select('email name');

    if (!user) {
      return res.status(400).json({
        valid: false,
        error: 'Password reset token is invalid or has expired. Please request a new link.'
      });
    }

    res.json({
      valid: true,
      email: user.email,
      name: user.name
    });
  } catch (err) {
    res.status(500).json({ valid: false, error: err.message });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({
        error: 'Password reset token is invalid or has expired. Please request a new link.'
      });
    }

    // Set new password (will be salted & hashed by User schema pre-save hook)
    user.password = newPassword;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    // Send success confirmation email
    await sendPasswordResetSuccessEmail({ to: user.email, name: user.name });

    res.json({
      message: 'Your password has been successfully reset. You may now sign in with your new credentials.'
    });
  } catch (err) {
    console.error('[Reset Password Error]:', err);
    res.status(500).json({ error: err.message || 'Error updating password.' });
  }
};

