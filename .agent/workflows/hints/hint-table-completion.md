---
description: TABLE_COMPLETION - Complete a table
---

# TABLE_COMPLETION

## Khi nào sử dụng:
- "Complete the table below"
- Tables với gaps cần điền

## Expected JSON Structure:

```json
{
  "idx": 5,
  "type": "TABLE_COMPLETION",
  "promptMd": "Type of material: _______",
  "options": [],
  "matchPairs": null,
  "blankAcceptTexts": {
    "0": ["PLASTIC", "PLASTICS"]
  },
  "correct_answers": ["PLASTIC"]
}
```

## 🚨 STRICT RULES:

### 1. Blank Pattern (CRITICAL):
```javascript
// Frontend regex:
const re = /_{3,}/g; // 3+ underscores = blank input
```

| Pattern | Valid? |
|---------|--------|
| `_______` | ✅ |
| `___` | ✅ |
| `...` | ❌ |

### 2. Required Fields:
| Field | Required | Value |
|-------|----------|-------|
| `options` | ✅ | `[]` (empty) |
| `matchPairs` | ❌ | null |
| `promptMd` | ✅ | PHẢI có `_{3,}` |
| `blankAcceptTexts` | ✅ | Dict với keys = blank index |

### 3. Answer Format:
```
✅ UPPERCASE: "PLASTIC", "WOOD AND GLASS"
✅ Multiple accepted: ["PLASTIC", "PLASTICS"]
```

### 4. ⚠️ CRITICAL - Thay TABLE bằng BULLET LIST:
```
ReactMarkdown KHÔNG render markdown tables tốt!
Convert table → bullet list format trong passageMd
```

**❌ DON'T use markdown tables:**
```markdown
| Material | Advantages |
|----------|------------|
| Wood | **5** _______ |
```

**✅ DO use bullet list format:**
```markdown
### Wood
- **Advantages:** durable
- **Disadvantages:** **5** _______
```

## Hints Usage:
```bash
--hints="Q5-8:TABLE_COMPLETION"
```

## passageMd Format (BULLET LIST - Preferred):
```markdown
## Questions 5-8

Complete the notes below. Write **NO MORE THAN TWO WORDS**.

### Material Comparison

**Wood**
- Advantages: durable, natural
- Disadvantages: **5** _______

**6** _______ (material name)
- Advantages: lightweight
- Disadvantages: expensive

**Metal**
- Advantages: strong
- Disadvantages: **7** _______ and **8** _______
```

## Grader: `CompletionGrader`
## UI: `completion` (Text input fields)
