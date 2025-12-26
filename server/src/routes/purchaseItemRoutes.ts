
import { Router } from 'express';
import { getAllPurchaseItems } from '../controllers/purchaseItemController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

router.get('/', authenticateToken, getAllPurchaseItems);

export default router;
