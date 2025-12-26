import db from '../src/models';
import { createExpense } from '../src/controllers/expenseController';
import { Request, Response } from 'express';

const testCreateExpense = async () => {
    try {
        await db.sequelize.sync();

        const user = await db.User.findOne();
        if (!user) {
            console.log('No user found');
            return;
        }

        console.log('Testing with groupId: undefined');
        const reqUndefined = {
            userId: user.id,
            body: {
                description: 'Test Expense Undefined',
                amount: 10,
                currency: 'USD',
                paidBy: user.id,
                groupId: undefined,
                category: 'food',
                date: new Date(),
                splitType: 'EQUAL',
                splits: []
            }
        } as unknown as Request;

        const res = {
            status: (code: number) => ({
                json: (data: any) => console.log(`Status ${code}:`, data)
            })
        } as Response;

        await createExpense(reqUndefined, res);

        console.log('Testing with groupId: "" (empty string)');
        const reqEmpty = {
            userId: user.id,
            body: {
                description: 'Test Expense Empty',
                amount: 10,
                currency: 'USD',
                paidBy: user.id,
                groupId: "",
                category: 'food',
                date: new Date(),
                splitType: 'EQUAL',
                splits: []
            }
        } as unknown as Request;

        await createExpense(reqEmpty, res);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await db.sequelize.close();
    }
};

testCreateExpense();
