
import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

class PurchaseItem extends Model {
    public id!: string;
    public expenseId!: string;
    public name!: string;
    public price!: number;
    public quantity!: number;
    public category?: string;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

PurchaseItem.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    expenseId: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    price: {
        type: DataTypes.FLOAT,
        allowNull: false,
    },
    quantity: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
        allowNull: false,
    },
    category: {
        type: DataTypes.STRING,
        allowNull: true,
    },
}, {
    sequelize,
    tableName: 'purchase_items',
});

export default PurchaseItem;
