import db from '../src/models';
import bcrypt from 'bcryptjs';

const verifyPassword = async () => {
    try {
        // Skip sync to avoid schema issues, just read
        const user = await db.User.findOne({ where: { email: 'admin@example.com' } });

        if (!user) {
            console.log('User admin@example.com NOT FOUND');
            return;
        }

        console.log(`Found user: ${user.email}`);
        console.log(`Stored Hash: ${user.password}`);

        const isMatch = await bcrypt.compare('password123', user.password);
        console.log(`Password 'password123' match: ${isMatch}`);

        if (!isMatch) {
            console.log('Attempting to re-hash and save...');
            const newHash = await bcrypt.hash('password123', 10);
            user.password = newHash;
            await user.save();
            console.log('Password reset to password123 with new hash.');

            const verifyAgain = await bcrypt.compare('password123', user.password);
            console.log(`Verification after reset: ${verifyAgain}`);
        }

    } catch (error) {
        console.error('Error verifying password:', error);
    } finally {
        await db.sequelize.close();
    }
};

verifyPassword();
