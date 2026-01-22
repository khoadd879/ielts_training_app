---
description: MCQ_MULTIPLE - Choose TWO/THREE letters
---

# MCQ_MULTIPLE (MULTIPLE_CHOICE_MULTIPLE)

## Khi nào sử dụng:
- "Choose TWO letters, A-E"
- "Choose THREE answers"
- "Which TWO of the following..."
- Answer có dấu phẩy: "A, B" hoặc "C, D"

## Expected JSON Structure:

```json
{
  "idx": 1,
  "type": "MULTIPLE_CHOICE_MULTIPLE",
  "promptMd": "Which TWO activities are available at the centre?",
  "options": [
    {"id": "uuid1", "idx": 1, "contentMd": "A. swimming", "isCorrect": true},
    {"id": "uuid2", "idx": 2, "contentMd": "B. tennis", "isCorrect": false},
    {"id": "uuid3", "idx": 3, "contentMd": "C. yoga", "isCorrect": true},
    {"id": "uuid4", "idx": 4, "contentMd": "D. football", "isCorrect": false},
    {"id": "uuid5", "idx": 5, "contentMd": "E. basketball", "isCorrect": false}
  ],
  "correct_answers": ["A", "C"],
  "matchPairs": null
}
```

## 🚨 STRICT RULES:

### 1. Options Format:
```
✅ "A. First option text" (Letter + dot + space + text)
✅ "B. Second option"
❌ "A) First option" (parenthesis)
❌ "a. first option" (lowercase)
```

### 2. isCorrect Count:
```
✅ Có thể có 2+ options với isCorrect: true
✅ Choose TWO → exactly 2 isCorrect: true
✅ Choose THREE → exactly 3 isCorrect: true
```

### 3. Detection Rule:
```python
# DETECTION - Use these to identify MCQ_MULTIPLE:
if 'TWO' in prompt or 'THREE' in prompt: type = 'MULTIPLE_CHOICE_MULTIPLE'
if answer has comma ('A, B'):            type = 'MULTIPLE_CHOICE_MULTIPLE'
```

### 4. Grading Logic:
```
User PHẢI chọn ĐÚNG TẤT CẢ correct options (set equality)
- Selected = {A, C}, Correct = {A, C} → ✅ PASS
- Selected = {A, B}, Correct = {A, C} → ❌ FAIL
- Selected = {A}, Correct = {A, C} → ❌ FAIL (incomplete)
```

### 5. Required Fields:
| Field | Required | Value |
|-------|----------|-------|
| `options` | ✅ | 5+ options with multi isCorrect |
| `matchPairs` | ❌ | null |
| `isCorrect` | ✅ | 2-3 options = true |

### 6. KHÔNG nhầm với MATCHING_INFORMATION:
```
⚠️ "Which TWO films..." với answer "A, B"
   → MCQ_MULTIPLE (KHÔNG phải MATCHING_INFORMATION)
   
⚠️ Chỉ dùng MATCHING_INFORMATION khi answer là SINGLE letter cho mỗi question
```

## Hints Usage:
```bash
--hints="Q1-2:MCQ_MULTIPLE"
```

## passageMd Format:
```markdown
## Questions 1-2

Choose **TWO** letters, **A-E**.

Which TWO activities are available?

- **A** swimming
- **B** tennis
- **C** yoga
- **D** football
- **E** basketball
```

## Grader: `MultipleChoiceGrader`
## UI: `choice_multiple` (Checkboxes)
