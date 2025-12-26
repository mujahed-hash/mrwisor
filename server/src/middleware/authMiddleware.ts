import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import db from '../models';

export interface AuthRequest extends Request {
  user?: any;
  userId?: string;
}

// Utility to get a system setting value
export const getSystemSetting = async (key: string): Promise<string | null> => {
  try {
    const setting = await db.SystemSetting.findOne({ where: { key } });
    return setting?.value || null;
  } catch (e) {
    return null;
  }
};

// Check if a feature is enabled (defaults to true if not set)
export const isFeatureEnabled = async (featureKey: string): Promise<boolean> => {
  const value = await getSystemSetting(featureKey);
  return value !== 'false'; // Default to enabled
};

// Middleware to check maintenance mode
export const checkMaintenanceMode = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const maintenanceMode = await getSystemSetting('maintenance_mode');
    if (maintenanceMode === 'true') {
      // Check if user is admin - admins can bypass maintenance
      const userId = req.user?.userId || req.user?.id;
      if (userId) {
        const user = await db.User.findByPk(userId);
        if (user?.role === 'admin') {
          return next();
        }
      }
      return res.status(503).json({
        message: 'System is under maintenance. Please try again later.',
        maintenance: true
      });
    }
    next();
  } catch (error) {
    next(); // On error, allow through
  }
};

// Middleware to check if user is suspended or banned
export const checkUserStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId || req.user?.userId;
    if (userId) {
      const user = await db.User.findByPk(userId);
      if (user?.status === 'suspended') {
        return res.status(403).json({
          message: 'Your account has been suspended. Please contact support.',
          suspended: true
        });
      }
      if (user?.status === 'banned') {
        return res.status(403).json({
          message: 'Your account has been banned.',
          banned: true
        });
      }
    }
    next();
  } catch (error) {
    next();
  }
};

export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  try {
    // Promisify jwt.verify
    const user = await new Promise<any>((resolve, reject) => {
      jwt.verify(token, process.env.JWT_SECRET as string, (err: any, decoded: any) => {
        if (err) reject(err);
        else resolve(decoded);
      });
    });

    req.user = user;
    req.userId = user.userId;

    // Check maintenance mode
    const maintenanceMode = await getSystemSetting('maintenance_mode');
    console.log('[Auth] Maintenance mode check:', maintenanceMode);
    if (maintenanceMode === 'true') {
      const dbUser = await db.User.findByPk(user.userId);
      console.log('[Auth] User role:', dbUser?.role);
      if (dbUser?.role !== 'admin') {
        return res.status(503).json({
          message: 'System is under maintenance. Please try again later.',
          maintenance: true
        });
      }
    }

    // Check if user is suspended/banned
    const dbUser = await db.User.findByPk(user.userId);
    if (dbUser?.status === 'suspended') {
      return res.status(403).json({
        message: 'Your account has been suspended.',
        suspended: true
      });
    }
    if (dbUser?.status === 'banned') {
      return res.status(403).json({
        message: 'Your account has been banned.',
        banned: true
      });
    }

    next();
  } catch (err) {
    console.error('[Auth] Token verification error:', err);
    return res.sendStatus(403);
  }
};

export const isAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const userId = req.user?.userId || req.user?.id;

  if (!req.user || !userId) {
    return res.status(403).json({ message: 'Unauthorized' });
  }

  try {
    const user = await db.User.findByPk(userId);
    if (user && user.role === 'admin') {
      next();
    } else {
      res.status(403).json({ message: 'Require Admin Role' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

