
import { Request, Response } from 'express';
import * as pushService from '../services/pushService';

// Register a new device token
export const registerToken = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { token, platform } = req.body;

        if (!token) {
            return res.status(400).json({ message: 'Token is required' });
        }

        await pushService.registerDeviceToken(userId, token, platform || 'web');

        res.status(200).json({ message: 'Device registered successfully' });
    } catch (error) {
        console.error('Register token error:', error);
        res.status(500).json({ message: 'Failed to register device' });
    }
};

// Test push (Admin/Debug only)
export const testPush = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        await pushService.sendPushNotification(userId, {
            title: 'Test Notification',
            body: 'This is a test push notification from Wisely Spent!',
            data: { type: 'test' }
        });
        res.json({ message: 'Test notification sent' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to send test push' });
    }
};
