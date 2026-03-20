# Blank Patterns Standard

## Overview

For completion questions, the **standard blank placeholder is `[number]`**. This is how students know where to fill in answers.

## Standard Format

### ✅ CORRECT
```javascript
"The city was founded in [1]."
"Hydrothermal vents rely on [1] bacteria which convert [2] into energy."
"Complete the [1] with [2]."
```

### ❌ LEGACY (will be auto-normalized)
```javascript
"The city was founded in ____."           // 4+ underscores
"The answer is ____(10)____ bacteria"     // Numbered underscores
"The answer is [blank]"                   // [blank] keyword
"The city was [blank] in 1066."           // [blank] anywhere
```

## Regex Patterns

### For Detection
```javascript
/\[\s*(\d+)\s*\]/g        // Standard: [1], [ 2 ], [3 ]
/_{4,}/g                 // Legacy: ____, _____, ______
/____\((\d+)\)____/g    // Legacy: ____(10)____
/\[blank\]/gi            // Legacy: [blank]
```

### For Parsing (Student Renderer)
```javascript
// Split text by [number] pattern
const parts = text.split(/\[\s*(\d+)\s*\]/g);
// "The [1] is [2]" → ["The ", "1", " is ", "2", ""]
// Odd indices are question numbers
```

### For Normalization (Backend Import)
```javascript
// Any of these will be converted to [number]:
____(10)____  →  [10]
_____          →  [1]  (sequential)
// etc.
```

---

## Blank Numbering

### Sequential Numbering (Recommended)
When multiple blanks exist, number sequentially:
```javascript
"[1] and [2] and [3]"
```

### Original Question Numbers
If the source uses specific question numbers, preserve them:
```javascript
// Source: "Answer question [10] and [11]"
// Normalized: "[10] and [11]" (if single blank) or "[1] and [2]" (if sequential)
```

---

## Completion Types & Blank Usage

| Type | Example |
|------|---------|
| SENTENCE_COMPLETION | `"The [1] is the capital of France."` |
| SUMMARY_COMPLETION | `"The [1] bacteria convert [2] into energy."` |
| NOTE_COMPLETION | `"Key point: [1] was discovered by [2]."` |
| TABLE_COMPLETION | Table HTML with `[1]`, `[2]` in cells |
| FLOW_CHART_COMPLETION | `"[1] → [2] → [3] → [4]"` |

---

## Frontend Implementation

### Teacher Form (FillBlankForm.jsx)

**SUMMARY mode - inserting placeholder:**
```javascript
// CORRECT - use [number]
const placeholder = ` [${numberQuestion}] `;

// Update state
setSummaryText(prev => prev + placeholder);
```

**SENTENCE mode:**
```javascript
// CORRECT - use [number]
content: sentenceText + " [" + questionNumber + "]"
```

### Student Renderer (RenderFillBlank.jsx)

**Already correct - parses [number]:**
```javascript
const renderNode = (node) => {
  if (node.nodeType === Node.TEXT_NODE) {
    const parts = text.split(/\[\s*(\d+)\s*\]/g);
    // Odd indices are question numbers
    return parts.map((part, i) => {
      if (i % 2 === 1) {
        // This is a question number - render input
        return <InlineInput question={getQuestionByNumber(part)} />;
      }
      return part;  // Regular text
    });
  }
};
```

---

## Backend Normalization

The `BlankNormalizer` utility handles conversion from legacy formats:

```typescript
import { BlankNormalizer } from './blank-normalizer';

const normalizer = new BlankNormalizer();

// Convert any format to standard [number]
const result = normalizer.normalizeToNumberedPattern(
  "____(10)____ bacteria which convert ____(11)____"
);
// Result: { normalizedText: "[1] bacteria which convert [2]", blanks: [...] }
```

---

## Migration Guide

### For Teachers (if using legacy formats)
1. Continue working as normal
2. System will auto-normalize on save

### For Frontend Devs
1. Use `[number]` format when inserting placeholders
2. Don't use `_____` or `[blank]`
3. Renderer already handles `[number]` parsing

---

## Checklist

- [ ] Teacher forms insert `[1]`, `[2]`, `[3]` not `____`
- [ ] Renderer uses regex `/\[\s*(\d+)\s*\]/g`
- [ ] Backend normalizes legacy formats on import
- [ ] Documentation shared with content team
