import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/user';
import Group from '../models/group';
import Expense from '../models/expense';
import sequelize from '../config/database';
import { Op } from 'sequelize';
import Payment from '../models/payment';
import ExpenseSplit from '../models/expenseSplit';
import NotificationModel from '../models/notification';

export const adminLogin = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ where: { email } });

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Check if user is admin
        if (user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied. Admins only.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET || 'secret', {
            expiresIn: '1d',
        });

        res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};


export const getSystemStats = async (req: Request, res: Response) => {
    try {
        const userCount = await User.count();
        const groupCount = await Group.count();
        const expenseCount = await Expense.count();

        // Calculate total expense amount
        const totalExpensesResult = await Expense.sum('amount');
        const totalExpenses = totalExpensesResult || 0;

        // Active users (logged in last 7 days) - handle if column doesn't exist
        let activeUsers = 0;
        let suspendedUsers = 0;

        try {
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            activeUsers = await User.count({
                where: { lastLoginAt: { [Op.gte]: sevenDaysAgo } }
            });
        } catch (e) {
            // lastLoginAt column may not exist yet
            activeUsers = userCount; // Fallback
        }

        try {
            suspendedUsers = await User.count({
                where: { status: 'suspended' }
            });
        } catch (e) {
            // status column may not exist yet
            suspendedUsers = 0;
        }

        res.json({
            users: userCount,
            groups: groupCount,
            expenses: expenseCount,
            totalTransactionVolume: totalExpenses,
            activeUsers,
            suspendedUsers
        });
    } catch (error) {
        console.error('Error in getSystemStats:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
};

export const getAllUsers = async (req: Request, res: Response) => {
    try {
        // Pagination & search
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const search = req.query.search as string || '';
        const offset = (page - 1) * limit;

        // Location filters
        const country = req.query.country as string;
        const state = req.query.state as string;
        const city = req.query.city as string;

        const whereConditions: any[] = [];

        // Search condition
        if (search) {
            whereConditions.push({
                [Op.or]: [
                    { name: { [Op.like]: `%${search}%` } },
                    { email: { [Op.like]: `%${search}%` } },
                    { customId: { [Op.like]: `%${search}%` } }
                ]
            });
        }

        // Location filter conditions
        if (country) {
            whereConditions.push({ country: country });
        }
        if (state) {
            whereConditions.push({ state: state });
        }
        if (city) {
            whereConditions.push({ city: city });
        }

        const whereClause = whereConditions.length > 0
            ? { [Op.and]: whereConditions }
            : {};

        const { count, rows: users } = await User.findAndCountAll({
            attributes: { exclude: ['password', 'otp', 'otpExpires'] },
            where: whereClause,
            order: [['createdAt', 'DESC']],
            limit,
            offset
        });

        res.json({
            data: users,
            pagination: {
                page,
                limit,
                total: count,
                totalPages: Math.ceil(count / limit)
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
};

export const getUserDetails = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const user = await User.findByPk(id, {
            attributes: { exclude: ['password', 'otp', 'otpExpires'] }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Get user statistics
        const expenseCount = await Expense.count({ where: { paidBy: id } });
        const totalPaid = await Expense.sum('amount', { where: { paidBy: id } }) || 0;
        const groupCount = await sequelize.query(
            `SELECT COUNT(DISTINCT groupId) as count FROM group_members WHERE userId = ?`,
            { replacements: [id], type: 'SELECT' }
        ) as any[];

        res.json({
            user,
            stats: {
                expenseCount,
                totalPaid,
                groupCount: groupCount[0]?.count || 0
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch user details' });
    }
};

export const suspendUser = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const user = await User.findByPk(id);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (user.role === 'admin') {
            return res.status(400).json({ error: 'Cannot suspend an admin' });
        }

        await user.update({ status: 'suspended' });
        res.json({ message: 'User suspended successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to suspend user' });
    }
};

export const unsuspendUser = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const user = await User.findByPk(id);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        await user.update({ status: 'active' });
        res.json({ message: 'User unsuspended successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to unsuspend user' });
    }
};

export const banUser = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const user = await User.findByPk(id);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (user.role === 'admin') {
            return res.status(400).json({ error: 'Cannot ban an admin' });
        }

        await user.update({ status: 'banned' });
        res.json({ message: 'User banned successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to ban user' });
    }
};

export const promoteToAdmin = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const user = await User.findByPk(id);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        await user.update({ role: 'admin' });
        res.json({ message: 'User promoted to admin successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to promote user' });
    }
};

export const demoteFromAdmin = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const user = await User.findByPk(id);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Check if this is the last admin
        const adminCount = await User.count({ where: { role: 'admin' } });
        if (adminCount <= 1) {
            return res.status(400).json({ error: 'Cannot demote the last admin' });
        }

        await user.update({ role: 'user' });
        res.json({ message: 'User demoted from admin successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to demote user' });
    }
};

export const resetUserPassword = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const user = await User.findByPk(id);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Generate temporary password
        const tempPassword = Math.random().toString(36).slice(-8);
        const hashedPassword = await bcrypt.hash(tempPassword, 10);

        await user.update({ password: hashedPassword });

        res.json({
            message: 'Password reset successfully',
            temporaryPassword: tempPassword
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to reset password' });
    }
};

export const deleteUser = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const user = await User.findByPk(id);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (user.role === 'admin') {
            const adminCount = await User.count({ where: { role: 'admin' } });
            if (adminCount <= 1) {
                return res.status(400).json({ error: 'Cannot delete the last admin' });
            }
        }

        await User.destroy({ where: { id } });
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete user' });
    }
};

export const getAllGroups = async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const search = req.query.search as string || '';
        const offset = (page - 1) * limit;

        const whereClause = search ? {
            name: { [Op.like]: `%${search}%` }
        } : {};

        const { count, rows: groups } = await Group.findAndCountAll({
            where: whereClause,
            order: [['createdAt', 'DESC']],
            limit,
            offset,
            include: [
                { model: User, as: 'users', attributes: ['id', 'name', 'email'] }
            ]
        });

        res.json({
            data: groups,
            pagination: {
                page,
                limit,
                total: count,
                totalPages: Math.ceil(count / limit)
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch groups' });
    }
};

export const deleteGroup = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await Group.destroy({ where: { id } });
        res.json({ message: 'Group deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete group' });
    }
};

export const getAllExpenses = async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const search = req.query.search as string || '';
        const offset = (page - 1) * limit;

        const whereClause = search ? {
            description: { [Op.like]: `%${search}%` }
        } : {};

        const { count, rows: expenses } = await Expense.findAndCountAll({
            where: whereClause,
            order: [['createdAt', 'DESC']],
            limit,
            offset,
            include: [
                { model: User, as: 'payer', attributes: ['name', 'email'] },
                { model: Group, attributes: ['name'] }
            ]
        });

        res.json({
            data: expenses,
            pagination: {
                page,
                limit,
                total: count,
                totalPages: Math.ceil(count / limit)
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch expenses' });
    }
};

export const deleteExpense = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await ExpenseSplit.destroy({ where: { expenseId: id } });
        await Expense.destroy({ where: { id } });
        res.json({ message: 'Expense deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete expense' });
    }
};

import SystemSetting from '../models/systemSetting';

export const getSystemSettings = async (req: Request, res: Response) => {
    try {
        const settings = await SystemSetting.findAll();
        const settingsMap = settings.reduce((acc: any, setting: any) => {
            acc[setting.key] = setting.value;
            return acc;
        }, {});
        res.json(settingsMap);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
};

export const updateSystemSettings = async (req: Request, res: Response) => {
    try {
        const settings = req.body;

        for (const [key, value] of Object.entries(settings)) {
            await SystemSetting.upsert({
                key,
                value: String(value)
            });
        }

        res.json({ message: 'Settings updated successfully' });
    } catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
};

// ============ PHASE 4: Financial Oversight ============

export const getAllPayments = async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const offset = (page - 1) * limit;

        const { count, rows: payments } = await Payment.findAndCountAll({
            order: [['createdAt', 'DESC']],
            limit,
            offset,
            include: [
                { model: User, as: 'payer', attributes: ['id', 'name', 'email'] },
                { model: User, as: 'payee', attributes: ['id', 'name', 'email'] },
                { model: Group, attributes: ['id', 'name'] }
            ]
        });

        // Calculate total payment volume
        const totalVolume = await Payment.sum('amount') || 0;

        res.json({
            data: payments,
            pagination: {
                page,
                limit,
                total: count,
                totalPages: Math.ceil(count / limit)
            },
            summary: {
                totalVolume,
                totalPayments: count
            }
        });
    } catch (error) {
        console.error('Error fetching payments:', error);
        res.status(500).json({ error: 'Failed to fetch payments' });
    }
};

export const getOutstandingBalances = async (req: Request, res: Response) => {
    try {
        // Simplified balance calculation
        const users = await User.findAll({
            attributes: ['id', 'name', 'email']
        });

        const balances = await Promise.all(users.map(async (user: any) => {
            // Get expenses paid by user
            const paidExpenses = await Expense.findAll({
                where: { paidBy: user.id },
                include: [{ model: ExpenseSplit, attributes: ['userId', 'amount'] }]
            });

            // Total owed TO user from splits
            let owedToUser = 0;
            paidExpenses.forEach((expense: any) => {
                expense.ExpenseSplits?.forEach((split: any) => {
                    if (split.userId !== user.id) {
                        owedToUser += parseFloat(split.amount) || 0;
                    }
                });
            });

            // Get splits where user owes money
            const userSplits = await ExpenseSplit.findAll({
                where: { userId: user.id },
                include: [{ model: Expense, attributes: ['paidBy'] }]
            });

            let userOwes = 0;
            userSplits.forEach((split: any) => {
                if (split.Expense?.paidBy !== user.id) {
                    userOwes += parseFloat(split.amount) || 0;
                }
            });

            // Payments
            const paymentsReceived = await Payment.sum('amount', { where: { payeeId: user.id } }) || 0;
            const paymentsMade = await Payment.sum('amount', { where: { payerId: user.id } }) || 0;

            const netBalance = (owedToUser - paymentsReceived) - (userOwes - paymentsMade);

            return {
                user: { id: user.id, name: user.name, email: user.email },
                owedToUser,
                userOwes,
                paymentsReceived,
                paymentsMade,
                netBalance
            };
        }));

        const activeBalances = balances.filter(b => Math.abs(b.netBalance) > 0.01);

        res.json({
            balances: activeBalances,
            summary: {
                totalUsers: users.length,
                usersWithBalance: activeBalances.length
            }
        });
    } catch (error) {
        console.error('Error calculating balances:', error);
        res.status(500).json({ error: 'Failed to calculate balances' });
    }
};

// ============ PHASE 6: Notification Control ============

export const sendGlobalNotification = async (req: Request, res: Response) => {
    try {
        const { title, message, type = 'ANNOUNCEMENT' } = req.body;

        if (!title || !message) {
            return res.status(400).json({ error: 'Title and message are required' });
        }

        // Get all active users
        const users = await User.findAll({
            where: {
                status: { [Op.or]: ['active', null] }
            },
            attributes: ['id']
        });

        // Create notifications for all users
        const notifications = await Promise.all(users.map((user: any) =>
            NotificationModel.create({
                userId: user.id,
                type,
                title,
                message,
                data: JSON.stringify({ global: true, sentAt: new Date().toISOString() })
            })
        ));

        res.json({
            message: 'Global notification sent successfully',
            recipientCount: notifications.length
        });
    } catch (error) {
        console.error('Error sending notification:', error);
        res.status(500).json({ error: 'Failed to send notification' });
    }
};

export const getNotificationStats = async (req: Request, res: Response) => {
    try {
        const totalNotifications = await NotificationModel.count();
        const unreadNotifications = await NotificationModel.count({ where: { read: false } });
        const last24Hours = await NotificationModel.count({
            where: {
                createdAt: { [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) }
            }
        });

        res.json({
            total: totalNotifications,
            unread: unreadNotifications,
            last24Hours
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch notification stats' });
    }
};

// ============ PHASE 7: Security Monitoring ============

export const getRecentLogins = async (req: Request, res: Response) => {
    try {
        const limit = parseInt(req.query.limit as string) || 50;

        // Get users with recent login activity (lastLoginAt)
        const recentLogins = await User.findAll({
            where: {
                lastLoginAt: { [Op.ne]: null }
            },
            attributes: ['id', 'name', 'email', 'role', 'lastLoginAt'],
            order: [['lastLoginAt', 'DESC']],
            limit
        });

        res.json(recentLogins);
    } catch (error) {
        console.error('Error fetching recent logins:', error);
        res.status(500).json({ error: 'Failed to fetch recent logins' });
    }
};

export const getSecurityOverview = async (req: Request, res: Response) => {
    try {
        const totalUsers = await User.count();
        const adminCount = await User.count({ where: { role: 'admin' } });
        const suspendedCount = await User.count({ where: { status: 'suspended' } });
        const bannedCount = await User.count({ where: { status: 'banned' } });

        // Active in last 24 hours
        const activeToday = await User.count({
            where: {
                lastLoginAt: { [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) }
            }
        });

        // Active in last 7 days
        const activeWeek = await User.count({
            where: {
                lastLoginAt: { [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
            }
        });

        res.json({
            totalUsers,
            adminCount,
            suspendedCount,
            bannedCount,
            activeToday,
            activeWeek,
            inactiveUsers: totalUsers - activeWeek
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch security overview' });
    }
};

// ============ PHASE 5: OCR Management ============

export const getOCRStats = async (req: Request, res: Response) => {
    try {
        const totalWithReceipt = await Expense.count({
            where: { receipt: { [Op.ne]: null } }
        });

        const completed = await Expense.count({
            where: { scanStatus: 'COMPLETED' }
        });

        const failed = await Expense.count({
            where: { scanStatus: 'FAILED' }
        });

        const processing = await Expense.count({
            where: { scanStatus: 'PROCESSING' }
        });

        const pending = await Expense.count({
            where: {
                receipt: { [Op.ne]: null },
                scanStatus: null
            }
        });

        res.json({
            totalWithReceipt,
            completed,
            failed,
            processing,
            pending,
            successRate: totalWithReceipt > 0
                ? ((completed / totalWithReceipt) * 100).toFixed(1) + '%'
                : '0%'
        });
    } catch (error) {
        console.error('Error fetching OCR stats:', error);
        res.status(500).json({ error: 'Failed to fetch OCR stats' });
    }
};

export const getFailedScans = async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const offset = (page - 1) * limit;

        const { count, rows: failedScans } = await Expense.findAndCountAll({
            where: { scanStatus: 'FAILED' },
            order: [['createdAt', 'DESC']],
            limit,
            offset,
            include: [
                { model: User, as: 'payer', attributes: ['id', 'name', 'email'] }
            ],
            attributes: ['id', 'description', 'amount', 'receipt', 'createdAt', 'scanStatus']
        });

        res.json({
            data: failedScans,
            pagination: {
                page,
                limit,
                total: count,
                totalPages: Math.ceil(count / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching failed scans:', error);
        res.status(500).json({ error: 'Failed to fetch failed scans' });
    }
};

export const retryOCR = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const expense = await Expense.findByPk(id);
        if (!expense) {
            return res.status(404).json({ error: 'Expense not found' });
        }

        if (!expense.receipt) {
            return res.status(400).json({ error: 'Expense has no receipt to scan' });
        }

        // Reset status to trigger rescan
        await expense.update({ scanStatus: null });

        res.json({
            message: 'OCR retry queued',
            expenseId: id
        });
    } catch (error) {
        console.error('Error retrying OCR:', error);
        res.status(500).json({ error: 'Failed to retry OCR' });
    }
};

// ============ USER INSIGHTS FOR AD TARGETING ============

export const getUserInsights = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;

        // Get user's expenses
        const expenses = await Expense.findAll({
            where: { paidBy: userId },
            attributes: ['id', 'category', 'amount', 'date', 'createdAt'],
            order: [['date', 'DESC']]
        });

        // Category breakdown
        const categoryStats: { [key: string]: { count: number; total: number } } = {};
        expenses.forEach((exp: any) => {
            const cat = exp.category || 'uncategorized';
            if (!categoryStats[cat]) {
                categoryStats[cat] = { count: 0, total: 0 };
            }
            categoryStats[cat].count++;
            categoryStats[cat].total += parseFloat(exp.amount) || 0;
        });

        const topCategories = Object.entries(categoryStats)
            .map(([category, stats]) => ({ category, ...stats }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 5);

        // Get purchase items for this user
        const PurchaseItem = sequelize.models.PurchaseItem;
        let topItems: any[] = [];
        if (PurchaseItem) {
            const items = await PurchaseItem.findAll({
                include: [{
                    model: Expense,
                    where: { paidBy: userId },
                    attributes: []
                }],
                attributes: ['name', 'price']
            });

            const itemStats: { [key: string]: { count: number; avgPrice: number; totalSpent: number } } = {};
            items.forEach((item: any) => {
                const name = item.name?.toLowerCase().trim() || 'unknown';
                if (!itemStats[name]) {
                    itemStats[name] = { count: 0, avgPrice: 0, totalSpent: 0 };
                }
                itemStats[name].count++;
                itemStats[name].totalSpent += parseFloat(item.price) || 0;
            });

            topItems = Object.entries(itemStats)
                .map(([name, stats]) => ({
                    name,
                    count: stats.count,
                    avgPrice: stats.totalSpent / stats.count,
                    totalSpent: stats.totalSpent
                }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 10);
        }

        // Calculate spending tier
        const totalSpent = expenses.reduce((sum: number, exp: any) => sum + (parseFloat(exp.amount) || 0), 0);
        const avgMonthlySpend = totalSpent / Math.max(1, Math.ceil((Date.now() - new Date(expenses[expenses.length - 1]?.createdAt || Date.now()).getTime()) / (30 * 24 * 60 * 60 * 1000)));

        let spendingTier: 'high' | 'medium' | 'budget' = 'budget';
        if (avgMonthlySpend > 500) spendingTier = 'high';
        else if (avgMonthlySpend > 100) spendingTier = 'medium';

        // Time patterns
        const dayStats: { [key: number]: number } = {};
        expenses.forEach((exp: any) => {
            const day = new Date(exp.date).getDay();
            dayStats[day] = (dayStats[day] || 0) + 1;
        });
        const peakDays = Object.entries(dayStats)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 2)
            .map(([day]) => ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][parseInt(day)]);

        res.json({
            userId,
            totalExpenses: expenses.length,
            totalSpent,
            avgMonthlySpend: avgMonthlySpend.toFixed(2),
            spendingTier,
            topCategories,
            topItems,
            peakDays,
            lastActive: expenses[0]?.createdAt || null
        });
    } catch (error) {
        console.error('Error fetching user insights:', error);
        res.status(500).json({ error: 'Failed to fetch user insights' });
    }
};

export const getGlobalInsights = async (req: Request, res: Response) => {
    try {
        // Overall category breakdown
        const expenses = await Expense.findAll({
            attributes: ['category', 'amount']
        });

        const categoryStats: { [key: string]: { count: number; total: number } } = {};
        let grandTotal = 0;
        expenses.forEach((exp: any) => {
            const cat = exp.category || 'uncategorized';
            if (!categoryStats[cat]) {
                categoryStats[cat] = { count: 0, total: 0 };
            }
            categoryStats[cat].count++;
            const amt = parseFloat(exp.amount) || 0;
            categoryStats[cat].total += amt;
            grandTotal += amt;
        });

        const topCategories = Object.entries(categoryStats)
            .map(([category, stats]) => ({
                category,
                count: stats.count,
                total: stats.total,
                percentage: grandTotal > 0 ? ((stats.total / grandTotal) * 100).toFixed(1) : '0'
            }))
            .sort((a, b) => b.total - a.total);

        // Get top items from all purchase items
        const PurchaseItem = sequelize.models.PurchaseItem;
        let topItems: any[] = [];
        if (PurchaseItem) {
            const items = await PurchaseItem.findAll({
                attributes: ['name', 'price']
            });

            const itemStats: { [key: string]: { count: number; totalSpent: number } } = {};
            items.forEach((item: any) => {
                const name = item.name?.toLowerCase().trim() || 'unknown';
                if (!itemStats[name]) {
                    itemStats[name] = { count: 0, totalSpent: 0 };
                }
                itemStats[name].count++;
                itemStats[name].totalSpent += parseFloat(item.price) || 0;
            });

            topItems = Object.entries(itemStats)
                .map(([name, stats]) => ({ name, ...stats }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 20);
        }

        // User spending tiers
        const users = await User.findAll({ attributes: ['id'] });
        const userSpending = await Promise.all(users.map(async (user: any) => {
            const total = await Expense.sum('amount', { where: { paidBy: user.id } }) || 0;
            return total;
        }));

        const avgSpendPerUser = userSpending.reduce((a, b) => a + b, 0) / Math.max(1, users.length);
        const highSpenders = userSpending.filter(s => s > 500).length;
        const mediumSpenders = userSpending.filter(s => s > 100 && s <= 500).length;
        const budgetUsers = userSpending.filter(s => s <= 100).length;

        res.json({
            totalExpenses: expenses.length,
            grandTotal,
            avgSpendPerUser: avgSpendPerUser.toFixed(2),
            topCategories,
            topItems,
            userSegments: {
                high: highSpenders,
                medium: mediumSpenders,
                budget: budgetUsers
            }
        });
    } catch (error) {
        console.error('Error fetching global insights:', error);
        res.status(500).json({ error: 'Failed to fetch global insights' });
    }
};

// ============ LOCATION-BASED USER ANALYTICS ============

import GroupMember from '../models/groupMember';

// Get users grouped by location (country/city)
export const getUsersByLocation = async (req: Request, res: Response) => {
    try {
        // Get location distribution - include all location fields
        const users = await User.findAll({
            attributes: ['id', 'name', 'email', 'city', 'state', 'country', 'zipCode', 'address', 'latitude', 'longitude', 'createdAt'],
            where: {
                [Op.or]: [
                    { country: { [Op.ne]: null } },
                    { city: { [Op.ne]: null } }
                ]
            },
            order: [['country', 'ASC'], ['city', 'ASC']]
        });

        // Group by country
        const byCountry: Record<string, { count: number; cities: Record<string, number>; users: any[] }> = {};

        users.forEach((user: any) => {
            const country = user.country || 'Unknown';
            const city = user.city || 'Unknown';

            if (!byCountry[country]) {
                byCountry[country] = { count: 0, cities: {}, users: [] };
            }
            byCountry[country].count++;
            byCountry[country].cities[city] = (byCountry[country].cities[city] || 0) + 1;
            byCountry[country].users.push({
                id: user.id,
                name: user.name,
                email: user.email,
                city: user.city,
                state: user.state,
                country: user.country,
                zipCode: user.zipCode,
                address: user.address,
                latitude: user.latitude,
                longitude: user.longitude
            });
        });

        // Get users without location
        const noLocationCount = await User.count({
            where: {
                [Op.and]: [
                    { country: { [Op.eq]: null } },
                    { city: { [Op.eq]: null } }
                ]
            }
        });

        // Summary stats
        const totalWithLocation = users.length;
        const countries = Object.keys(byCountry);

        res.json({
            summary: {
                totalWithLocation,
                noLocationCount,
                countryCount: countries.length
            },
            byCountry,
            countries
        });
    } catch (error) {
        console.error('Error fetching users by location:', error);
        res.status(500).json({ error: 'Failed to fetch users by location' });
    }
};

// Get users grouped by their group memberships
export const getUsersByGroup = async (req: Request, res: Response) => {
    try {
        // Get all groups with member counts
        const groups = await Group.findAll({
            attributes: ['id', 'name', 'createdAt'],
            include: [{
                model: GroupMember,
                as: 'members',
                attributes: ['userId'],
                include: [{
                    model: User,
                    as: 'user',
                    attributes: ['id', 'name', 'email', 'city', 'country']
                }]
            }],
            order: [['createdAt', 'DESC']]
        });

        // Format response
        const groupsWithUsers = groups.map((group: any) => ({
            id: group.id,
            name: group.name,
            memberCount: group.members?.length || 0,
            members: group.members?.map((m: any) => ({
                id: m.user?.id,
                name: m.user?.name,
                email: m.user?.email,
                location: [m.user?.city, m.user?.country].filter(Boolean).join(', ') || null
            })) || []
        }));

        // Get users not in any group
        const allGroupMembers = await GroupMember.findAll({
            attributes: ['userId']
        });
        const memberUserIds = allGroupMembers.map((m: any) => m.userId);

        const usersWithoutGroup = await User.findAll({
            attributes: ['id', 'name', 'email', 'city', 'country'],
            where: {
                id: { [Op.notIn]: memberUserIds.length ? memberUserIds : [''] }
            }
        });

        res.json({
            summary: {
                totalGroups: groups.length,
                usersInGroups: memberUserIds.length,
                usersWithoutGroup: usersWithoutGroup.length
            },
            groups: groupsWithUsers,
            usersWithoutGroup: usersWithoutGroup.map((u: any) => ({
                id: u.id,
                name: u.name,
                email: u.email,
                location: [u.city, u.country].filter(Boolean).join(', ') || null
            }))
        });
    } catch (error) {
        console.error('Error fetching users by group:', error);
        res.status(500).json({ error: 'Failed to fetch users by group' });
    }
};

// Get location statistics summary
export const getLocationStats = async (req: Request, res: Response) => {
    try {
        const totalUsers = await User.count();
        const usersWithLocation = await User.count({
            where: {
                [Op.or]: [
                    { country: { [Op.ne]: null } },
                    { city: { [Op.ne]: null } }
                ]
            }
        });

        // Top countries
        const topCountries = await User.findAll({
            attributes: [
                'country',
                [sequelize.fn('COUNT', sequelize.col('id')), 'count']
            ],
            where: { country: { [Op.ne]: null } },
            group: ['country'],
            order: [[sequelize.literal('count'), 'DESC']],
            limit: 10,
            raw: true
        });

        // Top cities
        const topCities = await User.findAll({
            attributes: [
                'city',
                'country',
                [sequelize.fn('COUNT', sequelize.col('id')), 'count']
            ],
            where: { city: { [Op.ne]: null } },
            group: ['city', 'country'],
            order: [[sequelize.literal('count'), 'DESC']],
            limit: 10,
            raw: true
        });

        res.json({
            totalUsers,
            usersWithLocation,
            usersWithoutLocation: totalUsers - usersWithLocation,
            locationCoverage: totalUsers ? ((usersWithLocation / totalUsers) * 100).toFixed(1) + '%' : '0%',
            topCountries,
            topCities
        });
    } catch (error) {
        console.error('Error fetching location stats:', error);
        res.status(500).json({ error: 'Failed to fetch location stats' });
    }
};

// Get hierarchical location data for ad targeting (Country -> State -> City)
export const getLocationHierarchy = async (req: Request, res: Response) => {
    try {
        // Get all users with location data
        const users = await User.findAll({
            attributes: ['country', 'state', 'city'],
            where: {
                [Op.or]: [
                    { country: { [Op.ne]: null } },
                    { city: { [Op.ne]: null } }
                ]
            },
            raw: true
        });

        // Build hierarchical structure
        const hierarchy: Record<string, {
            userCount: number;
            states: Record<string, {
                userCount: number;
                cities: string[]
            }>
        }> = {};

        users.forEach((user: any) => {
            const country = user.country || 'Unknown';
            const state = user.state || 'Unknown';
            const city = user.city || 'Unknown';

            if (!hierarchy[country]) {
                hierarchy[country] = { userCount: 0, states: {} };
            }
            hierarchy[country].userCount++;

            if (!hierarchy[country].states[state]) {
                hierarchy[country].states[state] = { userCount: 0, cities: [] };
            }
            hierarchy[country].states[state].userCount++;

            if (city !== 'Unknown' && !hierarchy[country].states[state].cities.includes(city)) {
                hierarchy[country].states[state].cities.push(city);
            }
        });

        // Convert to array format for easier frontend consumption
        const countries = Object.entries(hierarchy).map(([name, data]) => ({
            name,
            userCount: data.userCount,
            states: Object.entries(data.states).map(([stateName, stateData]) => ({
                name: stateName,
                userCount: stateData.userCount,
                cities: stateData.cities.sort()
            })).sort((a, b) => b.userCount - a.userCount)
        })).sort((a, b) => b.userCount - a.userCount);

        // Also return flat lists for easy selection
        const allCountries = [...new Set(users.map((u: any) => u.country).filter(Boolean))].sort();
        const allStates = [...new Set(users.map((u: any) => u.state).filter(Boolean))].sort();
        const allCities = [...new Set(users.map((u: any) => u.city).filter(Boolean))].sort();

        res.json({
            hierarchy: countries,
            allCountries,
            allStates,
            allCities,
            totalUsersWithLocation: users.length
        });
    } catch (error) {
        console.error('Error fetching location hierarchy:', error);
        res.status(500).json({ error: 'Failed to fetch location hierarchy' });
    }
};
