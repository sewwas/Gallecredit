const nodemailer = require('nodemailer');

async function sendOTPEmail(email, otp) {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  console.log(`\n==========================================`);
  console.log(`🔑 PASSWORD RESET SECURITY ALERT`);
  console.log(`Recipient: ${email}`);
  console.log(`OTP Code:  ${otp}`);
  console.log(`==========================================\n`);

  if (!host || !user || !pass) {
    console.log('ℹ️ [Nodemailer] SMTP settings not configured in .env. Skipping real email transmission. OTP logged above for development.');
    return {
      success: true,
      development: true,
      otp: otp
    };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: host,
      port: Number(port),
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for others
      auth: {
        user: user,
        pass: pass
      }
    });

    const mailOptions = {
      from: `"Galle Credit Security" <${user}>`,
      to: email,
      subject: '🔑 Galle Credit - Password Recovery OTP',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #1e3a8a; margin: 0;">Galle Credit</h2>
            <p style="color: #64748b; font-size: 12px; text-transform: uppercase; margin: 5px 0 0 0;">Microfinance Core System</p>
          </div>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin-bottom: 20px;" />
          <p style="color: #334155; font-size: 16px; line-height: 24px;">Hello,</p>
          <p style="color: #334155; font-size: 16px; line-height: 24px;">We received a request to reset the password for your system user account. Use the verification OTP code below to proceed with your reset:</p>
          <div style="text-align: center; margin: 30px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #2563eb; background-color: #eff6ff; padding: 10px 30px; border-radius: 8px; border: 1px dashed #bfdbfe; display: inline-block;">${otp}</span>
          </div>
          <p style="color: #dc2626; font-size: 13px; line-height: 20px;">⚠️ This code is valid for <b>10 minutes</b>. If you did not initiate this request, please contact system administration.</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0 20px 0;" />
          <p style="color: #94a3b8; font-size: 11px; text-align: center; margin: 0;">Galle Credit Core Microfinance System © 2026. All rights reserved.</p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 [Nodemailer] Recovery email successfully sent to ${email}. Message ID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ [Nodemailer] Failed to send email via SMTP:', error);
    return { success: false, error: error.message };
  }
}

module.exports = { sendOTPEmail };
