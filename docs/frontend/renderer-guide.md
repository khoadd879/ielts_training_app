# Frontend Student Renderer Guide

## Overview

This guide explains how student-facing renderers display questions and handle answers.

## Question Renderer Architecture

```
QuestionRenderer.jsx
    │
    ├── RenderMCQ.jsx          → Multiple Choice
    ├── RenderTFNG.jsx        → True/False/Not Given
    ├── RenderYesNoNotGiven.jsx → Yes/No/Not Given
    ├── RenderMatching.jsx    → All Matching types
    ├── RenderFillBlank.jsx   → All Completion types
    ├── RenderShortAnswer.jsx → Short Answer
    └── RenderLabeling.jsx    → Diagram Labeling
```

## Key Renderer Components

### RenderFillBlank.jsx

This is the most complex renderer - handles multiple completion types.

#### Blank Detection Logic

```javascript
// Line 300-309: Detects if it's a group (SUMMARY) mode
const isGroupMode = () => {
  const firstContent = questions[0].question_text?.trim() || "";
  if (firstContent.startsWith("<table")) return true;      // TABLE mode
  if (firstContent.length > 50) return true;              // SUMMARY mode
  return false;
};
```

#### [number] Parsing

```javascript
// Line 221: Regex pattern for parsing [number]
const parts = text.split(/\[\s*(\d+)\s*\]/g);
// "Complete the [1] with [2]"
// → ["Complete the ", "1", " with ", "2", ""]
// Odd indices (1, 3) = question numbers
```

#### HtmlTableParser

```javascript
const renderNode = (node, index) => {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent;
    const parts = text.split(/\[\s*(\d+)\s*\]/g);
    
    return parts.map((part, i) => {
      if (i % 2 === 1) {  // Odd index = captured number
        const question = getQuestionByNumber(part);
        return (
          <InlineInput
            question={question}
            userAnswerData={getUserData(question.question_id)}
            onAnswerChange={onAnswerChange}
            isReviewMode={isReviewMode}
            boxOptions={boxOptions}
          />
        );
      }
      return part;  // Regular text
    });
  }
  // Handle HTML elements recursively...
};
```

---

## InlineInput Component

Handles both typed input and box selection:

```javascript
// Box mode detection
const isBoxMode = boxOptions.length > 0;

// Typed input
{isBoxMode ? (
  <select value={localValue} onChange={handleChange}>
    <option value="">-</option>
    {boxOptions.map(opt => (
      <option key={opt.matching_key} value={opt.matching_key}>
        {opt.matching_key}
      </option>
    ))}
  </select>
) : (
  <Input
    value={localValue}
    onChange={handleChange}
    placeholder={`(${question.question_number})`}
  />
)}
```

---

## Data Flow

### Question Data Structure (from API)

```javascript
{
  question_id: "uuid",
  question_number: 1,
  question_text: "The city was founded in [1].",  // With [number] placeholders
  answers: [
    { answer_id: "uuid", answer_text: "Paris", matching_key: "A" }
  ],
  correct_answers: [
    { answer_text: "Paris", matching_key: null }
  ]
}
```

### Answer Submission

```javascript
// In reading.jsx / listening.jsx
const flattenedAnswers = [];

Object.entries(answers).forEach(([qId, data]) => {
  // Box mode: matching_key is the selected option
  if (data.value && boxOptions.find(o => o.matching_key === data.value)) {
    flattenedAnswers.push({
      idQuestion: qId,
      answerText: getAnswerText(qId, data.value),
      userAnswerType: "FILL_BLANK",
      matching_key: data.value,
      matching_value: null
    });
  } else {
    // Typed mode
    flattenedAnswers.push({
      idQuestion: qId,
      answerText: data.text || data.value,
      userAnswerType: "FILL_BLANK",
      matching_key: null,
      matching_value: null
    });
  }
});

// Submit
await createManyAnswersAPI(idUser, idTestResult, flattenedAnswers);
```

---

## Answer Types

| Type | Input | Storage |
|------|-------|---------|
| Typed | Text input | `answerText` |
| Box Selection | Dropdown | `matching_key` (e.g., "A", "B") |

---

## Review Mode

When `isReviewMode` is true, renderers show correct answers:

```javascript
// Show user's answer and correct answer
{isReviewMode && (
  <div className="flex gap-2">
    <span>Your answer: {userAnswer || "(empty)"}</span>
    <span className="correct">
      Correct: {correctAnswerDisplay}
    </span>
  </div>
)}
```

---

## Regex Quick Reference

```javascript
// Parse [number] placeholders
/\[\s*(\d+)\s*\]/g

// Match examples:
// [1]     → matches, captures "1"
// [ 2 ]   → matches, captures "2"
// [10]    → matches, captures "10"
// [abc]   → no match
```

---

## Testing Checklist

- [ ] RenderMCQ shows options correctly
- [ ] RenderTFNG shows 3 options
- [ ] RenderYesNo shows 3 options
- [ ] RenderMatching handles matching UI
- [ ] RenderFillBlank parses [1], [2], [3]
- [ ] InlineInput shows text input (non-box)
- [ ] InlineInput shows dropdown (box mode)
- [ ] Review mode shows correct answers
- [ ] Answer submission works correctly
