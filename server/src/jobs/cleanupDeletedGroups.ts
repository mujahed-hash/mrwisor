import cron from 'node-cron';
import { Op } from 'sequelize';
import db from '../models';

const { Group, Expense, ExpenseSplit, Comment, PurchaseItem, GroupMember, Payment, Notification } = db;

/**
 * Cleanup job to permanently delete groups that have been soft-deleted for more than 4 days.
 * Run daily at midnight.
 */
export const startCleanupJob = () => {
    // Run every day at midnight (0 0 * * *)
    cron.schedule('0 0 * * *', async () => {
        console.log('[Cleanup Job] Starting cleanup of deleted groups...');

        try {
            // Calculate cutoff date (4 days ago)
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - 4);

            // Find groups to delete
            const groupsToDelete = await Group.findAll({
                where: {
                    isDeleted: true,
                    deletedAt: {
                        [Op.lt]: cutoffDate
                    }
                }
            });

            if (groupsToDelete.length === 0) {
                console.log('[Cleanup Job] No groups found to cleanup.');
                return;
            }

            console.log(`[Cleanup Job] Found ${groupsToDelete.length} groups to delete permanently.`);

            let deletedCount = 0;

            for (const group of groupsToDelete) {
                try {
                    console.log(`[Cleanup Job] Permanently deleting group: ${group.name} (${group.id})`);

                    // 1. Find all expenses
                    const expenses = await Expense.findAll({ where: { groupId: group.id } });
                    const expenseIds = expenses.map((e: any) => e.id);

                    if (expenseIds.length > 0) {
                        // 2. Delete related records for these expenses
                        await ExpenseSplit.destroy({ where: { expenseId: expenseIds } });
                        await Comment.destroy({ where: { expenseId: expenseIds } });
                        await PurchaseItem.destroy({ where: { expenseId: expenseIds } });

                        // 3. Delete expenses
                        await Expense.destroy({ where: { groupId: group.id } });
                    }

                    // 4. Delete payments linked to the group
                    await Payment.destroy({ where: { groupId: group.id } });

                    // 5. Delete group members
                    await GroupMember.destroy({ where: { groupId: group.id } });

                    // 6. Finally, delete the group itself
                    await group.destroy();

                    deletedCount++;
                } catch (groupError) {
                    console.error(`[Cleanup Job] Error deleting group ${group.id}:`, groupError);
                }
            }

            console.log(`[Cleanup Job] Cleanup complete. Permanently deleted ${deletedCount} groups.`);

        } catch (error) {
            console.error('[Cleanup Job] Error running cleanup job:', error);
        }
    });

    console.log('[Cleanup Job] Scheduled cleanup job started.');
};
