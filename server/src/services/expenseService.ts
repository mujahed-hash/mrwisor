import { Op } from 'sequelize';
import db from '../models';

const { Expense, ExpenseSplit } = db;

/**
 * Redistributes a member's expenses in a group to remaining members.
 * Used when a member leaves a group or is removed.
 * 
 * @param groupId 
 * @param memberId 
 * @returns Number of expenses redistributed
 */
export const redistributeMemberExpenses = async (groupId: string, memberId: string): Promise<number> => {
    // Get all expenses in this group
    const groupExpenses = await Expense.findAll({ where: { groupId } });

    let redistributedCount = 0;

    // For each expense, check if the member has a split and redistribute
    for (const expense of groupExpenses) {
        // Get member's split for this expense
        const memberSplit = await ExpenseSplit.findOne({
            where: { expenseId: expense.id, userId: memberId }
        });

        if (memberSplit) {
            // Get remaining splits (everyone else in this expense)
            const remainingSplits = await ExpenseSplit.findAll({
                where: { expenseId: expense.id, userId: { [Op.ne]: memberId } }
            });

            if (remainingSplits.length > 0) {
                // Redistribute proportionally to remaining members
                const exitingAmount = Number(memberSplit.amount);
                const remainingTotal = remainingSplits.reduce((sum: number, s: any) => sum + Number(s.amount), 0);

                // If remaining total is 0 (e.g. everyone else has 0 share), strictly divide equally or handle edge case?
                // For now assuming > 0 if there are remaining members in a valid expense

                if (remainingTotal > 0 || remainingSplits.length > 0) {
                    // Calculate proportion based on current share, OR if total is 0, equal split?
                    // Option 2 (Proportional) usually implies if you pay 0, you get 0 increase.
                    // But if everyone pays 0? Then infinite loop or NaN.
                    // Fallback to equal split if remainingTotal is 0

                    for (const split of remainingSplits) {
                        const currentAmount = Number(split.amount);
                        let additionalAmount = 0;

                        if (remainingTotal > 0) {
                            const proportion = currentAmount / remainingTotal;
                            additionalAmount = exitingAmount * proportion;
                        } else {
                            // Fallback: Equal split
                            additionalAmount = exitingAmount / remainingSplits.length;
                        }

                        const newAmount = Math.round((currentAmount + additionalAmount) * 100) / 100;

                        console.log(`[Redistribute] Expense ${expense.id}: User ${split.userId}: $${currentAmount} + $${additionalAmount.toFixed(2)} = $${newAmount}`);

                        split.amount = newAmount;
                        await split.save();
                    }
                }

                redistributedCount++;
            }

            // Delete the exiting member's split
            await memberSplit.destroy();
        }
    }

    return redistributedCount;
};
