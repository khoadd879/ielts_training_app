#!/usr/bin/env python3
"""Fix script for mini-ielts/1540-the-dingo-debate"""
import json
import re
from pathlib import Path

# Load the normalized data
json_path = Path("/home/khoa/RiderProjects/Project_Langfens_Microservice/data/normalized/mini-ielts/1540-the-dingo-debate.json")
data = json.loads(json_path.read_text())

# === FIX: Remove leading numbers from Q11-13 prompts ===
for q in data['questions']:
    if q['idx'] in [11, 12, 13]:
        old_prompt = q['prompt_md']
        # Remove leading "11. " or "12. " etc.
        q['prompt_md'] = re.sub(r'^\d+\.\s*', '', old_prompt)
        print(f"Fixed Q{q['idx']}: '{old_prompt[:40]}...' → '{q['prompt_md'][:40]}...'")

# Save
json_path.write_text(json.dumps(data, indent=2, ensure_ascii=False))
print(f"\nSaved fixes to {json_path}")
