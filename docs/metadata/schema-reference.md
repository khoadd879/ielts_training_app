# Metadata Schema Reference

Complete Zod schemas for all question types.

## Shared Types

### Option
```typescript
{
  label: string,  // Display label: "A", "B", "1", "i" etc.
  text: string    // Option content
}
```

### WordBankItem
```typescript
{
  id: string,     // Unique identifier
  text: string     // Word/phrase text
}
```

### Coordinate
```typescript
{
  x: number,  // 0-100 percentage from left
  y: number   // 0-100 percentage from top
}
```

---

## Schema Definitions

### MULTIPLE_CHOICE
```typescript
z.object({
  type: z.literal("MULTIPLE_CHOICE"),
  options: z.array(OptionSchema).min(2),
  correctOptionIndexes: z.array(z.number().int().min(0)).min(1),
  isMultiSelect: z.boolean(),
})
```

### TRUE_FALSE_NOT_GIVEN
```typescript
z.object({
  type: z.literal("TRUE_FALSE_NOT_GIVEN"),
  statement: z.string().min(1),
  correctAnswer: z.enum(["TRUE", "FALSE", "NOT_GIVEN"]),
})
```

### YES_NO_NOT_GIVEN
```typescript
z.object({
  type: z.literal("YES_NO_NOT_GIVEN"),
  statement: z.string().min(1),
  correctAnswer: z.enum(["YES", "NO", "NOT_GIVEN"]),
})
```

### MATCHING_HEADING
```typescript
z.object({
  type: z.literal("MATCHING_HEADING"),
  headings: z.array(OptionSchema).min(1),
  paragraphRef: z.string().min(1),
  correctHeadingIndex: z.number().int().min(0),
})
```

### MATCHING_INFORMATION
```typescript
z.object({
  type: z.literal("MATCHING_INFORMATION"),
  statement: z.string().min(1),
  paragraphLabels: z.array(z.string()).min(1),
  correctParagraph: z.string().min(1),
})
```

### MATCHING_FEATURES
```typescript
z.object({
  type: z.literal("MATCHING_FEATURES"),
  statement: z.string().min(1),
  features: z.array(OptionSchema).min(1),
  correctFeatureLabel: z.string().min(1),
})
```

### MATCHING_SENTENCE_ENDINGS
```typescript
z.object({
  type: z.literal("MATCHING_SENTENCE_ENDINGS"),
  sentenceStem: z.string().min(1),
  endings: z.array(OptionSchema).min(1),
  correctEndingLabel: z.string().min(1),
})
```

### SENTENCE_COMPLETION
```typescript
z.object({
  type: z.literal("SENTENCE_COMPLETION"),
  sentenceWithBlank: z.string().min(1),
  maxWords: z.number().int().min(1),
  correctAnswers: z.array(z.string()).min(1),
})
```

### SUMMARY_COMPLETION
```typescript
z.object({
  type: z.literal("SUMMARY_COMPLETION"),
  blankLabel: z.string().min(1),
  maxWords: z.number().int().min(1),
  hasWordBank: z.boolean(),
  wordBank: z.array(WordBankItemSchema).optional(),
  correctAnswers: z.array(z.string()).min(1),
  fullParagraph: z.string().optional(),
})
```

### NOTE_COMPLETION
```typescript
z.object({
  type: z.literal("NOTE_COMPLETION"),
  noteContext: z.string().min(1),
  maxWords: z.number().int().min(1),
  correctAnswers: z.array(z.string()).min(1),
  fullNoteText: z.string().optional(),
})
```

### TABLE_COMPLETION
```typescript
z.object({
  type: z.literal("TABLE_COMPLETION"),
  rowIndex: z.number().int().min(0),
  columnIndex: z.number().int().min(0),
  maxWords: z.number().int().min(1),
  correctAnswers: z.array(z.string()).min(1),
})
```

### FLOW_CHART_COMPLETION
```typescript
z.object({
  type: z.literal("FLOW_CHART_COMPLETION"),
  stepLabel: z.string().min(1),
  maxWords: z.number().int().min(1),
  hasWordBank: z.boolean(),
  wordBank: z.array(WordBankItemSchema).optional(),
  correctAnswers: z.array(z.string()).min(1),
  fullFlowText: z.string().optional(),
})
```

### DIAGRAM_LABELING
```typescript
z.object({
  type: z.literal("DIAGRAM_LABELING"),
  imageUrl: z.string().url(),
  labelCoordinate: CoordinateSchema,
  pointLabel: z.string().min(1),
  hasWordBank: z.boolean(),
  wordBank: z.array(WordBankItemSchema).optional(),
  correctAnswers: z.array(z.string()).min(1),
})
```

### SHORT_ANSWER
```typescript
z.object({
  type: z.literal("SHORT_ANSWER"),
  maxWords: z.number().int().min(1),
  correctAnswers: z.array(z.string()).min(1),
})
```

---

## Validation Rules Summary

| Field Type | Rule |
|-----------|------|
| `type` | Must be exact string match |
| `string.min(1)` | Non-empty string |
| `number.int().min(0)` | Non-negative integer |
| `z.array().min(1)` | Non-empty array |
| `z.boolean()` | true or false |
| `z.enum()` | Must match one of values |
| `z.string().url()` | Valid URL format |
| `number.min(0).max(100)` | Percentage 0-100 |
