---
description: MCQ_SINGLE - Choose ONE letter (A/B/C/D)
---

# MCQ_SINGLE (MULTIPLE_CHOICE_SINGLE)

## Khi nào sử dụng:
- "Choose the correct letter, A, B, C or D"
- "Choose ONE answer"
- Single answer from A-D

## Expected JSON Structure:

```json
{
  "idx": 11,
  "type": "MULTIPLE_CHOICE_SINGLE",
  "promptMd": "What is the main purpose of the project?",
  "options": [
    {"id": "uuid1", "idx": 1, "contentMd": "A. to improve education", "isCorrect": false},
    {"id": "uuid2", "idx": 2, "contentMd": "B. to reduce costs", "isCorrect": true},
    {"id": "uuid3", "idx": 3, "contentMd": "C. to increase production", "isCorrect": false},
    {"id": "uuid4", "idx": 4, "contentMd": "D. to create jobs", "isCorrect": false}
  ],
  "correct_answers": ["B"],
  "matchPairs": null
}
```

## 🚨 STRICT RULES:

### 1. Options Format:
```
✅ "A. Full text" (Letter + dot + space + text)
✅ "B. to reduce costs"
❌ "A) Full text" (parenthesis instead of dot)
❌ "A text" (missing dot)
❌ "a. full text" (lowercase letter)
```

### 2. isCorrect Count:
```
✅ EXACTLY 1 option has isCorrect: true
❌ 0 isCorrect: true → Cannot determine answer
❌ 2+ isCorrect: true → Which one is correct?
```

### 3. Options Count:
```
✅ 3-5 options (typical: 4)
❌ < 3 options
```

### 4. promptMd Rules:
```
✅ "What is the main purpose?" (question only)
❌ "11. What is the main purpose?" (no number prefix!)
❌ "A. to improve..." (don't include options in prompt)
```

### 5. Required Fields:
| Field | Required | Value |
|-------|----------|-------|
| `options` | ✅ | 3-5 items |
| `matchPairs` | ❌ | null |
| `isCorrect` | ✅ | EXACTLY 1 = true |
| `contentMd` | ✅ | "A. Text" format |

### 6. Detection: MCQ_SINGLE vs MCQ_MULTIPLE:
```python
# MCQ_SINGLE
if "choose ONE" or "the correct letter" and answer is single:
    type = "MULTIPLE_CHOICE_SINGLE"

# MCQ_MULTIPLE  
if "TWO" or "THREE" in prompt or answer has comma:
    type = "MULTIPLE_CHOICE_MULTIPLE"
```

## Hints Usage:
```bash
--hints="Q11-13:MCQ_SINGLE"
```

## passageMd Format:
```markdown
## Questions 11-13

Choose the correct letter, **A, B, C** or **D**.

**11.** What is the main purpose of the project?
- **A** to improve education
- **B** to reduce costs
- **C** to increase production
- **D** to create jobs

**12.** According to the passage, what was the initial problem?
- **A** lack of funding
- **B** insufficient staff
- **C** outdated equipment
- **D** poor management
```

## Grader: `SingleChoiceGrader`
## UI: `choice_single` (Radio buttons)
