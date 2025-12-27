#!/usr/bin/env python3
"""Fix exam 1537 - All issues"""
import json
from pathlib import Path

path = Path("/home/khoa/RiderProjects/Project_Langfens_Microservice/data/normalized/mini-ielts/1537-australian-parrots-and-their-adaptation-to-habitat-change.json")
data = json.loads(path.read_text())

for q in data['questions']:
    idx = q['idx']
    
    # Fix Q1-6: MATCHING_HEADING
    if idx in [1, 2, 3, 4, 5, 6]:
        q['type'] = 'MATCHING_HEADING'
        q['options'] = []
        print(f"Q{idx}: Changed to MATCHING_HEADING")

# Save
path.write_text(json.dumps(data, indent=2, ensure_ascii=False))
print(f"\nSaved to {path}")
