import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../models';
import { sendOTP, sendPasswordResetOTP } from '../services/emailService';
import { getSystemSetting } from '../middleware/authMiddleware';

const User = db.User;

export const register = async (req: Request, res: Response) => {
  try {
    // Check if signups are enabled
    const signupsEnabled = await getSystemSetting('feature_signups_enabled');
    if (signupsEnabled === 'false') {
      return res.status(403).json({ message: 'New registrations are currently disabled.' });
    }

    const { name, email, password, phoneNumber } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ where: { email } });

    if (existingUser) {
      if (existingUser.isVerified) {
        return res.status(409).json({ message: 'User already exists' });
      } else {
        // User exists but is not verified. Resend OTP.
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Send Email
        await sendOTP(email, otp);

        // Update user with new OTP and password (in case they forgot)
        const hashedPassword = await bcrypt.hash(password, 10);
        await existingUser.update({
          name, // Update name if changed
          password: hashedPassword, // Update password
          phoneNumber, // Update phone
          otp,
          otpExpires
        });

        return res.status(200).json({ message: 'OTP resent', userId: existingUser.id });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate 6 digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Send Email
    await sendOTP(email, otp);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      phoneNumber,
      otp,
      otpExpires,
      isVerified: false
    });

    res.status(201).json({ message: 'OTP sent to email', userId: user.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error registering user' });
  }
};

export const verifyOTP = async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: 'User already verified' });
    }

    if (user.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    if (user.otpExpires && user.otpExpires < new Date()) {
      return res.status(400).json({ message: 'OTP expired' });
    }

    // Verify user and update lastLoginAt
    await user.update({ isVerified: true, otp: null, otpExpires: null, lastLoginAt: new Date() });

    // Login user immediately
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET as string, { expiresIn: '1h' });

    res.status(200).json({
      message: 'Verification successful',
      token,
      userId: user.id,
      name: user.name,
      email: user.email,
      customId: user.customId,
      role: user.role
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error verifying OTP' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    console.log('Login attempt for:', email);

    const user = await User.findOne({ where: { email } });

    if (!user) {
      console.log('User not found');
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      console.log('Password invalid');
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check verification status
    if (!user.isVerified) {
      console.log('User unverified, resending OTP');
      // Resend OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      await sendOTP(email, otp);

      await user.update({ otp, otpExpires });

      console.log('Sending 400 response (unverified)');
      return res.status(400).json({
        message: 'Account not verified. A new OTP has been sent.',
        requiresVerification: true,
        email: user.email
      });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET as string, { expiresIn: '1h' });

    // Update lastLoginAt timestamp
    await user.update({ lastLoginAt: new Date() });

    res.status(200).json({ token, userId: user.id, name: user.name, email: user.email, customId: user.customId, role: user.role });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error logging in' });
  }
};

// Forgot Password - Send OTP
export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ where: { email } });

    if (!user) {
      // Don't reveal if email exists for security
      return res.status(200).json({ message: 'If this email exists, a reset code has been sent.' });
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Send password reset email
    await sendPasswordResetOTP(email, otp);

    // Store OTP in user record
    await user.update({ otp, otpExpires });

    res.status(200).json({
      message: 'If this email exists, a reset code has been sent.',
      codeSentAt: new Date().toISOString()
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error processing request' });
  }
};

// Verify Reset OTP
export const verifyResetOTP = async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(400).json({ message: 'Invalid code' });
    }

    if (user.otp !== otp) {
      return res.status(400).json({ message: 'Invalid code' });
    }

    if (user.otpExpires && user.otpExpires < new Date()) {
      return res.status(400).json({ message: 'Code expired. Please request a new one.' });
    }

    // Return a temporary reset token (valid for 5 minutes)
    const resetToken = jwt.sign(
      { userId: user.id, purpose: 'password-reset' },
      process.env.JWT_SECRET as string,
      { expiresIn: '5m' }
    );

    res.status(200).json({
      message: 'Code verified',
      resetToken
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error verifying code' });
  }
};

// Reset Password
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { resetToken, newPassword } = req.body;

    // Verify reset token
    let decoded: any;
    try {
      decoded = jwt.verify(resetToken, process.env.JWT_SECRET as string);
    } catch (err) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    if (decoded.purpose !== 'password-reset') {
      return res.status(400).json({ message: 'Invalid token' });
    }

    const user = await User.findByPk(decoded.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and clear OTP
    await user.update({
      password: hashedPassword,
      otp: null,
      otpExpires: null
    });

    res.status(200).json({ message: 'Password reset successful' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error resetting password' });
  }
};
