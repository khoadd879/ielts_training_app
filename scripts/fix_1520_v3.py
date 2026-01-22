#!/usr/bin/env python3
"""Fix script #3 for exam 1520 - Fix apostrophe in answer"""
import json
from pathlib import Path

json_path = Path("/home/khoa/RiderProjects/Project_Langfens_Microservice/data/normalized/mini-ielts/1520-the-story-of-coffee.json")
data = json.loads(json_path.read_text())

# Fix Q13 answer - change apostrophe to avoid SQL issues
for q in data['questions']:
    if q['idx'] == 13:
        # Use escaped version or simplified version
        q['correct_answers'] = ["customers' specifications", "customer specifications"]
        print(f"Q13 answers: {q['correct_answers']}")

# Save
json_path.write_text(json.dumps(data, indent=2, ensure_ascii=False))
print(f"Fixed: {json_path}")
