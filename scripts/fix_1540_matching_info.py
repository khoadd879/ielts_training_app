#!/usr/bin/env python3
"""Fix exam 1540: MATCHING_INFORMATION with matchPairs (per schema)"""
import json
import re
from pathlib import Path

path = Path("/home/khoa/RiderProjects/Project_Langfens_Microservice/data/normalized/mini-ielts/1540-the-dingo-debate.json")
data = json.loads(path.read_text())

# Q1-7: paragraph letters, Q8-10: people letters
answers = {1: 'B', 2: 'D', 3: 'C', 4: 'B', 5: 'F', 6: 'A', 7: 'D', 8: 'D', 9: 'A', 10: 'B'}

for q in data['questions']:
    idx = q['idx']
    
    # Q1-7: MATCHING_INFORMATION (which paragraph contains)
    if idx <= 7:
        q['type'] = 'MATCHING_INFORMATION'
        q['options'] = []
        q['correct_answer'] = answers[idx]
        q['correct_answers'] = [answers[idx]]
        q['matchPairs'] = {f"info-q{idx}": [answers[idx]]}
        print(f"Q{idx}: MATCHING_INFORMATION (paragraph), matchPairs={{info-q{idx}: [{answers[idx]}]}}")
    
    # Q8-10: MATCHING_FEATURES (match to people)
    elif idx <= 10:
        q['type'] = 'MATCHING_FEATURES'
        q['options'] = []  # Per schema, MATCHING_FEATURES has empty options
        q['correct_answer'] = answers[idx]
        q['correct_answers'] = [answers[idx]]
        # matchPairs for MATCHING_FEATURES: {key: [fullLabel, letter]}
        people = {
            8: ('Mark Clifford', 'D'),  # Q8 answer D = Mark Clifford
            9: ('Stuart McKechnie', 'A'),  # Q9 answer A = Stuart McKechnie
            10: ('Chris Johnson', 'B'),  # Q10 answer B = Chris Johnson
        }
        q['matchPairs'] = {f"feature-q{idx}": list(people[idx])}
        print(f"Q{idx}: MATCHING_FEATURES, matchPairs={{feature-q{idx}: {list(people[idx])}}}")
    
    # Q11-13: SUMMARY_COMPLETION
    else:
        q['prompt_md'] = re.sub(r'^\d+\.\s*', '', q.get('prompt_md', ''))

path.write_text(json.dumps(data, indent=2, ensure_ascii=False))
print(f"\nSaved: {path}")
