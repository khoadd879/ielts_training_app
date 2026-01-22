#!/usr/bin/env python3
"""Final fix script for mini-ielts/1541-pacific-navigation-and-voyaging"""
import json
from pathlib import Path

# Load the normalized data
json_path = Path("/home/khoa/RiderProjects/Project_Langfens_Microservice/data/normalized/mini-ielts/1541-pacific-navigation-and-voyaging.json")
data = json.loads(json_path.read_text())

# === FIX 1: Q11-14 - Clear options for MATCHING_FEATURES (options in instruction_md only) ===
for q in data['questions']:
    if q['idx'] in [11, 12, 13, 14]:
        q['options'] = []
        print(f"Fixed Q{q['idx']}: Cleared options for MATCHING_FEATURES")

# === FIX 2: Fix typos in prompts ===
for q in data['questions']:
    if q['idx'] == 2:
        # "migrants to islanders" -> This is actually from source, keep as is
        pass
    if q['idx'] == 3:
        # "based on more on luck" -> This is from source, keep as is
        pass
    if q['idx'] == 10:
        # "p Wall Garrard" - this is actually from source (the name has "p" prefix)
        pass

# Save
json_path.write_text(json.dumps(data, indent=2, ensure_ascii=False))
print(f"\nSaved fixes to {json_path}")
