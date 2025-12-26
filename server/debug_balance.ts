import db from './src/models';

async function debugBalances() {
    try {
        const users = await db.User.findAll();
        const expenses = await db.Expense.findAll({
            include: [{ model: db.ExpenseSplit, as: 'ExpenseSplits' }]
        });
        const payments = await db.Payment.findAll();

        console.log('--- USERS ---');
        users.forEach((u: any) => console.log(`${u.id}: ${u.name}`));

        console.log('\n--- EXPENSES ---');
        expenses.forEach((e: any) => {
            console.log(`Expense ${e.id}: ${e.description}, Amount: ${e.amount}, PaidBy: ${e.paidBy}`);
            if (e.ExpenseSplits) {
                e.ExpenseSplits.forEach((s: any) => {
                    console.log(`  Split: User ${s.userId} owes ${s.amount}`);
                });
            }
        });

        console.log('\n--- PAYMENTS ---');
        payments.forEach((p: any) => {
            console.log(`Payment ${p.id}: ${p.payerId} paid ${p.payeeId} amount ${p.amount}`);
        });

    } catch (error) {
        console.error('Error:', error);
    }
}

debugBalances();
