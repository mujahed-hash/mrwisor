
import { Request, Response } from 'express';
import db from '../models';
import { Op } from 'sequelize';

const PurchaseItem = db.PurchaseItem;
const Expense = db.Expense;

interface AuthRequest extends Request {
    userId?: string;
}

export const getAllPurchaseItems = async (req: AuthRequest, res: Response) => {
    try {
        const currentUserId = req.userId;
        if (!currentUserId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        // Fetch items linked to expenses relevant to the user
        // For simplicity, let's fetch items from expenses PAID BY the user
        // We could expand this to shared expenses too, but "My Purchases" usually implies what I bought.

        // 1. Find all expenses paid by user
        const userExpenses = await Expense.findAll({
            where: { paidBy: currentUserId },
            attributes: ['id']
        });
        const expenseIds = userExpenses.map((e: any) => e.id);

        console.log(`[Purchases] User ${currentUserId} has ${expenseIds.length} expenses`);

        // 2. Find items for those expenses
        const items = await PurchaseItem.findAll({
            where: {
                expenseId: { [Op.in]: expenseIds }
            },
            include: [{
                model: Expense,
                attributes: ['date', 'description', 'currency']
            }],
            order: [[Expense, 'date', 'DESC']]
        });

        console.log(`[Purchases] Found ${items.length} purchase items`);
        if (items.length > 0) {
            const sampleItem = (items[0] as any).toJSON();
            console.log(`[Purchases] Sample item expense date:`, sampleItem.Expense?.date);
        }

        res.status(200).json(items);

    } catch (error) {
        console.error('Error fetching purchase items:', error);
        res.status(500).json({ message: 'Failed to fetch purchases' });
    }
};
