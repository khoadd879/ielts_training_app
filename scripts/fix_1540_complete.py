#!/usr/bin/env python3
"""Complete fix for exam 1540 - handle all question types correctly"""
import json
import re
from pathlib import Path

# Load quarantined data
path = Path("/home/khoa/RiderProjects/Project_Langfens_Microservice/data/quarantine/mini-ielts/1540-the-dingo-debate.json")
if not path.exists():
    path = Path("/home/khoa/RiderProjects/Project_Langfens_Microservice/data/normalized/mini-ielts/1540-the-dingo-debate.json")
data = json.loads(path.read_text())

# Answers
answers = {1: 'B', 2: 'D', 3: 'C', 4: 'B', 5: 'F', 6: 'A', 7: 'D', 8: 'D', 9: 'A', 10: 'B', 
           11: 'Tasmanian tiger', 12: 'rabbits', 13: 'overpopulation'}

for q in data['questions']:
    idx = q['idx']
    
    # Fix Q1-7: MATCHING_HEADING with paragraph A-H options
    if idx <= 7:
        q['type'] = 'MATCHING_HEADING'
        q['correct_answer'] = answers[idx]
        q['correct_answers'] = [answers[idx]]
        q['options'] = []
        for c in 'ABCDEFGH':
            q['options'].append({
                'value': c,
                'label': f'Paragraph {c}',
                'is_correct': (c == answers[idx])
            })
        print(f"Q{idx}: MATCHING_HEADING with 8 paragraph options (answer={answers[idx]})")
    
    # Fix Q8-10: MATCHING_FEATURES with people A-D options
    elif idx <= 10:
        q['type'] = 'MATCHING_FEATURES'
        q['correct_answer'] = answers[idx]
        q['correct_answers'] = [answers[idx]]
        q['options'] = [
            {'value': 'A', 'label': 'Stuart McKechnie', 'is_correct': answers[idx] == 'A'},
            {'value': 'B', 'label': 'Chris Johnson', 'is_correct': answers[idx] == 'B'},
            {'value': 'C', 'label': 'Lee Allen', 'is_correct': answers[idx] == 'C'},
            {'value': 'D', 'label': 'Mark Clifford', 'is_correct': answers[idx] == 'D'},
        ]
        print(f"Q{idx}: MATCHING_FEATURES with 4 people options (answer={answers[idx]})")
    
    # Fix Q11-13: Remove leading number from prompt
    else:
        q['type'] = 'SUMMARY_COMPLETION'
        q['correct_answer'] = answers[idx]
        q['correct_answers'] = [answers[idx]]
        q['options'] = []
        old_prompt = q.get('prompt_md', '')
        new_prompt = re.sub(r'^\d+\.\s*', '', old_prompt)
        if old_prompt != new_prompt:
            q['prompt_md'] = new_prompt
            print(f"Q{idx}: SUMMARY_COMPLETION - removed leading number")
        else:
            print(f"Q{idx}: SUMMARY_COMPLETION (no leading number)")

# Save to normalized
out_path = Path("/home/khoa/RiderProjects/Project_Langfens_Microservice/data/normalized/mini-ielts/1540-the-dingo-debate.json")
out_path.write_text(json.dumps(data, indent=2, ensure_ascii=False))
print(f"\nSaved to {out_path}")
