---
description: MATCHING_HEADING - Match paragraphs with headings (i-x)
---

# MATCHING_HEADING

## Khi nào sử dụng:
- "Match each paragraph with the correct heading"
- "Choose the correct heading for each paragraph"
- Headings thường đánh số i, ii, iii... hoặc 1, 2, 3...

## Expected JSON Structure:

```json
{
  "idx": 1,
  "type": "MATCHING_HEADING",
  "promptMd": "Paragraph A",
  "options": [
    {"id": "uuid1", "idx": 1, "contentMd": "i. The importance of planning", "isCorrect": false},
    {"id": "uuid2", "idx": 2, "contentMd": "ii. Early developments", "isCorrect": true},
    {"id": "uuid3", "idx": 3, "contentMd": "iii. Future challenges", "isCorrect": false}
  ],
  "correct_answers": ["ii"],
  "matchPairs": {"section-1": ["ii", "ii. Early developments"]}
}
```

## 🚨 STRICT RULES:

### 1. Options Format:
```
✅ "i. Full heading text"  (Roman + dot + space + text)
✅ "ii. Where to find herbs"
❌ "i) Full heading" (parenthesis instead of dot)
❌ "I. Full heading" (uppercase Roman)
```

### 2. Required Fields:
| Field | Required | Value |
|-------|----------|-------|
| `options` | ✅ | ALL headings (i-xi) |
| `matchPairs` | ✅ | `{key: [value, fullLabel]}` |
| `isCorrect` | ✅ | Exactly 1 option = true |

### 3. matchPairs Format:
```json
"matchPairs": {"section-1": ["ii", "ii. Early developments"]}
```
- Key: unique identifier (e.g., "section-a", "para-1")
- Value[0]: Roman numeral only
- Value[1]: Full heading text with roman

### 4. Passage Rules:
```
✅ Passage chỉ có sections: "**A.** Content..." "**B.** Content..."
❌ Passage KHÔNG được chứa headings list (i-xi)
❌ Passage KHÔNG chứa answer key
```

### 5. Frontend Extraction:
```typescript
// Frontend extracts value by:
value = contentMd.split(".")[0].trim()  // "ii"
```

## Hints Usage:
```bash
--hints="Q1-6:MATCHING_HEADING"
```

## passageMd Format:
```markdown
## Questions 1-6: Match each paragraph with the correct heading

**List of Headings:**
- **i** The importance of planning
- **ii** Early developments  
- **iii** Future challenges
- **iv** Modern applications
- **v** Economic impact
- **vi** Environmental concerns

---

**Passage:**

**A.** [Paragraph A content...]

**B.** [Paragraph B content...]
```

## Grader: `MatchingHeadingGrader`
## UI: `matching_heading` (Dropdown select)
