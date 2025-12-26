
import db from './src/models';
import { Op } from 'sequelize';

async function verifyAvgSpend() {
    try {
        // 1. Define the 30-day window
        const now = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(now.getDate() - 30);

        console.log(`Checking expenses between ${thirtyDaysAgo.toISOString()} and ${now.toISOString()}`);

        // 2. Fetch personal expenses (groupId is null)
        const expenses = await db.Expense.findAll({
            where: {
                groupId: null, // Personal expenses only
                date: {
                    [Op.gte]: thirtyDaysAgo, // >= 30 days ago
                }
            }
        });

        console.log(`Found ${expenses.length} personal expenses in the last 30 days.`);

        // 3. Calculate Total Spend
        let totalSpend = 0;
        expenses.forEach((e: any) => {
            // Ensure amount is treated as number
            const amt = parseFloat(e.amount);
            console.log(` - Expense: ${e.description}, Amount: ${amt}, Date: ${e.date}`);
            totalSpend += amt;
        });

        // 4. Calculate Average
        const avgDailySpend = totalSpend / 30;

        console.log('--------------------------------------------------');
        console.log(`Total Spend (Last 30 Days): $${totalSpend.toFixed(2)}`);
        console.log(`Avg Daily Spend (Total / 30): $${avgDailySpend.toFixed(2)}`);
        console.log('--------------------------------------------------');

    } catch (error) {
        console.error("Error verifying spend:", error);
    } finally {
        await db.sequelize.close(); // Close DB connection
    }
}

verifyAvgSpend();
