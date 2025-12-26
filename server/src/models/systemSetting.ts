import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

class SystemSetting extends Model {
    public key!: string;
    public value!: string;
    public description!: string;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

SystemSetting.init({
    key: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false,
        unique: true,
    },
    value: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    description: {
        type: DataTypes.STRING,
        allowNull: true,
    },
}, {
    sequelize,
    tableName: 'system_settings',
});

export default SystemSetting;
