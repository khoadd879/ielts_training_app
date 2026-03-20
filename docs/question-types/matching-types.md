# Matching Question Types

Matching questions require students to correctly match items from two sets.

## Overview

There are 4 matching types:

| Type | Match From | Match To |
|------|-----------|----------|
| MATCHING_HEADING | Paragraphs | Headings |
| MATCHING_INFORMATION | Statements | Paragraphs |
| MATCHING_FEATURES | Items | Categories |
| MATCHING_SENTENCE_ENDINGS | Stems | Endings |

---

## 1. MATCHING_HEADING

### Description
Match paragraphs to their correct headings (i, ii, iii, etc.)

### Metadata Structure
```typescript
{
  type: "MATCHING_HEADING",
  headings: [
    { label: "i", text: "Heading i text..." },
    { label: "ii", text: "Heading ii text..." },
    { label: "iii", text: "Heading iii text..." }
  ],
  paragraphRef: "Paragraph A",
  correctHeadingIndex: 0  // Index in headings array
}
```

### Example
```json
{
  "type": "MATCHING_HEADING",
  "headings": [
    { "label": "i", "text": "The history of the city" },
    { "label": "ii", "text": "Modern developments" },
    { "label": "iii", "text": "Climate and geography" }
  ],
  "paragraphRef": "Paragraph A",
  "correctHeadingIndex": 1
}
```

### Teacher Form
- File: `MatchingForm.jsx`
- Enter heading options
- Select which paragraph this question refers to
- Choose correct heading

---

## 2. MATCHING_INFORMATION

### Description
Match information/statements to the paragraph where it appears.

### Metadata Structure
```typescript
{
  type: "MATCHING_INFORMATION",
  statement: "Which paragraph contains information about...",
  paragraphLabels: ["A", "B", "C", "D", "E", "F"],
  correctParagraph: "C"
}
```

### Example
```json
{
  "type": "MATCHING_INFORMATION",
  "statement": "Information about the population growth",
  "paragraphLabels": ["A", "B", "C", "D", "E"],
  "correctParagraph": "C"
}
```

### Teacher Form
- File: `MatchingForm.jsx`
- Enter statement to match
- Enter available paragraph labels
- Select correct paragraph

---

## 3. MATCHING_FEATURES

### Description
Match items/features to their correct category or person.

### Metadata Structure
```typescript
{
  type: "MATCHING_FEATURES",
  statement: "Match the inventions to their inventors",
  features: [
    { label: "1", text: "Telephone" },
    { label: "2", text: "Light bulb" },
    { label: "3", text: "Internet" }
  ],
  correctFeatureLabel: "A"  // Correct category label
}
```

### Example
```json
{
  "type": "MATCHING_FEATURES",
  "statement": "Which researcher discovered this?",
  "features": [
    { "label": "1", "text": "Theory of relativity" },
    { "label": "2", "text": "Gravity laws" }
  ],
  "correctFeatureLabel": "Einstein"
}
```

### Teacher Form
- File: `MatchingForm.jsx`
- Enter feature items
- Enter category options
- Select correct category

---

## 4. MATCHING_SENTENCE_ENDINGS

### Description
Complete a sentence by selecting the correct ending from options.

### Metadata Structure
```typescript
{
  type: "MATCHING_SENTENCE_ENDINGS",
  sentenceStem: "The city was founded",
  endings: [
    { label: "A", text: "in 1066 by William the Conqueror." },
    { label: "B", text: "as a Roman trading post." },
    { label: "C", text: "in the 15th century." }
  ],
  correctEndingLabel: "B"
}
```

### Example
```json
{
  "type": "MATCHING_SENTENCE_ENDINGS",
  "sentenceStem": "According to the passage, the study shows that",
  "endings": [
    { "label": "A", "text": "technology has improved education." },
    { "label": "B", "text": "traditional methods are still superior." },
    { "label": "C", "text": "both online and offline learning are equally effective." }
  ],
  "correctEndingLabel": "C"
}
```

### Teacher Form
- File: `MatchingForm.jsx`
- Enter sentence stem (beginning)
- Enter possible endings
- Select correct ending

### Student Renderer
- File: `RenderMatching.jsx`
- Displays stem and ending options

---

## Common Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | Yes | Question type code |
| `statement` | string | Yes | Question/stem text |
| `headings/endings/features` | array | Yes | Options to match from |
| `correctHeadingIndex/correctParagraph/correctFeatureLabel/correctEndingLabel` | string/number | Yes | Correct answer |
