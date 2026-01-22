#!/usr/bin/env python3
import json
from pathlib import Path

# Load normalized data
json_path = Path("/home/khoa/RiderProjects/Project_Langfens_Microservice/data/normalized/mini-ielts/1516-the-importance-of-law.json")
data = json.loads(json_path.read_text())

# Verified answers from IZONE
answers = {
    1: "iv", 2: "vii", 3: "i", 4: "viii", 5: "vi", 6: "ii",
    7: "C", 8: "D",
    9: "truth", 10: "journalists", 11: "nurses", 12: "dedication", 13: "documents"
}

# Fix Q1-6: MATCHING_HEADING
for idx in range(1, 7):
    q = next((q for q in data['questions'] if q['idx'] == idx), None)
    if q:
        q['correct_answers'] = [answers[idx]]
        q['correct_answer'] = answers[idx]
        q['matchPairs'] = None
        q['options'] = [
            {'value': 'i', 'label': 'i', 'text': 'Different areas of professional expertise'},
            {'value': 'ii', 'label': 'ii', 'text': 'Reasons why it is unfair to criticise lawyers'},
            {'value': 'iii', 'label': 'iii', 'text': 'The disadvantages of the legal system'},
            {'value': 'iv', 'label': 'iv', 'text': 'The law applies throughout our lives'},
            {'value': 'v', 'label': 'v', 'text': 'The law has affected historical events'},
            {'value': 'vi', 'label': 'vi', 'text': 'A negative regard for lawyers'},
            {'value': 'vii', 'label': 'vii', 'text': "public's increasing ability to influence the law"},
            {'value': 'viii', 'label': 'viii', 'text': 'growth in laws'}
        ]

# Fix Q7-8: Choose TWO (MCQ_SINGLE)
data['questions'] = [q for q in data['questions'] if q['idx'] not in [7, 8]]

options_q7_8 = [
    {'value': 'A', 'label': 'A', 'text': 'There should be a person with legal training in every hospital.'},
    {'value': 'B', 'label': 'B', 'text': 'Lawyers with experience in commercial law are the most in demand.'},
    {'value': 'C', 'label': 'C', 'text': 'Knowledge of the law is as important as having computer skills.'},
    {'value': 'D', 'label': 'D', 'text': 'Society could not function effectively without legal experts.'},
    {'value': 'E', 'label': 'E', 'text': 'Schools should teach students about the law.'}
]

data['questions'].append({
    'idx': 7,
    'type': 'MULTIPLE_CHOICE_SINGLE',
    'prompt_md': 'Select the first correct statement about legal skills in today\'s world.',
    'options': [{'value': o['value'], 'label': o['label'], 'text': o['text'], 'is_correct': o['value'] == 'C'} for o in options_q7_8],
    'correct_answers': ['C'],
    'correct_answer': 'C',
    'matchPairs': None
})

data['questions'].append({
    'idx': 8,
    'type': 'MULTIPLE_CHOICE_SINGLE',
    'prompt_md': 'Select the second correct statement about legal skills in today\'s world.',
    'options': [{'value': o['value'], 'label': o['label'], 'text': o['text'], 'is_correct': o['value'] == 'D'} for o in options_q7_8],
    'correct_answers': ['D'],
    'correct_answer': 'D',
    'matchPairs': None
})

# Fix Q9-13: SUMMARY_COMPLETION
data['questions'] = [q for q in data['questions'] if q['idx'] not in range(9, 14)]

summary_prompts = {
    9: "People sometimes say that _______ is of little interest to lawyers...",
    10: "This may well be the case with some individuals, in the same way that some _______ or scientific experts...",
    11: "However, criticising lawyers because their work is concerned with people's problems would be similar to attacking IT staff or _______...",
    12: "In fact, many lawyers focus on questions relating... which requires them to have _______ to their work.",
    13: "What's more, a lot of lawyers' time is spent writing _______ rather than dealing with people's misfortunes."
}

for idx in range(9, 14):
    ans = answers[idx]
    data['questions'].append({
        'idx': idx,
        'type': 'SUMMARY_COMPLETION',
        'prompt_md': summary_prompts.get(idx, 'Complete the summary.'),
        'options': [],
        'correct_answers': [ans],
        'correct_answer': ans,
        'matchPairs': None,
        'blankAcceptTexts': {"0": [ans]}
    })

# Sort questions by idx
data['questions'].sort(key=lambda x: x['idx'])

# Save
json_path.write_text(json.dumps(data, indent=2, ensure_ascii=False))
print("Fixed 1516-the-importance-of-law")
