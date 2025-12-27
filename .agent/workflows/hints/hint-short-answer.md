---
description: SHORT_ANSWER - Write short answer
---

# SHORT_ANSWER

## Khi nào sử dụng:
- "Answer the questions below"
- "Write NO MORE THAN THREE WORDS"
- Direct questions requiring short answers
- Câu hỏi trực tiếp (KHÔNG có _______ trong prompt)

## Expected JSON Structure:

```json
{
  "idx": 4,
  "type": "SHORT_ANSWER",
  "promptMd": "What material was used for the original design? _______",
  "options": [],
  "matchPairs": null,
  "shortAnswerAcceptTexts": ["WOOD", "WOODEN MATERIAL"],
  "correct_answers": ["WOOD"]
}
```

## 🚨 STRICT RULES:

### 1. Blank Pattern (STILL REQUIRED):
```javascript
// Even though it's a direct question, still need underscore for input:
const re = /_{3,}/g;
```

```
✅ "What material was used? _______"
❌ "What material was used?" (no underscore = no input rendered!)
```

### 2. shortAnswerAcceptTexts (NOT blankAcceptTexts):
```json
// SHORT_ANSWER uses shortAnswerAcceptTexts
"shortAnswerAcceptTexts": ["WOOD", "WOODEN"],

// SUMMARY_COMPLETION uses blankAcceptTexts
"blankAcceptTexts": {"0": ["WOOD"]}
```

### 3. Required Fields:
| Field | Required | Value |
|-------|----------|-------|
| `options` | ✅ | `[]` (empty) |
| `matchPairs` | ❌ | null |
| `promptMd` | ✅ | PHẢI có `_{3,}` |
| `shortAnswerAcceptTexts` | ✅ | Array of accepted answers |

### 4. Answer Format:
```
✅ UPPERCASE: "WOOD", "1772"
✅ Multiple accepted: ["1772", "SEVENTEEN SEVENTY-TWO"]
✅ Regex option: "shortAnswerAcceptRegex": ["17\\d{2}"]
```

### 5. Khác với SUMMARY_COMPLETION:
```
SHORT_ANSWER:
- Direct question format
- Uses shortAnswerAcceptTexts
- Single answer per question

SUMMARY_COMPLETION:
- Gap-fill trong context
- Uses blankAcceptTexts với blank index
- Có thể nhiều blanks trong 1 promptMd
```

## Hints Usage:
```bash
--hints="Q4-8:SHORT_ANSWER"
```

## passageMd Format:
```markdown
## Questions 4-8

Answer the questions below. Write **NO MORE THAN THREE WORDS** for each answer.

**4.** What material was used for the original design? _______

**5.** How long did the project take to complete? _______

**6.** Who was responsible for the funding? _______

**7.** When did construction begin? _______

**8.** What was the total cost? _______
```

## Grader: `ShortAnswerGrader`
## UI: `completion` (Text input field)
