const nodemailer = require('nodemailer');

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

// Send verification code email
const sendVerificationCode = async (email, code) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: email,
    subject: 'Comic Cloud - Email Verification Code',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; background-color: #f5f3ee; padding: 20px; margin: 0;">
        <div style="max-width: 500px; margin: 0 auto; background-color: white; border-radius: 20px; overflow: hidden; border: 2px solid black;">
          <!-- Header -->
          <div style="background-color: #0058BE; padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold; font-style: italic;">
              COMIC CLOUD
            </h1>
          </div>

          <!-- Content -->
          <div style="padding: 40px 30px; text-align: center;">
            <h2 style="color: #0c0c0c; margin-bottom: 20px; font-size: 22px;">
              Verify Your Email Address
            </h2>

            <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
              Thank you for creating your Comic Cloud account! Please use the verification code below to complete your registration.
            </p>

            <!-- Verification Code -->
            <div style="background-color: #f8f9fa; border: 2px solid black; border-radius: 15px; padding: 25px; margin: 30px 0;">
              <p style="color: #666; font-size: 14px; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 2px;">
                Your Verification Code
              </p>
              <div style="font-size: 48px; font-weight: bold; color: #0058BE; letter-spacing: 15px; font-family: 'Courier New', monospace;">
                ${code}
              </div>
            </div>

            <p style="color: #666; font-size: 14px; margin-top: 20px;">
              This code will expire in ${process.env.EMAIL_VERIFICATION_EXPIRY_MINUTES || 10} minutes.
            </p>

            <p style="color: #999; font-size: 12px; margin-top: 30px;">
              If you didn't create an account on Comic Cloud, please ignore this email.
            </p>
          </div>

          <!-- Footer -->
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eee;">
            <p style="color: #999; font-size: 12px; margin: 0;">
              © 2026 Comic Cloud. All rights reserved.
            </p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Verification email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw new Error('Failed to send verification email');
  }
};

module.exports = {
  sendVerificationCode,
};
