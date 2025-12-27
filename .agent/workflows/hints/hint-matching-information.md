---
description: MATCHING_INFORMATION - Match info / Label map or diagram
---

# MATCHING_INFORMATION

## Khi nào sử dụng:
- "Which paragraph contains the following information?"
- "Label the map/plan/diagram"
- "Match each statement with the correct section"
- Map labeling questions (choose A-G)
- Answer là SINGLE letter cho mỗi question

## Expected JSON Structure:

```json
{
  "idx": 8,
  "type": "MATCHING_INFORMATION",
  "promptMd": "Location marked 8 on the map",
  "options": [],
  "correct_answers": ["B"],
  "matchPairs": {"info-q8": ["B"]}
}
```

## 🚨 STRICT RULES:

### 1. Options MUST be empty:
```json
"options": []  // ✅ CRITICAL - must be empty array!
```

> ⚠️ Nếu options không rỗng → Frontend render sai UI!

### 2. matchPairs Format:
```json
"matchPairs": {"info-q8": ["B"]}
// Key: unique identifier
// Value: array with SINGLE letter
```

### 3. Answer Format:
```
✅ Single uppercase letter: "A", "B", "C"... "G"
❌ Multiple letters: "A, B" (này là MCQ_MULTIPLE)
❌ Lowercase: "b"
```

### 4. MAP_LABEL Conversion:
```python
# MAP_LABEL → MATCHING_INFORMATION (same UI)
if type == 'MAP_LABEL' and answer is single letter:
    type = 'MATCHING_INFORMATION'
    options = []
```

### 5. Required Fields:
| Field | Required | Value |
|-------|----------|-------|
| `options` | ✅ | `[]` (MUST be empty!) |
| `matchPairs` | ✅ | `{key: [letter]}` |
| `correct_answers` | ✅ | `["B"]` single letter |

### 6. Frontend Input:
```
User nhập 1 chữ cái (A-J)
Frontend validates: /^[A-J]$/i
```

### 7. KHÔNG nhầm với MCQ_MULTIPLE:
```
MATCHING_INFORMATION: Mỗi question = 1 letter answer
MCQ_MULTIPLE: 1 question = 2-3 letter answers (A, B)
```

## Hints Usage:
```bash
--hints="Q8-10:MATCHING_INFORMATION"
```

## passageMd Format (for Map/Diagram):
```markdown
## Questions 8-10

Label the map below. Choose **THREE** answers from the box.

### Options:
- **A** bicycle parking
- **B** drinks machine
- **C** first aid room
- **D** manager's office
- **E** telephones
- **F** ticket office
- **G** toilets

### Map:

![Map](https://cloudinary.com/xxx/map.jpg)

**Questions:**
- **8** Location 8: _______
- **9** Location 9: _______
- **10** Location 10: _______
```

## passageMd Format (for Paragraph Info):
```markdown
## Questions 1-5

Which paragraph contains the following information?

**A** Introduction to the topic
**B** Historical background
**C** Modern developments
**D** Future predictions
**E** Conclusion

- **1** A reference to early experiments → _______
- **2** The economic impact → _______
```

## Grader: `MatchingHeadingGrader`
## UI: `matching_letter` (Single letter text input A-J)
