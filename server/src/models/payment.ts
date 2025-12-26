import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

class Payment extends Model {
  public id!: string;
  public payerId!: string;
  public payeeId!: string;
  public amount!: number;
  public currency!: string;
  public date!: string;
  public groupId?: string;
  public notes?: string;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Payment.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  payerId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  payeeId: {
    type: DataTypes.UUID,
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
  date: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  groupId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  sequelize,
  tableName: 'payments',
  paranoid: true,
});

export default Payment;
