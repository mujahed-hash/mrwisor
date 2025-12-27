import bcrypt from 'bcryptjs';
import db from './models';

const createAdminUser = async () => {
    try {
        // Check if admin already exists
        const existingAdmin = await db.User.findOne({ where: { email: 'admin@wiselyspent.com' } });

        if (existingAdmin) {
            console.log('✅ Admin user already exists');
            return;
        }

        // Create admin user
        const hashedPassword = await bcrypt.hash('Admin@123', 10);

        const admin = await db.User.create({
            name: 'Admin',
            email: 'admin@wiselyspent.com',
            password: hashedPassword,
            role: 'admin',
            customId: 'ADMIN001',
            isVerified: true  // Admin accounts don't need OTP verification
        });

        console.log('✅ Admin user created successfully');
        console.log('📧 Email: admin@wiselyspent.com');
        console.log('🔑 Password: Admin@123');
        console.log('⚠️  Please change this password after first login!');

    } catch (error) {
        console.error('❌ Error creating admin user:', error);
        throw error;
    }
};

// Run if called directly
if (require.main === module) {
    createAdminUser()
        .then(() => {
            console.log('Seed completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Seed failed:', error);
            process.exit(1);
        });
}

export default createAdminUser;
