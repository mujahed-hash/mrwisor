import { Router } from 'express';
import {
  createGroup,
  getGroups,
  getGroupById,
  updateGroup,
  deleteGroup,
  addMemberToGroup,
  removeMemberFromGroup,
} from '../controllers/groupController';
import {
  leaveGroup,
  transferAdmin,
  softDeleteGroup,
  getDeletedGroups,
  deleteAllGroupExpenses,
  getMemberExpenseCount,
} from '../controllers/memberController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

// Deleted groups (must be before /:id routes)
router.get('/deleted', authenticateToken, getDeletedGroups);

router.post('/', authenticateToken, createGroup);
router.get('/', authenticateToken, getGroups);
router.get('/:id', authenticateToken, getGroupById);
router.put('/:id', authenticateToken, updateGroup);
router.delete('/:id', authenticateToken, deleteGroup);

// Member management
router.post('/:id/members', authenticateToken, addMemberToGroup);
router.delete('/:id/members/:memberId', authenticateToken, removeMemberFromGroup);

// Member exit & admin features
router.get('/:groupId/members/:userId/expense-count', authenticateToken, getMemberExpenseCount);
router.delete('/:groupId/members/:userId/leave', authenticateToken, leaveGroup);
router.put('/:groupId/transfer-admin', authenticateToken, transferAdmin);
router.delete('/:groupId/expenses/all', authenticateToken, deleteAllGroupExpenses);
router.delete('/:groupId/soft-delete', authenticateToken, softDeleteGroup);

export default router;

