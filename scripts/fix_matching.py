#!/usr/bin/env python3
"""Fix Q8-10 type for both exams"""
import json
from pathlib import Path

# === FIX EXAM 1540 ===
path_1540 = Path("/home/khoa/RiderProjects/Project_Langfens_Microservice/data/normalized/mini-ielts/1540-the-dingo-debate.json")
data = json.loads(path_1540.read_text())

for q in data['questions']:
    if q['idx'] in [8, 9, 10]:
        q['type'] = 'MATCHING_FEATURES'
        q['options'] = []  # options in instruction_md
        print(f"1540 Q{q['idx']}: Changed to MATCHING_FEATURES")

path_1540.write_text(json.dumps(data, indent=2, ensure_ascii=False))
print("Saved 1540")

# === FIX EXAM 1537 ===
path_1537 = Path("/home/khoa/RiderProjects/Project_Langfens_Microservice/data/normalized/mini-ielts/1537-australian-parrots-and-their-adaptation-to-habitat-change.json")
data = json.loads(path_1537.read_text())

# Check current types
for q in data['questions']:
    print(f"1537 Q{q['idx']}: {q['type']}")
