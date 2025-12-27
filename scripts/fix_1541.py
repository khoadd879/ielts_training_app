#!/usr/bin/env python3
"""Fix script for mini-ielts/1541-pacific-navigation-and-voyaging"""
import json
from pathlib import Path

# Load the normalized data
json_path = Path("/home/khoa/RiderProjects/Project_Langfens_Microservice/data/normalized/mini-ielts/1541-pacific-navigation-and-voyaging.json")
data = json.loads(json_path.read_text())

# === FIX 1: Q5 - Change type from TRUE_FALSE_NOT_GIVEN to YES_NO_NOT_GIVEN ===
for q in data['questions']:
    if q['idx'] == 5:
        q['type'] = 'YES_NO_NOT_GIVEN'
        print(f"Fixed Q5: Changed type to YES_NO_NOT_GIVEN")

# === FIX 2: Q6-Q10 MCQ options - extract proper options from source ===
mcq_options = {
    6: {
        'prompt': "David Lewis's research was different because",
        'options': [
            {"label": "A", "text": "he observed traditional navigators at work", "is_correct": True},
            {"label": "B", "text": "he conducted test voyages using his own yacht", "is_correct": False},
            {"label": "C", "text": "he carried no modern instruments on test voyages", "is_correct": False},
            {"label": "D", "text": "he spoke the same language as the islanders he sailed with", "is_correct": False},
        ],
        'correct_answers': ["A"]
    },
    7: {
        'prompt': "What did David Lewis's research discover about traditional navigators?",
        'options': [
            {"label": "A", "text": "They used the sun and moon to find their position", "is_correct": False},
            {"label": "B", "text": "They could not sail further than about 1,000 nautical miles", "is_correct": False},
            {"label": "C", "text": "They knew which direction they were sailing in", "is_correct": True},
            {"label": "D", "text": "They were able to drift for long distances", "is_correct": False},
        ],
        'correct_answers': ["C"]
    },
    8: {
        'prompt': "What are we told about Edwin Doran's research?",
        'options': [
            {"label": "A", "text": "Data were collected after the canoes had returned to land", "is_correct": False},
            {"label": "B", "text": "Canoe characteristics were recorded using modern instruments", "is_correct": True},
            {"label": "C", "text": "Research was conducted in the most densely populated regions", "is_correct": False},
            {"label": "D", "text": "Navigators were not allowed to see the instruments Doran used", "is_correct": False},
        ],
        'correct_answers': ["B"]
    },
    9: {
        'prompt': "Which of the following did Steven Horvath discover during his research?",
        'options': [
            {"label": "A", "text": "Canoe design was less important than human strength", "is_correct": False},
            {"label": "B", "text": "New research methods had to be developed for use in canoes", "is_correct": False},
            {"label": "C", "text": "Navigators became very tired on the longest voyages", "is_correct": False},
            {"label": "D", "text": "Human energy may have been used to assist sailing canoes", "is_correct": True},
        ],
        'correct_answers': ["D"]
    },
    10: {
        'prompt': "What is the writer's opinion of p Wall Garrard's research?",
        'options': [
            {"label": "A", "text": "He is disappointed it was conducted in the laboratory", "is_correct": False},
            {"label": "B", "text": "He is impressed by the originality of the techniques used", "is_correct": True},
            {"label": "C", "text": "He is surprised it was used to help linguists with their research", "is_correct": False},
            {"label": "D", "text": "He is concerned that the islands studied are long distances apart", "is_correct": False},
        ],
        'correct_answers': ["B"]
    }
}

for q in data['questions']:
    if q['idx'] in mcq_options:
        fix = mcq_options[q['idx']]
        q['prompt_md'] = fix['prompt']
        q['options'] = fix['options']
        q['correct_answers'] = fix['correct_answers']
        print(f"Fixed Q{q['idx']}: Restored proper MCQ options")

# === FIX 3: Q11-14 - Change type from MATCHING_INFORMATION to MATCHING_FEATURES ===
# These are sentence completion with endings A-F
sentence_endings = [
    {"label": "A", "text": "was the variety of experimental techniques used", "is_correct": False},
    {"label": "B", "text": "was not of interest to young islanders today", "is_correct": False},
    {"label": "C", "text": "was not conclusive evidence in support of a single theory", "is_correct": False},
    {"label": "D", "text": "was being able to change their practices when necessary", "is_correct": False},
    {"label": "E", "text": "was the first time humans intentionally crossed an ocean", "is_correct": False},
    {"label": "F", "text": "was the speed with which it was conducted", "is_correct": False},
]

matching_fixes = {
    11: {"correct": "C", "prompt": "One limitation in the information produced by all of this research is that it"},
    12: {"correct": "A", "prompt": "The best thing about this type of research"},
    13: {"correct": "D", "prompt": "The most important achievement of traditional navigators"},
    14: {"correct": "E", "prompt": "The migration of people from Asia to the Pacific"},
}

for q in data['questions']:
    if q['idx'] in matching_fixes:
        fix = matching_fixes[q['idx']]
        q['type'] = 'MATCHING_FEATURES'
        q['prompt_md'] = fix['prompt']
        # Create options with correct answer marked
        q['options'] = []
        for opt in sentence_endings:
            new_opt = opt.copy()
            new_opt['is_correct'] = (opt['label'] == fix['correct'])
            q['options'].append(new_opt)
        q['correct_answers'] = [fix['correct']]
        print(f"Fixed Q{q['idx']}: Changed to MATCHING_FEATURES with proper options")

# === FIX 4: Fix instruction_md - Change A-L to A-F for Q11-14 ===
data['sections'][0]['instruction_md'] = """**Questions 1-5:**
Do the following statements agree with the claims of the writer?

Write
- **YES** if the statement agrees with the claims of the writer
- **NO** if the statement contradicts the claims of the writer
- **NOT GIVEN** if it is impossible to say what the writer thinks about this

---

**Questions 6-10:**
Choose the correct letter, **A**, **B**, **C** or **D**.

---

**Questions 11-14:**
Complete each sentence with the correct ending, **A-F**, below.

- **A** was the variety of experimental techniques used
- **B** was not of interest to young islanders today
- **C** was not conclusive evidence in support of a single theory
- **D** was being able to change their practices when necessary
- **E** was the first time humans intentionally crossed an ocean
- **F** was the speed with which it was conducted"""
print("Fixed instruction_md: Updated Q11-14 instruction to A-F endings")

# Save
json_path.write_text(json.dumps(data, indent=2, ensure_ascii=False))
print(f"\nSaved fixes to {json_path}")
