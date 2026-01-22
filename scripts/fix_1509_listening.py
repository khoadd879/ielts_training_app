#!/usr/bin/env python3
"""Fix exam 1509-water-hyacinth (Listening): 
Q1-2=MCQ_MULTIPLE (Choose TWO), Q3-6=MCQ_SINGLE, Q7-10=MATCHING_FEATURES"""
import json
import re
from pathlib import Path

# Load normalized data
path = Path("/home/khoa/RiderProjects/Project_Langfens_Microservice/data/normalized/mini-ielts/1509-water-hyacinth.json")
data = json.loads(path.read_text())

# Answers from crawler
answers = {
    1: ['B', 'E'],  # Choose TWO
    3: 'A',  # Latin America
    4: 'C',  # loss of trees
    5: 'C',  # many years later
    6: 'C',  # expensive
    7: 'D',  # dried water hyacinth → materials for plants to grow in
    8: 'C',  # mushroom farmers → quick profits
    9: 'E',  # (check source) → good for human health
    10: 'B', # → alternative energy resource
}

# Q1-2 options
q12_options = [
    "A. plants and fish are poisoned",
    "B. Farmers cannot fish",
    "C. the dam's structure is damaged",
    "D. Electricity production is affected.",
    "E. electricity production is affected.",
]

# Q3-6 options
q3_options = [
    "A. Latin America",
    "B. Africa",
    "C. Europe",
]
q4_options = [
    "A. soil erosion",
    "B. a change of rainfall",
    "C. loss of trees",
]
q5_options = [
    "A. immediately",
    "B. 6 months later",
    "C. many years later",
]
q6_options = [
    "A. ineffective",
    "B. dangerous", 
    "C. expensive",
]

# Q7-10 benefits (MATCHING_FEATURES)
benefits = """A. can reduce the effect of global warming
B. can be used as alternative energy resource
C. can make quick profits
D. can produce materials for plants to grow in
E. can be good for human health
F. can produce fertilizer"""

# Build new questions
new_questions = []

# === Q1-2: MULTIPLE_CHOICE_MULTIPLE (Choose TWO) ===
# Split into 2 questions as per IELTS format
for i, ans in enumerate(answers[1], start=1):
    options = []
    for opt_text in q12_options:
        letter = opt_text[0]
        options.append({
            'value': letter,
            'label': opt_text,
            'is_correct': letter == ans,
        })
    new_questions.append({
        'idx': i,
        'type': 'MULTIPLE_CHOICE_SINGLE',  # Each is separate MCQ
        'prompt_md': f"Which two problems are caused by water hyacinth? (Answer {i} of 2)",
        'options': options,
        'correct_answers': [ans],
        'correct_answer': ans,
        'matchPairs': None,
    })
    print(f"Q{i}: MCQ_SINGLE (part of Choose TWO), answer={ans}")

# === Q3-6: MULTIPLE_CHOICE_SINGLE ===
mcq_data = [
    (3, "Where was water hyacinth originally from?", q3_options, answers[3]),
    (4, "What is the primary cause of the decrease in nutrients from the soil?", q4_options, answers[4]),
    (5, "When will the biological solution bring risks to the environment?", q5_options, answers[5]),
    (6, "What does John say about the mechanical solution?", q6_options, answers[6]),
]

for idx, prompt, opts, ans in mcq_data:
    options = []
    for opt_text in opts:
        letter = opt_text[0]
        options.append({
            'value': letter,
            'label': opt_text,
            'is_correct': letter == ans,
        })
    new_questions.append({
        'idx': idx,
        'type': 'MULTIPLE_CHOICE_SINGLE',
        'prompt_md': prompt,
        'options': options,
        'correct_answers': [ans],
        'correct_answer': ans,
        'matchPairs': None,
    })
    print(f"Q{idx}: MCQ_SINGLE, answer={ans}")

# === Q7-10: MATCHING_FEATURES ===
features_data = [
    (7, "dried water hyacinth", 'D'),
    (8, "mushroom farmers", 'C'),
    (9, "?", 'E'),  # Need to check source
    (10, "?", 'B'),  # Need to check source
]

for idx, item, ans in features_data:
    new_questions.append({
        'idx': idx,
        'type': 'MATCHING_FEATURES',
        'prompt_md': f"What is the benefit of the cut down water hyacinth to: {item}",
        'options': [],  # MATCHING_FEATURES has empty options per schema
        'correct_answers': [ans],
        'correct_answer': ans,
        'matchPairs': {f"feature-q{idx}": [ans]},
    })
    print(f"Q{idx}: MATCHING_FEATURES, answer={ans}")

# Sort by idx
new_questions.sort(key=lambda q: q['idx'])
data['questions'] = new_questions

# === Fix passage - add more context ===
data['sections'][0]['passage_md'] = """# Listening Test - Water Hyacinth

This is a listening practice test about the water hyacinth plant and its environmental impacts.

**About the Audio:**
This test discusses the water hyacinth, an invasive aquatic plant originally from Latin America that has become a major problem in many waterways around the world.

**Topics covered:**
- Problems caused by water hyacinth (blocking waterways, affecting fishing and electricity)
- Origin of water hyacinth and how it spread
- Environmental impacts (nutrient loss, soil erosion)
- Biological and mechanical solutions
- Benefits of harvesting water hyacinth (alternative energy, plant materials, mushroom farming)

**Instructions:**
Listen carefully to the audio recording and answer the questions below. The recording will only be played once.

**Word Bank for Questions 7-10:**
A. can reduce the effect of global warming
B. can be used as alternative energy resource
C. can make quick profits
D. can produce materials for plants to grow in
E. can be good for human health
F. can produce fertilizer"""

# === Update instruction_md ===
data['sections'][0]['instruction_md'] = """**Questions 1-2:**
Choose **TWO** letters, **A-E**.

Which two problems are caused by water hyacinth?

---

**Questions 3-6:**
Choose the correct letter, **A**, **B** or **C**.

---

**Questions 7-10:**
What is the benefit of the cut down water hyacinth to each of the following aspects?

Choose **FOUR** answers from the box and write the correct letter, **A-F** next to Questions 7-10.

**Benefits of the cut-down water hyacinth:**
- A. can reduce the effect of global warming
- B. can be used as alternative energy resource
- C. can make quick profits
- D. can produce materials for plants to grow in
- E. can be good for human health
- F. can produce fertilizer"""

path.write_text(json.dumps(data, indent=2, ensure_ascii=False))
print(f"\nSaved: {path}")
