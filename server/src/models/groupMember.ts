import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

class GroupMember extends Model {
  public id!: string;
  public userId!: string;
  public groupId!: string;
  public role!: 'admin' | 'member';

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

GroupMember.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  groupId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  role: {
    type: DataTypes.ENUM('admin', 'member'),
    defaultValue: 'member',
  },
}, {
  sequelize,
  tableName: 'group_members',
});

export default GroupMember;
