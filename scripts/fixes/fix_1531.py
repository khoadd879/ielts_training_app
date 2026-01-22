#!/usr/bin/env python3
"""
Fix script for 1531-the-ecological-importance-of-bees

Issues:
1. Q1-5 MATCHING_HEADING: options should be headings (i-viii), not paragraphs
2. prompt_md is correct as "Paragraph A/B/D/E/F" 
3. Need to add proper heading options with text

List of Headings from source:
i. Parallels between bee and human activities
ii. An evolutionary turning point  
iii. A lack of total co-operation
iv. The preservation of individual plant species
v. The commercial value of bees
vi. The structure of flowering plants
vii. The pursuit of self-interest
viii. The need for further research

Answers from source:
- Paragraph A = ii (An evolutionary turning point)
- Paragraph B = v (The commercial value of bees)
- Paragraph C = vii (Example given)
- Paragraph D = iv (The preservation of individual plant species)
- Paragraph E = viii (The need for further research)
- Paragraph F = ? (not in Q1-5, only A,B,D,E,F asked)

Wait - Questions ask for A, B, D, E and F (5 questions)
But we have Q1-5 matching paragraphs A, B, C, D, E
Need to verify...

Actually from the cleaned text:
Q1 = Paragraph A -> answer ii
Q2 = Paragraph B -> answer v
Example = Paragraph C -> answer vii
Q3 = Paragraph D -> answer i (actually need to check)
Q4 = Paragraph E -> answer iv
Q5 = Paragraph F -> answer viii

Let me fix based on actual correct_answers in normalized data.
"""

import json
from pathlib import Path

json_path = Path("/home/khoa/RiderProjects/Project_Langfens_Microservice/data/normalized/mini-ielts/1531-the-ecological-importance-of-bees.json")
data = json.loads(json_path.read_text())

# Headings list (i-viii)
HEADINGS = [
    {"label": "i", "text": "Parallels between bee and human activities", "is_correct": False},
    {"label": "ii", "text": "An evolutionary turning point", "is_correct": False},
    {"label": "iii", "text": "A lack of total co-operation", "is_correct": False},
    {"label": "iv", "text": "The preservation of individual plant species", "is_correct": False},
    {"label": "v", "text": "The commercial value of bees", "is_correct": False},
    {"label": "vi", "text": "The structure of flowering plants", "is_correct": False},
    {"label": "vii", "text": "The pursuit of self-interest", "is_correct": False},
    {"label": "viii", "text": "The need for further research", "is_correct": False},
]

# Correct answers for each paragraph (from cleaned text analysis)
PARAGRAPH_ANSWERS = {
    "Paragraph A": "ii",   # An evolutionary turning point
    "Paragraph B": "v",    # The commercial value of bees  
    "Paragraph C": "vii",  # The pursuit of self-interest (Example - not in Q1-5)
    "Paragraph D": "i",    # Parallels between bee and human activities (from correct_answers)
    "Paragraph E": "iv",   # The preservation of individual plant species
}

# Actually let me check Q5's answer - it says "VIII" in normalized data
# Q1: Paragraph A -> II
# Q2: Paragraph B -> V
# Q3: Paragraph C -> I  (wait, normalized says I not vii)
# Q4: Paragraph D -> IV
# Q5: Paragraph E -> VIII

# Wait - normalized data shows Q3=I, but "Paragraph C = vii" is the EXAMPLE
# So Q3 is NOT Paragraph C, it's the next one after C
# Let me re-read: "Choose the correct heading for paragraphs A, B, D, E and F"
# So Q1=A, Q2=B, Q3=D, Q4=E, Q5=F (skip C because it's example)

# Correcting:
# Q1: Paragraph A -> ii
# Q2: Paragraph B -> v  
# Q3: Paragraph D -> i (from normalized correct_answers=['I'])
# Q4: Paragraph E -> iv (from normalized correct_answers=['IV'])
# Q5: Paragraph E -> viii (normalized says correct_answers=['VIII'])

# Actually the normalized shows:
# Q5: Paragraph E with answer VIII

# But wait - if A,B,D,E,F are the 5 questions, then:
# Q1 = A, Q2 = B, Q3 = D, Q4 = E, Q5 = F
# Current normalized has Q3 = Paragraph C (wrong!)

# Fix: Change Q3,Q4,Q5 prompts to D,E,F respectively

fixes_applied = []

for q in data['questions']:
    idx = q['idx']
    
    if q['type'] == 'MATCHING_HEADING' and 1 <= idx <= 5:
        # Get correct answer from current data
        answer_label = q.get('correct_answers', [''])[0].lower()
        
        # Create options with correct is_correct marking
        options = []
        for h in HEADINGS:
            opt = {
                "label": h["label"],
                "text": h["text"],
                "is_correct": h["label"] == answer_label
            }
            options.append(opt)
        
        q['options'] = options
        
        # Fix prompt_md - should match the paragraphs asked: A, B, D, E, F
        # Q1=A, Q2=B, Q3=D, Q4=E, Q5=F (skip C)
        para_map = {1: "A", 2: "B", 3: "D", 4: "E", 5: "F"}
        q['prompt_md'] = f"Paragraph {para_map[idx]}"
        
        fixes_applied.append(f"Q{idx}: Fixed options to headings i-viii, prompt to Paragraph {para_map[idx]}")

# Q5 should be Paragraph F, not E - so the answer needs to match
# From cleaned text: F is about forest reserves and flight range
# Looking at headings, F likely = viii "The need for further research"

# Actually, let's update correct_answers based on the paragraph content:
# - Paragraph A (evolution to bees) = ii. An evolutionary turning point
# - Paragraph B (commercial value, £1000 million) = v. The commercial value of bees
# - Paragraph D (Adam Smith, economists) = i. Parallels between bee and human activities
# - Paragraph E (conservation policies) = iv. The preservation of individual plant species
# - Paragraph F (forest reserves, flight range) = viii. The need for further research

CORRECT_ANSWERS = {
    1: "ii",    # Paragraph A
    2: "v",     # Paragraph B
    3: "i",     # Paragraph D
    4: "iv",    # Paragraph E
    5: "viii",  # Paragraph F
}

for q in data['questions']:
    idx = q['idx']
    if q['type'] == 'MATCHING_HEADING' and 1 <= idx <= 5:
        correct = CORRECT_ANSWERS[idx]
        q['correct_answers'] = [correct.upper()]
        
        # Update is_correct in options
        for opt in q['options']:
            opt['is_correct'] = opt['label'] == correct
        
        fixes_applied.append(f"Q{idx}: Set correct_answer to {correct.upper()}")

# Save
json_path.write_text(json.dumps(data, indent=2, ensure_ascii=False))

print("=" * 50)
print("Fixes applied:")
for fix in fixes_applied:
    print(f"  ✓ {fix}")
print("=" * 50)
print(f"Saved: {json_path}")
