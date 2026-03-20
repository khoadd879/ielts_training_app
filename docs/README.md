# IELTS Training App - Documentation

## Overview

This documentation covers the question creation and rendering system for the IELTS Training App.

## Structure

```
docs/
├── README.md                          # This file
├── question-types/                   # Question type definitions
│   ├── README.md
│   ├── selection-types.md            # MCQ, TFNG, YNNG
│   ├── matching-types.md             # 4 MATCHING types
│   ├── completion-types.md           # 5 COMPLETION + SHORT_ANSWER types
│   └── labeling-types.md             # DIAGRAM_LABELING
├── metadata/                         # Metadata schemas
│   ├── README.md
│   ├── schema-reference.md           # Zod schemas
│   └── blank-patterns.md            # [number] standard
├── frontend/                        # FE integration guides
│   ├── teacher-guide.md             # Teacher form changes
│   └── renderer-guide.md            # Student renderer
└── api/                            # API documentation
    ├── endpoints.md                 # API endpoints
    └── validation-errors.md        # Error handling
```

## Question Types Summary

| # | Type | Category |
|---|------|----------|
| 1 | MULTIPLE_CHOICE | Selection |
| 2 | TRUE_FALSE_NOT_GIVEN | Selection |
| 3 | YES_NO_NOT_GIVEN | Selection |
| 4 | MATCHING_HEADING | Matching |
| 5 | MATCHING_INFORMATION | Matching |
| 6 | MATCHING_FEATURES | Matching |
| 7 | MATCHING_SENTENCE_ENDINGS | Matching |
| 8 | SENTENCE_COMPLETION | Completion |
| 9 | SUMMARY_COMPLETION | Completion |
| 10 | NOTE_COMPLETION | Completion |
| 11 | TABLE_COMPLETION | Completion |
| 12 | FLOW_CHART_COMPLETION | Completion |
| 13 | DIAGRAM_LABELING | Labeling |
| 14 | SHORT_ANSWER | Completion |

## Key Concepts

### Metadata Structure

All questions use a `metadata` object for type-specific data. This is validated by Zod schemas on the backend.

### Blank Pattern Standard

For completion questions, the **standard blank placeholder is `[number]`**:

```javascript
// CORRECT
"The city was founded in [1]."
"Process: [1] → [2] → [3]"

// LEGACY (will be normalized)
"The city was founded in ____."
"____(10)____"
```

### API Validation

All question creation endpoints validate `metadata` using Zod schemas. Invalid metadata results in 400 Bad Request.
