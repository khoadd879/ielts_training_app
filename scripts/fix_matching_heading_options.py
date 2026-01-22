#!/usr/bin/env python3
"""Add paragraph options A-H/A-J for MATCHING_HEADING questions"""
import json
from pathlib import Path

def add_paragraph_options(path, max_letter):
    """Add A-H or A-J options for MATCHING_HEADING questions"""
    data = json.loads(path.read_text())
    
    # Build options based on max letter
    options = []
    for c in 'ABCDEFGHIJ':
        if c <= max_letter:
            options.append({
                'value': c,
                'label': f'Paragraph {c}',
                'is_correct': False
            })
    
    for q in data['questions']:
        if q['type'] == 'MATCHING_HEADING':
            q['options'] = options.copy()
            # Set correct option
            answer = q.get('correct_answer', '')
            for opt in q['options']:
                opt['is_correct'] = (opt['value'] == answer)
            print(f"Q{q['idx']}: Added {len(options)} options (answer: {answer})")
    
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False))
    print(f"Saved: {path.name}\n")

# Fix exam 1540 (paragraphs A-H)
path_1540 = Path("/home/khoa/RiderProjects/Project_Langfens_Microservice/data/normalized/mini-ielts/1540-the-dingo-debate.json")
add_paragraph_options(path_1540, 'H')

# Fix exam 1537 (paragraphs A-J)
path_1537 = Path("/home/khoa/RiderProjects/Project_Langfens_Microservice/data/normalized/mini-ielts/1537-australian-parrots-and-their-adaptation-to-habitat-change.json")
add_paragraph_options(path_1537, 'J')
