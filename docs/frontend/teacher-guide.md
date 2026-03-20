# Frontend Teacher Guide

## Overview

This guide covers how frontend teacher forms should send question data to the backend.

## API Payload Structure

### Create Question Endpoint
```
POST /question/create-question
```

### Request Body Format
```typescript
{
  idQuestionGroup: string,      // Question group UUID
  idPart: string,               // Part UUID
  questionNumber: number,       // 1, 2, 3...
  content: string,              // Question text or HTML
  questionType: string,         // "MULTIPLE_CHOICE", etc.
  metadata: { ... },            // Type-specific metadata
  order?: number                 // Optional ordering
}
```

### Create Many Questions
```
POST /question/create-many-questions
```

```typescript
{
  questions: [
    { idQuestionGroup, idPart, questionNumber, content, questionType, metadata },
    { ... },
    { ... }
  ]
}
```

---

## By Question Type

### 1. MULTIPLE_CHOICE

```javascript
{
  questionType: "MULTIPLE_CHOICE",
  content: "What is the capital of France?",
  metadata: {
    type: "MULTIPLE_CHOICE",
    options: [
      { label: "A", text: "Paris" },
      { label: "B", text: "London" },
      { label: "C", text: "Berlin" },
      { label: "D", text: "Rome" }
    ],
    correctOptionIndexes: [0],
    isMultiSelect: false
  }
}
```

**FE Form**: `MCQForm.jsx`

---

### 2. TRUE_FALSE_NOT_GIVEN

```javascript
{
  questionType: "TRUE_FALSE_NOT_GIVEN",
  content: "The main idea of the passage is about climate change.",
  metadata: {
    type: "TRUE_FALSE_NOT_GIVEN",
    statement: "The main idea of the passage is about climate change.",
    correctAnswer: "NOT_GIVEN"
  }
}
```

**FE Form**: `TFNGForm.jsx`

---

### 3. YES_NO_NOT_GIVEN

```javascript
{
  questionType: "YES_NO_NOT_GIVEN",
  content: "The author agrees that reading is beneficial.",
  metadata: {
    type: "YES_NO_NOT_GIVEN",
    statement: "The author agrees that reading is beneficial.",
    correctAnswer: "YES"
  }
}
```

**FE Form**: `YesNoNotGivenForm.jsx`

---

### 4. MATCHING (All Types)

```javascript
{
  questionType: "MATCHING_HEADING",  // or MATCHING_INFORMATION, MATCHING_FEATURES, MATCHING_SENTENCE_ENDINGS
  content: "Match paragraphs to headings",
  metadata: {
    type: "MATCHING_HEADING",
    headings: [
      { label: "i", text: "History of the city" },
      { label: "ii", text: "Modern developments" },
      { label: "iii", text: "Geography" }
    ],
    paragraphRef: "Paragraph A",
    correctHeadingIndex: 1
  }
}
```

**FE Form**: `MatchingForm.jsx`

---

### 5. SENTENCE_COMPLETION

```javascript
{
  questionType: "SENTENCE_COMPLETION",
  content: "The capital of France is [1].",
  metadata: {
    type: "SENTENCE_COMPLETION",
    sentenceWithBlank: "The capital of France is [1].",
    maxWords: 1,
    correctAnswers: ["Paris"]
  }
}
```

**FE Form**: `FillBlankForm.jsx` (SENTENCE mode)

**Important**: Use `[1]` not `_____`

---

### 6. SUMMARY_COMPLETION

```javascript
{
  questionType: "SUMMARY_COMPLETION",
  content: summaryText,  // Full paragraph with [1], [2], etc.
  metadata: {
    type: "SUMMARY_COMPLETION",
    blankLabel: "10",  // Question number
    maxWords: 2,
    hasWordBank: false,
    correctAnswers: ["chemosynthetic"],
    fullParagraph: summaryText  // Same as content
  }
}
```

**FE Form**: `FillBlankForm.jsx` (SUMMARY mode)

---

### 7. TABLE_COMPLETION

```javascript
{
  questionType: "TABLE_COMPLETION",
  content: tableHTML,  // HTML table with [1], [2] in cells
  metadata: {
    type: "TABLE_COMPLETION",
    rowIndex: 2,
    columnIndex: 1,
    maxWords: 1,
    correctAnswers: ["1900"]
  }
}
```

**FE Form**: `FillBlankForm.jsx` (TABLE mode)

---

### 8. FLOW_CHART_COMPLETION

```javascript
{
  questionType: "FLOW_CHART_COMPLETION",
  content: flowText,  // "Process: [1] → [2] → [3]"
  metadata: {
    type: "FLOW_CHART_COMPLETION",
    stepLabel: "Step 1",
    maxWords: 2,
    hasWordBank: false,
    correctAnswers: ["evaporation"],
    fullFlowText: flowText
  }
}
```

**FE Form**: `FillBlankForm.jsx` (SUMMARY mode - same component)

---

### 9. SHORT_ANSWER

```javascript
{
  questionType: "SHORT_ANSWER",
  content: "What is the main cause of climate change?",
  metadata: {
    type: "SHORT_ANSWER",
    maxWords: 3,
    correctAnswers: ["global warming", "greenhouse gases", "carbon emissions"]
  }
}
```

**FE Form**: `ShortAnswerForm.jsx`

---

### 10. DIAGRAM_LABELING

```javascript
{
  questionType: "DIAGRAM_LABELING",
  content: "Label the diagram",
  metadata: {
    type: "DIAGRAM_LABELING",
    imageUrl: "https://example.com/map.png",
    labelCoordinate: { x: 45.0, y: 30.5 },
    pointLabel: "A",
    hasWordBank: false,
    correctAnswers: ["Atlantic Ocean"]
  }
}
```

**FE Form**: `LabelingForm.jsx`

---

## Common Mistakes to Avoid

### ❌ WRONG
```javascript
// Sending answers array instead of metadata
{
  answers: [
    { answer_text: "Paris", matching_key: "A", matching_value: "CORRECT" }
  ]
}
```

### ✅ CORRECT
```javascript
// Send metadata object
{
  metadata: {
    type: "MULTIPLE_CHOICE",
    options: [...],
    correctOptionIndexes: [0],
    isMultiSelect: false
  }
}
```

---

## Validation Errors

If metadata is invalid, you'll get a 400 error:

```json
{
  "statusCode": 400,
  "message": "Invalid metadata for question type MULTIPLE_CHOICE: Required"
}
```

Check the schema reference for required fields.

---

## Testing Checklist

- [ ] MCQ form sends correct metadata
- [ ] TFNG form sends correct metadata
- [ ] YES_NO form sends correct metadata
- [ ] Matching form sends correct metadata
- [ ] FillBlank form uses `[1]` not `____`
- [ ] Summary mode includes `fullParagraph`
- [ ] Table mode sends rowIndex/columnIndex
- [ ] ShortAnswer form sends `correctAnswers` array
- [ ] Labeling form sends valid URL and coordinates
