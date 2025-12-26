import express from 'express';
import { createAd, getAds, updateAd, deleteAd } from '../controllers/adController';
import { authenticateToken, isAdmin } from '../middleware/authMiddleware';

const router = express.Router();

// Public routes (or protected for users, depending on requirement. Im making them public/authenticated for general access)
router.get('/', getAds);

// Admin only routes
router.post('/', authenticateToken, isAdmin, createAd);
router.put('/:id', authenticateToken, isAdmin, updateAd);
router.delete('/:id', authenticateToken, isAdmin, deleteAd);

export default router;
