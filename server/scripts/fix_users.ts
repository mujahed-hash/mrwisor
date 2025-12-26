import db from '../src/models';
import bcrypt from 'bcryptjs';

const fixUsers = async () => {
    try {
        // await db.sequelize.sync({ alter: true }); // Skip sync as column exists

        const users = await db.User.findAll();
        console.log(`Found ${users.length} users.`);

        for (const user of users) {
            let changed = false;

            // Fix Custom ID
            if (!user.customId) {
                user.customId = Math.random().toString(36).substring(2, 10);
                console.log(`Generated customId for ${user.email}: ${user.customId}`);
                changed = true;
            }

            // Reset Admin Password
            if (user.email === 'admin@example.com') {
                const hashedPassword = await bcrypt.hash('password123', 10);
                user.password = hashedPassword;
                console.log(`Reset password for admin@example.com to 'password123'`);
                changed = true;
            }

            if (changed) {
                await user.save();
            }
        }

        // Add Unique Index manually if it doesn't exist
        try {
            await db.sequelize.query('CREATE UNIQUE INDEX IF NOT EXISTS users_customId ON users(customId)');
            console.log('Unique index on customId created/verified.');
        } catch (err) {
            console.error('Error creating index:', err);
        }

        console.log('User fix complete.');
    } catch (error) {
        console.error('Error fixing users:', error);
    } finally {
        await db.sequelize.close();
    }
};

fixUsers();
