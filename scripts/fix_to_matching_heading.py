#!/usr/bin/env python3
"""Change MATCHING_INFORMATION to MATCHING_HEADING for exams 1540 and 1537"""
import json
from pathlib import Path

# === FIX EXAM 1540 ===
path_1540 = Path("/home/khoa/RiderProjects/Project_Langfens_Microservice/data/normalized/mini-ielts/1540-the-dingo-debate.json")
data = json.loads(path_1540.read_text())

for q in data['questions']:
    if q['idx'] in [1, 2, 3, 4, 5, 6, 7]:
        q['type'] = 'MATCHING_HEADING'
        q['options'] = []
        print(f"1540 Q{q['idx']}: Changed to MATCHING_HEADING")

path_1540.write_text(json.dumps(data, indent=2, ensure_ascii=False))
print("Saved 1540\n")

# === FIX EXAM 1537 ===
path_1537 = Path("/home/khoa/RiderProjects/Project_Langfens_Microservice/data/normalized/mini-ielts/1537-australian-parrots-and-their-adaptation-to-habitat-change.json")
data = json.loads(path_1537.read_text())

for q in data['questions']:
    if q['idx'] in [1, 2, 3, 4, 5, 6]:
        q['type'] = 'MATCHING_HEADING'
        q['options'] = []
        print(f"1537 Q{q['idx']}: Changed to MATCHING_HEADING")

path_1537.write_text(json.dumps(data, indent=2, ensure_ascii=False))
print("Saved 1537")
