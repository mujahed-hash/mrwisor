import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/database';

class DeviceToken extends Model {
    public id!: string;
    public userId!: string;
    public token!: string;
    public platform!: 'ios' | 'android' | 'web';
    public lastUsed!: Date;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

DeviceToken.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        userId: {
            type: DataTypes.UUID,
            allowNull: false,
        },
        token: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        platform: {
            type: DataTypes.ENUM('ios', 'android', 'web'),
            allowNull: false,
            defaultValue: 'web',
        },
        lastUsed: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
    },
    {
        sequelize,
        modelName: 'DeviceToken',
        tableName: 'device_tokens',
        indexes: [
            {
                unique: true,
                fields: ['userId', 'token'], // Prevent duplicate token per user
            },
        ],
    }
);

export default DeviceToken;
