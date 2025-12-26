#!/usr/bin/env python3
"""
Test Donut model for receipt OCR
Using open model: naver-clova-ix/donut-base-finetuned-cord-v2
"""

import sys
import json
import re
from PIL import Image

from transformers import DonutProcessor, VisionEncoderDecoderModel
import torch

def test_donut_ocr(image_path):
    print(f"Loading Donut model...")
    
    # Use the CORD (receipt) fine-tuned model - this is open
    model_name = "naver-clova-ix/donut-base-finetuned-cord-v2"
    
    processor = DonutProcessor.from_pretrained(model_name)
    model = VisionEncoderDecoderModel.from_pretrained(model_name)
    
    # Use MPS (Apple Silicon) if available, otherwise CPU
    device = "mps" if torch.backends.mps.is_available() else "cpu"
    print(f"Using device: {device}")
    model.to(device)
    model.eval()
    
    # Load and process image
    print(f"Processing image: {image_path}")
    image = Image.open(image_path).convert("RGB")
    
    # Prepare input
    pixel_values = processor(image, return_tensors="pt").pixel_values.to(device)
    
    # Generate output
    print("Running inference...")
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
            bad_words_ids=[[processor.tokenizer.unk_token_id]],
            return_dict_in_generate=True,
        )
    
    # Decode output
    sequence = processor.batch_decode(outputs.sequences)[0]
    sequence = sequence.replace(processor.tokenizer.eos_token, "").replace(processor.tokenizer.pad_token, "")
    sequence = re.sub(r"<.*?>", "", sequence, count=1).strip()  # Remove task prompt
    
    # Parse JSON
    try:
        sequence = processor.token2json(sequence)
    except:
        pass
    
    print("\n--- Donut Result ---")
    print(json.dumps(sequence, indent=2) if isinstance(sequence, dict) else sequence)
    
    return sequence

if __name__ == "__main__":
    image_path = sys.argv[1] if len(sys.argv) > 1 else "uploads/1765714448493-468955511.jpeg"
    test_donut_ocr(image_path)
