import { Router } from 'express';
import {
  createPayment,
  getPayments,
  createBatchPayments,
} from '../controllers/paymentController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

router.post('/', authenticateToken, createPayment);
router.post('/batch', authenticateToken, createBatchPayments);
router.get('/', authenticateToken, getPayments);

export default router;
