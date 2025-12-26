import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

class ExpenseSplit extends Model {
  public id!: string;
  public expenseId!: string;
  public userId!: string;
  public amount!: number;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

ExpenseSplit.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  expenseId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  amount: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
}, {
  sequelize,
  tableName: 'expense_splits',
  paranoid: true,
});

export default ExpenseSplit;
