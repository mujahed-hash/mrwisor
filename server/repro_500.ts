import db from './src/models';

async function testQuery() {
    try {
        const expenses = await db.Expense.findAll({
            limit: 1,
            include: [
                {
                    model: db.ExpenseSplit,
                    as: 'ExpenseSplits', // This is what getExpenses uses
                    required: false,
                },
            ]
        });
        console.log('getExpenses query success');

        // Test getExpenseById query
        if (expenses.length > 0) {
            const id = expenses[0].id;
            await db.Expense.findByPk(id, {
                include: [
                    { model: db.User, as: 'payer', attributes: ['id', 'name', 'email'] },
                    { model: db.ExpenseSplit, as: 'ExpenseSplits', include: [{ model: db.User, as: 'user', attributes: ['id', 'name', 'email'] }] },
                    { model: db.Comment, as: 'comments', include: [{ model: db.User, as: 'user', attributes: ['id', 'name', 'email'] }] }
                ],
            });
            console.log('getExpenseById query success');
        }

    } catch (error) {
        console.error('Sequelize Error:', error);
    }
}

testQuery();
