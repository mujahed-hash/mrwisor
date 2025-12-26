import { Request, Response } from 'express';
import db from '../models';

const Notification = db.Notification;

interface AuthRequest extends Request {
    userId?: string;
}

export const getNotifications = async (req: AuthRequest, res: Response) => {
    try {
        const currentUserId = req.userId;

        if (!currentUserId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const notifications = await Notification.findAll({
            where: { userId: currentUserId },
            order: [['createdAt', 'DESC']],
            limit: 50
        });

        res.status(200).json(notifications);
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ message: 'Error fetching notifications' });
    }
};

export const markAsRead = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const currentUserId = req.userId;

        const notification = await Notification.findOne({
            where: { id, userId: currentUserId }
        });

        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' });
        }

        notification.read = true;
        await notification.save();

        res.status(200).json(notification);
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({ message: 'Error updating notification' });
    }
};

export const markAllAsRead = async (req: AuthRequest, res: Response) => {
    try {
        const currentUserId = req.userId;

        await Notification.update(
            { read: true },
            { where: { userId: currentUserId, read: false } }
        );

        res.status(200).json({ message: 'All notifications marked as read' });
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        res.status(500).json({ message: 'Error updating notifications' });
    }
};

export const createNotification = async (req: AuthRequest, res: Response) => {
    try {
        const { userId, message, type } = req.body;
        const currentUserId = req.userId;

        if (!userId || !message) {
            return res.status(400).json({ message: 'UserId and message are required' });
        }

        const notification = await Notification.create({
            id: crypto.randomUUID(),
            userId, // The recipient
            title: 'Reminder', // Required field
            message,
            read: false,
            type: type || 'reminder',
            relatedId: currentUserId // store sender ID here optionally if schema supports, or just in message
        });

        res.status(201).json(notification);
    } catch (error) {
        console.error('Error creating notification:', error);
        res.status(500).json({ message: 'Error creating notification' });
    }
};
