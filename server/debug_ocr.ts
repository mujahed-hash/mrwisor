import { processReceiptImage } from './src/services/ocrService';

const imagePath = process.argv[2];

if (!imagePath) {
    console.error("Usage: npx ts-node debug_ocr.ts <path-to-image>");
    process.exit(1);
}

console.log(`Scanning image: ${imagePath}`);

processReceiptImage(imagePath).then(data => {
    console.log("\\n=== RAW TEXT ===");
    console.log(data.text);
    console.log("\\n=== EXTRACTED ITEMS ===");
    if (data.rawData && data.rawData.length > 0) {
        data.rawData.forEach((item, i) => {
            console.log(`  ${i + 1}. ${item.name} - $${item.price.toFixed(2)}`);
        });
    } else {
        console.log("  (No items extracted)");
    }
    console.log("========================");
}).catch(err => {
    console.error("OCR Failed:", err);
    process.exit(1);
});
