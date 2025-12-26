import db from '../src/models';

const dumpDb = async () => {
    try {
        await db.sequelize.sync();

        const users = await db.User.findAll();
        const groups = await db.Group.findAll();
        const groupMembers = await db.GroupMember.findAll();
        const expenses = await db.Expense.findAll();
        const expenseSplits = await db.ExpenseSplit.findAll();
        const payments = await db.Payment.findAll();

        console.log('=== USERS ===');
        console.log(JSON.stringify(users, null, 2));

        console.log('\n=== GROUPS ===');
        console.log(JSON.stringify(groups, null, 2));

        console.log('\n=== GROUP MEMBERS ===');
        console.log(JSON.stringify(groupMembers, null, 2));

        console.log('\n=== EXPENSES ===');
        console.log(JSON.stringify(expenses, null, 2));

        console.log('\n=== EXPENSE SPLITS ===');
        console.log(JSON.stringify(expenseSplits, null, 2));

        console.log('\n=== PAYMENTS ===');
        console.log(JSON.stringify(payments, null, 2));

    } catch (error) {
        console.error('Error dumping DB:', error);
    } finally {
        await db.sequelize.close();
    }
};

dumpDb();
