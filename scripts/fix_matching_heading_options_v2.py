#!/usr/bin/env python3
"""Add paragraph options with correct answers for MATCHING_HEADING"""
import json
from pathlib import Path

# Exam 1540: Answers from source
answers_1540 = {1: 'B', 2: 'D', 3: 'C', 4: 'B', 5: 'F', 6: 'A', 7: 'D'}

path_1540 = Path("/home/khoa/RiderProjects/Project_Langfens_Microservice/data/normalized/mini-ielts/1540-the-dingo-debate.json")
data = json.loads(path_1540.read_text())

for q in data['questions']:
    idx = q['idx']
    if q['type'] == 'MATCHING_HEADING' and idx in answers_1540:
        correct = answers_1540[idx]
        q['correct_answer'] = correct
        q['options'] = []
        for c in 'ABCDEFGH':
            q['options'].append({
                'value': c,
                'label': f'Paragraph {c}',
                'is_correct': (c == correct)
            })
        print(f"1540 Q{idx}: Added 8 options, answer={correct}")

path_1540.write_text(json.dumps(data, indent=2, ensure_ascii=False))
print("Saved 1540\n")

# Exam 1537: Answers from source  
answers_1537 = {1: 'D', 2: 'G', 3: 'C', 4: 'H', 5: 'E', 6: 'F'}

path_1537 = Path("/home/khoa/RiderProjects/Project_Langfens_Microservice/data/normalized/mini-ielts/1537-australian-parrots-and-their-adaptation-to-habitat-change.json")
data = json.loads(path_1537.read_text())

for q in data['questions']:
    idx = q['idx']
    if q['type'] == 'MATCHING_HEADING' and idx in answers_1537:
        correct = answers_1537[idx]
        q['correct_answer'] = correct
        q['options'] = []
        for c in 'ABCDEFGHIJ':
            q['options'].append({
                'value': c,
                'label': f'Paragraph {c}',
                'is_correct': (c == correct)
            })
        print(f"1537 Q{idx}: Added 10 options, answer={correct}")

path_1537.write_text(json.dumps(data, indent=2, ensure_ascii=False))
print("Saved 1537")
