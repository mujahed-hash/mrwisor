import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

class User extends Model {
  public id!: string;
  public name!: string;
  public email!: string;
  public role!: string;
  public status!: 'active' | 'suspended' | 'banned';
  public customId!: string;
  public password!: string;
  public phoneNumber!: string;
  public otp?: string | null;
  public otpExpires?: Date | null;
  public isVerified!: boolean;
  public lastLoginAt?: Date | null;
  // Location fields
  public city?: string | null;
  public country?: string | null;
  public state?: string | null;
  public zipCode?: string | null;
  public address?: string | null;
  public latitude?: number | null;
  public longitude?: number | null;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

User.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  role: {
    type: DataTypes.STRING,
    defaultValue: 'user',
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('active', 'suspended', 'banned'),
    defaultValue: 'active',
    allowNull: false,
  },
  customId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    defaultValue: () => Math.random().toString(36).substring(2, 10),
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  phoneNumber: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  otp: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  otpExpires: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  isVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
  },
  lastLoginAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  // Location fields for ad targeting
  city: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  country: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  state: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  zipCode: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  address: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  latitude: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  longitude: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
}, {
  sequelize,
  tableName: 'users',
  hooks: {
    beforeCreate: async (user: User) => {
      if (!user.customId) {
        user.customId = Math.random().toString(36).substring(2, 10);
      }
    }
  }
});

export default User;
