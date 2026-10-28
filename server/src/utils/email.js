const nodemailer = require('nodemailer');

/**
 * Escapes HTML characters in user-provided strings for safe interpolation in emails.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Creates and returns a Nodemailer transporter configured via environment variables.
 * If credentials are missing or invalid, returns null.
 */
function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });
}

/**
 * Sends an email over SMTP using Nodemailer.
 *
 * Requirements:
 * - Uses SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM
 * - NEVER throws into calling code
 * - On failure or missing configuration, logs a short error without secrets and returns false
 * - All provider details are kept in this file so it can be swapped for Resend later
 *
 * @param {Object} options
 * @param {string} options.to
 * @param {string} options.subject
 * @param {string} options.text
 * @param {string} options.html
 * @returns {Promise<boolean>} true if sent, false otherwise
 */
async function sendEmail({ to, subject, text, html }) {
  try {
    const transporter = createTransporter();
    if (!transporter) {
      console.error('[email] SMTP configuration is missing or incomplete. Email not sent to:', to);
      return false;
    }

    const from = process.env.EMAIL_FROM || 'Furry Tales <no-reply@furrytales.org>';

    await transporter.sendMail({
      from,
      to,
      subject,
      text,
      html,
    });

    return true;
  } catch (err) {
    // Log a short error message WITHOUT dumping passwords or auth configs
    console.error(`[email] Failed to send email to ${to}: ${err.message || 'Unknown error'}`);
    return false;
  }
}

/**
 * Email Template: Center approved
 * Tells the admin their center is approved and they can now sign in and add animals.
 */
function getCenterApprovedEmail({ centerName, adminName }) {
  const safeCenter = escapeHtml(centerName);
  const safeAdmin = escapeHtml(adminName);

  const subject = `Your center "${centerName}" is approved on Furry Tales!`;

  const text = `Hi ${adminName},

Great news! Your center "${centerName}" has been approved by the Furry Tales team.

You can now sign in to your dashboard at any time to start listing animals and managing adoption requests.

Welcome to the Furry Tales community!

Warmly,
The Furry Tales Team`;

  const html = `<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333333; margin: 0; padding: 24px;">
  <div style="max-width: 560px; margin: 0 auto; background: #ffffff; padding: 28px; border: 1px solid #e5e7eb; border-radius: 8px;">
    <h2 style="color: #355C4A; margin-top: 0;">Welcome to Furry Tales!</h2>
    <p>Hi ${safeAdmin},</p>
    <p>Great news! Your center <strong>${safeCenter}</strong> has been approved by our team.</p>
    <p>You can now sign in to your dashboard at any time to start adding animals looking for homes and review adoption applications.</p>
    <div style="margin: 28px 0;">
      <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/login" style="background: #355C4A; color: #ffffff; text-decoration: none; padding: 12px 20px; border-radius: 6px; font-weight: bold; display: inline-block;">Sign In to Dashboard</a>
    </div>
    <p style="color: #666666; font-size: 14px; margin-top: 24px;">Warmly,<br/>The Furry Tales Team</p>
  </div>
</body>
</html>`;

  return { subject, text, html };
}

/**
 * Email Template: Center rejected
 * Includes the rejection reason. HTML-escapes all user input.
 */
function getCenterRejectedEmail({ centerName, adminName, reason }) {
  const safeCenter = escapeHtml(centerName);
  const safeAdmin = escapeHtml(adminName);
  const safeReason = escapeHtml(reason);

  const subject = `Update regarding your center application: "${centerName}"`;

  const text = `Hi ${adminName},

Thank you for your interest in joining Furry Tales with "${centerName}".

After reviewing your application, we are unable to approve your center at this time for the following reason:

${reason}

If you have any questions or would like to submit updated information, please feel free to reach out to our team.

Warmly,
The Furry Tales Team`;

  const html = `<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333333; margin: 0; padding: 24px;">
  <div style="max-width: 560px; margin: 0 auto; background: #ffffff; padding: 28px; border: 1px solid #e5e7eb; border-radius: 8px;">
    <h2 style="color: #A95032; margin-top: 0;">Center Application Update</h2>
    <p>Hi ${safeAdmin},</p>
    <p>Thank you for submitting your application for <strong>${safeCenter}</strong> to Furry Tales.</p>
    <p>After reviewing the provided details, we are unable to approve your center at this time for the following reason:</p>
    <div style="background: #FFF4F2; border-left: 4px solid #A95032; padding: 14px 16px; margin: 18px 0; border-radius: 4px; color: #7F2315;">
      ${safeReason}
    </div>
    <p>If you have any questions or need further clarification, please reply to this email or contact support.</p>
    <p style="color: #666666; font-size: 14px; margin-top: 24px;">Warmly,<br/>The Furry Tales Team</p>
  </div>
</body>
</html>`;

  return { subject, text, html };
}

module.exports = {
  sendEmail,
  escapeHtml,
  getCenterApprovedEmail,
  getCenterRejectedEmail,
};
