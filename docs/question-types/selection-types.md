# Selection Question Types

Selection questions require students to select the correct answer(s) from provided options.

## 1. MULTIPLE_CHOICE

### Description
Classic multiple choice with 4 options (A, B, C, D). Can be single or multi-select.

### Metadata Structure
```typescript
{
  type: "MULTIPLE_CHOICE",
  options: [
    { label: "A", text: "Option A text" },
    { label: "B", text: "Option B text" },
    { label: "C", text: "Option C text" },
    { label: "D", text: "Option D text" }
  ],
  correctOptionIndexes: [0],  // Array index of correct option(s)
  isMultiSelect: false        // true = multiple answers allowed
}
```

### Example
```json
{
  "type": "MULTIPLE_CHOICE",
  "options": [
    { "label": "A", "text": "Paris" },
    { "label": "B", "text": "London" },
    { "label": "C", "text": "Berlin" },
    { "label": "D", "text": "Rome" }
  ],
  "correctOptionIndexes": [1],
  "isMultiSelect": false
}
```

### Teacher Form
- File: `MCQForm.jsx`
- Creates options with labels A, B, C, D
- Marks correct answer(s)

### Student Renderer
- File: `RenderMCQ.jsx`
- Displays options as clickable list
- Single: radio buttons | Multi: checkboxes

---

## 2. TRUE_FALSE_NOT_GIVEN

### Description
Evaluate whether a statement is True, False, or Not Given based on the passage.

### Metadata Structure
```typescript
{
  type: "TRUE_FALSE_NOT_GIVEN",
  statement: "The main idea of the passage is about climate change.",
  correctAnswer: "TRUE" | "FALSE" | "NOT_GIVEN"
}
```

### Example
```json
{
  "type": "TRUE_FALSE_NOT_GIVEN",
  "statement": "The author believes technology will solve all environmental problems.",
  "correctAnswer": "NOT_GIVEN"
}
```

### Teacher Form
- File: `TFNGForm.jsx`
- Enter statement text
- Select correct answer from dropdown

### Student Renderer
- File: `RenderTFNG.jsx`
- Displays statement
- Three options: TRUE / FALSE / NOT GIVEN

---

## 3. YES_NO_NOT_GIVEN

### Description
Evaluate whether the author's opinion/claim is Yes, No, or Not Given.

### Metadata Structure
```typescript
{
  type: "YES_NO_NOT_GIVEN",
  statement: "The author agrees that reading is beneficial for children.",
  correctAnswer: "YES" | "NO" | "NOT_GIVEN"
}
```

### Example
```json
{
  "type": "YES_NO_NOT_GIVEN",
  "statement": "The writer suggests that traditional education will disappear.",
  "correctAnswer": "NO"
}
```

### Teacher Form
- File: `YesNoNotGivenForm.jsx`
- Enter statement
- Select correct answer

### Student Renderer
- File: `RenderYesNoNotGiven.jsx`
- Displays statement
- Three options: YES / NO / NOT GIVEN

---

## Common Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | Yes | Question type code |
| `statement` | string | Yes | Text of statement to evaluate |
| `correctAnswer` | string | Yes | Valid answer value |
