#!/usr/bin/env python3
"""Fix script for exam 1520-the-story-of-coffee

Issues to fix:
1. Q1-6: Fix MATCHING_HEADING with proper headings (i-xi), fix prompts to show Paragraph B-G
2. Q7-13: Fix SUMMARY_COMPLETION prompts with proper gap-fill sentences
3. Fix instruction_md to match question types
4. Ensure all correct_answers match properly
"""
import json
from pathlib import Path

json_path = Path("/home/khoa/RiderProjects/Project_Langfens_Microservice/data/normalized/mini-ielts/1520-the-story-of-coffee.json")
data = json.loads(json_path.read_text())

# Full list of headings from source (i-xi with text)
headings = [
    {"value": "i", "label": "i", "text": "Growing Coffee"},
    {"value": "ii", "label": "ii", "text": "Problems with Manufacture"},
    {"value": "iii", "label": "iii", "text": "Processing the Bean"},
    {"value": "iv", "label": "iv", "text": "First Contact"},
    {"value": "v", "label": "v", "text": "Arabian Coffee"},
    {"value": "vi", "label": "vi", "text": "Coffee Varieties"},
    {"value": "vii", "label": "vii", "text": "Modern Coffee"},
    {"value": "viii", "label": "viii", "text": "The Spread of Coffee"},
    {"value": "ix", "label": "ix", "text": "Consuming Coffee"},
    {"value": "x", "label": "x", "text": "Climates for Coffee"},
    {"value": "xi", "label": "xi", "text": "The Coffee Plant"},
]

# Correct answers for Q1-6 (lowercase roman numerals)
q1_6_answers = {
    1: "viii",   # Paragraph B - The Spread of Coffee
    2: "ix",     # Paragraph C - Consuming Coffee
    3: "vi",     # Paragraph D - Coffee Varieties
    4: "xi",     # Paragraph E - The Coffee Plant
    5: "i",      # Paragraph F - Growing Coffee (actually x: Climates for Coffee fits better, but source says i)
    6: "iii"     # Paragraph G - Processing the Bean
}

# Prompts for Q1-6
q1_6_prompts = {
    1: "Paragraph B",
    2: "Paragraph C",
    3: "Paragraph D",
    4: "Paragraph E",
    5: "Paragraph F",
    6: "Paragraph G"
}

# Q7-9 diagram labels (SUMMARY_COMPLETION)
q7_9_data = {
    7: {"prompt": "The outer coating of the coffee berry is called the _______.", "answer": "epicarp"},
    8: {"prompt": "Inside the coating is a white, sugary mucilaginous flesh called the _______.", "answer": "mesocarp"},
    9: {"prompt": "The resistant, golden yellow parchment coating the beans is called the _______.", "answer": "endocarp"}
}

# Q10-13 flowchart (SUMMARY_COMPLETION)
q10_13_data = {
    10: {"prompt": "First, ripe beans are picked and taken to pulping mills where they can be pulped (or _______).", "answer": ["wet milled"]},
    11: {"prompt": "The pulped beans rest in pure rainwater to ferment _______.", "answer": ["overnight"]},
    12: {"prompt": "During the drying process, beans need to be _______ many times to dry evenly.", "answer": ["raked"]},
    13: {"prompt": "The green beans are roasted according to the _______ and then packaged.", "answer": ["customers' specifications"]}
}

new_questions = []

# Fix Q1-6: MATCHING_HEADING
for idx in range(1, 7):
    correct_val = q1_6_answers[idx]
    opts = []
    for h in headings:
        opts.append({
            "value": h["value"],
            "label": h["label"],
            "text": h["text"],
            "is_correct": h["value"] == correct_val
        })
    
    # Find heading text for matchPairs
    heading_text = next((h["text"] for h in headings if h["value"] == correct_val), "")
    
    new_questions.append({
        "idx": idx,
        "type": "MATCHING_HEADING",
        "prompt_md": q1_6_prompts[idx],
        "options": opts,
        "correct_answers": [correct_val],
        "matchPairs": {f"heading-q{idx}": [correct_val, heading_text]}
    })

# Fix Q7-9: SUMMARY_COMPLETION (diagram labels)
for idx in range(7, 10):
    new_questions.append({
        "idx": idx,
        "type": "SUMMARY_COMPLETION",
        "prompt_md": q7_9_data[idx]["prompt"],
        "options": [],
        "correct_answers": [q7_9_data[idx]["answer"]],
        "matchPairs": {}
    })

# Fix Q10-13: SUMMARY_COMPLETION (flowchart)
for idx in range(10, 14):
    new_questions.append({
        "idx": idx,
        "type": "SUMMARY_COMPLETION",
        "prompt_md": q10_13_data[idx]["prompt"],
        "options": [],
        "correct_answers": q10_13_data[idx]["answer"],
        "matchPairs": {}
    })

data['questions'] = new_questions

# Fix section instruction_md
for section in data['sections']:
    section['instruction_md'] = """**Questions 1-6:**
The reading passage on The Story of Coffee has 7 paragraphs A – G.
From the list of headings below choose the most suitable headings for paragraphs B – G.
Write the appropriate number (i – xi) in boxes 1-6 on your answer sheet.

**NB:** There are more headings than paragraphs, so you will not use them all.

**List of Headings:**
i. Growing Coffee
ii. Problems with Manufacture
iii. Processing the Bean
iv. First Contact
v. Arabian Coffee
vi. Coffee Varieties
vii. Modern Coffee
viii. The Spread of Coffee
ix. Consuming Coffee
x. Climates for Coffee
xi. The Coffee Plant

*Example: Paragraph A → iv*

---

**Questions 7-9:**
Complete the labels on the diagram of a coffee bean below.
Choose your answers from the text and write them in boxes 7-9 on your answer sheet.

---

**Questions 10-13:**
Using the information in the passage, complete the flowchart below.
Write your answers in boxes 10-13 on your answer sheet.
Use NO MORE THAN THREE WORDS from the passage for each answer."""

# Save
json_path.write_text(json.dumps(data, indent=2, ensure_ascii=False))
print(f"Fixed: {json_path}")
print(f"Total questions: {len(data['questions'])}")
for q in data['questions']:
    print(f"Q{q['idx']}: {q['type']} -> {q['correct_answers']}")
