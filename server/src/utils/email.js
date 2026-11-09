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

/**
 * Email Template: Application received — sent to the ADOPTER as confirmation.
 */
function getApplicationReceivedAdopterEmail({ adopterName, animalName, centerName }) {
  const safeName = escapeHtml(adopterName);
  const safeAnimal = escapeHtml(animalName);
  const safeCenter = escapeHtml(centerName);

  const subject = `Your adoption application for ${animalName} has been received!`;

  const text = `Hi ${adopterName},

Thank you for submitting an adoption application for ${animalName} at ${centerName}.

Your application is now pending review. The center team will be in touch once they have had a chance to review it.

You can track your application status at any time under "My Applications" on Furry Tales.

Warmly,
The Furry Tales Team`;

  const html = `<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333333; margin: 0; padding: 24px;">
  <div style="max-width: 560px; margin: 0 auto; background: #ffffff; padding: 28px; border: 1px solid #e5e7eb; border-radius: 8px;">
    <h2 style="color: #A95032; margin-top: 0;">Application Received! 🐾</h2>
    <p>Hi ${safeName},</p>
    <p>Thank you for submitting an adoption application for <strong>${safeAnimal}</strong> at <strong>${safeCenter}</strong>.</p>
    <p>Your application is now <strong>pending review</strong>. The center team will be in touch once they have had a chance to review it.</p>
    <div style="margin: 24px 0;">
      <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/my-applications" style="background: #A95032; color: #ffffff; text-decoration: none; padding: 12px 20px; border-radius: 6px; font-weight: bold; display: inline-block;">View My Applications</a>
    </div>
    <p style="color: #666666; font-size: 14px; margin-top: 24px;">Warmly,<br/>The Furry Tales Team</p>
  </div>
</body>
</html>`;

  return { subject, text, html };
}

/**
 * Email Template: New application notification — sent to the CENTER's contact email.
 */
function getApplicationReceivedCenterEmail({ centerName, animalName, adopterName, adopterEmail }) {
  const safeCenter = escapeHtml(centerName);
  const safeAnimal = escapeHtml(animalName);
  const safeAdopter = escapeHtml(adopterName);
  const safeAdopterEmail = escapeHtml(adopterEmail);

  const subject = `New adoption application for ${animalName} on Furry Tales`;

  const text = `Hi ${centerName} team,

A new adoption application has been submitted for ${animalName}.

Applicant: ${adopterName} (${adopterEmail})

Please sign in to your Furry Tales dashboard to review the application.

Warmly,
The Furry Tales Team`;

  const html = `<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333333; margin: 0; padding: 24px;">
  <div style="max-width: 560px; margin: 0 auto; background: #ffffff; padding: 28px; border: 1px solid #e5e7eb; border-radius: 8px;">
    <h2 style="color: #355C4A; margin-top: 0;">New Adoption Application</h2>
    <p>Hi <strong>${safeCenter}</strong> team,</p>
    <p>A new adoption application has been submitted for <strong>${safeAnimal}</strong>.</p>
    <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
      <tr><td style="padding: 6px 0; color: #666;">Applicant</td><td style="padding: 6px 0; font-weight: bold;">${safeAdopter}</td></tr>
      <tr><td style="padding: 6px 0; color: #666;">Email</td><td style="padding: 6px 0;">${safeAdopterEmail}</td></tr>
    </table>
    <div style="margin: 24px 0;">
      <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/center" style="background: #355C4A; color: #ffffff; text-decoration: none; padding: 12px 20px; border-radius: 6px; font-weight: bold; display: inline-block;">Go to Dashboard</a>
    </div>
    <p style="color: #666666; font-size: 14px; margin-top: 24px;">Warmly,<br/>The Furry Tales Team</p>
  </div>
</body>
</html>`;

  return { subject, text, html };
}

// ---------------------------------------------------------------------------
// Phase 5B email templates — application decision emails
// ---------------------------------------------------------------------------

/**
 * Email Template: Application approved
 * Sent to the APPROVED APPLICANT's account email.
 * Includes: congratulations, animal name, center name, center address/phone/contact_email,
 * the optional note, and an instruction to contact the center to arrange pickup.
 * HTML-escapes all user-supplied values (names, center details, notes).
 */
function getApplicationApprovedEmail({
  adopterName,
  animalName,
  centerName,
  centerAddress,
  centerPhone,
  centerContactEmail,
  note,
}) {
  const safeName   = escapeHtml(adopterName);
  const safeAnimal = escapeHtml(animalName);
  const safeCenter = escapeHtml(centerName);
  const safeAddr   = escapeHtml(centerAddress  || '');
  const safePhone  = escapeHtml(centerPhone    || '');
  const safeCEmail = escapeHtml(centerContactEmail || '');
  const safeNote   = note ? escapeHtml(note) : null;

  const subject = `Great news — your application for ${animalName} has been approved!`;

  const noteTextBlock = note
    ? `\nNote from the center:\n"${note}"\n`
    : '';
  const noteHtmlBlock = safeNote
    ? `<div style="background:#F3FDF6;border-left:4px solid #28784A;padding:12px 16px;margin:16px 0;border-radius:4px;color:#1a5a35;">
        <strong>Note from the center:</strong><br/>${safeNote}
       </div>`
    : '';

  const text = `Hi ${adopterName},

Wonderful news! Your adoption application for ${animalName} at ${centerName} has been approved. 🎉

Please contact the center to arrange a pickup time:
  Center: ${centerName}${safeAddr ? '\n  Address: ' + centerAddress : ''}${centerPhone ? '\n  Phone: ' + centerPhone : ''}${centerContactEmail ? '\n  Email: ' + centerContactEmail : ''}
${noteTextBlock}
We wish you and ${animalName} many happy years together!

Warmly,
The Furry Tales Team`;

  const html = `<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333333; margin: 0; padding: 24px;">
  <div style="max-width: 560px; margin: 0 auto; background: #ffffff; padding: 28px; border: 1px solid #e5e7eb; border-radius: 8px;">
    <h2 style="color: #28784A; margin-top: 0;">Your adoption is approved! 🎉</h2>
    <p>Hi ${safeName},</p>
    <p>Wonderful news! Your adoption application for <strong>${safeAnimal}</strong> at <strong>${safeCenter}</strong> has been <strong>approved</strong>.</p>
    <p>Please contact the center to arrange a pickup time:</p>
    <table style="border-collapse: collapse; width: 100%; margin: 12px 0;">
      <tr><td style="padding: 4px 0; color: #666; width: 110px;">Center</td><td style="padding: 4px 0; font-weight: bold;">${safeCenter}</td></tr>
      ${safeAddr   ? `<tr><td style="padding: 4px 0; color: #666;">Address</td><td style="padding: 4px 0;">${safeAddr}</td></tr>` : ''}
      ${safePhone  ? `<tr><td style="padding: 4px 0; color: #666;">Phone</td><td style="padding: 4px 0;">${safePhone}</td></tr>` : ''}
      ${safeCEmail ? `<tr><td style="padding: 4px 0; color: #666;">Email</td><td style="padding: 4px 0;">${safeCEmail}</td></tr>` : ''}
    </table>
    ${noteHtmlBlock}
    <p>We wish you and <strong>${safeAnimal}</strong> many happy years together!</p>
    <div style="margin: 24px 0;">
      <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/my-applications" style="background: #28784A; color: #ffffff; text-decoration: none; padding: 12px 20px; border-radius: 6px; font-weight: bold; display: inline-block;">View My Applications</a>
    </div>
    <p style="color: #666666; font-size: 14px; margin-top: 24px;">Warmly,<br/>The Furry Tales Team</p>
  </div>
</body>
</html>`;

  return { subject, text, html };
}

/**
 * Email Template: Application rejected
 * Sent to the REJECTED APPLICANT's account email.
 * Includes: sorry message, animal name, center name, optional note.
 */
function getApplicationRejectedEmail({ adopterName, animalName, centerName, note }) {
  const safeName   = escapeHtml(adopterName);
  const safeAnimal = escapeHtml(animalName);
  const safeCenter = escapeHtml(centerName);
  const safeNote   = note ? escapeHtml(note) : null;

  const subject = `Update on your application for ${animalName}`;

  const noteTextBlock = note ? `\nNote from the center:\n"${note}"\n` : '';
  const noteHtmlBlock = safeNote
    ? `<div style="background:#FFF4F2;border-left:4px solid #A95032;padding:12px 16px;margin:16px 0;border-radius:4px;color:#7F2315;">
        <strong>Note from the center:</strong><br/>${safeNote}
       </div>`
    : '';

  const text = `Hi ${adopterName},

Thank you for your interest in adopting ${animalName} from ${centerName}.

After reviewing your application, the center has decided not to proceed with your application at this time.
${noteTextBlock}
We encourage you to browse other animals available for adoption — your perfect companion may be waiting!

Warmly,
The Furry Tales Team`;

  const html = `<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333333; margin: 0; padding: 24px;">
  <div style="max-width: 560px; margin: 0 auto; background: #ffffff; padding: 28px; border: 1px solid #e5e7eb; border-radius: 8px;">
    <h2 style="color: #A95032; margin-top: 0;">Application Update</h2>
    <p>Hi ${safeName},</p>
    <p>Thank you for your interest in adopting <strong>${safeAnimal}</strong> from <strong>${safeCenter}</strong>.</p>
    <p>After reviewing your application, the center has decided not to proceed with it at this time.</p>
    ${noteHtmlBlock}
    <p>We encourage you to browse other animals available for adoption — your perfect companion may be waiting!</p>
    <div style="margin: 24px 0;">
      <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/animals" style="background: #A95032; color: #ffffff; text-decoration: none; padding: 12px 20px; border-radius: 6px; font-weight: bold; display: inline-block;">Browse Animals</a>
    </div>
    <p style="color: #666666; font-size: 14px; margin-top: 24px;">Warmly,<br/>The Furry Tales Team</p>
  </div>
</body>
</html>`;

  return { subject, text, html };
}

/**
 * Email Template: Not selected
 * Sent to applicants whose applications are marked 'not_selected' because
 * another applicant was approved for the same animal.
 * Never includes center contact details.
 */
function getApplicationNotSelectedEmail({ adopterName, animalName }) {
  const safeName   = escapeHtml(adopterName);
  const safeAnimal = escapeHtml(animalName);

  const subject = `Update on your application for ${animalName}`;

  const text = `Hi ${adopterName},

Thank you so much for applying to adopt ${animalName} through Furry Tales.

Another applicant was selected for ${animalName}. We know this is disappointing news, and we genuinely appreciate you opening your heart to give an animal a home.

There are many other wonderful animals looking for loving families — please do browse other animals available for adoption!

Warmly,
The Furry Tales Team`;

  const html = `<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333333; margin: 0; padding: 24px;">
  <div style="max-width: 560px; margin: 0 auto; background: #ffffff; padding: 28px; border: 1px solid #e5e7eb; border-radius: 8px;">
    <h2 style="color: #A95032; margin-top: 0;">Application Update</h2>
    <p>Hi ${safeName},</p>
    <p>Thank you so much for applying to adopt <strong>${safeAnimal}</strong> through Furry Tales.</p>
    <p>Another applicant was selected for <strong>${safeAnimal}</strong>. We know this is disappointing, and we genuinely appreciate you opening your heart to give an animal a home.</p>
    <p>There are many other wonderful animals looking for loving families — please do browse other animals available for adoption!</p>
    <div style="margin: 24px 0;">
      <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/animals" style="background: #A95032; color: #ffffff; text-decoration: none; padding: 12px 20px; border-radius: 6px; font-weight: bold; display: inline-block;">Browse Animals</a>
    </div>
    <p style="color: #666666; font-size: 14px; margin-top: 24px;">Warmly,<br/>The Furry Tales Team</p>
  </div>
</body>
</html>`;

  return { subject, text, html };
}

/**
 * Email Template: Application cancelled by center (return to available)
 * Sent to the applicant whose APPROVED application was cancelled when the
 * admin returned the animal from pending_pickup to available.
 * Never includes center contact details.
 */
function getApplicationCancelledByCenterEmail({ adopterName, animalName }) {
  const safeName   = escapeHtml(adopterName);
  const safeAnimal = escapeHtml(animalName);

  const subject = `Update on your adoption of ${animalName}`;

  const text = `Hi ${adopterName},

We're writing to let you know that the pickup for ${animalName} did not go ahead, and ${animalName} is being returned to our available animals list.

Your application has been cancelled as a result. If ${animalName} is listed again in the future, you are welcome to apply again.

We're sorry for the inconvenience, and we hope you'll find your perfect companion soon.

Warmly,
The Furry Tales Team`;

  const html = `<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333333; margin: 0; padding: 24px;">
  <div style="max-width: 560px; margin: 0 auto; background: #ffffff; padding: 28px; border: 1px solid #e5e7eb; border-radius: 8px;">
    <h2 style="color: #946200; margin-top: 0;">Adoption Update</h2>
    <p>Hi ${safeName},</p>
    <p>We're writing to let you know that the pickup for <strong>${safeAnimal}</strong> did not go ahead, and <strong>${safeAnimal}</strong> is being returned to the available animals list.</p>
    <p>Your application has been cancelled as a result. If <strong>${safeAnimal}</strong> is listed again, you are very welcome to apply again.</p>
    <p>We're sorry for the inconvenience, and we hope you'll find your perfect companion soon!</p>
    <div style="margin: 24px 0;">
      <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/animals" style="background: #A95032; color: #ffffff; text-decoration: none; padding: 12px 20px; border-radius: 6px; font-weight: bold; display: inline-block;">Browse Animals</a>
    </div>
    <p style="color: #666666; font-size: 14px; margin-top: 24px;">Warmly,<br/>The Furry Tales Team</p>
  </div>
</body>
</html>`;

  return { subject, text, html };
}

/**
 * Email Template: Animal no longer available (Phase 5C — animal removed)
 * Sent to applicants whose PENDING application was cancelled because the animal
 * was removed from the platform.
 * Never mentions the word "removed" in a way that is confusing; says the listing is no longer available.
 * Never includes center contact details or admin notes.
 *
 * @param {{ applicantName: string, animalName: string, centerName: string }} opts
 */
function getApplicationAnimalRemovedEmail({ applicantName, animalName, centerName }) {
  const safeName   = escapeHtml(applicantName);
  const safeAnimal = escapeHtml(animalName);
  const safeCenter = escapeHtml(centerName);

  const subject = `Update on your application for ${animalName}`;

  const text = `Hi ${applicantName},

We wanted to let you know that the listing for ${animalName} from ${centerName} is no longer available on Furry Tales, and your application has been cancelled as a result.

We're sorry this didn't work out. There are many other wonderful animals looking for loving homes — we hope you'll find the right one soon!

You're very welcome to apply for any other animal on Furry Tales.

Warmly,
The Furry Tales Team`;

  const html = `<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333333; margin: 0; padding: 24px;">
  <div style="max-width: 560px; margin: 0 auto; background: #ffffff; padding: 28px; border: 1px solid #e5e7eb; border-radius: 8px;">
    <h2 style="color: #946200; margin-top: 0;">Application Update</h2>
    <p>Hi ${safeName},</p>
    <p>We wanted to let you know that the listing for <strong>${safeAnimal}</strong> from <strong>${safeCenter}</strong> is no longer available on Furry Tales, and your application has been cancelled as a result.</p>
    <p>We're sorry this didn't work out. There are many other wonderful animals looking for loving homes — we hope you'll find the right one soon!</p>
    <p>You're very welcome to apply for any other animal on Furry Tales.</p>
    <div style="margin: 24px 0;">
      <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/animals" style="background: #A95032; color: #ffffff; text-decoration: none; padding: 12px 20px; border-radius: 6px; font-weight: bold; display: inline-block;">Browse Animals</a>
    </div>
    <p style="color: #666666; font-size: 14px; margin-top: 24px;">Warmly,<br/>The Furry Tales Team</p>
  </div>
</body>
</html>`;

  return { subject, text, html };
}

/**
 * Email Template: Center not currently accepting applications (Phase 5C — center suspended)
 * Sent to applicants whose PENDING application was cancelled because the center was suspended.
 * NEVER uses the word "suspended" or gives a reason. Only says the center is not currently
 * accepting applications on Furry Tales.
 * Never includes center contact details or admin notes.
 *
 * @param {{ applicantName: string, animalName: string, centerName: string }} opts
 */
function getApplicationCenterUnavailableEmail({ applicantName, animalName, centerName }) {
  const safeName   = escapeHtml(applicantName);
  const safeAnimal = escapeHtml(animalName);
  const safeCenter = escapeHtml(centerName);

  const subject = `Update on your application for ${animalName}`;

  const text = `Hi ${applicantName},

We're writing to let you know that ${centerName} is not currently accepting applications on Furry Tales, and your application for ${animalName} has been cancelled as a result.

We're sorry for the inconvenience. If the center returns to Furry Tales in the future, you're welcome to apply again.

In the meantime, there are many other wonderful animals available for adoption — we hope you'll find your perfect companion!

Warmly,
The Furry Tales Team`;

  const html = `<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333333; margin: 0; padding: 24px;">
  <div style="max-width: 560px; margin: 0 auto; background: #ffffff; padding: 28px; border: 1px solid #e5e7eb; border-radius: 8px;">
    <h2 style="color: #946200; margin-top: 0;">Application Update</h2>
    <p>Hi ${safeName},</p>
    <p>We're writing to let you know that <strong>${safeCenter}</strong> is not currently accepting applications on Furry Tales, and your application for <strong>${safeAnimal}</strong> has been cancelled as a result.</p>
    <p>We're sorry for the inconvenience. If the center returns to Furry Tales in the future, you're welcome to apply again.</p>
    <p>In the meantime, there are many other wonderful animals available for adoption — we hope you'll find your perfect companion!</p>
    <div style="margin: 24px 0;">
      <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/animals" style="background: #A95032; color: #ffffff; text-decoration: none; padding: 12px 20px; border-radius: 6px; font-weight: bold; display: inline-block;">Browse Animals</a>
    </div>
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
  getApplicationReceivedAdopterEmail,
  getApplicationReceivedCenterEmail,
  getApplicationApprovedEmail,
  getApplicationRejectedEmail,
  getApplicationNotSelectedEmail,
  getApplicationCancelledByCenterEmail,
  getApplicationAnimalRemovedEmail,
  getApplicationCenterUnavailableEmail,
};
