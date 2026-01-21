import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

export async function sendOTPEmail(email, otp, purpose) {
    const subject = purpose === 'register'
        ? 'KRMU Green - Verify Your Registration'
        : 'KRMU Green - Login Verification';

    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 400px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #00ff9d; text-align: center;">KRMU GREEN</h2>
      <p>Your verification code is:</p>
      <div style="background: #1a1a2e; color: #00ff9d; font-size: 32px; font-weight: bold; text-align: center; padding: 20px; border-radius: 8px; letter-spacing: 8px;">
        ${otp}
      </div>
      <p style="color: #666; font-size: 14px; margin-top: 20px;">
        This code expires in 5 minutes. Do not share it with anyone.
      </p>
    </div>
  `;

    await transporter.sendMail({
        from: process.env.SMTP_FROM,
        to: email,
        subject,
        html,
    });
}
