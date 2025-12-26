import { Request, Response } from 'express';
import db from '../models';
import { getSystemSetting } from '../middleware/authMiddleware';

const Comment = db.Comment;
const User = db.User;

interface AuthRequest extends Request {
    userId?: string;
}

export const addComment = async (req: AuthRequest, res: Response) => {
    try {
        // Check if comments feature is enabled
        const commentsEnabled = await getSystemSetting('feature_comments_enabled');
        if (commentsEnabled === 'false') {
            return res.status(403).json({ message: 'Comments are currently disabled.' });
        }

        const { expenseId } = req.params;
        const { content } = req.body;
        const currentUserId = req.userId;

        if (!currentUserId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        if (!content) {
            return res.status(400).json({ message: 'Content is required' });
        }

        const comment = await Comment.create({
            expenseId,
            userId: currentUserId,
            content,
        });

        // Get expense details to find participants to notify
        const expense = await db.Expense.findByPk(expenseId, {
            include: [{ model: db.ExpenseSplit, as: 'ExpenseSplits', attributes: ['userId'] }]
        });

        if (expense) {
            const participants = new Set<string>();
            // Add payer
            participants.add(expense.paidBy);
            // Add split members
            if ((expense as any).ExpenseSplits) {
                (expense as any).ExpenseSplits.forEach((split: any) => participants.add(split.userId));
            }

            // Remove current user (commenter)
            participants.delete(currentUserId);

            // Fetch current user details
            const currentUserRecord = await User.findByPk(currentUserId);
            const userName = currentUserRecord?.name || 'Someone';

            // Create notifications
            const notificationPromises = Array.from(participants).map(userId => {
                return db.Notification.create({
                    userId,
                    type: 'COMMENT_ADD',
                    title: 'New Comment',
                    message: `${userName} commented on "${expense.description}": ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`,
                    data: JSON.stringify({ expenseId, commentId: comment.id })
                });
            });

            await Promise.all(notificationPromises).catch(err => console.error('Error creating notifications:', err));
        }

        const commentWithUser = await Comment.findByPk(comment.id, {
            include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }]
        });

        res.status(201).json(commentWithUser);
    } catch (error) {
        console.error('Error adding comment:', error);
        res.status(500).json({ message: 'Error adding comment' });
    }
};

export const getComments = async (req: AuthRequest, res: Response) => {
    try {
        const { expenseId } = req.params;

        const comments = await Comment.findAll({
            where: { expenseId },
            include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }],
            order: [['createdAt', 'ASC']]
        });

        res.status(200).json(comments);
    } catch (error) {
        console.error('Error fetching comments:', error);
        res.status(500).json({ message: 'Error fetching comments' });
    }
};
