import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

interface ExtractedItem {
    name: string;
    price: number;
    quantity?: number;
}

interface ExtractedData {
    text: string;
    total?: number;
    date?: string;
    potentialItems: string[];
    rawData?: ExtractedItem[];
}

// Gemini API - accurate OCR for receipts
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyDUISliRUMMZPaZlUghGVY5ilbInxWq10o';

/**
 * Compress image for API
 */
const compressImage = async (imagePath: string): Promise<string> => {
    try {
        console.log(`[OCR] Compressing image...`);
        const compressed = await sharp(imagePath)
            .resize(1200, 1600, { fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 80 })
            .toBuffer();
        console.log(`[OCR] Compressed size: ${(compressed.length / 1024).toFixed(0)}KB`);
        return compressed.toString('base64');
    } catch (error) {
        console.error(`[OCR] Compression failed:`, error);
        const buffer = fs.readFileSync(imagePath);
        return buffer.toString('base64');
    }
};

/**
 * Extract items using Gemini 2.5 Flash
 */
const extractWithGemini = async (imagePath: string): Promise<ExtractedItem[]> => {
    try {
        console.log(`[OCR] Sending to Gemini 2.5 Flash...`);
        const base64Image = await compressImage(imagePath);

        const prompt = `Extract ALL items with prices from this receipt. 
Return ONLY valid JSON: {"items":[{"name":"Item Name","price":0.00}]}
Rules:
- Include EVERY line item, even if names repeat
- Do NOT include subtotals, taxes, totals, or payment info
- Prices must be numbers, not strings
- If unsure, return {"items":[]}`;

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            { text: prompt },
                            { inline_data: { mime_type: 'image/jpeg', data: base64Image } }
                        ]
                    }],
                    generationConfig: { temperature: 0, maxOutputTokens: 2048 }
                }),
            }
        );

        if (!response.ok) {
            const error = await response.text();
            console.error(`[OCR] Gemini API error:`, error);
            return [];
        }

        const result = await response.json() as any;

        if (result.error) {
            console.error(`[OCR] Gemini error:`, result.error.message);
            return [];
        }

        const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
        console.log(`[OCR] Gemini response received`);

        // Parse JSON from response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try {
                const parsed = JSON.parse(jsonMatch[0]);
                const items = (parsed.items || []).filter((item: any) =>
                    item.name && typeof item.price === 'number' && item.price > 0
                ).map((item: any) => ({
                    name: item.name,
                    price: item.price,
                    quantity: 1
                }));
                console.log(`[OCR] Extracted ${items.length} items`);
                return items;
            } catch (e) {
                console.error(`[OCR] Failed to parse JSON:`, e);
            }
        }

        return [];
    } catch (error) {
        console.error(`[OCR] Gemini failed:`, error);
        return [];
    }
};

/**
 * Extract date from text
 */
const extractDateFromText = (text: string): string | undefined => {
    const patterns = [
        /(\d{1,2}\/\d{1,2}\/\d{2,4})/,
        /(\d{1,2}-\d{1,2}-\d{2,4})/,
    ];
    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) return match[1];
    }
    return undefined;
};

/**
 * Main function to process receipt
 */
export const processReceiptImage = async (imagePath: string): Promise<ExtractedData> => {
    try {
        console.log(`[OCR] Starting receipt processing: ${imagePath}`);

        const items = await extractWithGemini(imagePath);

        console.log(`[OCR] Final result: ${items.length} items`);

        const total = items.reduce((sum, item) => sum + item.price, 0);

        return {
            text: JSON.stringify(items),
            total: total > 0 ? total : undefined,
            date: undefined,
            potentialItems: items.map(i => `${i.name} - $${i.price.toFixed(2)}`),
            rawData: items
        };

    } catch (error) {
        console.error("[OCR] Processing failed:", error);
        throw new Error("Failed to process receipt image");
    }
};
