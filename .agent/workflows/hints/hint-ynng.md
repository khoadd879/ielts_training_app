---
description: YES_NO_NOT_GIVEN questions
---

# YES_NO_NOT_GIVEN

## Khi nào sử dụng:
- "Do the following statements agree with the views/claims of the writer?"
- "Write YES, NO, or NOT GIVEN"
- Opinion/view statements (quan điểm tác giả, KHÔNG phải facts)

## Expected JSON Structure:

```json
{
  "idx": 1,
  "type": "YES_NO_NOT_GIVEN",
  "promptMd": "The author believes climate change is reversible.",
  "options": [
    {"id": "uuid1", "idx": 1, "contentMd": "YES", "isCorrect": false},
    {"id": "uuid2", "idx": 2, "contentMd": "NO", "isCorrect": true},
    {"id": "uuid3", "idx": 3, "contentMd": "NOT GIVEN", "isCorrect": false}
  ],
  "correct_answers": ["NO"],
  "matchPairs": null
}
```

## 🚨 STRICT RULES:

### 1. Options MUST be EXACTLY 3:
```json
"options": [
  {"contentMd": "YES", "isCorrect": false},
  {"contentMd": "NO", "isCorrect": false},
  {"contentMd": "NOT GIVEN", "isCorrect": false}
]
```

### 2. Option contentMd (EXACT text):
```
✅ "YES" (not "Yes" or "yes")
✅ "NO" (not "No")
✅ "NOT GIVEN" (not "Not Given")
```

### 3. isCorrect Count:
```
✅ EXACTLY 1 option has isCorrect: true
❌ 0 or 2+ isCorrect: true → Invalid
```

### 4. promptMd Rules:
```
✅ "Statement about author's view."
❌ "1. Statement" (no number prefix!)
```

### 5. Detection: YNNG vs TFNG:
```python
# YNNG = opinions (quan điểm của tác giả)
if "views" in instruction or "claims" in instruction:
    type = "YES_NO_NOT_GIVEN"
    
# TFNG = facts (thông tin thực tế)
if "information" in instruction:
    type = "TRUE_FALSE_NOT_GIVEN"
```

### 6. Required Fields:
| Field | Required | Value |
|-------|----------|-------|
| `options` | ✅ | EXACTLY 3: Y/N/NG |
| `matchPairs` | ❌ | null |
| `isCorrect` | ✅ | EXACTLY 1 = true |

## Hints Usage:
```bash
--hints="Q1-5:YES_NO_NOT_GIVEN"
```

## passageMd Format:
```markdown
## Questions 1-5

Do the following statements agree with the **views of the writer**?

Write:
- **YES** if the statement agrees with the views of the writer
- **NO** if the statement contradicts the views of the writer
- **NOT GIVEN** if it is impossible to say what the writer thinks

**1.** The author believes climate change is reversible.
**2.** The writer supports government intervention.
**3.** According to the author, technology will solve the problem.
```

## Grader: `SingleChoiceGrader`
## UI: `choice_single` (3 Radio buttons: YES / NO / NOT GIVEN)
