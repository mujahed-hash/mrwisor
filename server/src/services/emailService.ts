
// @ts-ignore
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendOTP = async (to: string, otp: string) => {
  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.log('SMTP credentials missing, skipping email.');
      console.log(`[MOCK EMAIL] To: ${to}, OTP: ${otp}`);
      return;
    }

    const info = await transporter.sendMail({
      from: '"Wisely Spent" <verify@wiselyspent.com>',
      to,
      subject: "Your Verification Code - Wisely Spent",
      text: `Your verification code is: ${otp}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #0f172a;">Welcome to Wisely Spent!</h2>
          <p>Please use the following 6-digit code to verify your account:</p>
          <div style="background-color: #f1f5f9; padding: 15px; border-radius: 8px; font-size: 24px; font-weight: bold; letter-spacing: 5px; text-align: center; margin: 20px 0;">
            ${otp}
          </div>
          <p>This code will expire in 10 minutes.</p>
          <p style="color: #64748b; font-size: 12px; margin-top: 30px;">If you didn't request this code, please ignore this email.</p>
        </div>
      `,
    });

    console.log("Message sent: %s", info.messageId);
  } catch (error) {
    console.error("Error sending email:", error);
    // Fallback to console log so dev/user isn't blocked if email fails
    console.log(`[FALLBACK MOCK EMAIL] To: ${to}, OTP: ${otp}`);
  }
};

export const sendPasswordResetOTP = async (to: string, otp: string) => {
  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.log('SMTP credentials missing, skipping email.');
      console.log(`[MOCK EMAIL] Password Reset - To: ${to}, OTP: ${otp}`);
      return;
    }

    const info = await transporter.sendMail({
      from: '"Wisely Spent" <verify@wiselyspent.com>',
      to,
      subject: "Your Verification Code - Wisely Spent",
      text: `Your password reset code is: ${otp}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #0f172a;">Password Reset Request</h2>
          <p>You requested to reset your password. Use the following 6-digit code:</p>
          <div style="background-color: #fef2f2; padding: 15px; border-radius: 8px; font-size: 24px; font-weight: bold; letter-spacing: 5px; text-align: center; margin: 20px 0; color: #dc2626;">
            ${otp}
          </div>
          <p>This code will expire in 10 minutes.</p>
          <p style="color: #64748b; font-size: 12px; margin-top: 30px;">If you didn't request this, please ignore this email. Your password will remain unchanged.</p>
        </div>
      `,
    });

    console.log("Password reset email sent: %s", info.messageId);
  } catch (error) {
    console.error("Error sending password reset email:", error);
    console.log(`[FALLBACK MOCK EMAIL] Password Reset - To: ${to}, OTP: ${otp}`);
  }
};
