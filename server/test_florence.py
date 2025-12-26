#!/usr/bin/env python3
"""
Test Florence-2 (Microsoft) for receipt OCR
"""

import sys
import json
from PIL import Image

from transformers import AutoProcessor, AutoModelForCausalLM
import torch

def test_florence2(image_path):
    print("Loading Florence-2 model (Microsoft)...")
    
    model_name = "microsoft/Florence-2-base"
    
    processor = AutoProcessor.from_pretrained(model_name, trust_remote_code=True)
    model = AutoModelForCausalLM.from_pretrained(model_name, trust_remote_code=True)
    
    # Use MPS (Apple Silicon) if available
    device = "mps" if torch.backends.mps.is_available() else "cpu"
    print(f"Using device: {device}")
    model.to(device)
    model.eval()
    
    # Load image
    print(f"Processing image: {image_path}")
    image = Image.open(image_path).convert("RGB")
    
    # OCR task
    print("Running OCR...")
    task_prompt = "<OCR>"
    
    inputs = processor(text=task_prompt, images=image, return_tensors="pt").to(device)
    
    with torch.no_grad():
        generated_ids = model.generate(
            input_ids=inputs["input_ids"],
            pixel_values=inputs["pixel_values"],
            max_new_tokens=1024,
            num_beams=3,
        )
    
    generated_text = processor.batch_decode(generated_ids, skip_special_tokens=False)[0]
    parsed = processor.post_process_generation(generated_text, task=task_prompt, image_size=(image.width, image.height))
    
    print("\n--- Florence-2 OCR Result ---")
    print(parsed.get('<OCR>', parsed))
    
    return parsed

if __name__ == "__main__":
    image_path = sys.argv[1] if len(sys.argv) > 1 else "uploads/1765714448493-468955511.jpeg"
    test_florence2(image_path)
