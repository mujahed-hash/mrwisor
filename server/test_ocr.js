// Test Gemini Vision OCR
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const GEMINI_API_KEY = 'AIzaSyDUISliRUMMZPaZlUghGVY5ilbInxWq10o';

async function test() {
    const imagePath = path.join(__dirname, 'uploads', '1765714448493-468955511.jpeg');
    console.log('Testing Gemini Vision on:', imagePath);

    // Compress image
    console.log('Compressing image...');
    const compressed = await sharp(imagePath)
        .resize(1200, 1600, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();

    console.log(`Compressed size: ${(compressed.length / 1024).toFixed(0)}KB`);
    const base64Image = compressed.toString('base64');

    const prompt = `Analyze this receipt image and extract all purchased items with their prices.

Return ONLY a valid JSON object in this exact format:
{"items":[{"name":"Item Name","price":1.99}]}

Rules:
- Extract each individual item and its price
- Do NOT include subtotals, taxes, totals, tips, or payment info
- Use exact item names from the receipt
- Prices must be numbers (not strings)`;

    console.log('Sending to Gemini...');
    const startTime = Date.now();

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: prompt },
                        { inline_data: { mime_type: "image/jpeg", data: base64Image } }
                    ]
                }],
                generationConfig: { temperature: 0, maxOutputTokens: 2048 }
            }),
        }
    );

    const result = await response.json();
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log(`\n--- Gemini Result (${elapsed}s) ---`);

    if (result.error) {
        console.error('Error:', result.error);
        return;
    }

    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
    console.log(text);
}

test().catch(console.error);
