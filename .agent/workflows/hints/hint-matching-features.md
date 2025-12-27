---
description: MATCHING_FEATURES - Match features with names
---

# MATCHING_FEATURES

## Khi nào sử dụng:
- "Match each statement with the correct person"
- "Match the features with the theories"
- "Which researcher made the following statement?"
- "Which company...?"

## Expected JSON Structure:

```json
{
  "idx": 7,
  "type": "MATCHING_FEATURES",
  "promptMd": "developed the first working model",
  "options": [],
  "correct_answers": ["B"],
  "matchPairs": {"feature-q7": ["Mary Jones", "B"]}
}
```

## 🚨 STRICT RULES:

### 1. Options MUST be empty:
```json
"options": []  // ✅ CRITICAL - must be empty array!
```

### 2. matchPairs Format:
```json
"matchPairs": {"feature-q7": ["Mary Jones", "B"]}
// Key: unique identifier
// Value[0]: Full name/label
// Value[1]: Letter
```

### 3. Answer Format:
```
✅ Single uppercase letter: "A", "B", "C"
❌ Full name only (need letter for grading)
```

### 4. promptMd Content:
```
✅ Feature/statement text only
✅ "developed the first working model"
❌ "7. developed..." (no number prefix!)
```

### 5. Required Fields:
| Field | Required | Value |
|-------|----------|-------|
| `options` | ✅ | `[]` (empty!) |
| `matchPairs` | ✅ | `{key: [fullLabel, letter]}` |
| `correct_answers` | ✅ | `["B"]` single letter |

### 6. Names/Categories in passageMd:
```markdown
## passageMd should contain the list of options:

**Researchers:**
A. John Smith
B. Mary Jones
C. Peter Brown
D. Sarah Wilson
```

## Hints Usage:
```bash
--hints="Q7-10:MATCHING_FEATURES"
```

## passageMd Format:
```markdown
## Questions 7-10

Match each statement with the correct researcher, **A-D**.

**Researchers:**
- **A** John Smith
- **B** Mary Jones
- **C** Peter Brown
- **D** Sarah Wilson

**Statements:**
- **7** developed the first working model → _______
- **8** proposed an alternative theory → _______
- **9** received the Nobel Prize → _______
- **10** founded the research institute → _______
```

## Grader: `MatchingHeadingGrader`
## UI: `matching_letter` (Single letter text input)
