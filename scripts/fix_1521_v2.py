#!/usr/bin/env python3
"""Fix script #2 for exam 1521-e-training

Issues to fix:
1. Q11-13: Change type from MCQ_SINGLE to MULTIPLE_CHOICE_SINGLE
2. Update section 1 instruction_md for Q7-10
"""
import json
from pathlib import Path

json_path = Path("/home/khoa/RiderProjects/Project_Langfens_Microservice/data/normalized/mini-ielts/1521-e-training.json")
data = json.loads(json_path.read_text())

# Fix Q11-13 types
for q in data['questions']:
    if q['idx'] in [11, 12, 13]:
        q['type'] = 'MULTIPLE_CHOICE_SINGLE'

# Fix section instruction_md - separate Q7-10 into section 2, Q11-13 into section 3
# The passage already has paragraphs A-F in the cleaned text

for section in data['sections']:
    if section.get('section_idx') == 2:
        section['instruction_md'] = """**Questions 7-10:**
The reading Passage has six paragraphs A-F.
Which paragraph contains the following information?
Write the correct letter A-F, in boxes 7-10 on your answer sheet.

**A** - Paragraph A
**B** - Paragraph B  
**C** - Paragraph C
**D** - Paragraph D
**E** - Paragraph E
**F** - Paragraph F"""
    elif section.get('section_idx') == 3:
        section['instruction_md'] = """**Questions 11-13:**
Choose THREE correct letters, among A-E.
Write your answers in boxes 11-13 on your answer sheet.

According to the passage, what are the limitations of e-training?
A. Technical facilities are hardly obtained.
B. Presenting multimedia over the Internet is restricted due to the bandwidth limit.
C. It is ineffective imparting a unique corporate value to fresh employees.
D. Employees need to block a long time leaving their position attending training.
E. More preparation time is needed to keep the course at a suitable level."""

# Save
json_path.write_text(json.dumps(data, indent=2, ensure_ascii=False))
print(f"Fixed: {json_path}")
print(f"Q11 type: {next((q['type'] for q in data['questions'] if q['idx'] == 11), 'N/A')}")
print(f"Q12 type: {next((q['type'] for q in data['questions'] if q['idx'] == 12), 'N/A')}")
print(f"Q13 type: {next((q['type'] for q in data['questions'] if q['idx'] == 13), 'N/A')}")
