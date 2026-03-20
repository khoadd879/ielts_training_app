# Validation Errors

## Overview

The backend validates all question `metadata` using Zod schemas. Invalid metadata results in 400 Bad Request responses.

## Error Response Format

```typescript
{
  "statusCode": 400,
  "message": "Invalid metadata for question type MULTIPLE_CHOICE: Required"
}
```

## Common Error Messages

### Missing Required Fields

```javascript
// Missing options
"Invalid metadata for question type MULTIPLE_CHOICE: Required"

// Missing correctAnswer
"Invalid metadata for question type TRUE_FALSE_NOT_GIVEN: Required"

// Missing correctAnswers
"Invalid metadata for question type SHORT_ANSWER: Required"
```

### Invalid Field Types

```javascript
// options should be array with min 2 items
"Invalid metadata for question type MULTIPLE_CHOICE: Expected array, received string"

// correctOptionIndexes should be array of integers
"Invalid metadata for question type MULTIPLE_CHOICE: Expected array, received number"

// correctAnswer should be enum value
"Invalid metadata for question type TRUE_FALSE_NOT_GIVEN: Expected 'TRUE' | 'FALSE' | 'NOT_GIVEN', received 'MAYBE'"
```

### Invalid URL Format

```javascript
// imageUrl must be valid URL
"Invalid metadata for question type DIAGRAM_LABELING: Invalid url"
```

### Out of Range Values

```javascript
// rowIndex/columnIndex must be >= 0
"Invalid metadata for question type TABLE_COMPLETION: Number must be greater than or equal to 0"

// coordinates must be 0-100
"Invalid metadata for question type DIAGRAM_LABELING: Number must be less than or equal to 100"
```

---

## Error Handling in Frontend

### Example: Handle Validation Error

```javascript
try {
  const response = await createManyQuestionAPI({ questions });
  // Success
} catch (error) {
  if (error.response?.status === 400) {
    // Show validation error to user
    const message = error.response.data.message;
    // e.g., "Invalid metadata for question type MULTIPLE_CHOICE: Required"
    showErrorToast(message);
  }
}
```

---

## Validation Checklist

Before sending to API, verify:

### MULTIPLE_CHOICE
- [ ] `options` is array with at least 2 items
- [ ] Each option has `label` and `text`
- [ ] `correctOptionIndexes` is array of valid indices
- [ ] `isMultiSelect` is boolean

### TRUE_FALSE_NOT_GIVEN / YES_NO_NOT_GIVEN
- [ ] `statement` is non-empty string
- [ ] `correctAnswer` is valid enum value

### MATCHING Types
- [ ] `headings`/`features`/`endings` is non-empty array
- [ ] Each item has `label` and `text`
- [ ] `correctHeadingIndex`/`correctFeatureLabel`/`correctEndingLabel` is valid

### COMPLETION Types
- [ ] `maxWords` is positive integer
- [ ] `correctAnswers` is non-empty array
- [ ] `sentenceWithBlank`/`fullParagraph` uses `[number]` pattern

### DIAGRAM_LABELING
- [ ] `imageUrl` is valid URL
- [ ] `labelCoordinate.x` and `labelCoordinate.y` are 0-100
- [ ] `pointLabel` is non-empty string

### SHORT_ANSWER
- [ ] `maxWords` is positive integer
- [ ] `correctAnswers` is non-empty array

---

## Debugging Tips

1. **Check the exact error message** - it tells you which field is invalid
2. **Verify field types** - make sure numbers are numbers, arrays are arrays
3. **Check enum values** - ensure `correctAnswer` matches allowed values exactly
4. **Validate URLs** - use `z.string().url()` format for imageUrl
5. **Check ranges** - ensure coordinates are 0-100, indices are >= 0
