#!/usr/bin/env python3
"""
PaddleOCR Receipt Parser
Extracts text and items from receipt images using PaddleOCR.
Output: JSON with text, items array, and metadata.
"""
import sys
import json
import re
import os

# Limit CPU usage to prevent freezing
os.environ['OMP_NUM_THREADS'] = '1'
os.environ['MKL_NUM_THREADS'] = '1'
os.environ['VECLIB_MAXIMUM_THREADS'] = '1'
os.environ['NUMEXPR_NUM_THREADS'] = '1'

def extract_items_from_text(lines: list) -> list:
    """Extract items with prices from OCR lines.
    
    PaddleOCR often returns items and prices on separate lines, so we need to:
    1. First try to match "Item Name $X.XX" on same line
    2. Then pair item name lines with following price lines
    """
    items = []
    ignore_keywords = [
        'TOTAL', 'SUBTOTAL', 'TAX', 'CASH', 'CHANGE', 'DUE', 'BALANCE',
        'AMOUNT', 'VISA', 'DEBIT', 'CREDIT', 'CARD', 'PAYMENT', 'TENDER',
        'SURCHARGE', 'TIP', 'GRATUITY', 'REFUND', 'DISCOUNT', 'RECEIPT',
        'TRANS', 'STATION', 'ITEMS', 'AVE', 'STREET', 'PHONE', 'ADDRESS'
    ]
    
    # Find max amount (likely total) for filtering
    max_amount = 0
    all_amounts = []
    for line in lines:
        amounts = re.findall(r'\$?(\d+\.\d{2})', line)
        for amt in amounts:
            val = float(amt)
            all_amounts.append(val)
            if val > max_amount:
                max_amount = val
    
    # Price pattern (standalone price line like "$4.49" or "4.49")
    price_pattern = re.compile(r'^\$?(\d+\.\d{2})$')
    
    # Same-line pattern: "Item Name $X.XX"
    same_line_pattern = re.compile(r'^(.+?)\s+\$?(\d+\.\d{2})\s*$')
    
    # Track potential item names waiting for a price
    pending_item = None
    
    for i, line in enumerate(lines):
        line = line.strip()
        if not line or len(line) < 2:
            pending_item = None
            continue
        
        # Skip ignored keywords
        upper_line = line.upper()
        if any(kw in upper_line for kw in ignore_keywords):
            pending_item = None
            continue
        
        # Check if this is a standalone price
        price_match = price_pattern.match(line)
        if price_match:
            price = float(price_match.group(1))
            
            # If we have a pending item name, pair it with this price
            if pending_item and price > 0 and price < max_amount:
                items.append({"name": pending_item, "price": price})
            pending_item = None
            continue
        
        # Check for same-line item+price
        same_match = same_line_pattern.match(line)
        if same_match:
            name = same_match.group(1).strip()
            price = float(same_match.group(2))
            
            # Clean and validate
            name = re.sub(r'^[\d\s]+', '', name).strip()
            upper_name = name.upper()
            
            if (len(name) >= 2 and 
                price > 0 and 
                (max_amount == 0 or price < max_amount) and
                not any(kw in upper_name for kw in ignore_keywords)):
                items.append({"name": name, "price": price})
            pending_item = None
            continue
        
        # This could be an item name - check if it looks like one
        # (contains letters, not too short, not a barcode)
        alpha_count = len(re.findall(r'[a-zA-Z]', line))
        digit_count = len(re.findall(r'\d', line))
        
        if alpha_count >= 2 and alpha_count > digit_count:
            pending_item = line
        else:
            pending_item = None
    
    return items

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No image path provided"}), file=sys.stderr)
        sys.exit(1)
    
    image_path = sys.argv[1]
    
    try:
        from paddleocr import PaddleOCR
        
        # Initialize PaddleOCR (angle classification for rotated receipts)
        ocr = PaddleOCR(use_angle_cls=True, lang='en')
        
        # Run OCR - new API uses predict() or direct call
        try:
            result = ocr.predict(image_path)
        except TypeError:
            # Fallback for older API
            result = ocr.ocr(image_path)
        
        if not result:
            print(json.dumps({
                "text": "",
                "lines": [],
                "items": [],
                "error": None
            }))
            return
        
        # Extract text lines - handle different result formats
        lines = []
        
        # New API returns dict with 'rec_texts' key
        if isinstance(result, dict):
            if 'rec_texts' in result:
                lines = result['rec_texts']
            elif 'text' in result:
                lines = result['text'] if isinstance(result['text'], list) else [result['text']]
        # Old API returns list of lists
        elif isinstance(result, list):
            for page in result:
                if isinstance(page, list):
                    for line_data in page:
                        if line_data and len(line_data) >= 2:
                            text = line_data[1][0] if isinstance(line_data[1], (tuple, list)) else str(line_data[1])
                            lines.append(text)
                elif isinstance(page, dict) and 'rec_texts' in page:
                    lines.extend(page['rec_texts'])
        
        full_text = "\n".join(str(l) for l in lines)
        
        # Extract items
        items = extract_items_from_text([str(l) for l in lines])
        
        # Extract date
        date_match = re.search(r'(\d{1,2}/\d{1,2}/\d{2,4})|(\d{4}-\d{2}-\d{2})', full_text)
        date = date_match.group(0) if date_match else None
        
        output = {
            "text": full_text,
            "lines": [str(l) for l in lines],
            "items": items,
            "date": date,
            "error": None
        }
        
        print(json.dumps(output))
        
    except Exception as e:
        import traceback
        print(json.dumps({"error": str(e), "traceback": traceback.format_exc(), "text": "", "items": []}))
        sys.exit(1)

if __name__ == "__main__":
    main()
