---
description: TRUE_FALSE_NOT_GIVEN questions
---

# TRUE_FALSE_NOT_GIVEN

## Khi nào sử dụng:
- "Do the following statements agree with the information?"
- "Write TRUE, FALSE, or NOT GIVEN"
- Factual statements về passage content (facts, không phải opinions)

## Expected JSON Structure:

```json
{
  "idx": 1,
  "type": "TRUE_FALSE_NOT_GIVEN",
  "promptMd": "The project was completed on time.",
  "options": [
    {"id": "uuid1", "idx": 1, "contentMd": "TRUE", "isCorrect": true},
    {"id": "uuid2", "idx": 2, "contentMd": "FALSE", "isCorrect": false},
    {"id": "uuid3", "idx": 3, "contentMd": "NOT GIVEN", "isCorrect": false}
  ],
  "correct_answers": ["TRUE"],
  "matchPairs": null
}
```

## 🚨 STRICT RULES:

### 1. Options MUST be EXACTLY 3:
```json
"options": [
  {"contentMd": "TRUE", "isCorrect": false},
  {"contentMd": "FALSE", "isCorrect": false},
  {"contentMd": "NOT GIVEN", "isCorrect": false}
]
```

### 2. Option contentMd (EXACT text):
```
✅ "TRUE" (not "True" or "true")
✅ "FALSE" (not "False")
✅ "NOT GIVEN" (not "Not Given" or "NOT_GIVEN")
```

### 3. isCorrect Count:
```
✅ EXACTLY 1 option has isCorrect: true
❌ 0 or 2+ isCorrect: true → Invalid
```

### 4. promptMd Rules:
```
✅ "Statement text without number."
❌ "1. Statement text" (no number prefix!)
```
> Frontend already displays question number from `idx`

### 5. Detection vs YES_NO_NOT_GIVEN:
```python
# TFNG = facts (thông tin thực tế từ passage)
if question_about == "information/facts": type = "TRUE_FALSE_NOT_GIVEN"

# YNNG = opinions (quan điểm của tác giả)
if question_about == "views/claims/opinions": type = "YES_NO_NOT_GIVEN"
```

### 6. Required Fields:
| Field | Required | Value |
|-------|----------|-------|
| `options` | ✅ | EXACTLY 3: T/F/NG |
| `matchPairs` | ❌ | null |
| `isCorrect` | ✅ | EXACTLY 1 = true |

## Hints Usage:
```bash
--hints="Q1-7:TRUE_FALSE_NOT_GIVEN"
```

## passageMd Format:
```markdown
## Questions 1-7

Do the following statements agree with the **information** given in the passage?

Write:
- **TRUE** if the statement agrees with the information
- **FALSE** if the statement contradicts the information
- **NOT GIVEN** if there is no information on this

**1.** The project was completed on time.
**2.** The cost exceeded the initial budget.
**3.** All workers were paid fairly.
```

## Grader: `SingleChoiceGrader`
## UI: `choice_single` (3 Radio buttons: TRUE / FALSE / NOT GIVEN)
