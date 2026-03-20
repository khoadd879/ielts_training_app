# Completion Question Types

Completion questions require students to fill in blanks. **Standard blank placeholder is `[number]`**.

## Overview

| Type | Blank Format | Word Bank |
|------|-------------|-----------|
| SENTENCE_COMPLETION | Single `[1]` | No |
| SUMMARY_COMPLETION | Multiple `[1]`, `[2]`... | Optional |
| NOTE_COMPLETION | Multiple `[1]`, `[2]`... | No |
| TABLE_COMPLETION | `[1]`, `[2]`... in cells | No |
| FLOW_CHART_COMPLETION | Multiple `[1]`, `[2]`... | Optional |
| SHORT_ANSWER | N/A (full answer) | No |

## Blank Pattern Standard

### ✅ CORRECT Format
```javascript
"The city was founded in [1]."
"Hydrothermal vents rely on [1] bacteria which convert [2] into energy."
```

### ❌ LEGACY Formats (will be normalized)
```javascript
"The city was founded in ____."           // Underscores
"The answer is ____(10)____ bacteria"    // Numbered underscores
"The answer is [blank]"                  // [blank] keyword
```

### Regex for Parsing
```javascript
/\[\s*(\d+)\s*\]/g
```

---

## 1. SENTENCE_COMPLETION

### Description
Fill in a single blank in a sentence.

### Metadata Structure
```typescript
{
  type: "SENTENCE_COMPLETION",
  sentenceWithBlank: "The city was founded in [1].",
  maxWords: 2,
  correctAnswers: ["Paris", "london"]  // Case-insensitive
}
```

### Example
```json
{
  "type": "SENTENCE_COMPLETION",
  "sentenceWithBlank": "The capital of France is [1].",
  "maxWords": 1,
  "correctAnswers": ["Paris"]
}
```

### Teacher Form
- File: `FillBlankForm.jsx` (SENTENCE mode)
- Enter sentence with `[1]` placeholder
- Enter answer text
- Set max word count

### Student Renderer
- File: `RenderFillBlank.jsx`
- Sentence displays with input field at `[1]` position

---

## 2. SUMMARY_COMPLETION

### Description
Fill in multiple blanks in a summary paragraph. Can use word bank.

### Metadata Structure
```typescript
{
  type: "SUMMARY_COMPLETION",
  blankLabel: "10",  // Question number for this blank
  maxWords: 2,
  hasWordBank: true,
  wordBank: [
    { id: "1", text: "chemosynthetic" },
    { id: "2", text: "photosynthetic" }
  ],
  correctAnswers: ["chemosynthetic"],
  fullParagraph: "Hydrothermal vents support ecosystems that rely on [1] bacteria..."
}
```

### Example
```json
{
  "type": "SUMMARY_COMPLETION",
  "blankLabel": "1",
  "maxWords": 1,
  "hasWordBank": false,
  "correctAnswers": ["chemosynthetic"],
  "fullParagraph": "Hydrothermal vents support ecosystems that rely on [1] bacteria which convert chemicals into energy."
}
```

### With Word Bank
```json
{
  "type": "SUMMARY_COMPLETION",
  "blankLabel": "10",
  "maxWords": 1,
  "hasWordBank": true,
  "wordBank": [
    { "id": "1", "text": "chemosynthetic" },
    { "id": "2", "text": "photosynthetic" }
  ],
  "correctAnswers": ["chemosynthetic"],
  "fullParagraph": "The bacteria found at vents are [1]."
}
```

### Teacher Form
- File: `FillBlankForm.jsx` (SUMMARY mode)
- Enter full paragraph with `[1]`, `[2]`, etc.
- Enter answers for each blank
- Toggle word bank option

### Student Renderer
- File: `RenderFillBlank.jsx`
- Displays paragraph with input fields
- If word bank: shows dropdown instead of text input

---

## 3. NOTE_COMPLETION

### Description
Fill in blanks within notes or bullet points.

### Metadata Structure
```typescript
{
  type: "NOTE_COMPLETION",
  noteContext: "Key points about the discovery:",
  maxWords: 2,
  correctAnswers: ["answer"],
  fullNoteText: "Key points: [1] were observed..."
}
```

### Example
```json
{
  "type": "NOTE_COMPLETION",
  "noteContext": "Notes on the experiment",
  "maxWords": 2,
  "correctAnswers": ["successful"],
  "fullNoteText": "The experiment was [1]."
}
```

### Teacher Form
- File: `FillBlankForm.jsx` (SUMMARY mode - same component)
- Enter note text with `[number]` placeholders

---

## 4. TABLE_COMPLETION

### Description
Fill in blanks within table cells.

### Metadata Structure
```typescript
{
  type: "TABLE_COMPLETION",
  rowIndex: 0,     // 0-based row index
  columnIndex: 1,  // 0-based column index
  maxWords: 2,
  correctAnswers: ["Answer"]
}
// Note: The table HTML with [number] placeholders is stored in question.content
```

### Example
```json
{
  "type": "TABLE_COMPLETION",
  "rowIndex": 2,
  "columnIndex": 1,
  "maxWords": 1,
  "correctAnswers": ["1900"]
}
```

### Content Format
```html
<!-- question.content contains HTML table with placeholders -->
<table>
  <tr><td>Year</td><td>Event</td></tr>
  <tr><td>1800</td><td>[1]</td></tr>
  <tr><td>1850</td><td>[2]</td></tr>
</table>
```

### Teacher Form
- File: `FillBlankForm.jsx` (TABLE mode)
- Create table with `[1]`, `[2]` placeholders in cells
- Enter answers for each cell

### Student Renderer
- File: `RenderFillBlank.jsx`
- Parses HTML table
- Renders input fields at placeholder positions

---

## 5. FLOW_CHART_COMPLETION

### Description
Fill in blanks within a flowchart or process steps.

### Metadata Structure
```typescript
{
  type: "FLOW_CHART_COMPLETION",
  stepLabel: "Step 1",
  maxWords: 3,
  hasWordBank: true,
  wordBank: [
    { id: "1", text: "heat" },
    { id: "2", text: "pressure" }
  ],
  correctAnswers: ["heat"],
  fullFlowText: "Process: [1] → [2] → [3]"
}
```

### Example
```json
{
  "type": "FLOW_CHART_COMPLETION",
  "stepLabel": "1",
  "maxWords": 2,
  "hasWordBank": false,
  "correctAnswers": ["evaporation"],
  "fullFlowText": "The water cycle starts with [1] of water."
}
```

### Teacher Form
- File: `FillBlankForm.jsx` (SUMMARY mode - same component)
- Enter flow chart text with `[number]` placeholders

---

## 6. SHORT_ANSWER

### Description
Provide a short free-text answer. Multiple acceptable answers allowed.

### Metadata Structure
```typescript
{
  type: "SHORT_ANSWER",
  maxWords: 3,
  correctAnswers: ["answer1", "alternative answer", "another valid answer"]
}
```

### Example
```json
{
  "type": "SHORT_ANSWER",
  "maxWords": 3,
  "correctAnswers": ["global warming", "climate change", "greenhouse effect"]
}
```

### Teacher Form
- File: `ShortAnswerForm.jsx`
- Enter question
- Enter acceptable answers (one per line)

### Student Renderer
- File: `RenderShortAnswer.jsx`
- Simple text input
- Case-insensitive matching

---

## Common Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | Yes | Question type code |
| `maxWords` | number | Yes | Maximum words in answer |
| `correctAnswers` | array | Yes | Acceptable answer(s) |
| `fullParagraph/fullNoteText/fullFlowText` | string | No | Full text with `[number]` |
| `hasWordBank` | boolean | No | Whether word bank is used |
| `wordBank` | array | No | Word bank items |
