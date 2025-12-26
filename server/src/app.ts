import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import db from './models';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import groupRoutes from './routes/groupRoutes';
import expenseRoutes from './routes/expenseRoutes';
import paymentRoutes from './routes/paymentRoutes';
import notificationRoutes from './routes/notificationRoutes';
import adminRoutes from './routes/adminRoutes';
import systemRoutes from './routes/systemRoutes';
import adRoutes from './routes/adRoutes';
import uploadRoutes from './routes/uploadRoutes';
import purchaseItemRoutes from './routes/purchaseItemRoutes';
import pushRoutes from './routes/pushRoutes';
import path from 'path';
import { startCleanupJob } from './jobs/cleanupDeletedGroups';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/users', userRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/ads', adRoutes);
app.use('/api/upload', uploadRoutes); // Mount upload routes
app.use('/api/purchases', purchaseItemRoutes);
app.use('/api/push', pushRoutes);

const PORT = 5001;

const startServer = async () => {
  try {
    // Workaround for SQLite foreign key constraints    // Sync database
    // Note: alter: true is disabled to prevent SQLite crash loops on expenses table.
    // If schema changes are needed, careful migration or re-creation is required.
    await db.sequelize.sync({ alter: false });
    console.log('Database synced');

    // Start background jobs
    startCleanupJob();

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
  }
};

startServer();
