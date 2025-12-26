import { Request, Response } from 'express';
import db from '../models';
import { Op } from 'sequelize';
import { getSystemSetting } from '../middleware/authMiddleware';
import * as pushService from '../services/pushService';

const Expense = db.Expense;
const ExpenseSplit = db.ExpenseSplit;
const GroupMember = db.GroupMember;
const Notification = db.Notification;

interface AuthRequest extends Request {
  userId?: string;
}

export const createExpense = async (req: AuthRequest, res: Response) => {
  try {
    console.log('Starting createExpense with body:', JSON.stringify(req.body));
    const { description, amount, currency, paidBy, groupId: rawGroupId, category, date, receipt, notes, splitType, splits } = req.body;
    const groupId = rawGroupId === "" ? null : rawGroupId;
    const currentUserId = req.userId;

    if (!currentUserId) {
      console.log('createExpense: Unauthorized');
      return res.status(401).json({ message: 'Unauthorized: User not logged in' });
    }

    // Check max expenses per user limit
    const maxExpenses = await getSystemSetting('max_expenses_per_user');
    if (maxExpenses) {
      const limit = parseInt(maxExpenses);
      if (!isNaN(limit) && limit > 0) {
        const userExpenseCount = await Expense.count({ where: { paidBy: currentUserId } });
        if (userExpenseCount >= limit) {
          return res.status(403).json({
            message: `You have reached the maximum limit of ${limit} expenses.`
          });
        }
      }
    }

    // Validate if paidBy user is a member of the group if groupId is provided
    if (groupId) {
      console.log(`Checking membership for user ${paidBy} in group ${groupId}`);
      const isMember = await GroupMember.findOne({ where: { groupId, userId: paidBy } });
      if (!isMember) {
        console.log('createExpense: Payer not member');
        return res.status(403).json({ message: 'Forbidden: Payer is not a member of the specified group' });
      }
    }

    console.log('Creating expense record...');
    const expense = await Expense.create({
      description,
      amount,
      currency,
      paidBy,
      groupId,
      category,
      date,
      receipt,
      notes,
      splitType,
    });
    console.log('Expense created:', expense.id);

    // Fetch current user to get name for notification
    const currentUser = await db.User.findByPk(currentUserId);
    const userName = currentUser?.name || 'Someone';

    // Create notifications for split participants (excluding the payer)
    if (splits && splits.length > 0) {
      console.log('Processing splits:', splits.length);
      const expenseSplits = splits.map((split: any) => ({
        expenseId: expense.id,
        userId: split.userId,
        amount: split.amount,
      }));
      console.log('Bulk creating splits...');
      await ExpenseSplit.bulkCreate(expenseSplits);

      // Notify participants
      console.log('Processing notifications...');
      for (const split of splits) {
        if (split.userId !== currentUserId) {
          try {
            await Notification.create({
              userId: split.userId,
              type: 'EXPENSE_ADD',
              title: 'New Expense',
              message: `${userName} added an expense "${description}" involving you.`,
              data: JSON.stringify({ expenseId: expense.id, groupId })
            });
            // Send push notification
            await pushService.sendPushNotification(split.userId, {
              title: 'New Expense',
              body: `${userName} added "${description}" - $${amount}`,
              data: { type: 'EXPENSE_ADD', expenseId: expense.id, groupId: groupId || '' }
            });
          } catch (notifError) {
            console.error('Failed to create notification for user ' + split.userId, notifError);
            // Continue execution, don't fail the request for notification error
          }
        }
      }
    }
    // Ensure all split participants are members of the group
    if (groupId && splits && splits.length > 0) {
      const participantIds = splits.map((s: any) => s.userId).filter((id: string) => id !== paidBy);
      if (participantIds.length > 0) {
        console.log(`Ensuring ${participantIds.length} split participants are in group ${groupId}`);
        const existingMembers = await GroupMember.findAll({
          where: {
            groupId,
            userId: { [Op.in]: participantIds }
          },
          attributes: ['userId']
        });

        const existingMemberIds = new Set(existingMembers.map((m: any) => m.userId));
        const missingMemberIds = participantIds.filter((id: string) => !existingMemberIds.has(id));

        if (missingMemberIds.length > 0) {
          console.log(`Adding ${missingMemberIds.length} missing members to group ${groupId}:`, missingMemberIds);
          const newMembers = missingMemberIds.map((userId: string) => ({
            groupId,
            userId,
            role: 'member'
          }));
          await GroupMember.bulkCreate(newMembers);
        }
      }
    }

    // Fetch the created expense with splits
    console.log('Fetching created expense...');
    const createdExpense = await Expense.findByPk(expense.id, {
      include: [{ model: ExpenseSplit, as: 'ExpenseSplits', attributes: ['userId', 'amount'] }]
    });

    // --- AUTOMATED RECEIPT SCANNING ---
    // --- AUTOMATED RECEIPT SCANNING ---
    if (receipt) {
      console.log(`[Auto-Scan] Triggered for expense ${expense.id}. Receipt length: ${receipt.length}`);

      // Update status to PROCESSING
      await Expense.update({ scanStatus: 'PROCESSING' }, { where: { id: expense.id } });

      // Run asynchronously to not block response
      (async () => {
        try {
          let imagePath = '';

          const path = require('path');
          const fs = require('fs');
          const { processReceiptImage } = require('../services/ocrService');

          // Use server directory for uploads (more reliable than __dirname)
          const uploadsDir = path.join(process.cwd(), 'uploads');
          console.log(`[Auto-Scan] Uploads directory: ${uploadsDir}`);

          // Ensure uploads directory exists
          if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
            console.log(`[Auto-Scan] Created uploads directory`);
          }

          // Check if receipt is Base64 (Legacy fallback, but we prefer URL now)
          if (receipt.startsWith('data:image')) {
            console.log(`[Auto-Scan] Base64 receipt detected. Ideally should be uploaded first.`);
            // We can keep it or remove it. For safety/performance, let's remove strict dependency on it 
            // and just handle it if absolutely necessary, but since we changed frontend, we expect URL.
            // Let's actually REMOVE the file writing for base64 to enforce the new performance pattern.
            // If we really need it, we can re-add. But simpler is better.
            console.log(`[Auto-Scan] Skipping Base64 processing to prevent memory issues.`);
          } else {
            console.log(`[Auto-Scan] Receipt is URL. Value: ${receipt.substring(0, 80)}...`);
            const filename = receipt.split('/').pop();
            if (filename && filename.length < 255) {
              imagePath = path.join(uploadsDir, filename);
              console.log(`[Auto-Scan] Resolved image path: ${imagePath}`);
            } else {
              console.log(`[Auto-Scan] Invalid filename extracted from URL`);
            }
          }

          if (imagePath && fs.existsSync(imagePath)) {
            console.log(`[Auto-Scan] Processing receipt image: ${imagePath}`);
            const data = await processReceiptImage(imagePath);
            console.log(`[Auto-Scan] OCR Result: Found ${data.rawData?.length || 0} items`);

            if (data.rawData && data.rawData.length > 0) {
              console.log(`[Auto-Scan] Items extracted:`, data.rawData.map((i: any) => `${i.name}: $${i.price}`));
            }

            if (data.rawData && data.rawData.length > 0) {
              const items = data.rawData.map((item: any) => ({
                expenseId: expense.id,
                name: item.name,
                price: item.price,
                quantity: 1
              }));

              await db.PurchaseItem.bulkCreate(items);
              console.log(`[Auto-Scan] SUCCESS: Saved ${items.length} items for expense ${expense.id}`);
              await Expense.update({ scanStatus: 'COMPLETED' }, { where: { id: expense.id } });
            } else {
              console.log(`[Auto-Scan] No items extracted from image.`);
              await Expense.update({ scanStatus: 'COMPLETED' }, { where: { id: expense.id } }); // Completed but empty
            }
          } else {
            console.log(`[Auto-Scan] ERROR: Image path not found or invalid: ${imagePath}`);
            await Expense.update({ scanStatus: 'FAILED' }, { where: { id: expense.id } });
            if (imagePath) {
              // List files in uploads directory for debugging
              const files = fs.readdirSync(uploadsDir);
              console.log(`[Auto-Scan] Files in uploads directory:`, files.slice(0, 10));
            }
          }
        } catch (err) {
          console.error("[Auto-Scan] CRITICAL FAILURE:", err);
          await Expense.update({ scanStatus: 'FAILED' }, { where: { id: expense.id } });
        }
      })();
    } else {
      console.log(`[Auto-Scan] No receipt data provided for expense ${expense.id}`);
    }
    // ----------------------------------
    // ----------------------------------

    const expenseData = (createdExpense as any).toJSON();
    res.status(201).json({
      ...expenseData,
      splits: expenseData.ExpenseSplits || [],
    });
  } catch (error) {
    console.error('CRITICAL ERROR in createExpense:', error);
    res.status(500).json({ message: 'Error creating expense' });
  }
};

export const getExpenses = async (req: AuthRequest, res: Response) => {
  try {
    const currentUserId = req.userId;

    if (!currentUserId) {
      return res.status(401).json({ message: 'Unauthorized: User not logged in' });
    }

    // Pagination parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const paginate = req.query.paginate !== 'false'; // Allow disabling pagination

    // Build the query
    const queryOptions: any = {
      include: [
        {
          model: ExpenseSplit,
          as: 'ExpenseSplits',
          attributes: ['userId', 'amount'],
          required: false,
        },
      ],
      where: {
        deletedAt: null,
        // Safety: Also exclude expenses where groupId is in a deleted group
        [Op.or]: [
          { groupId: null }, // Non-group expenses are always OK
          {
            groupId: {
              [Op.notIn]: db.sequelize.literal(`(SELECT id FROM groups WHERE deletedAt IS NOT NULL)`)
            }
          }
        ],
        [Op.and]: [
          {
            [Op.or]: [
              { paidBy: currentUserId },
              { '$ExpenseSplits.userId$': currentUserId }
            ]
          }
        ]
      },
      order: [
        ['date', 'DESC'],
        ['createdAt', 'DESC']
      ],
      distinct: true,
      subQuery: false, // Important for pagination with JOINs
    };

    // Apply pagination only if enabled
    if (paginate) {
      queryOptions.limit = limit;
      queryOptions.offset = offset;
    }

    // Get count and rows
    const { count, rows: expenses } = await Expense.findAndCountAll(queryOptions);

    // Format expenses to include splits array
    const formattedExpenses = expenses.map((expense: any) => {
      const expenseData = expense.toJSON();
      return {
        ...expenseData,
        splits: expenseData.ExpenseSplits || [],
      };
    });

    // Handle count (can be number or array when using distinct)
    const totalCount = typeof count === 'number' ? count : (count as any[]).length;

    // Return paginated response
    if (paginate) {
      res.status(200).json({
        data: formattedExpenses,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit),
          hasMore: page < Math.ceil(totalCount / limit)
        }
      });
    } else {
      // Legacy mode: return array directly for backward compatibility
      res.status(200).json(formattedExpenses);
    }
  } catch (error) {
    console.error('Error in getExpenses:', error);
    res.status(500).json({ message: 'Error fetching expenses' });
  }
};

export const getExpenseById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const currentUserId = req.userId;

    if (!currentUserId) {
      return res.status(401).json({ message: 'Unauthorized: User not logged in' });
    }

    const expense = await Expense.findByPk(id, {
      include: [
        { model: db.User, as: 'payer', attributes: ['id', 'name', 'email'] },
        { model: ExpenseSplit, as: 'ExpenseSplits', include: [{ model: db.User, as: 'user', attributes: ['id', 'name', 'email'] }] },
        { model: db.Comment, as: 'comments', include: [{ model: db.User, as: 'user', attributes: ['id', 'name', 'email'] }] },
        { model: db.PurchaseItem, as: 'purchaseItems' }
      ],
    });

    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    // Check if the current user is involved in this expense (either as payer or in a split)
    const isUserInvolved = expense.paidBy === currentUserId ||
      (expense as any).ExpenseSplits.some((split: any) => split.userId === currentUserId);

    if (!isUserInvolved) {
      return res.status(403).json({ message: 'Forbidden: You are not involved in this expense' });
    }

    res.status(200).json(expense);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching expense' });
  }
};

export const updateExpense = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { description, amount, currency, paidBy, groupId, category, date, receipt, notes, splitType, splits } = req.body;
    const currentUserId = req.userId;

    if (!currentUserId) {
      return res.status(401).json({ message: 'Unauthorized: User not logged in' });
    }

    const expense = await Expense.findByPk(id);

    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    // Only the payer can update the expense (for simplicity)
    if (expense.paidBy !== currentUserId) {
      return res.status(403).json({ message: 'Forbidden: Only the payer can update this expense' });
    }

    // Update expense details
    expense.description = description || expense.description;
    expense.amount = amount || expense.amount;
    expense.currency = currency || expense.currency;
    expense.paidBy = paidBy || expense.paidBy;
    expense.groupId = groupId || expense.groupId;
    expense.category = category || expense.category;
    expense.date = date || expense.date;
    expense.receipt = receipt || expense.receipt;
    expense.notes = notes || expense.notes;
    expense.splitType = splitType || expense.splitType;
    await expense.save();

    // Update expense splits (delete existing and create new ones)
    if (splits && splits.length > 0) {
      await ExpenseSplit.destroy({ where: { expenseId: id } });
      const expenseSplits = splits.map((split: any) => ({
        expenseId: expense.id,
        userId: split.userId,
        amount: split.amount,
      }));
      await ExpenseSplit.bulkCreate(expenseSplits);
    }

    // Ensure all split participants are members of the group
    if (expense.groupId && splits && splits.length > 0) {
      const participantIds = splits.map((s: any) => s.userId).filter((uid: string) => uid !== expense.paidBy);
      if (participantIds.length > 0) {
        const existingMembers = await GroupMember.findAll({
          where: {
            groupId: expense.groupId,
            userId: { [Op.in]: participantIds }
          },
          attributes: ['userId']
        });

        const existingMemberIds = new Set(existingMembers.map((m: any) => m.userId));
        const missingMemberIds = participantIds.filter((id: string) => !existingMemberIds.has(id));

        if (missingMemberIds.length > 0) {
          console.log(`[UpdateExpense] Adding ${missingMemberIds.length} missing members to group ${expense.groupId}`);
          const newMembers = missingMemberIds.map((userId: string) => ({
            groupId: expense.groupId,
            userId,
            role: 'member'
          }));
          await GroupMember.bulkCreate(newMembers);
        }
      }
    }

    // Notify participants of update
    try {
      // Fetch updated expense with splits to identify participants
      const updatedExpense = await Expense.findByPk(id, {
        include: [{ model: ExpenseSplit, as: 'ExpenseSplits', attributes: ['userId'] }]
      });

      if (updatedExpense) {
        const participants = new Set<string>();
        // Add payer (if different from current user, though update is restricted to payer usually)
        if (updatedExpense.paidBy !== currentUserId) participants.add(updatedExpense.paidBy);

        // Add split members
        if ((updatedExpense as any).ExpenseSplits) {
          (updatedExpense as any).ExpenseSplits.forEach((split: any) => participants.add(split.userId));
        }

        participants.delete(currentUserId);

        const currentUserRecord = await db.User.findByPk(currentUserId);
        const userName = currentUserRecord?.name || 'Someone';

        const notificationPromises = Array.from(participants).map(async userId => {
          await Notification.create({
            userId,
            type: 'EXPENSE_UPDATE',
            title: 'Expense Updated',
            message: `${userName} updated the expense "${description}".`,
            data: JSON.stringify({ expenseId: id, groupId: updatedExpense.groupId })
          });
          // Send push notification
          await pushService.sendPushNotification(userId, {
            title: 'Expense Updated',
            body: `${userName} updated "${description}"`,
            data: { type: 'EXPENSE_UPDATE', expenseId: id, groupId: updatedExpense.groupId || '' }
          });
        });

        await Promise.all(notificationPromises);
      }
    } catch (notifError) {
      console.error('Failed to send update notifications', notifError);
    }

    res.status(200).json(expense);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error updating expense' });
  }
};

export const deleteExpense = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const currentUserId = req.userId;

    if (!currentUserId) {
      return res.status(401).json({ message: 'Unauthorized: User not logged in' });
    }

    const expense = await Expense.findByPk(id);

    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    // Only the payer can delete the expense
    if (expense.paidBy !== currentUserId) {
      return res.status(403).json({ message: 'Forbidden: Only the payer can delete this expense' });
    }

    // Notify participants before deletion
    try {
      // Fetch expense with splits to identify participants before deleting
      const expenseToDelete = await Expense.findByPk(id, {
        include: [{ model: ExpenseSplit, as: 'ExpenseSplits', attributes: ['userId'] }]
      });

      if (expenseToDelete) {
        const participants = new Set<string>();
        if ((expenseToDelete as any).ExpenseSplits) {
          (expenseToDelete as any).ExpenseSplits.forEach((split: any) => participants.add(split.userId));
        }

        // Exclude current user (payer)
        participants.delete(currentUserId);

        const currentUserRecord = await db.User.findByPk(currentUserId);
        const userName = currentUserRecord?.name || 'Someone';

        const notificationPromises = Array.from(participants).map(async userId => {
          await Notification.create({
            userId,
            type: 'EXPENSE_DELETE',
            title: 'Expense Deleted',
            message: `${userName} deleted the expense "${expenseToDelete.description}".`,
            data: JSON.stringify({ expenseId: id, groupId: expenseToDelete.groupId })
          });
          // Send push notification
          await pushService.sendPushNotification(userId, {
            title: 'Expense Deleted',
            body: `${userName} deleted "${expenseToDelete.description}"`,
            data: { type: 'EXPENSE_DELETE', expenseId: id, groupId: expenseToDelete.groupId || '' }
          });
        });

        await Promise.all(notificationPromises);
      }
    } catch (notifError) {
      console.error('Failed to send delete notifications', notifError);
    }

    // Delete associated splits first
    await ExpenseSplit.destroy({ where: { expenseId: id } });
    await expense.destroy();

    res.status(204).json({ message: 'Expense deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error deleting expense' });
  }
};

export const analyzeReceipt = async (req: AuthRequest, res: Response) => {
  try {
    const { filename } = req.body;
    if (!filename) {
      return res.status(400).json({ message: 'Filename is required' });
    }

    const path = require('path');
    const imagePath = path.join(__dirname, '../../uploads', filename);

    // Import dynamically to avoid require cycles or ensure service is ready
    const { processReceiptImage } = require('../services/ocrService');

    console.log(`Analyzing receipt: ${imagePath}`);
    const data = await processReceiptImage(imagePath);

    res.status(200).json(data);
  } catch (error) {
    console.error('Error analyzing receipt:', error);
    res.status(500).json({ message: 'Failed to analyze receipt' });
  }
};
