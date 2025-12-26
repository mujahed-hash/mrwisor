import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

class Notification extends Model {
    public id!: string;
    public userId!: string;
    public type!: string;
    public title!: string;
    public message!: string;
    public read!: boolean;
    public data?: string; // JSON string

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

Notification.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    type: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    message: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    read: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    data: {
        type: DataTypes.TEXT, // Store JSON as string
        allowNull: true,
    },
}, {
    sequelize,
    tableName: 'notifications',
});

export default Notification;
