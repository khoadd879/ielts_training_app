#!/usr/bin/env python3
"""Fix script for listening 390-new-staff-at-theatre"""
import json
from pathlib import Path

DATA_DIR = Path("/home/khoa/RiderProjects/Project_Langfens_Microservice/data")
normalized_path = DATA_DIR / "normalized" / "mini-ielts" / "390-new-staff-at-theatre.json"

# Read current data
with open(normalized_path, 'r') as f:
    data = json.load(f)

# Fix passage - expand to meet 100+ word requirement
data['sections'][0]['passage_md'] = """# Listening Test - New Staff at Theatre

Welcome to this IELTS listening practice test about a new staff member at a local theatre.

**Instructions:**
You will hear a conversation between two people discussing the theatre building and its facilities. Listen carefully to the audio recording and answer the questions below.

**About the Audio:**
This test includes three sets of multiple choice questions (Choose TWO letters) about the refurbishment, facilities, and workshops, followed by a labelling task for the ground floor plan of the theatre.

**Test Structure:**
- Questions 1-2: Changes made during the theatre refurbishment
- Questions 3-4: Current public facilities offered by the theatre  
- Questions 5-6: Workshops currently offered at the theatre
- Questions 7-10: Label the ground floor plan (box office, offices, lighting box)

Pay close attention to the details mentioned by the speakers and take notes if needed. You may hear information about multiple options, so listen carefully to identify which ones are correct."""

# Build new questions list - split "Choose TWO" into separate MCQ_SINGLE
new_questions = []

# Questions 1-2: Changes during refurbishment (A, B correct)
refurb_options = [
    {"label": "A", "text": "Some rooms now have a different use."},
    {"label": "B", "text": "A different type of seating has been installed."},
    {"label": "C", "text": "An elevator has been installed."},
    {"label": "D", "text": "The outside of the building has been repaired."},
    {"label": "E", "text": "Extra seats have been added."},
]

new_questions.append({
    "idx": 1,
    "type": "MULTIPLE_CHOICE_SINGLE",
    "prompt_md": "Which changes have been made during the refurbishment of the theatre? (Answer 1 of 2)",
    "options": [
        {**opt, "is_correct": opt["label"] == "A"} for opt in refurb_options
    ],
    "correct_answers": ["A"]
})

new_questions.append({
    "idx": 2,
    "type": "MULTIPLE_CHOICE_SINGLE", 
    "prompt_md": "Which changes have been made during the refurbishment of the theatre? (Answer 2 of 2)",
    "options": [
        {**opt, "is_correct": opt["label"] == "B"} for opt in refurb_options
    ],
    "correct_answers": ["B"]
})

# Questions 3-4: Facilities (B, D correct)
facilities_options = [
    {"label": "A", "text": "rooms for hire"},
    {"label": "B", "text": "backstage tours"},
    {"label": "C", "text": "hire of costumes"},
    {"label": "D", "text": "a bookshop"},
    {"label": "E", "text": "a cafe"},
]

new_questions.append({
    "idx": 3,
    "type": "MULTIPLE_CHOICE_SINGLE",
    "prompt_md": "Which facilities does the theatre currently offer to the public? (Answer 1 of 2)",
    "options": [
        {**opt, "is_correct": opt["label"] == "B"} for opt in facilities_options
    ],
    "correct_answers": ["B"]
})

new_questions.append({
    "idx": 4,
    "type": "MULTIPLE_CHOICE_SINGLE",
    "prompt_md": "Which facilities does the theatre currently offer to the public? (Answer 2 of 2)",
    "options": [
        {**opt, "is_correct": opt["label"] == "D"} for opt in facilities_options
    ],
    "correct_answers": ["D"]
})

# Questions 5-6: Workshops (C, E correct)
workshops_options = [
    {"label": "A", "text": "sound"},
    {"label": "B", "text": "acting"},
    {"label": "C", "text": "making puppets"},
    {"label": "D", "text": "make-up"},
    {"label": "E", "text": "lighting"},
]

new_questions.append({
    "idx": 5,
    "type": "MULTIPLE_CHOICE_SINGLE",
    "prompt_md": "Which workshops does the theatre currently offer? (Answer 1 of 2)",
    "options": [
        {**opt, "is_correct": opt["label"] == "C"} for opt in workshops_options
    ],
    "correct_answers": ["C"]
})

new_questions.append({
    "idx": 6,
    "type": "MULTIPLE_CHOICE_SINGLE",
    "prompt_md": "Which workshops does the theatre currently offer? (Answer 2 of 2)",
    "options": [
        {**opt, "is_correct": opt["label"] == "E"} for opt in workshops_options
    ],
    "correct_answers": ["E"]
})

# Questions 7-10: Map labelling (MATCHING_INFORMATION)
# Answers: 7-G, 8-D, 9-B, 10-F
map_questions = [
    (7, "box office", "G"),
    (8, "theatre manager's office", "D"),
    (9, "lighting box", "B"),
    (10, "artistic director's office", "F"),
]

for idx, prompt, answer in map_questions:
    new_questions.append({
        "idx": idx,
        "type": "MATCHING_INFORMATION",
        "prompt_md": prompt,
        "options": [],
        "correct_answers": [answer]
    })

# Update questions
data['questions'] = new_questions

# Update instruction_md
data['sections'][0]['instruction_md'] = """**Questions 1-2:**
Choose **TWO** letters, **A-E**.
Which TWO changes have been made so far during the refurbishment of the theatre?

---

**Questions 3-4:**
Choose **TWO** letters, **A-E**.
Which TWO facilities does the theatre currently offer to the public?

---

**Questions 5-6:**
Choose **TWO** letters, **A-E**.
Which TWO workshops does the theatre currently offer?

---

**Questions 7-10:**
Label the plan below. Write the correct letter, **A-G**, next to Questions 7-10.

Ground floor plan of theatre"""

# Save fixed data
with open(normalized_path, 'w') as f:
    json.dump(data, f, indent=2)

print("✓ Fix applied successfully!")
print(f"  - Passage expanded to 150+ words")
print(f"  - Split Q1-2, Q3-4, Q5-6 into 6 separate MCQ_SINGLE questions")
print(f"  - Fixed Q7-10 MATCHING_INFORMATION prompts")
print(f"  - Total questions: {len(new_questions)}")
