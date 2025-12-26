import { Router } from 'express';
import { register, login, verifyOTP, forgotPassword, verifyResetOTP, resetPassword } from '../controllers/authController';

const router = Router();

router.post('/register', register);
router.post('/verify-otp', verifyOTP);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/verify-reset-otp', verifyResetOTP);
router.post('/reset-password', resetPassword);

export default router;
