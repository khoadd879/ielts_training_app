# Question Types Overview

The IELTS Training App supports 14 question types organized into 4 categories.

## Categories

### 1. Selection Types (3 types)
- **MULTIPLE_CHOICE** - Select correct answer(s) from options
- **TRUE_FALSE_NOT_GIVEN** - Evaluate statement as True/False/Not Given
- **YES_NO_NOT_GIVEN** - Evaluate claim as Yes/No/Not Given

### 2. Matching Types (4 types)
- **MATCHING_HEADING** - Match paragraphs to headings
- **MATCHING_INFORMATION** - Match statements to paragraph locations
- **MATCHING_FEATURES** - Match items to categories/features
- **MATCHING_SENTENCE_ENDINGS** - Complete sentences with correct endings

### 3. Completion Types (6 types)
- **SENTENCE_COMPLETION** - Fill blank in single sentence
- **SUMMARY_COMPLETION** - Fill blanks in summary paragraph
- **NOTE_COMPLETION** - Fill blanks in notes
- **TABLE_COMPLETION** - Fill blanks in table cells
- **FLOW_CHART_COMPLETION** - Fill blanks in flowchart steps
- **SHORT_ANSWER** - Short free-text answer

### 4. Labeling Type (1 type)
- **DIAGRAM_LABELING** - Label points on diagram/image

## Question Code Reference

```typescript
enum QuestionType {
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',
  TRUE_FALSE_NOT_GIVEN = 'TRUE_FALSE_NOT_GIVEN',
  YES_NO_NOT_GIVEN = 'YES_NO_NOT_GIVEN',
  MATCHING_HEADING = 'MATCHING_HEADING',
  MATCHING_INFORMATION = 'MATCHING_INFORMATION',
  MATCHING_FEATURES = 'MATCHING_FEATURES',
  MATCHING_SENTENCE_ENDINGS = 'MATCHING_SENTENCE_ENDINGS',
  SENTENCE_COMPLETION = 'SENTENCE_COMPLETION',
  SUMMARY_COMPLETION = 'SUMMARY_COMPLETION',
  NOTE_COMPLETION = 'NOTE_COMPLETION',
  TABLE_COMPLETION = 'TABLE_COMPLETION',
  FLOW_CHART_COMPLETION = 'FLOW_CHART_COMPLETION',
  DIAGRAM_LABELING = 'DIAGRAM_LABELING',
  SHORT_ANSWER = 'SHORT_ANSWER',
}
```

## Related Documentation

- [Selection Types](selection-types.md)
- [Matching Types](matching-types.md)
- [Completion Types](completion-types.md)
- [Labeling Types](labeling-types.md)
