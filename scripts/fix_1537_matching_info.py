#!/usr/bin/env python3
"""Fix exam 1537: Convert to MATCHING_INFORMATION with matchPairs (per schema)"""
import json
from pathlib import Path

path = Path("/home/khoa/RiderProjects/Project_Langfens_Microservice/data/normalized/mini-ielts/1537-australian-parrots-and-their-adaptation-to-habitat-change.json")
data = json.loads(path.read_text())

# Q1-6 answers (paragraph letters)
answers = {1: 'D', 2: 'G', 3: 'C', 4: 'H', 5: 'E', 6: 'F'}

for q in data['questions']:
    idx = q['idx']
    
    # Fix Q1-6: MATCHING_INFORMATION with matchPairs (per schema)
    if idx <= 6:
        q['type'] = 'MATCHING_INFORMATION'  # Letter input UI
        q['options'] = []  # Empty per schema
        q['correct_answer'] = answers[idx]
        q['correct_answers'] = [answers[idx]]
        # Add matchPairs per schema
        q['matchPairs'] = {f"info-q{idx}": [answers[idx]]}
        print(f"Q{idx}: MATCHING_INFORMATION, matchPairs={{info-q{idx}: [{answers[idx]}]}}")

path.write_text(json.dumps(data, indent=2, ensure_ascii=False))
print(f"\nSaved: {path}")
