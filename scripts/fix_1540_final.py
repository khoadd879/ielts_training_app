#!/usr/bin/env python3
"""Fix exam 1540 - All issues"""
import json
import re
from pathlib import Path

path = Path("/home/khoa/RiderProjects/Project_Langfens_Microservice/data/normalized/mini-ielts/1540-the-dingo-debate.json")
data = json.loads(path.read_text())

for q in data['questions']:
    idx = q['idx']
    
    # Fix Q1-7: MATCHING_HEADING
    if idx in [1, 2, 3, 4, 5, 6, 7]:
        q['type'] = 'MATCHING_HEADING'
        q['options'] = []
        print(f"Q{idx}: Changed to MATCHING_HEADING")
    
    # Fix Q8-10: MATCHING_FEATURES (match to people A-D)
    if idx in [8, 9, 10]:
        q['type'] = 'MATCHING_FEATURES'
        q['options'] = []
        print(f"Q{idx}: Changed to MATCHING_FEATURES")
    
    # Fix Q11-13: Remove leading numbers from prompt
    if idx in [11, 12, 13]:
        old_prompt = q.get('prompt_md', '')
        new_prompt = re.sub(r'^\d+\.\s*', '', old_prompt)
        if old_prompt != new_prompt:
            q['prompt_md'] = new_prompt
            print(f"Q{idx}: Removed leading number from prompt")

# Save
path.write_text(json.dumps(data, indent=2, ensure_ascii=False))
print(f"\nSaved to {path}")
