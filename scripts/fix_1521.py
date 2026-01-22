#!/usr/bin/env python3
"""Fix script for exam 1521-e-training

Issues to fix:
1. Q1-6: MATCHING_HEADING - need full heading options with i-x, fix correct_answers case
2. Q7-10: Change from MATCHING_HEADING to MATCHING_INFORMATION (paragraph lookup)
3. Q11: Change to MCQ_MULTIPLE, add Q12/Q13 as same type (Choose THREE from A-E)
"""
import json
from pathlib import Path

json_path = Path("/home/khoa/RiderProjects/Project_Langfens_Microservice/data/normalized/mini-ielts/1521-e-training.json")
data = json.loads(json_path.read_text())

# Full list of headings from source
headings = [
    {"value": "i", "label": "i", "text": "overview of the benefits for application of E-training"},
    {"value": "ii", "label": "ii", "text": "IBM's successful choice of training"},
    {"value": "iii", "label": "iii", "text": "Future directions and a new style of teaching"},
    {"value": "iv", "label": "iv", "text": "learners' achievement and advanced teaching materials"},
    {"value": "v", "label": "v", "text": "limitations when E-training compares with traditional class"},
    {"value": "vi", "label": "vi", "text": "multimedia over the Internet can be a solution"},
    {"value": "vii", "label": "vii", "text": "technology can be a huge financial burden"},
    {"value": "viii", "label": "viii", "text": "the distance learners outperformed the traditional university learners worldwide"},
    {"value": "ix", "label": "ix", "text": "other advantages besides economic consideration"},
    {"value": "x", "label": "x", "text": "Training offered to help people learn using computers"},
]

# Correct answers for Q1-6 (lowercase)
q1_6_answers = {
    1: "i",
    2: "ix", 
    3: "iv",
    4: "vii",
    5: "v",
    6: "iii"
}

# Correct answers for Q7-10 (paragraph letters)
q7_10_answers = {
    7: "A",
    8: "B", 
    9: "F",
    10: "D"
}

# Q7-10 prompts (statements to match to paragraphs)
q7_10_prompts = {
    7: "Projected Basic Blue in IBM achieved great success.",
    8: "E-learning wins as a priority for many corporations as its flexibility.",
    9: "The combination of traditional and e-training environments may prevail.",
    10: "Example of fast electronic delivery for a company's products to its customers."
}

# Q11-13 MCQ options (Choose THREE from A-E)
mcq_options = [
    {"label": "A", "text": "Technical facilities are hardly obtained.", "is_correct": False},
    {"label": "B", "text": "Presenting multimedia over the Internet is restricted due to the bandwidth limit.", "is_correct": True},
    {"label": "C", "text": "It is ineffective imparting a unique corporate value to fresh employees.", "is_correct": True},
    {"label": "D", "text": "Employees need to block a long time leaving their position attending training.", "is_correct": False},
    {"label": "E", "text": "More preparation time is needed to keep the course at a suitable level.", "is_correct": True},
]

# Correct answers for Q11-13 (split into individual questions)
q11_13_answers = {
    11: "B",
    12: "C",
    13: "E"
}

new_questions = []

for q in data['questions']:
    idx = q['idx']
    
    if 1 <= idx <= 6:
        # Fix Q1-6: MATCHING_HEADING with full options
        # Create options with correct is_correct flag
        opts = []
        correct_val = q1_6_answers[idx]
        for h in headings:
            opts.append({
                "value": h["value"],
                "label": h["label"], 
                "text": h["text"],
                "is_correct": h["value"] == correct_val
            })
        q['options'] = opts
        q['correct_answers'] = [correct_val]
        q['matchPairs'] = {f"heading-q{idx}": [correct_val, next(h["text"] for h in headings if h["value"] == correct_val)]}
        new_questions.append(q)
        
    elif 7 <= idx <= 10:
        # Fix Q7-10: Change to MATCHING_INFORMATION
        q['type'] = 'MATCHING_INFORMATION'
        q['prompt_md'] = q7_10_prompts[idx]
        q['options'] = []  # MATCHING_INFORMATION has no options in our schema
        correct_para = q7_10_answers[idx]
        q['correct_answers'] = [correct_para]
        q['matchPairs'] = {f"info-q{idx}": [correct_para, f"Paragraph {correct_para}"]}
        new_questions.append(q)
        
    elif idx == 11:
        # Skip the old Q11 - we'll create 3 new MCQ_MULTIPLE questions
        pass
    else:
        new_questions.append(q)

# Add Q11-13 as MCQ_MULTIPLE (separate questions for Choose THREE)
for qidx in [11, 12, 13]:
    correct_letter = q11_13_answers[qidx]
    opts = []
    for opt in mcq_options:
        opts.append({
            "label": opt["label"],
            "text": opt["text"],
            "is_correct": opt["label"] == correct_letter
        })
    new_questions.append({
        "idx": qidx,
        "type": "MCQ_SINGLE",  # Each answer is a single selection from A-E
        "prompt_md": f"According to the passage, what are the limitations of e-training?",
        "options": opts,
        "correct_answers": [correct_letter],
        "matchPairs": {}
    })

data['questions'] = new_questions

# Fix sections instruction_md
for section in data['sections']:
    if section.get('section_idx') == 1:
        section['instruction_md'] = """**Questions 1-6:**
The reading passage has six paragraphs, A-F.
Choose the correct heading for paragraphs A-F from the list below.
Write the correct number, i-x, in boxes 1-6 on your answer sheet.

**List of Headings**
i. overview of the benefits for application of E-training
ii. IBM's successful choice of training
iii. Future directions and a new style of teaching
iv. learners' achievement and advanced teaching materials
v. limitations when E-training compares with traditional class
vi. multimedia over the Internet can be a solution
vii. technology can be a huge financial burden
viii. the distance learners outperformed the traditional university learners worldwide
ix. other advantages besides economic consideration
x. Training offered to help people learn using computers"""
    elif section.get('section_idx') == 2:
        section['instruction_md'] = """**Questions 7-10:**
The reading Passage has six paragraphs A-F.
Which paragraph contains the following information?
Write the correct letter A-F, in boxes 7-10 on your answer sheet."""
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
print(f"Total questions: {len(data['questions'])}")
