import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { getSystemSetting } from '../middleware/authMiddleware';
import * as pushService from '../services/pushService';
import db from '../models';
import { redistributeMemberExpenses } from '../services/expenseService';

const Group = db.Group;
const User = db.User;
const GroupMember = db.GroupMember;
const Notification = db.Notification;

interface AuthRequest extends Request {
  userId?: string;
}

export const createGroup = async (req: AuthRequest, res: Response) => {
  try {
    const { name, members } = req.body; // Extract members
    const createdBy = req.userId; // Get user ID from authenticated request

    if (!createdBy) {
      return res.status(401).json({ message: 'Unauthorized: User not logged in' });
    }

    // Check max groups per user limit
    const maxGroups = await getSystemSetting('max_groups_per_user');
    if (maxGroups) {
      const limit = parseInt(maxGroups);
      if (!isNaN(limit) && limit > 0) {
        const userGroupCount = await GroupMember.count({ where: { userId: createdBy } });
        if (userGroupCount >= limit) {
          return res.status(403).json({
            message: `You have reached the maximum limit of ${limit} groups.`
          });
        }
      }
    }

    const group = await Group.create({
      name,
      createdBy,
    });

    // Add the creator as a member of the group with admin role
    await GroupMember.create({
      groupId: group.id,
      userId: createdBy,
      role: 'admin',
    });

    // Add other members if provided
    if (members && Array.isArray(members)) {
      // Filter out creator if accidentally included, to avoid duplicate key error
      const otherMembers = members.filter((id: string) => id !== createdBy);

      for (const memberId of otherMembers) {
        // Verify user exists (optional but good practice)
        const userExists = await User.findByPk(memberId);
        if (userExists) {
          await GroupMember.create({
            groupId: group.id,
            userId: memberId
          });

          // Create Notification for added member
          await Notification.create({
            userId: memberId,
            type: 'GROUP_ADD',
            title: 'Added to Group',
            message: `You have been added to the group "${group.name}"`,
            data: JSON.stringify({ groupId: group.id })
          });
        }
      }
    }

    res.status(201).json(group);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error creating group' });
  }
};

export const getGroups = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId; // Get user ID from authenticated request

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized: User not logged in' });
    }

    // Correct approach for finding groups the user belongs to:
    // 1. Find all GroupMember entries for this user
    const userMemberships = await GroupMember.findAll({
      where: { userId },
      attributes: ['groupId']
    });

    const groupIds = userMemberships.map((m: any) => m.groupId);

    // 2. Find all groups with those IDs (excluding deleted), including ALL their members and expenses
    const allGroups = await Group.findAll({
      where: {
        id: groupIds,
        isDeleted: false
      },
      order: [['createdAt', 'DESC']], // Newest groups first
      include: [
        {
          model: User,
          as: 'users',
          attributes: ['id'],
          through: { attributes: [] }
        },
        {
          model: db.Expense,
          attributes: ['amount'],
          required: false
        }
      ]
    });

    const groupsWithMembers = allGroups.map((group: any) => {
      const groupData = group.toJSON();
      // Calculate total expenses for this group
      const total = groupData.Expenses
        ? groupData.Expenses.reduce((sum: number, expense: any) => sum + parseFloat(expense.amount || 0), 0)
        : 0;

      return {
        ...groupData,
        members: groupData.users ? groupData.users.map((user: any) => user.id) : [],
        total: total,
        Expenses: undefined, // Remove Expenses array from response
      };
    });

    res.status(200).json(groupsWithMembers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching groups' });
  }
};

export const getGroupById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const includeDeleted = req.query.includeDeleted === 'true';

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized: User not logged in' });
    }

    const group = await Group.findByPk(id, {
      paranoid: !includeDeleted, // If includeDeleted is true, paranoid is false (show deleted)
      include: [
        {
          model: User,
          as: 'users', // Alias for the through table association
          attributes: ['id', 'name', 'email'], // Include user details
          through: { attributes: [] } // Exclude join table attributes
        },
        // Include deleted expenses if includeDeleted is true
        ...(includeDeleted ? [{
          model: db.Expense,
          attributes: ['id', 'description', 'amount', 'currency', 'paidBy', 'date', 'category', 'createdAt', 'deletedAt'],
          required: false,
          paranoid: false,
          include: [{ model: db.ExpenseSplit, required: false, paranoid: false }] // Include splits if needed for calculation
        }] : []),
        // Include deleted payments if includeDeleted is true
        ...(includeDeleted ? [{
          model: db.Payment,
          required: false,
          paranoid: false
        }] : [])
      ]
    });

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check if the authenticated user is a member of the group
    const isMember = (group as any).users.some((member: any) => member.id === userId);
    if (!isMember) {
      return res.status(403).json({ message: 'Forbidden: You are not a member of this group' });
    }

    res.status(200).json(group);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching group' });
  }
};

export const updateGroup = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized: User not logged in' });
    }

    const group = await Group.findByPk(id);

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Only the creator can update the group details (for now)
    if (group.createdBy !== userId) {
      return res.status(403).json({ message: 'Forbidden: Only the group creator can update this group' });
    }

    group.name = name || group.name;
    await group.save();

    res.status(200).json(group);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error updating group' });
  }
};

export const deleteGroup = async (req: AuthRequest, res: Response) => {
  const t = await db.sequelize.transaction();
  try {
    const { id } = req.params;
    const userId = req.userId;
    const Expense = db.Expense;
    const Payment = db.Payment;
    const GroupMember = db.GroupMember;
    const ExpenseSplit = db.ExpenseSplit;
    const Comment = db.Comment;

    if (!userId) {
      await t.rollback();
      return res.status(401).json({ message: 'Unauthorized: User not logged in' });
    }

    const group = await Group.findByPk(id, { transaction: t });

    if (!group) {
      await t.rollback();
      return res.status(404).json({ message: 'Group not found' });
    }

    // Only the creator can delete the group
    if (group.createdBy !== userId) {
      await t.rollback();
      return res.status(403).json({ message: 'Forbidden: Only the group creator can delete this group' });
    }

    // Manual cascade delete to ensure everything is cleaned up
    // 1. Find all expenses in the group
    const expenses = await Expense.findAll({ where: { groupId: id }, transaction: t });
    const expenseIds = expenses.map((e: any) => e.id);

    if (expenseIds.length > 0) {
      // 2. Delete splits for these expenses
      await ExpenseSplit.destroy({ where: { expenseId: expenseIds }, transaction: t });

      // 3. Delete comments for these expenses
      await Comment.destroy({ where: { expenseId: expenseIds }, transaction: t });

      // 4. Delete the expenses themselves
      await Expense.destroy({ where: { id: expenseIds }, transaction: t });
    }

    // 5. Delete payments associated with the group
    await Payment.destroy({ where: { groupId: id }, transaction: t });

    // 6. Delete group members
    await GroupMember.destroy({ where: { groupId: id }, transaction: t });

    // 7. Finally delete the group
    await group.destroy({ transaction: t });

    await t.commit();
    res.status(204).json({ message: 'Group deleted successfully' });
  } catch (error) {
    await t.rollback();
    console.error('Error deleting group:', error);
    res.status(500).json({ message: 'Error deleting group', details: (error as Error).message });
  }
};

export const addMemberToGroup = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params; // Group ID
    const { userId: memberId, email, customId, identifier } = req.body; // Accept various identifiers
    const currentUserId = req.userId;

    if (!currentUserId) {
      return res.status(401).json({ message: 'Unauthorized: User not logged in' });
    }

    const group = await Group.findByPk(id);

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check if current user is a member of the group (any member can add others)
    const memberCheck = await db.GroupMember.findOne({
      where: { groupId: id, userId: currentUserId }
    });
    if (!memberCheck) {
      return res.status(403).json({ message: 'Forbidden: Only group members can add new members' });
    }

    let userToAdd;
    const searchIdentifier = identifier || email || customId;

    if (memberId) {
      userToAdd = await User.findByPk(memberId);
    } else if (searchIdentifier) {
      // Try to find by customId first, then email
      userToAdd = await User.findOne({
        where: {
          [Op.or]: [
            { customId: searchIdentifier },
            { email: searchIdentifier }
          ]
        }
      });

      if (!userToAdd) {
        // If not found, check if it looks like an email to create a shadow user
        const isEmail = String(searchIdentifier).includes('@');
        if (isEmail) {
          // Create shadow user with email
          userToAdd = await User.create({
            name: String(searchIdentifier).split('@')[0],
            email: searchIdentifier,
            password: Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8), // Random password
            // customId will be auto-generated by hook/default value
          });
        } else {
          // If not an email and not found by customId, we cannot add by name anymore
          return res.status(404).json({ message: `User with identifier '${searchIdentifier}' not found. Please use Email or Custom ID.` });
        }
      }
    } else {
      return res.status(400).json({ message: 'Please provide userId, email, or customId' });
    }

    if (!userToAdd) {
      return res.status(404).json({ message: 'User to add not found and could not be created' });
    }

    const existingMember = await GroupMember.findOne({ where: { groupId: id, userId: userToAdd.id } });
    if (existingMember) {
      return res.status(409).json({ message: 'User is already a member of this group' });
    }

    await GroupMember.create({
      groupId: id,
      userId: userToAdd.id,
    });

    // Create Notification
    await Notification.create({
      userId: userToAdd.id,
      type: 'GROUP_ADD',
      title: 'Added to Group',
      message: `You have been added to the group "${group.name}"`,
      data: JSON.stringify({ groupId: group.id })
    });

    // Send push notification
    await pushService.sendPushNotification(userToAdd.id, {
      title: 'Added to Group',
      body: `You've been added to "${group.name}"`,
      data: { type: 'GROUP_ADD', groupId: group.id }
    });

    res.status(200).json({ message: 'Member added to group successfully', user: userToAdd });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error adding member to group' });
  }
};

export const removeMemberFromGroup = async (req: AuthRequest, res: Response) => {
  try {
    const { id, memberId } = req.params; // Group ID and Member ID to remove
    const currentUserId = req.userId;
    const Expense = db.Expense;
    const ExpenseSplit = db.ExpenseSplit;
    const User = db.User;
    const Notification = db.Notification;
    const { Op } = require('sequelize');

    if (!currentUserId) {
      return res.status(401).json({ message: 'Unauthorized: User not logged in' });
    }

    const group = await Group.findByPk(id);

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check if current user is creator of the group
    if (group.createdBy !== currentUserId) {
      return res.status(403).json({ message: 'Forbidden: Only the group creator can remove members' });
    }

    // Redistribute expenses
    const redistributedExpenses = await redistributeMemberExpenses(id, memberId);

    // Now remove from group
    const deleted = await GroupMember.destroy({ where: { groupId: id, userId: memberId } });

    if (deleted === 0) {
      return res.status(404).json({ message: 'Member not found in this group' });
    }

    // Get member's name for notification
    const removedUser = await User.findByPk(memberId);
    const removedUserName = removedUser?.name || 'A member';

    // Notify remaining group members
    const remainingMembers = await GroupMember.findAll({ where: { groupId: id } });
    for (const member of remainingMembers) {
      await Notification.create({
        userId: member.userId,
        type: 'member_removed',
        title: 'Member Removed from Group',
        message: `${removedUserName} has been removed from "${group.name}".${redistributedExpenses > 0 ? ` Their shares have been redistributed across ${redistributedExpenses} expense(s).` : ''}`,
        data: JSON.stringify({ groupId: id, removedUserId: memberId, redistributedExpenses }),
      });
    }

    console.log(`[RemoveMemberFromGroup] Removed ${memberId} from group ${id}. Redistributed ${redistributedExpenses} expenses.`);

    res.status(200).json({
      message: 'Member removed from group successfully',
      redistributedExpenses
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error removing member from group' });
  }
};
