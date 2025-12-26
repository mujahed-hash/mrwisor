
import sequelize from './src/config/database';

const fixSchema = async () => {
    try {
        await sequelize.authenticate();
        console.log("Database connected.");
        try {
            await sequelize.query("ALTER TABLE users ADD COLUMN phoneNumber VARCHAR(255)");
            console.log("Added phoneNumber column to users table");
        } catch (e: any) {
            console.log("Column phoneNumber might already exist or error:", e.message);
        }
    } catch (error) {
        console.error('Error fixing schema:', error);
    } finally {
        await sequelize.close();
    }
};

fixSchema();
