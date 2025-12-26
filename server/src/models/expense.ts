import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

class Expense extends Model {
  public id!: string;
  public description!: string;
  public amount!: number;
  public currency!: string;
  public paidBy!: string;
  public groupId?: string;
  public category?: string;
  public date!: string;
  public receipt?: string;
  public notes?: string;
  public splitType!: 'EQUAL' | 'PERCENTAGE' | 'SHARES' | 'EXACT' | 'ADJUSTMENT';
  public scanStatus?: string;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Expense.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  description: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  amount: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  currency: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'USD',
  },
  paidBy: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  groupId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  category: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  date: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  receipt: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  splitType: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  scanStatus: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: null,
  },
}, {
  sequelize,
  tableName: 'expenses',
  paranoid: true,
});

export default Expense;
