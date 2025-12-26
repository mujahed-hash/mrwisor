import express from 'express';
import {
    adminLogin,
    getAllUsers,
    getUserDetails,
    deleteUser,
    suspendUser,
    unsuspendUser,
    banUser,
    promoteToAdmin,
    demoteFromAdmin,
    resetUserPassword,
    getSystemStats,
    getAllGroups,
    deleteGroup,
    getAllExpenses,
    deleteExpense,
    getSystemSettings,
    updateSystemSettings,
    // Phase 4: Financial
    getAllPayments,
    getOutstandingBalances,
    // Phase 5: OCR Management
    getOCRStats,
    getFailedScans,
    retryOCR,
    // Phase 6: Notifications
    sendGlobalNotification,
    getNotificationStats,
    // Phase 7: Security
    getRecentLogins,
    getSecurityOverview,
    // User Insights
    getUserInsights,
    getGlobalInsights,
    // Location Analytics
    getUsersByLocation,
    getUsersByGroup,
    getLocationStats,
    getLocationHierarchy
} from '../controllers/adminController';
import jwt from 'jsonwebtoken';


const router = express.Router();

// Middleware to verify Admin
const verifyAdmin = (req: any, res: any, next: any) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Access denied' });

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET || 'secret') as any;
        if (verified.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        req.user = verified;
        next();
    } catch (err) {
        res.status(400).json({ error: 'Invalid token' });
    }
};

// Public Admin Route
router.post('/login', adminLogin);

// Protected Admin Routes
router.use(verifyAdmin);

// Dashboard
router.get('/stats', getSystemStats);

// User Management - SPECIFIC routes BEFORE parameterized routes
router.get('/users/by-location', getUsersByLocation);
router.get('/users/by-group', getUsersByGroup);
router.get('/users', getAllUsers);
router.get('/users/:id', getUserDetails);
router.delete('/users/:id', deleteUser);
router.put('/users/:id/suspend', suspendUser);
router.put('/users/:id/unsuspend', unsuspendUser);
router.put('/users/:id/ban', banUser);
router.put('/users/:id/promote', promoteToAdmin);
router.put('/users/:id/demote', demoteFromAdmin);
router.post('/users/:id/reset-password', resetUserPassword);

// Group Management
router.get('/groups', getAllGroups);
router.delete('/groups/:id', deleteGroup);

// Expense Management
router.get('/expenses', getAllExpenses);
router.delete('/expenses/:id', deleteExpense);

// System Settings
router.get('/settings', getSystemSettings);
router.put('/settings', updateSystemSettings);

// Phase 4: Financial Oversight
router.get('/payments', getAllPayments);
router.get('/balances', getOutstandingBalances);

// Phase 5: OCR Management
router.get('/ocr/stats', getOCRStats);
router.get('/ocr/failed', getFailedScans);
router.post('/ocr/:id/retry', retryOCR);

// Phase 6: Notification Control
router.post('/notifications/broadcast', sendGlobalNotification);
router.get('/notifications/stats', getNotificationStats);

// Phase 7: Security Monitoring
router.get('/security/logins', getRecentLogins);
router.get('/security/overview', getSecurityOverview);

// User Insights for Ad Targeting
router.get('/insights/user/:userId', getUserInsights);
router.get('/insights/global', getGlobalInsights);

// Location Analytics
router.get('/location/stats', getLocationStats);
router.get('/location/hierarchy', getLocationHierarchy);

export default router;
