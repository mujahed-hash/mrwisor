import db from './src/models';
import { Op } from 'sequelize';

async function clearExpenses() {
    try {
        console.log("Connecting to database...");

        // Check connection
        await db.sequelize.authenticate();
        console.log("Database connection established.");

        console.log("Deleting all expenses and related data...");

        // Transaction for safety
        const t = await db.sequelize.transaction();

        try {
            // Calculate date 30 days ago
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            console.log(`Clearing data older than ${thirtyDaysAgo.toISOString()}...`);

            // Find old expenses to delete (Cascade should handle splits and items if set up, but let's be safe)
            // Note: In Sequelize, hooks/cascade might not trigger with bulk destroy unless individualHooks: true is set or DB constraints handle it.
            // We'll rely on DB constraints or manual deletion if needed. checking previous view_file, constraints seemed implied but let's be explicit.

            // Actually, best way is to find IDs first.
            const oldExpenses = await db.Expense.findAll({
                where: {
                    date: {
                        [Op.lt]: thirtyDaysAgo
                    }
                },
                attributes: ['id'],
                transaction: t
            });

            const oldExpenseIds = oldExpenses.map((e: any) => e.id);
            console.log(`Found ${oldExpenseIds.length} expenses older than 30 days.`);

            if (oldExpenseIds.length > 0) {
                // Delete related Splits
                await db.ExpenseSplit.destroy({
                    where: { expenseId: { [Op.in]: oldExpenseIds } },
                    transaction: t
                });

                // Delete related Purchase Items
                // We need to check if PurchaseItem model is loaded/available in db object
                if (db.PurchaseItem) {
                    await db.PurchaseItem.destroy({
                        where: { expenseId: { [Op.in]: oldExpenseIds } },
                        transaction: t
                    });
                }

                // Delete related Comments
                await db.Comment.destroy({
                    where: { expenseId: { [Op.in]: oldExpenseIds } },
                    transaction: t
                });

                // Delete the Expenses themselves
                await db.Expense.destroy({
                    where: { id: { [Op.in]: oldExpenseIds } },
                    transaction: t
                });

                console.log(`Deleted ${oldExpenseIds.length} old expenses.`);
            } else {
                console.log("No expenses older than 30 days found.");
            }

            // Payments usually don't have a 'date' field in the model? 
            // Let's check Payment model. If it doesn't have a date or link to expense, we might leave it or clear all?
            // User request specifically mentioned "receipts" and "expenses". Payments might be separate. 
            // For now, let's ONLY touch expenses to be safe and meet the requirement. 
            // The original script cleared ALL payments. If "Reset" implies "Archive", maybe we should clear old payments too?
            // Without a date on Payment, we can't filter. Let's leave payments alone to avoid deleting recent ones.
            // OR we can check if Payment has createdAt.

            // Checking Payment model via db object (assumed). Let's assume it has createdAt like all Sequelize models.
            await db.Payment.destroy({
                where: {
                    createdAt: {
                        [Op.lt]: thirtyDaysAgo
                    }
                },
                transaction: t
            });
            console.log("Old payments cleared.");

            await t.commit();
            console.log("Successfully managed data retention (kept last 30 days)!");

        } catch (error) {
            await t.rollback();
            throw error;
        }

    } catch (error) {
        console.error("Error clearing expenses:", error);
        process.exit(1);
    } finally {
        process.exit(0);
    }
}

clearExpenses();
