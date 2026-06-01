const nodemailer = require('nodemailer');

/**
 * Create Nodemailer transporter using Gmail SMTP
 */
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: false, // true for 465, false for 587
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

/**
 * Verify transporter connection on startup
 */
transporter.verify((error) => {
  if (error) {
    console.warn('⚠️  Email transporter not ready:', error.message);
  } else {
    console.log('✅ Email transporter is ready');
  }
});

/**
 * Generic email sender helper
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} html - HTML email body
 * @param {Array} attachments - Optional attachments array
 * @returns {Promise}
 */
const sendEmail = async (to, subject, html, attachments = []) => {
  const mailOptions = {
    from: `"PizzaHub 🍕" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
    attachments,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 Email sent: ${info.messageId} to ${to}`);
    return info;
  } catch (error) {
    console.error(`❌ Email send error: ${error.message}`);
    throw error;
  }
};

module.exports = { transporter, sendEmail };
