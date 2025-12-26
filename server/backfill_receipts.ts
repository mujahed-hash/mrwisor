import db from './src/models';
import path from 'path';
import fs from 'fs';
import { processReceiptImage } from './src/services/ocrService';
import { Op } from 'sequelize';

async function backfillReceipts() {
    try {
        console.log("Connecting to database...");
        await db.sequelize.authenticate();
        console.log("Database connection established.");

        // Find expenses with a receipt
        const expenses = await db.Expense.findAll({
            where: {
                receipt: { [Op.ne]: null }
            }
        });

        console.log(`Found ${expenses.length} expenses with receipts.`);

        let processedCount = 0;

        for (const expense of expenses) {
            // Check if already has items
            const count = await db.PurchaseItem.count({ where: { expenseId: expense.id } });
            if (count > 0) {
                console.log(`Skipping expense ${expense.id} (already has items)`);
                continue;
            }

            const receiptData = expense.receipt;
            if (!receiptData) continue;

            let imagePath = '';
            let isTemp = false;
            // Use process.cwd() for consistent path resolution
            const uploadsDir = path.join(process.cwd(), 'uploads');

            if (receiptData.startsWith('data:image')) {
                // Handle Base64
                const base64Data = receiptData.replace(/^data:image\/\w+;base64,/, "");
                const tempFile = path.join(uploadsDir, `temp_${expense.id}.png`);
                fs.writeFileSync(tempFile, base64Data, 'base64');
                imagePath = tempFile;
                isTemp = true;
                console.log(`Processing Base64 receipt for expense ${expense.id}`);
            } else if (receiptData.startsWith('http')) {
                // Handle URL (extract filename)
                const filename = receiptData.split('/').pop();
                if (!filename) continue;
                imagePath = path.join(uploadsDir, filename);
                console.log(`Processing file receipt for expense ${expense.id}: ${filename}`);
            } else {
                // Assume it's a filename or path
                if (receiptData.length > 200) {
                    console.log(`Skipping likely malformed Base64 for expense ${expense.id}`);
                    continue;
                }
                const filename = receiptData.split('/').pop();
                if (filename) {
                    imagePath = path.join(uploadsDir, filename);
                    console.log(`Processing receipt path for expense ${expense.id}: ${filename}`);
                }
            }

            if (!imagePath) continue;

            try {
                const data = await processReceiptImage(imagePath);

                if (data.rawData && data.rawData.length > 0) {
                    const items = data.rawData.map((item: any) => ({
                        expenseId: expense.id,
                        name: item.name,
                        price: item.price,
                        quantity: 1
                    }));

                    await db.PurchaseItem.bulkCreate(items);
                    console.log(`  -> Saved ${items.length} items.`);
                    processedCount++;
                } else {
                    console.log("  -> No items found.");
                }
            } catch (err) {
                console.error(`  -> Failed to process:`, err);
            } finally {
                if (isTemp && imagePath) {
                    try {
                        fs.unlinkSync(imagePath);
                    } catch (e) { /* ignore */ }
                }
            }
        }

        console.log(`Backfill complete. Processed ${processedCount} receipts.`);

    } catch (error) {
        console.error("Error during backfill:", error);
    } finally {
        process.exit(0);
    }
}

backfillReceipts();
