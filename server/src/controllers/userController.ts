import { Request, Response } from 'express';
import { Op } from 'sequelize';
import db from '../models';

const User = db.User;

interface AuthRequest extends Request {
  userId?: string;
}

// Get current authenticated user
export const getCurrentUser = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const user = await User.findByPk(userId, {
      attributes: { exclude: ['password', 'otp', 'otpExpires'] },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching user' });
  }
};

export const getUser = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.params.id;
    const user = await User.findByPk(userId, {
      attributes: { exclude: ['password'] }, // Exclude password from the result
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching user' });
  }
};

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password'] }, // Exclude password from the result
    });
    res.status(200).json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching users' });
  }
};

export const searchUsers = async (req: Request, res: Response) => {
  try {
    const { q } = req.query;

    if (!q || typeof q !== 'string') {
      return res.status(400).json({ message: 'Search query is required' });
    }

    const query = q.trim();

    // Don't search for very short strings to avoid too many results
    if (query.length < 2) {
      return res.status(200).json([]);
    }

    const users = await User.findAll({
      where: {
        [Op.or]: [
          { name: { [Op.like]: `%${query}%` } },
          { email: { [Op.like]: `%${query}%` } },
          { customId: { [Op.like]: `%${query}%` } }
        ]
      },
      attributes: { exclude: ['password'] },
      limit: 10 // Limit results
    });

    res.status(200).json(users);
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ message: 'Error searching users' });
  }
};


export const updateUser = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.params.id;
    const requestingUserId = req.userId;
    const { customId, password, name } = req.body;

    // Security check: Only allow users to update their own profile
    if (userId !== requestingUserId) {
      // Find if requester is admin
      const requester = await User.findByPk(requestingUserId);
      if (requester?.role !== 'admin') {
        return res.status(403).json({ message: 'Unauthorized to update this profile' });
      }
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (customId) {
      // Check uniqueness if changed
      if (customId !== user.customId) {
        const existing = await User.findOne({ where: { customId } });
        if (existing) {
          return res.status(400).json({ message: 'Custom ID already taken' });
        }
        user.customId = customId;
      }
    }

    if (name) {
      user.name = name;
    }

    if (password) {
      const bcrypt = require('bcryptjs'); // Lazy load or move to top if preferred
      user.password = await bcrypt.hash(password, 10);
    }

    await user.save();

    const updatedUser = user.toJSON();
    delete updatedUser.password;

    res.status(200).json(updatedUser);

  } catch (error) {
    console.error('Error updating profile:', error);

    res.status(500).json({ message: 'Error updating profile' });
  }
};

export const checkCustomId = async (req: AuthRequest, res: Response) => {
  try {
    const { customId } = req.query;
    const currentUserId = req.userId; // Get authenticated user ID

    if (!customId || typeof customId !== 'string') {
      return res.status(400).json({ message: 'Custom ID is required' });
    }

    // Check if any user acts as owner of this customId, EXCLUDING the current user
    const user = await User.findOne({
      where: {
        customId,
        id: { [Op.ne]: currentUserId } // Exclude current user
      }
    });

    if (user) {
      return res.status(200).json({ available: false });
    }
    return res.status(200).json({ available: true });
  } catch (error) {
    console.error('Error checking custom ID:', error);
    res.status(500).json({ message: 'Error checking custom ID' });
  }
};

// Update user location (for mobile GPS)
export const updateLocation = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { latitude, longitude, city, country, state, zipCode, address } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update location fields
    if (latitude !== undefined) user.latitude = latitude;
    if (longitude !== undefined) user.longitude = longitude;
    if (city !== undefined) user.city = city;
    if (country !== undefined) user.country = country;
    if (state !== undefined) user.state = state;
    if (zipCode !== undefined) user.zipCode = zipCode;
    if (address !== undefined) user.address = address;

    await user.save();

    res.status(200).json({
      message: 'Location updated',
      location: {
        city: user.city,
        country: user.country,
        state: user.state,
        zipCode: user.zipCode,
        address: user.address,
        latitude: user.latitude,
        longitude: user.longitude
      }
    });
  } catch (error) {
    console.error('Error updating location:', error);
    res.status(500).json({ message: 'Error updating location' });
  }
};
