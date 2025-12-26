import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

interface LocationTarget {
    country?: string;
    state?: string;
    city?: string;
}

class Ad extends Model {
    public id!: string;
    public title!: string;
    public content!: string;
    public type!: 'TOP_BANNER' | 'BOTTOM_STICKY' | 'FEED';
    public isActive!: boolean;
    public startDate?: Date;
    public endDate?: Date;
    public targetLocations!: LocationTarget[]; // For location-based targeting

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

Ad.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    mediaUrls: {
        type: DataTypes.TEXT, // stored as JSON string
        allowNull: true,
        defaultValue: '[]',
        get() {
            const rawValue = this.getDataValue('mediaUrls');
            return rawValue ? JSON.parse(rawValue as unknown as string) : [];
        },
        set(value: string[]) {
            this.setDataValue('mediaUrls', JSON.stringify(value));
        }
    },
    type: {
        type: DataTypes.ENUM('TOP_BANNER', 'BOTTOM_STICKY', 'FEED'),
        allowNull: false,
        defaultValue: 'TOP_BANNER',
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
    startDate: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    endDate: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    // Location targeting: empty array = show to everyone
    // Format: [{ country: "USA", state: "NY", city: "NYC" }]
    targetLocations: {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue: '[]',
        get() {
            const rawValue = this.getDataValue('targetLocations');
            return rawValue ? JSON.parse(rawValue as unknown as string) : [];
        },
        set(value: LocationTarget[]) {
            this.setDataValue('targetLocations', JSON.stringify(value || []));
        }
    },
}, {
    sequelize,
    tableName: 'ads',
});

export default Ad;
