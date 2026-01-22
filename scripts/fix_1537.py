#!/usr/bin/env python3
"""Fix script for mini-ielts/1537-australian-parrots"""
import json
from pathlib import Path

json_path = Path("/home/khoa/RiderProjects/Project_Langfens_Microservice/data/normalized/mini-ielts/1537-australian-parrots-and-their-adaptation-to-habitat-change.json")
data = json.loads(json_path.read_text())

# === FIX 1: Q1-6 should all be MATCHING_INFORMATION (not MATCHING_HEADING) ===
for q in data['questions']:
    if q['idx'] in [1, 2, 3, 4, 5, 6]:
        q['type'] = 'MATCHING_INFORMATION'
        q['options'] = []
        print(f"Fixed Q{q['idx']}: Changed to MATCHING_INFORMATION")

# === FIX 2: Fix Q9 prompt - add space in "isNOT" ===
for q in data['questions']:
    if q['idx'] == 9:
        q['prompt_md'] = "Which of the following is NOT mentioned by the writer as a disadvantage of nesting boxes?"
        print(f"Fixed Q9: Added space in 'is NOT'")

# === FIX 3: Fix Q10-13 prompts ===
q10_13_fixes = {
    10: "There are 345 varieties of parrot in existence and, of these, _______ live in Australia.",
    11: "As early as the _______, the mapmaker recognized that parrots lived in that part of the world.",
    12: "As early as the _______, the mapmaker _______ recognized that parrots lived in that part of the world.",
    13: "_______, the famous painter of animals and birds, commented on the size and beauty of the Australian parrot family.",
}

for q in data['questions']:
    if q['idx'] in q10_13_fixes:
        q['prompt_md'] = q10_13_fixes[q['idx']]
        print(f"Fixed Q{q['idx']}: Restored proper prompt with blank")

# Save
json_path.write_text(json.dumps(data, indent=2, ensure_ascii=False))
print(f"\nSaved fixes to {json_path}")
