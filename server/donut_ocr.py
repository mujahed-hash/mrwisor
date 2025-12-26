#!/usr/bin/env python3
"""
Donut OCR Service - Improved accuracy version
Model: naver-clova-ix/donut-base-finetuned-cord-v2
"""

import sys
import json
import re
from PIL import Image

def run_ocr(image_path):
    from transformers import DonutProcessor, VisionEncoderDecoderModel
    import torch
    
    model_name = "naver-clova-ix/donut-base-finetuned-cord-v2"
    
    processor = DonutProcessor.from_pretrained(model_name)
    model = VisionEncoderDecoderModel.from_pretrained(model_name)
    
    device = "mps" if torch.backends.mps.is_available() else "cpu"
    model.to(device)
    model.eval()
    
    # Load image at FULL resolution (no resizing)
    image = Image.open(image_path).convert("RGB")
    
    # Donut expects specific size - let model handle it
    pixel_values = processor(image, return_tensors="pt").pixel_values.to(device)
    
    # Generate with higher max_length for more tokens
    task_prompt = "<s_cord-v2>"
    decoder_input_ids = processor.tokenizer(task_prompt, add_special_tokens=False, return_tensors="pt").input_ids.to(device)
    
    with torch.no_grad():
        outputs = model.generate(
            pixel_values,
            decoder_input_ids=decoder_input_ids,
            max_length=model.decoder.config.max_position_embeddings,
            pad_token_id=processor.tokenizer.pad_token_id,
            eos_token_id=processor.tokenizer.eos_token_id,
            use_cache=True,
            num_beams=3,  # Use beam search for better accuracy
            bad_words_ids=[[processor.tokenizer.unk_token_id]],
            return_dict_in_generate=True,
        )
    
    sequence = processor.batch_decode(outputs.sequences)[0]
    sequence = sequence.replace(processor.tokenizer.eos_token, "").replace(processor.tokenizer.pad_token, "")
    sequence = re.sub(r"<.*?>", "", sequence, count=1).strip()
    
    try:
        result = processor.token2json(sequence)
    except:
        result = {"raw": sequence}
    
    # Print raw result for debugging
    print("RAW:", json.dumps(result), file=sys.stderr)
    
    # Extract items
    items = []
    exclude_keywords = [
        'TOTAL', 'TAX', 'SUBTOTAL', 'CHANGE', 'CASH', 'CARD', 'CREDIT',
        'DEBIT', 'VISA', 'MASTERCARD', 'PAYMENT', 'BALANCE',
        'TRANS', 'RECEIPT', 'STATION', 'CASHIER',
        'APPLE', 'GOURMET', 'DELI', 'STORE', 'MARKET',
        'AM', 'PM',
    ]
    
    if isinstance(result, dict) and "menu" in result:
        for item in result.get("menu", []):
            name = item.get("nm", "").strip()
            price_str = item.get("price", "0")
            
            price = 0.0
            if price_str:
                price_match = re.search(r'\$?([\d,]+\.?\d*)', str(price_str))
                if price_match:
                    price = float(price_match.group(1).replace(",", ""))
            
            if price > 100:
                continue
            
            name_upper = name.upper()
            if not name or price <= 0:
                continue
            
            if any(kw in name_upper for kw in exclude_keywords):
                continue
            
            if re.search(r'\d{1,2}[/-]\d{1,2}[/-]\d{2,4}', name):
                continue
            
            if re.match(r'^(trans|receipt|station|#).*\d', name_upper):
                continue
            
            digit_ratio = sum(c.isdigit() for c in name) / max(len(name), 1)
            if digit_ratio > 0.9 and len(name) > 15:
                continue
            
            # Get quantity
            qty = 1
            cnt_str = item.get("cnt", "1")
            try:
                qty = int(cnt_str) if cnt_str else 1
            except:
                qty = 1
            
            items.append({"name": name, "price": price, "quantity": qty})
    
    output = {"items": items, "raw": result}
    print(json.dumps(output))

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No image path", "items": []}))
        sys.exit(1)
    try:
        run_ocr(sys.argv[1])
    except Exception as e:
        print(json.dumps({"error": str(e), "items": []}))
        sys.exit(1)
