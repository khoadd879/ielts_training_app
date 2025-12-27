#!/usr/bin/env python3
"""Fix exam 1538-yawning: Q1-6=SUMMARY_COMPLETION (word bank), Q7-11=MCQ, Q12-14=YNNG"""
import json
import re
from pathlib import Path

path = Path("/home/khoa/RiderProjects/Project_Langfens_Microservice/data/normalized/mini-ielts/1538-yawning.json")
data = json.loads(path.read_text())

# Word bank options A-K (from source)
word_bank = {
    'A': 'form and function',
    'B': 'long yawns', 
    'C': '3 seconds',
    'D': 'fixed action pattern',
    'E': '68 seconds',
    'F': 'short yawns',
    'G': 'reflex',
    'H': 'sneeze',
    'I': 'short duration',
    'J': '6 seconds',
    'K': 'half-yawns',
}

# Answers for Q1-6 (SUMMARY_COMPLETION)
summary_answers = {1: 'K', 2: 'H', 3: 'D', 4: 'J', 5: 'E', 6: 'B'}

# Answers for Q7-11 (MCQ)
mcq_answers = {7: 'B', 8: 'A', 9: 'D', 10: 'C', 11: 'B'}

# Q7-11 options from source
mcq_options = {
    7: [
        "A. Ending a yawn requires use of the nostrils.",
        "B. You can yawn without breathing through your nose",
        "C. Breathing through the nose produces a silent yawn.",
        "D. The role of the nose in yawning needs further investigation.",
    ],
    8: [
        "A. gaping of the jaws is required to complete a yawn.",
        "B. gaping of the jaws makes you look like you need to breathe.",
        "C. the mouth provides a sufficient airway during yawns.",
        "D. sneezing and yawning need the same amount of jaw movement.",
    ],
    9: [
        "A. The nose yawn is just like normal breathing.",
        "B. The nose yawn produces an unsatisfying feeling.",
        "C. The nose yawn can only be produced when opening the mouth.",
        "D. The nose yawn allows the full yawning process to take place.",
    ],
    10: [
        "A. Yawning and sneezing share similar features.",
        "B. Yawning is a complex behavior involving many features.",
        "C. Yawning and stretching occur together in adults.",
        "D. Yawning may be linked to the animal world.",
    ],
    11: [
        "A. to prove that paralysis can be cured by repeated yawning.",
        "B. to demonstrate the link between yawning and stretching.",
        "C. as part of a study to find out why movement occurs when yawning.",
        "D. to suggest that the paralyzed arm may demonstrate the contagion response.",
    ],
}

# Answers Q12-14 (YES_NO_NOT_GIVEN)
ynng_answers = {12: 'YES', 13: 'NOT GIVEN', 14: 'NO'}

# Prompts Q12-14
ynng_prompts = {
    12: "This experiment is an example of the typical intensity of fixed action patterns.",
    13: "Yawning may be therapeutic for preventing muscular deterioration.",
    14: "Yawning has a single purpose.",
}

# Prompts Q1-6 (SUMMARY_COMPLETION)
summary_prompts = {
    1: "Through his observation of yawns, Province was able to confirm that _______ do not exist.",
    2: "Just like a _______, yawns cannot be interrupted after they have begun.",
    3: "This is because yawns occur as a _______ rather than a stimulus response as was previously thought.",
    4: "In measuring the time taken to yawn, Provine found that a typical yawn lasts about _______.",
    5: "He also found that it is common for people to yawn a number of times in quick succession with the yawns usually being around _______ apart.",
    6: "When studying whether length and rate were connected, Province concluded that people who yawn less do not necessarily produce _______ to make up for this.",
}

# Prompts Q7-11 (MCQ)
mcq_prompts = {
    7: "What did Provine conclude from his 'closed nose yawn' experiment?",
    8: "Provine's clenched teeth yawn's experiment shows that",
    9: "What does the passage say about 'the nose yawn'?",
    10: "What is the purpose of the paragraph about yawning and stretching?",
    11: "The neurologist Sir Francis Walshe is mentioned in the passage",
}

# Build new questions list
new_questions = []

# Q1-6: SUMMARY_COMPLETION
for idx in range(1, 7):
    answer = summary_answers[idx]
    new_questions.append({
        'idx': idx,
        'type': 'SUMMARY_COMPLETION',
        'prompt_md': summary_prompts[idx],
        'options': [],
        'correct_answers': [answer],
        'correct_answer': answer,
        'matchPairs': None,
        'blankAcceptTexts': {"0": [answer, word_bank[answer]]},
    })
    print(f"Q{idx}: SUMMARY_COMPLETION, answer={answer} ({word_bank[answer]})")

# Q7-11: MULTIPLE_CHOICE_SINGLE
for idx in range(7, 12):
    answer = mcq_answers[idx]
    options = []
    for opt_text in mcq_options[idx]:
        letter = opt_text[0]  # First char is A/B/C/D
        options.append({
            'value': letter,
            'label': opt_text,
            'is_correct': letter == answer,
        })
    new_questions.append({
        'idx': idx,
        'type': 'MULTIPLE_CHOICE_SINGLE',
        'prompt_md': mcq_prompts[idx],
        'options': options,
        'correct_answers': [answer],
        'correct_answer': answer,
        'matchPairs': None,
    })
    print(f"Q{idx}: MULTIPLE_CHOICE_SINGLE, answer={answer}")

# Q12-14: YES_NO_NOT_GIVEN
for idx in range(12, 15):
    answer = ynng_answers[idx]
    new_questions.append({
        'idx': idx,
        'type': 'YES_NO_NOT_GIVEN',
        'prompt_md': ynng_prompts[idx],
        'options': [
            {'value': 'YES', 'label': 'YES', 'is_correct': answer == 'YES'},
            {'value': 'NO', 'label': 'NO', 'is_correct': answer == 'NO'},
            {'value': 'NOT GIVEN', 'label': 'NOT GIVEN', 'is_correct': answer == 'NOT GIVEN'},
        ],
        'correct_answers': [answer],
        'correct_answer': answer,
        'matchPairs': None,
    })
    print(f"Q{idx}: YES_NO_NOT_GIVEN, answer={answer}")

data['questions'] = new_questions

# Update instruction_md
data['sections'][0]['instruction_md'] = """**Questions 1-6:**
Complete the summary below using the list of words, A-K.

**Word Bank:**
- A. form and function
- B. long yawns
- C. 3 seconds
- D. fixed action pattern
- E. 68 seconds
- F. short yawns
- G. reflex
- H. sneeze
- I. short duration
- J. 6 seconds
- K. half-yawns

---

**Questions 7-11:**
Choose the correct letter, **A**, **B**, **C** or **D**.

---

**Questions 12-14:**
Do the following statements agree with the claims of the writer?

Write
- **YES** if the statement agrees with the claims of the writer
- **NO** if the statement contradicts the claims of the writer
- **NOT GIVEN** if it is impossible to say what the writer thinks about this"""

path.write_text(json.dumps(data, indent=2, ensure_ascii=False))
print(f"\nSaved: {path}")
