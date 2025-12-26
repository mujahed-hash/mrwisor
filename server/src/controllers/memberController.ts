import { Request, Response } from 'express';
import { Op } from 'sequelize';
import db from '../models';
import { redistributeMemberExpenses } from '../services/expenseService';

const { User, Group, GroupMember, Expense, ExpenseSplit, Notification, Comment, PurchaseItem } = db;

/**
 * Remove a member from an expense (with debt redistribution)
 * - Member can remove themselves
 * - Admin can remove anyone
 */
export const removeFromExpense = async (req: Request, res: Response) => {
    try {
        const { expenseId } = req.params;
        let { userId } = req.params;
        const requestingUserId = (req as any).userId;

        // Handle 'me' as special case - means current user
        if (userId === 'me') {
            userId = requestingUserId;
        }

        console.log(`[RemoveFromExpense] Removing user ${userId} from expense ${expenseId}`);

        // Get the expense and verify it exists
        const expense = await Expense.findByPk(expenseId);
        if (!expense) {
            return res.status(404).json({ message: 'Expense not found' });
        }

        // Get the exiting member's split
        const exitingSplit = await ExpenseSplit.findOne({
            where: { expenseId, userId }
        });
        if (!exitingSplit) {
            return res.status(404).json({ message: 'Member not found in this expense' });
        }

        console.log(`[RemoveFromExpense] Exiting split amount: $${exitingSplit.amount}`);

        // Check authorization: user can remove self, or admin can remove anyone
        const isRemovingSelf = requestingUserId === userId;

        // Check if requesting user is admin of the group
        let isAdmin = false;
        if (expense.groupId) {
            const membership = await GroupMember.findOne({
                where: { groupId: expense.groupId, userId: requestingUserId }
            });
            const group = await Group.findByPk(expense.groupId);
            isAdmin = membership?.role === 'admin' || group?.createdBy === requestingUserId;
        }

        if (!isRemovingSelf && !isAdmin) {
            return res.status(403).json({ message: 'Only the member themselves or a group admin can remove from expense' });
        }

        // Get ALL remaining splits (including payer's split if they have one)
        const remainingSplits = await ExpenseSplit.findAll({
            where: { expenseId, userId: { [Op.ne]: userId } }
        });

        console.log(`[RemoveFromExpense] Remaining splits count: ${remainingSplits.length}`);

        if (remainingSplits.length === 0) {
            return res.status(400).json({ message: 'Cannot remove the last member from an expense' });
        }

        // Calculate redistribution - Option 2: Proportional to ALL remaining splits
        const exitingAmount = exitingSplit.amount;
        const remainingTotal = remainingSplits.reduce((sum: number, s: any) => sum + s.amount, 0);

        console.log(`[RemoveFromExpense] Exiting amount: $${exitingAmount}, Remaining total: $${remainingTotal}`);

        // Redistribute proportionally to ALL remaining splits
        for (const split of remainingSplits) {
            const currentAmount = split.amount;
            const proportion = currentAmount / remainingTotal;
            const additionalAmount = exitingAmount * proportion;
            const newAmount = Math.round((currentAmount + additionalAmount) * 100) / 100;

            console.log(`[RemoveFromExpense] User ${split.userId}: $${currentAmount} + $${additionalAmount} = $${newAmount}`);

            split.amount = newAmount;
            await split.save();
        }

        // Delete exiting member's split AFTER redistribution
        await exitingSplit.destroy();

        console.log(`[RemoveFromExpense] Successfully removed and redistributed`);

        // Get exiting user's name for notification
        const exitingUser = await User.findByPk(userId);
        const exitingUserName = exitingUser?.name || 'A member';

        // Send notifications to remaining members
        for (const split of remainingSplits) {
            await Notification.create({
                userId: split.userId,
                type: 'member_left_expense',
                title: 'Member Left Expense',
                message: `${exitingUserName} has left the expense "${expense.description}". Your share has been updated to $${Number(split.amount).toFixed(2)}.`,
                data: JSON.stringify({ expenseId, exitedUserId: userId, newAmount: split.amount }),
            });
        }

        res.json({
            message: 'Member removed from expense successfully',
            redistributedTo: remainingSplits.length,
            exitingAmount,
            newSplits: remainingSplits.map((s: any) => ({ userId: s.userId, amount: s.amount }))
        });
    } catch (error) {
        console.error('Error removing member from expense:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Get count of expenses a member is involved in within a group
 */
export const getMemberExpenseCount = async (req: Request, res: Response) => {
    try {
        const { groupId, userId } = req.params;

        // Get all expenses in the group
        const expenses = await Expense.findAll({
            where: { groupId },
            include: [{
                model: ExpenseSplit,
                where: { userId },
                required: true
            }]
        });

        res.json({ count: expenses.length });
    } catch (error) {
        console.error('Error getting member expense count:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Leave a group (after leaving all expenses)
 */
export const leaveGroup = async (req: Request, res: Response) => {
    try {
        const { groupId, userId } = req.params;
        const requestingUserId = (req as any).userId;

        // Check authorization
        const isRemovingSelf = requestingUserId === userId;
        const requestingMembership = await GroupMember.findOne({
            where: { groupId, userId: requestingUserId }
        });
        const isAdmin = requestingMembership?.role === 'admin';

        if (!isRemovingSelf && !isAdmin) {
            return res.status(403).json({ message: 'Only the member themselves or a group admin can remove from group' });
        }

        // Check if user has any expense splits in this group
        const expensesInGroup = await Expense.findAll({
            where: { groupId },
            include: [{
                model: ExpenseSplit,
                where: { userId },
                required: true
            }]
        });

        // Redistribute expenses automatically
        const redistributedCount = await redistributeMemberExpenses(groupId, userId);

        console.log(`[LeaveGroup] User ${userId} leaving group ${groupId}. Redistributed ${redistributedCount} expenses.`);

        // If user is admin and trying to leave, must transfer first
        const leavingMembership = await GroupMember.findOne({
            where: { groupId, userId }
        });

        if (leavingMembership?.role === 'admin') {
            // Check if there are other members
            const otherMembers = await GroupMember.count({
                where: { groupId, userId: { [Op.ne]: userId } }
            });

            if (otherMembers > 0) {
                return res.status(400).json({
                    message: 'Admin must transfer admin role to another member before leaving'
                });
            }
            // If no other members, admin can leave (group becomes empty)
        }

        // Get user info for notification
        const leavingUser = await User.findByPk(userId);
        const leavingUserName = leavingUser?.name || 'A member';

        // Remove membership
        await GroupMember.destroy({
            where: { groupId, userId }
        });

        // Notify remaining members
        const remainingMembers = await GroupMember.findAll({ where: { groupId } });
        const group = await Group.findByPk(groupId);

        for (const member of remainingMembers) {
            await Notification.create({
                userId: member.userId,
                type: 'member_left_group',
                title: 'Member Left Group',
                message: `${leavingUserName} has left the group "${group?.name}".`,
                data: JSON.stringify({ groupId, leftUserId: userId }),
            });
        }

        res.json({ message: 'Left group successfully' });
    } catch (error) {
        console.error('Error leaving group:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Transfer admin role to another member
 */
export const transferAdmin = async (req: Request, res: Response) => {
    try {
        const { groupId } = req.params;
        const { newAdminId } = req.body;
        const requestingUserId = (req as any).userId;

        // Verify requesting user is current admin
        const currentAdminMembership = await GroupMember.findOne({
            where: { groupId, userId: requestingUserId }
        });

        if (currentAdminMembership?.role !== 'admin') {
            return res.status(403).json({ message: 'Only the current admin can transfer admin role' });
        }

        // Verify new admin is a member
        const newAdminMembership = await GroupMember.findOne({
            where: { groupId, userId: newAdminId }
        });

        if (!newAdminMembership) {
            return res.status(404).json({ message: 'New admin must be a member of the group' });
        }

        // Transfer role
        await currentAdminMembership.update({ role: 'member' });
        await newAdminMembership.update({ role: 'admin' });

        // Also update Group.createdBy for backward compatibility
        await Group.update({ createdBy: newAdminId }, { where: { id: groupId } });

        // Get names for notification
        const currentAdmin = await User.findByPk(requestingUserId);
        const newAdmin = await User.findByPk(newAdminId);
        const group = await Group.findByPk(groupId);

        // Notify all members
        const allMembers = await GroupMember.findAll({ where: { groupId } });
        for (const member of allMembers) {
            await Notification.create({
                userId: member.userId,
                type: 'admin_transferred',
                title: 'Group Admin Changed',
                message: `${newAdmin?.name} is now the admin of "${group?.name}".`,
                data: JSON.stringify({ groupId, oldAdminId: requestingUserId, newAdminId }),
            });
        }

        res.json({ message: 'Admin role transferred successfully' });
    } catch (error) {
        console.error('Error transferring admin:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Soft delete a group (2-step process: expenses deleted first)
 */
export const softDeleteGroup = async (req: Request, res: Response) => {
    try {
        const { groupId } = req.params;
        const requestingUserId = (req as any).userId;

        // Verify requesting user is admin (check role OR createdBy for legacy data)
        const membership = await GroupMember.findOne({
            where: { groupId, userId: requestingUserId }
        });
        const group = await Group.findByPk(groupId);

        const isAdmin = membership?.role === 'admin' || group?.createdBy === requestingUserId;

        if (!isAdmin) {
            return res.status(403).json({ message: 'Only the group admin can delete the group' });
        }

        // Check if all expenses are deleted
        const expenseCount = await Expense.count({ where: { groupId } });
        if (expenseCount > 0) {
            return res.status(400).json({
                message: 'All expenses must be deleted first',
                expenseCount
            });
        }

        // Soft delete the group (already fetched above for admin check)
        if (!group) {
            return res.status(404).json({ message: 'Group not found' });
        }

        await group.update({
            isDeleted: true,
            deletedAt: new Date()
        });

        // Notify all members
        const allMembers = await GroupMember.findAll({
            where: { groupId },
            include: [{ model: User, as: 'user' }]
        });

        for (const member of allMembers) {
            await Notification.create({
                userId: member.userId,
                type: 'group_deleted',
                title: 'Group Deleted',
                message: `The group "${group.name}" has been deleted. You can view its history in Settings for 4 days.`,
                data: JSON.stringify({ groupId, deletedAt: new Date() }),
            });
        }

        res.json({ message: 'Group deleted successfully. History available for 4 days.' });
    } catch (error) {
        console.error('Error soft deleting group:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Get deleted groups for current user (within 4-day window)
 */
export const getDeletedGroups = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);

        // Get groups where user was a member and group is soft deleted
        const memberships = await GroupMember.findAll({
            where: { userId },
            include: [{
                model: Group,
                where: {
                    isDeleted: true,
                    deletedAt: { [Op.gte]: fourDaysAgo }
                }
            }]
        });

        const deletedGroups = memberships.map((m: any) => ({
            id: m.Group.id,
            name: m.Group.name,
            deletedAt: m.Group.deletedAt,
            daysRemaining: Math.ceil((new Date(m.Group.deletedAt).getTime() + 4 * 24 * 60 * 60 * 1000 - Date.now()) / (24 * 60 * 60 * 1000))
        }));

        // Sort by deletedAt DESC (most recently deleted first)
        deletedGroups.sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime());

        res.json(deletedGroups);
    } catch (error) {
        console.error('Error getting deleted groups:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Delete all expenses in a group (step 1 of group deletion)
 */
export const deleteAllGroupExpenses = async (req: Request, res: Response) => {
    try {
        const { groupId } = req.params;
        const requestingUserId = (req as any).userId;

        // Verify requesting user is admin (check role OR createdBy for legacy data)
        const membership = await GroupMember.findOne({
            where: { groupId, userId: requestingUserId }
        });
        const group = await Group.findByPk(groupId);

        const isAdmin = membership?.role === 'admin' || group?.createdBy === requestingUserId;

        if (!isAdmin) {
            return res.status(403).json({ message: 'Only the group admin can delete all expenses' });
        }

        // First delete expense splits, then expenses
        const expenses = await Expense.findAll({ where: { groupId } });
        const expenseIds = expenses.map((e: any) => e.id);

        if (expenseIds.length > 0) {
            // Delete all related records first (to avoid foreign key constraints)
            await Comment.destroy({ where: { expenseId: expenseIds } });
            await PurchaseItem.destroy({ where: { expenseId: expenseIds } });
            await ExpenseSplit.destroy({ where: { expenseId: expenseIds } });
        }

        // Delete all expenses
        const deletedCount = await Expense.destroy({ where: { groupId } });

        res.json({ message: `Deleted ${deletedCount} expenses`, deletedCount });
    } catch (error) {
        console.error('Error deleting group expenses:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
