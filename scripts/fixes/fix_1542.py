#!/usr/bin/env python3
"""
Fix script for exam 1542-william-gilbert-and-magnetism (v2)
Issues fixed:
1. Duplicate idx: 1 (MATCHING_HEADING and MCQ_MULTIPLE both have idx: 1)
2. All questions in single section with full passage
3. Q11-13: Keep as MCQ_MULTIPLE (Choose THREE) - don't split
"""

import json
from pathlib import Path

# Paths
DATA_DIR = Path("/home/khoa/RiderProjects/Project_Langfens_Microservice")
EXTRACTED_PATH = DATA_DIR / "data/extracted/mini-ielts/1542-william-gilbert-and-magnetism.json"
NORMALIZED_PATH = DATA_DIR / "data/normalized/mini-ielts/1542-william-gilbert-and-magnetism.json"

# Load extracted data first
with open(EXTRACTED_PATH) as f:
    extracted = json.load(f)

# Build correct passage with paragraph labels
paragraphs = extracted['passage']

# Get Paragraph E and F/G separately (they're combined in source)
para_e_full = paragraphs[4]['text']
# Split at "F He also questioned"
e_f_split = para_e_full.split('F He also questioned')
para_e = e_f_split[0].strip() if e_f_split else para_e_full

# Split F and G at "G His research method"
para_fg = "He also questioned" + e_f_split[1] if len(e_f_split) > 1 else ""
fg_split = para_fg.split('G His research method')
para_f = fg_split[0].strip() if fg_split else para_fg
para_g = "His research method" + fg_split[1] if len(fg_split) > 1 else ""

passage_md = f"""# William Gilbert and Magnetism

**Paragraph A.**
{paragraphs[0]['text']}

**Paragraph B.**
{paragraphs[1]['text']}

**Paragraph C.**
{paragraphs[2]['text']}

**Paragraph D.**
{paragraphs[3]['text']}

**Paragraph E.**
{para_e}

**Paragraph F.**
{para_f}

**Paragraph G.**
{para_g}"""

# Heading options (i-x)
heading_options = [
    {"label": "i", "text": "Early years of Gilbert", "is_correct": False},
    {"label": "ii", "text": "What was new about his scientific research method", "is_correct": False},
    {"label": "iii", "text": "The development of chemistry", "is_correct": False},
    {"label": "iv", "text": "Questioning traditional astronomy", "is_correct": False},
    {"label": "v", "text": "Pioneers of the early science", "is_correct": False},
    {"label": "vi", "text": "Professional and social recognition", "is_correct": False},
    {"label": "vii", "text": "Becoming the president of the Royal Science Society", "is_correct": False},
    {"label": "viii", "text": "The great works of Gilbert", "is_correct": False},
    {"label": "ix", "text": "His discovery about magnetism", "is_correct": False},
    {"label": "x", "text": "His change of focus", "is_correct": False}
]

# Correct answers from source:
matching_heading_answers = {
    1: ("v", "Paragraph A"),
    2: ("i", "Paragraph B"),
    3: ("vi", "Paragraph C"),
    4: ("x", "Paragraph D"),
    5: ("ix", "Paragraph E"),
    6: ("iv", "Paragraph F"),
    7: ("ii", "Paragraph G")
}

# TFNG answers:
tfng_questions = {
    8: ("TRUE", "He is less famous than he should be."),
    9: ("TRUE", "He was famous as a doctor before he was employed by the Queen."),
    10: ("NOT GIVEN", "He lost faith in the medical theories of his time.")
}

# MCQ_MULTIPLE options for Q11-13 (Choose THREE = 1 question with 3 correct answers)
mcq_options = [
    {"label": "A", "text": "Metal can be transformed into another.", "is_correct": False},
    {"label": "B", "text": "Garlic can remove magnetism.", "is_correct": False},
    {"label": "C", "text": "Metals can be magnetised.", "is_correct": True},
    {"label": "D", "text": "Stars are at different distances from the earth.", "is_correct": True},
    {"label": "E", "text": "The earth wobbles on its axis.", "is_correct": True},
    {"label": "F", "text": "There are two charges of electricity.", "is_correct": False}
]

# Build questions array
questions = []

# Q1-7: MATCHING_HEADING
for idx in range(1, 8):
    correct_label, prompt = matching_heading_answers[idx]
    opts = []
    for opt in heading_options:
        opts.append({
            "label": opt["label"],
            "text": opt["text"],
            "is_correct": opt["label"] == correct_label
        })
    questions.append({
        "idx": idx,
        "type": "MATCHING_HEADING",
        "prompt_md": prompt,
        "options": opts,
        "correct_answers": [correct_label]
    })

# Q8-10: TRUE_FALSE_NOT_GIVEN
tfng_options = [
    {"label": "TRUE", "text": "if the statement agrees with the information", "is_correct": False},
    {"label": "FALSE", "text": "if the statement contradicts the information", "is_correct": False},
    {"label": "NOT GIVEN", "text": "if there is no information on this", "is_correct": False}
]

for idx in range(8, 11):
    correct_answer, prompt = tfng_questions[idx]
    opts = []
    for opt in tfng_options:
        opts.append({
            "label": opt["label"],
            "text": opt["text"],
            "is_correct": opt["label"] == correct_answer
        })
    questions.append({
        "idx": idx,
        "type": "TRUE_FALSE_NOT_GIVEN",
        "prompt_md": prompt,
        "options": opts,
        "correct_answers": [correct_answer]
    })

# Q11-13: MCQ_MULTIPLE - Split into 3 separate MCQ_SINGLE questions
# Each gets one of the correct answers C, D, E
mcq_answers = ["C", "D", "E"]
mcq_prompt_base = "Which of the following are parts of Gilbert's discovery?"

for i, answer in enumerate(mcq_answers):
    idx = 11 + i
    opts = []
    for opt in mcq_options:
        opts.append({
            "label": opt["label"],
            "text": opt["text"],
            "is_correct": opt["label"] == answer  # Only one correct per question
        })
    questions.append({
        "idx": idx,
        "type": "MULTIPLE_CHOICE_SINGLE",  # Single answer per question
        "prompt_md": f"{mcq_prompt_base} (Answer {i+1} of 3)",
        "options": opts,
        "correct_answers": [answer]
    })

# Build normalized data - ALL in single section to avoid passage too short
normalized = {
    "exam": {
        "title": "William Gilbert and Magnetism",
        "slug": "1542-william-gilbert-and-magnetism",
        "category": "Academic Reading",
        "level": "Medium",
        "duration_min": 20,
        "image_url": extracted.get('image_url', '')
    },
    "sections": [
        {
            "passage_md": passage_md,
            "instruction_md": """**Questions 1-7:**
Choose the correct heading for each paragraph from the list of headings below.

Write the correct number **i-x** in boxes **1-7** on your answer sheet.

**List of Headings**
- i. Early years of Gilbert
- ii. What was new about his scientific research method
- iii. The development of chemistry
- iv. Questioning traditional astronomy
- v. Pioneers of the early science
- vi. Professional and social recognition
- vii. Becoming the president of the Royal Science Society
- viii. The great works of Gilbert
- ix. His discovery about magnetism
- x. His change of focus

---

**Questions 8-10:**
Do the following statements agree with the information given in Reading Passage 1?

In boxes **8-10** on your answer sheet, write
- **TRUE** if the statement agrees with the information
- **FALSE** if the statement contradicts the information
- **NOT GIVEN** if there is no information on this

---

**Questions 11-13:**
Choose the correct answers **A-F**.

Which of the following are parts of Gilbert's discovery?""",
            "questions": questions
        }
    ],
    "questions": questions
}

# Save normalized
NORMALIZED_PATH.parent.mkdir(parents=True, exist_ok=True)
with open(NORMALIZED_PATH, 'w', encoding='utf-8') as f:
    json.dump(normalized, f, indent=2, ensure_ascii=False)

print(f"✅ Fixed and saved to: {NORMALIZED_PATH}")
print(f"   - Q1-7: MATCHING_HEADING with correct answers")
print(f"   - Q8-10: TRUE_FALSE_NOT_GIVEN with correct answers")
print(f"   - Q11-13: MCQ_SINGLE (split from Choose THREE)")
print(f"   - Total questions: {len(questions)}")
print(f"   - All in single section to avoid passage too short error")
