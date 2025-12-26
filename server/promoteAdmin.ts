import User from './src/models/user';
import sequelize from './src/config/database';

const createAdmin = async () => {
    try {
        await sequelize.authenticate();
        await sequelize.query('DROP TABLE IF EXISTS users_backup');
        try {
            await sequelize.query("ALTER TABLE users ADD COLUMN role VARCHAR(255) DEFAULT 'user'");
            console.log("Added role column to users table");
        } catch (e: any) {
            if (!e.message.includes('duplicate column name')) {
                console.log("Column role might already exist or other error:", e.message);
            }
        }
        // find first user or create one
        let user = await User.findOne();
        if (!user) {
            console.log('No users found. Please register a user first via the main app or seed the db.');
            return;
        }

        user.role = 'admin';
        await user.save();
        console.log(`User ${user.email} promoted to admin.`);
    } catch (error) {
        console.error('Error creating admin:', error);
    } finally {
        await sequelize.close();
    }
};

createAdmin();
