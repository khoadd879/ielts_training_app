---
description: SUMMARY_COMPLETION - Fill gaps / Write words
---

# SUMMARY_COMPLETION

## Khi nào sử dụng:
- "Complete the notes/summary below"
- "Write NO MORE THAN TWO/THREE WORDS"
- "Fill in the gaps"
- Gap-fill với blank markers: _______

## Expected JSON Structure:

```json
{
  "idx": 3,
  "type": "SUMMARY_COMPLETION",
  "promptMd": "The exhibition opens on: _______",
  "options": [],
  "matchPairs": null,
  "blankAcceptTexts": {
    "0": ["28TH AUGUST", "28 AUGUST", "AUGUST 28"]
  },
  "correct_answers": ["28TH AUGUST"]
}
```

## 🚨 STRICT RULES:

### 1. Blank Pattern (CRITICAL):
```javascript
// Frontend regex:
const re = /_{3,}/g; // 3+ underscores = blank input
```

| Pattern | Valid? | Reason |
|---------|--------|--------|
| `_______` | ✅ | 7 underscores |
| `___` | ✅ | 3 underscores |
| `____` | ✅ | 4 underscores |
| `...` | ❌ | Dots not recognized |
| `(...)` | ❌ | No match |
| `[blank]` | ❌ | No match |

### 2. Required Fields:
| Field | Required | Value |
|-------|----------|-------|
| `options` | ✅ | `[]` (empty array) |
| `matchPairs` | ❌ | null |
| `promptMd` | ✅ | PHẢI có `_{3,}` |
| `blankAcceptTexts` | ✅ | Dict với keys = blank index |

### 3. blankAcceptTexts Format:
```json
"blankAcceptTexts": {
  "0": ["$68.50", "68.50", "$68.5"],     // First blank
  "1": ["utilities", "utility"]          // Second blank
}
```

### 4. Answer Format:
```
✅ UPPERCASE: "28TH AUGUST", "PEOPLE AT WORK"
✅ Multiple accepted: ["PEOPLE AT WORK", "PEOPLE AT THEIR WORK"]
❌ lowercase: "28th august" (normalize to uppercase)
```

### 5. Multiple Blanks in One Prompt:
```json
{
  "promptMd": "The student pays _______ per week. The rent includes _______.",
  "blankAcceptTexts": {
    "0": ["$68.50"],    // First _______
    "1": ["utilities"]  // Second _______
  }
}
```

### 6. Khác với SHORT_ANSWER:
```
SUMMARY_COMPLETION: Gap-fill with _______ marker in context
SHORT_ANSWER: Direct question without _______ in prompt
```

## Hints Usage:
```bash
--hints="Q3-10:SUMMARY_COMPLETION"
```

## passageMd Format:
```markdown
## Questions 3-7

Complete the notes below. Write **NO MORE THAN THREE WORDS AND/OR A NUMBER**.

### Exhibition Information
- Opens: **3** _______
- Current theme: **4** _______
- Visitors can use: **5** _______ service
- New attraction: **6** _______
- Prize: **7** _______ for 2 people
```

## Grader: `CompletionGrader`
## UI: `completion` (Text input fields)
