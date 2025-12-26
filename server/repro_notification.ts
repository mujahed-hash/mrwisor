
import db from './src/models';
import { v4 as uuidv4 } from 'uuid';

async function reproduce() {
    try {
        await db.sequelize.authenticate();
        console.log('Connected to DB');

        // Find a user
        const user = await db.User.findOne();
        if (!user) {
            console.log('No user found');
            return;
        }
        console.log('User found:', user.id);

        console.log('Attempting Notification.create...');
        await db.Notification.create({
            userId: user.id,
            type: 'EXPENSE_ADD',
            title: 'Test Notification',
            message: 'This is a test',
            data: JSON.stringify({ foo: 'bar' })
        });

        console.log('Notification created successfully');

    } catch (error) {
        console.error('ERROR REPRODUCING NOTIFICATION ISSUE:', error);
    } finally {
        await db.sequelize.close();
    }
}

reproduce();
