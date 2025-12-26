import { Router } from 'express';
import { getUser, getAllUsers, searchUsers, updateUser, checkCustomId, updateLocation, getCurrentUser } from '../controllers/userController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

// Get current authenticated user (must be before parameterized routes)
router.get('/me', authenticateToken, getCurrentUser);

router.get('/', authenticateToken, getAllUsers);
// Search users (specific path)
router.get('/search', authenticateToken, searchUsers);

// Check custom ID availability (specific path)
router.get('/check-custom-id', authenticateToken, checkCustomId);

// Update user location (GPS)
router.put('/location', authenticateToken, updateLocation);

// Get specific user (parameterized path - must be last)
router.get('/:id', authenticateToken, getUser);
router.put('/:id', authenticateToken, updateUser);

export default router;
