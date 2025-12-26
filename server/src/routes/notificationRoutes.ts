import { Router } from 'express';
import { getNotifications, markAsRead, markAllAsRead, createNotification } from '../controllers/notificationController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

router.get('/', authenticateToken, getNotifications);
router.post('/', authenticateToken, createNotification);
router.put('/:id/read', authenticateToken, markAsRead);
router.put('/read-all', authenticateToken, markAllAsRead);

export default router;
