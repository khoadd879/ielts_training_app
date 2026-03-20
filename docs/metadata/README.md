# Metadata System

## Overview

Every question in the system has a `metadata` field that contains type-specific data. This is stored as JSONB in the database and validated by Zod schemas on the backend.

## Why Metadata?

1. **Type Safety**: Each question type has different required fields
2. **Validation**: Backend validates metadata before saving
3. **Flexibility**: Supports complex question structures
4. **Extensibility**: Easy to add new question types

## Metadata Structure

```typescript
{
  type: "QUESTION_TYPE",        // Required - discriminator
  // ... type-specific fields
}
```

## Validation Flow

```
Teacher creates question
        ↓
FE sends to API
        ↓
ValidateMetadataPipe (NestJS)
        ↓
QuestionMetadataValidator.validate()
        ↓
Zod Schema validation
        ↓
✓ Valid → Save to database
✗ Invalid → 400 Bad Request
```

## Quick Reference

| Question Type | Required Metadata Fields |
|---------------|-------------------------|
| MULTIPLE_CHOICE | `type`, `options`, `correctOptionIndexes`, `isMultiSelect` |
| TRUE_FALSE_NOT_GIVEN | `type`, `statement`, `correctAnswer` |
| YES_NO_NOT_GIVEN | `type`, `statement`, `correctAnswer` |
| MATCHING_HEADING | `type`, `headings`, `paragraphRef`, `correctHeadingIndex` |
| MATCHING_INFORMATION | `type`, `statement`, `paragraphLabels`, `correctParagraph` |
| MATCHING_FEATURES | `type`, `statement`, `features`, `correctFeatureLabel` |
| MATCHING_SENTENCE_ENDINGS | `type`, `sentenceStem`, `endings`, `correctEndingLabel` |
| SENTENCE_COMPLETION | `type`, `sentenceWithBlank`, `maxWords`, `correctAnswers` |
| SUMMARY_COMPLETION | `type`, `blankLabel`, `maxWords`, `hasWordBank`, `correctAnswers` |
| NOTE_COMPLETION | `type`, `noteContext`, `maxWords`, `correctAnswers` |
| TABLE_COMPLETION | `type`, `rowIndex`, `columnIndex`, `maxWords`, `correctAnswers` |
| FLOW_CHART_COMPLETION | `type`, `stepLabel`, `maxWords`, `hasWordBank`, `correctAnswers` |
| DIAGRAM_LABELING | `type`, `imageUrl`, `labelCoordinate`, `pointLabel`, `correctAnswers` |
| SHORT_ANSWER | `type`, `maxWords`, `correctAnswers` |

## Related Documentation

- [Schema Reference](schema-reference.md) - Detailed Zod schemas
- [Blank Patterns](blank-patterns.md) - Standard blank placeholder format
