const { Resend } = require('resend');

let resendClient = null;

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey === 'your_resend_api_key_here' || apiKey.startsWith('re_your_')) {
    return null;
  }
  if (!resendClient) {
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

function getFromEmail() {
  return process.env.RESEND_FROM_EMAIL || 'GeoCommerce AI <onboarding@resend.dev>';
}

function getFrontendUrl() {
  return process.env.FRONTEND_URL || 'http://localhost:3000';
}

/**
 * Base responsive email wrapper with GeoCommerce AI dark-mode aesthetic
 */
function buildEmailTemplate({ title, subtitle, headerGradient = 'from-brand', contentHtml, footerNote }) {
  const gradStyle = headerGradient === 'emerald'
    ? 'background: linear-gradient(135deg, #059669 0%, #10b981 100%);'
    : headerGradient === 'amber'
    ? 'background: linear-gradient(135deg, #d97706 0%, #f59e0b 100%);'
    : headerGradient === 'rose'
    ? 'background: linear-gradient(135deg, #e11d48 0%, #f43f5e 100%);'
    : 'background: linear-gradient(135deg, #0284c7 0%, #38bdf8 100%);';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b1120; color: #f8fafc; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
    .wrapper { width: 100%; background-color: #0b1120; padding: 40px 16px; box-sizing: border-box; }
    .container { max-width: 580px; margin: 0 auto; background-color: #1e293b; border-radius: 20px; border: 1px solid #334155; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.6); }
    .header { ${gradStyle} padding: 36px 28px; text-align: center; }
    .header h1 { margin: 0; color: #ffffff; font-size: 26px; font-weight: 800; letter-spacing: -0.5px; text-shadow: 0 2px 4px rgba(0,0,0,0.2); }
    .header .subtitle { font-size: 13px; color: rgba(255,255,255,0.9); margin-top: 6px; font-weight: 500; }
    .content { padding: 36px 32px; font-size: 14px; line-height: 1.65; color: #cbd5e1; }
    .content h2 { color: #ffffff; font-size: 18px; margin-top: 0; font-weight: 700; }
    .btn-container { text-align: center; margin: 32px 0; }
    .btn { display: inline-block; background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); color: #ffffff !important; font-weight: 700; font-size: 14px; padding: 14px 32px; border-radius: 12px; text-decoration: none; box-shadow: 0 6px 18px rgba(2, 132, 199, 0.4); }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
    .badge-info { background-color: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); }
    .badge-alert { background-color: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3); }
    .badge-success { background-color: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); }
    .callout { background-color: #0f172a; border-radius: 12px; padding: 16px 20px; margin: 24px 0; border: 1px solid #334155; }
    .callout p { margin: 6px 0; font-size: 13px; }
    .link-fallback { background-color: #0f172a; padding: 12px 16px; border-radius: 8px; word-break: break-all; font-family: ui-monospace, Menlo, Monaco, Consolas, monospace; font-size: 11px; color: #38bdf8; border: 1px solid #334155; }
    .footer { padding: 24px 32px; background-color: #0f172a; border-top: 1px solid #334155; text-align: center; font-size: 12px; color: #64748b; }
    .footer a { color: #94a3b8; text-decoration: underline; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1>GeoCommerce AI</h1>
        <div class="subtitle">${subtitle || 'Regional Demand & Inventory Intelligence Platform'}</div>
      </div>
      <div class="content">
        ${contentHtml}
      </div>
      <div class="footer">
        <p style="margin: 0 0 8px 0;">&copy; ${new Date().getFullYear()} GeoCommerce AI Inc. All rights reserved.</p>
        <p style="margin: 0; font-size: 11px; color: #475569;">${footerNote || 'Enterprise AI Regional Demand & Supply Chain Intelligence'}</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * 1. User Registration Confirmation / Welcome Email
 */
async function sendWelcomeEmail({ to, name, storeName, verifyUrl }) {
  const client = getResendClient();
  const fromEmail = getFromEmail();
  const frontendUrl = getFrontendUrl();
  const merchantName = name || 'Merchant';
  const brandName = storeName || 'Your Store';

  const contentHtml = `
    <h2>Welcome to GeoCommerce AI, ${merchantName}!</h2>
    <p>Your isolated merchant workspace for <strong>${brandName}</strong> has been successfully provisioned on GeoCommerce AI.</p>
    
    <div class="callout">
      <p style="color: #38bdf8; font-weight: 700; font-size: 13px; margin-bottom: 8px;">🚀 What you can do right now:</p>
      <p>• <strong>Upload Sales Data:</strong> Drag and drop your Amazon, Flipkart, Meesho, or Shopify CSV/Excel orders.</p>
      <p>• <strong>Explore Geographic Demand:</strong> Pinpoint top revenue products by State, District, and PIN code clusters.</p>
      <p>• <strong>ML Demand Forecasting:</strong> Predict regional SKU replenishment needs for the next 30 days.</p>
      <p>• <strong>Grounded AI Copilot:</strong> Query sales trends using verified MongoDB aggregations without hallucinations.</p>
    </div>

    ${verifyUrl ? `
      <p>Please confirm your email address to unlock full multi-region export capabilities:</p>
      <div class="btn-container">
        <a href="${verifyUrl}" class="btn" target="_blank">Verify Email Address</a>
      </div>
      <p style="font-size: 12px; color: #94a3b8;">Or copy this URL:</p>
      <div class="link-fallback">${verifyUrl}</div>
    ` : `
      <div class="btn-container">
        <a href="${frontendUrl}/overview" class="btn" target="_blank">Open Your Dashboard</a>
      </div>
    `}

    <p style="font-size: 12px; color: #64748b; margin-top: 24px;">Need assistance? Simply reply to this email or access the AI Business Copilot in your navigation menu.</p>
  `;

  const html = buildEmailTemplate({
    title: 'Welcome to GeoCommerce AI',
    subtitle: 'Your Workspace is Ready',
    headerGradient: 'from-brand',
    contentHtml
  });

  return dispatchEmail({ to, subject: 'Welcome to GeoCommerce AI — Your Workspace is Ready', html, actionType: 'welcome' });
}

/**
 * 2. Email Verification Email
 */
async function sendEmailVerificationEmail({ to, name, verifyUrl, token }) {
  const merchantName = name || 'Merchant';

  const contentHtml = `
    <h2>Verify Your Email Address</h2>
    <p>Hello <strong>${merchantName}</strong>,</p>
    <p>Thank you for joining GeoCommerce AI. Please confirm that <strong>${to}</strong> belongs to you to activate your full merchant account.</p>

    <div style="background-color: rgba(56, 189, 248, 0.1); border-left: 3px solid #38bdf8; padding: 12px 16px; margin: 20px 0; font-size: 12px; color: #bae6fd; border-radius: 4px;">
      ⏰ This verification link is valid for <strong>24 hours</strong>.
    </div>

    <div class="btn-container">
      <a href="${verifyUrl}" class="btn" target="_blank">Verify Email Address</a>
    </div>

    <p style="font-size: 12px; color: #94a3b8;">If the button above does not work, copy and paste this link into your browser:</p>
    <div class="link-fallback">${verifyUrl}</div>

    <p style="font-size: 12px; color: #64748b; margin-top: 28px;">If you did not register for an account on GeoCommerce AI, please disregard this message.</p>
  `;

  const html = buildEmailTemplate({
    title: 'Verify Your Email Address',
    subtitle: 'Account Verification',
    headerGradient: 'from-brand',
    contentHtml
  });

  return dispatchEmail({ to, subject: 'Verify your GeoCommerce AI email address', html, actionType: 'email_verification', fallbackUrl: verifyUrl });
}

/**
 * 3. Password Reset Email
 */
async function sendPasswordResetEmail({ to, name, resetUrl, token }) {
  const merchantName = name || 'Merchant';

  const contentHtml = `
    <h2>Reset Your Password</h2>
    <p>Hello <strong>${merchantName}</strong>,</p>
    <p>We received a request to reset the password for your GeoCommerce AI account (<strong>${to}</strong>).</p>

    <div style="background-color: rgba(234, 179, 8, 0.1); border-left: 3px solid #eab308; padding: 12px 16px; margin: 20px 0; font-size: 12px; color: #fde047; border-radius: 4px;">
      ⏰ This password reset link will expire in <strong>60 minutes</strong>.
    </div>

    <div class="btn-container">
      <a href="${resetUrl}" class="btn" target="_blank">Reset Password</a>
    </div>

    <p style="font-size: 12px; color: #94a3b8;">If the button above does not work, copy and paste this URL into your browser:</p>
    <div class="link-fallback">${resetUrl}</div>

    <p style="font-size: 12px; color: #64748b; margin-top: 28px;">If you did not request this password reset, no action is needed. Your account remains completely secure.</p>
  `;

  const html = buildEmailTemplate({
    title: 'Reset Your GeoCommerce AI Password',
    subtitle: 'Security Credentials Update',
    headerGradient: 'amber',
    contentHtml
  });

  return dispatchEmail({ to, subject: 'Reset your GeoCommerce AI password', html, actionType: 'password_reset', fallbackUrl: resetUrl });
}

/**
 * 4. Password Reset Success Confirmation Email
 */
async function sendPasswordResetSuccessEmail({ to, name }) {
  const merchantName = name || 'Merchant';
  const frontendUrl = getFrontendUrl();

  const contentHtml = `
    <h2>Password Successfully Updated</h2>
    <p>Hello <strong>${merchantName}</strong>,</p>
    <p>Your password for GeoCommerce AI account (<strong>${to}</strong>) has been successfully reset.</p>
    <p>You can now sign in using your new credentials.</p>

    <div class="btn-container">
      <a href="${frontendUrl}/login" class="btn" target="_blank" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">Sign In to Dashboard</a>
    </div>

    <p style="font-size: 12px; color: #e11d48; margin-top: 24px;">If you did not make this change, please contact support and secure your email account immediately.</p>
  `;

  const html = buildEmailTemplate({
    title: 'Password Updated',
    subtitle: 'Security Confirmation',
    headerGradient: 'emerald',
    contentHtml
  });

  return dispatchEmail({ to, subject: 'Your GeoCommerce AI password has been updated', html, actionType: 'password_reset_success' });
}

/**
 * 5. Important User Notifications (Inventory alerts, dataset processing, executive digest)
 */
async function sendNotificationEmail({ to, name, title, message, actionLabel, actionUrl, severity = 'info' }) {
  const merchantName = name || 'Merchant';
  const frontendUrl = getFrontendUrl();
  const headerGradient = severity === 'danger' ? 'rose' : severity === 'warning' ? 'amber' : severity === 'success' ? 'emerald' : 'from-brand';

  const badgeClass = severity === 'danger' ? 'badge-alert' : severity === 'warning' ? 'badge-alert' : severity === 'success' ? 'badge-success' : 'badge-info';

  const contentHtml = `
    <div style="margin-bottom: 12px;">
      <span class="badge ${badgeClass}">${severity.toUpperCase()} ALERT</span>
    </div>
    <h2>${title}</h2>
    <p>Hello <strong>${merchantName}</strong>,</p>
    <div class="callout">
      <p style="color: #f8fafc; font-size: 14px; line-height: 1.6;">${message}</p>
    </div>

    ${actionUrl ? `
      <div class="btn-container">
        <a href="${actionUrl}" class="btn" target="_blank">${actionLabel || 'View in Dashboard'}</a>
      </div>
    ` : ''}

    <p style="font-size: 12px; color: #64748b; margin-top: 24px;">This is an automated operational notification dispatched based on your GeoCommerce AI telemetry settings.</p>
  `;

  const html = buildEmailTemplate({
    title,
    subtitle: 'Executive Telemetry Notification',
    headerGradient,
    contentHtml
  });

  return dispatchEmail({ to, subject: `[GeoCommerce AI] ${title}`, html, actionType: 'notification' });
}

/**
 * Core email dispatcher wrapper handling Resend API calls and dev simulation
 */
async function dispatchEmail({ to, subject, html, actionType, fallbackUrl }) {
  const client = getResendClient();
  const fromEmail = getFromEmail();

  if (!client) {
    console.warn(`[Resend Notice] RESEND_API_KEY is not configured or in placeholder mode.`);
    console.log(`[Resend Dev Fallback] Type: "${actionType}" | To: ${to} | Subject: "${subject}"`);
    if (fallbackUrl) {
      console.log(`[Resend Dev Fallback] Action URL: ${fallbackUrl}`);
    }
    return {
      success: true,
      delivered: false,
      mode: 'simulated_dev',
      message: 'Email simulated in development mode (RESEND_API_KEY not configured).',
      previewUrl: fallbackUrl || null
    };
  }

  try {
    const data = await client.emails.send({
      from: fromEmail,
      to,
      subject,
      html
    });

    const emailId = data.id || (data.data && data.data.id);
    console.log(`[Resend] Successfully dispatched "${actionType}" email to ${to}. Email ID: ${emailId}`);

    return {
      success: true,
      delivered: true,
      mode: 'resend_live',
      emailId,
      previewUrl: fallbackUrl || null
    };
  } catch (err) {
    // Mask sensitive details and log gracefully
    console.error(`[Resend Error] Failed to send "${actionType}" email to ${to}:`, err.message);
    return {
      success: false,
      delivered: false,
      error: err.message,
      previewUrl: fallbackUrl || null
    };
  }
}

module.exports = {
  getResendClient,
  sendWelcomeEmail,
  sendEmailVerificationEmail,
  sendPasswordResetEmail,
  sendPasswordResetSuccessEmail,
  sendNotificationEmail
};
