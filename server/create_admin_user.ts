
import User from './src/models/user';
import sequelize from './src/config/database';
import bcrypt from 'bcryptjs';

const createAdmin = async () => {
    try {
        await sequelize.authenticate();
        console.log("Database connected.");

        // Define admin credentials
        const email = 'admin@spendsplit.com';
        const password = 'admin123';
        const hashedPassword = await bcrypt.hash(password, 10);
        const name = 'System Admin';

        let user = await User.findOne({ where: { email } });

        if (user) {
            console.log(`Admin user ${email} found. Updating password and role...`);
            user.password = hashedPassword;
            user.role = 'admin';
            user.name = name; // Ensure name is set
            await user.save();
        } else {
            console.log(`Admin user ${email} not found. Creating...`);
            user = await User.create({
                name,
                email,
                password: hashedPassword,
                role: 'admin',
                customId: 'admin' // explicitly set a nice customId
            });
        }

        console.log('---------------------------------------------------');
        console.log('Admin User Ready:');
        console.log(`Email: ${email}`);
        console.log(`Password: ${password}`);
        console.log('---------------------------------------------------');

    } catch (error) {
        console.error('Error creating admin:', error);
    } finally {
        // Need to close connection to exit script cleanly
        await sequelize.close();
    }
};

createAdmin();
