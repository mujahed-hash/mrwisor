import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

class Comment extends Model {
    public id!: string;
    public expenseId!: string;
    public userId!: string;
    public content!: string;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

Comment.init({
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
    content: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
}, {
    sequelize,
    tableName: 'comments',
});

export default Comment;
