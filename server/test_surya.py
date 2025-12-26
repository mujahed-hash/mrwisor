#!/usr/bin/env python3
"""
Test Surya OCR for receipt scanning
"""

import sys
import json
from PIL import Image

from surya.recognition import RecognitionPredictor

def test_surya(image_path):
    print("Loading Surya OCR models...")
    
    # RecognitionPredictor can do both detection and recognition
    rec_predictor = RecognitionPredictor.from_pretrained()
    
    print(f"Processing: {image_path}")
    image = Image.open(image_path)
    
    # Run recognition
    results = rec_predictor([image])
    
    print("\n--- Surya OCR Result ---")
    all_text = []
    for page in results:
        for line in page.text_lines:
            print(f"{line.text}")
            all_text.append(line.text)
    
    return all_text

if __name__ == "__main__":
    image_path = sys.argv[1] if len(sys.argv) > 1 else "uploads/1765714448493-468955511.jpeg"
    test_surya(image_path)
