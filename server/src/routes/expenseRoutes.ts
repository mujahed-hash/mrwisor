import { Router } from 'express';
import {
  createExpense,
  getExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
  analyzeReceipt,
} from '../controllers/expenseController';
import { removeFromExpense } from '../controllers/memberController';
import { authenticateToken } from '../middleware/authMiddleware';
import commentRoutes from './commentRoutes';

const router = Router();

router.post('/analyze', authenticateToken, analyzeReceipt);
router.post('/', authenticateToken, createExpense);
router.get('/', authenticateToken, getExpenses);
router.get('/:id', authenticateToken, getExpenseById);
router.put('/:id', authenticateToken, updateExpense);
router.delete('/:id', authenticateToken, deleteExpense);

// Remove member from expense (with debt redistribution)
router.delete('/:expenseId/members/:userId', authenticateToken, removeFromExpense);

// Nested comment routes
router.use('/:expenseId/comments', commentRoutes);

export default router;
