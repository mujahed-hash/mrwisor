import { Router } from 'express';
import { addComment, getComments } from '../controllers/commentController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router({ mergeParams: true }); // Enable access to parent params (expenseId)

router.post('/', authenticateToken, addComment);
router.get('/', authenticateToken, getComments);

export default router;
