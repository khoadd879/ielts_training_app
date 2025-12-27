---
description: Quy tắc format dữ liệu IELTS questions - KHÔNG SỬA BACKEND/FRONTEND
---

# /ielts-data-format - STRICT LOCKED SCHEMAS

> [!CAUTION]
> **STRICT SCHEMA**: Output JSON PHẢI EXACTLY match schema này.
> - Vi phạm → Frontend KHÔNG render được
> - Vi phạm → Backend KHÔNG chấm điểm được

---

# 🔍 SECTION 1: QUICK LOOKUP (AI Detection Reference)

## Type → UI → Grader (Master Table)

| Type | UI Kind | Grader | Options | MatchPairs | Blanks |
|------|---------|--------|---------|------------|--------|
| TRUE_FALSE_NOT_GIVEN | `choice_single` | SingleChoice | ✅ T/F/NG | ❌ | ❌ |
| YES_NO_NOT_GIVEN | `choice_single` | SingleChoice | ✅ Y/N/NG | ❌ | ❌ |
| MULTIPLE_CHOICE_SINGLE | `choice_single` | SingleChoice | ✅ A-D | ❌ | ❌ |
| MULTIPLE_CHOICE_MULTIPLE | `choice_multiple` | MultipleChoice | ✅ multi | ❌ | ❌ |
| CLASSIFICATION | `choice_single` | MatchingHeading | ✅ cats | ✅ | ❌ |
| SHORT_ANSWER | `completion` | ShortAnswer | `[]` | ❌ | ✅ `_{3,}` |
| SUMMARY_COMPLETION | `completion` | Completion | `[]` | ❌ | ✅ `_{3,}` |
| TABLE_COMPLETION | `completion` | Completion | `[]` | ❌ | ✅ `_{3,}` |
| NOTE_COMPLETION | `completion` | Completion | `[]` | ❌ | ✅ `_{3,}` |
| FORM_COMPLETION | `completion` | Completion | `[]` | ❌ | ✅ `_{3,}` |
| SENTENCE_COMPLETION | `completion` | Completion | `[]` | ❌ | ✅ `_{3,}` |
| DIAGRAM_LABEL | `completion` | Label | `[]` | ❌ | ✅ `_{3,}` |
| MAP_LABEL | `matching_letter` | MatchingHeading | `[]` | ✅ | ❌ |
| MATCHING_HEADING | `matching_heading` | MatchingHeading | ✅ i-xi | ✅ | ❌ |
| MATCHING_INFORMATION | `matching_letter` | MatchingHeading | `[]` | ✅ | ❌ |
| MATCHING_FEATURES | `matching_letter` | MatchingHeading | `[]` | ✅ | ❌ |
| MATCHING_ENDINGS | `matching_letter` | MatchingHeading | `[]` | ✅ | ❌ |
| FLOW_CHART | `flow_chart` | FlowChart | `[]` | ❌ | ❌ |

## Detection Patterns (for AI)

```python
# DETECTION RULES - Use these patterns to identify question type:

# 1. TFNG vs YNNG
if answer in ['TRUE', 'FALSE']: type = 'TRUE_FALSE_NOT_GIVEN'
if answer in ['YES', 'NO']:     type = 'YES_NO_NOT_GIVEN'

# 2. MCQ_SINGLE vs MCQ_MULTIPLE  
if 'TWO' in prompt or 'THREE' in prompt: type = 'MULTIPLE_CHOICE_MULTIPLE'
if answer has comma ('A, B'):            type = 'MULTIPLE_CHOICE_MULTIPLE'

# 3. MATCHING_* types
if prompt has 'paragraph' + answer is letter: type = 'MATCHING_INFORMATION'
if prompt has 'heading' + answer is roman:    type = 'MATCHING_HEADING'
if prompt has 'person/name' + answer letter:  type = 'MATCHING_FEATURES'

# 4. COMPLETION types
if prompt has '_______' (3+ underscores): type = '*_COMPLETION' or 'SHORT_ANSWER'
if prompt has 'diagram/map/label':        type = 'DIAGRAM_LABEL' or 'MAP_LABEL'

# 5. MAP_LABEL → MATCHING_INFORMATION (CONVERT)
if type == 'MAP_LABEL' and answer is letter (A-J):
    type = 'MATCHING_INFORMATION'  # Frontend renders same UI
```

## Required Fields by Type

| Type Category | options | matchPairs | blankAcceptTexts | shortAnswerAcceptTexts |
|---------------|---------|------------|------------------|------------------------|
| Choice (TFNG, MCQ) | ✅ Required | ❌ null | ❌ null | ❌ null |
| Completion (*_COMPLETION) | `[]` empty | ❌ null | ✅ Required | ❌ null |
| SHORT_ANSWER | `[]` empty | ❌ null | ❌ null | ✅ Required |
| Matching (MATCHING_*) | `[]` or ✅ | ✅ Required | ❌ null | ❌ null |

---

# 📋 SECTION 2: TYPE-BY-TYPE SCHEMAS

## 🎯 FRONTEND UI KINDS MAPPING

```typescript
// Frontend: mapApiQuestionToUi.ts
type BackendType → uiKind:

"TRUE_FALSE_NOT_GIVEN"      → "choice_single"     // Radio buttons
"YES_NO_NOT_GIVEN"          → "choice_single"     // Radio buttons
"MULTIPLE_CHOICE_SINGLE"    → "choice_single"     // Radio buttons
"MULTIPLE_CHOICE_SINGLE_IMAGE" → "choice_single"  // Radio buttons with images
"CLASSIFICATION"            → "choice_single"     // Radio buttons

"MULTIPLE_CHOICE_MULTIPLE"  → "choice_multiple"   // Checkboxes

"FORM_COMPLETION"           → "completion"        // Text input(s)
"NOTE_COMPLETION"           → "completion"        // Text input(s)
"SENTENCE_COMPLETION"       → "completion"        // Text input(s)
"SUMMARY_COMPLETION"        → "completion"        // Text input(s)
"TABLE_COMPLETION"          → "completion"        // Text input(s)
"SHORT_ANSWER"              → "completion"        // Text input
"DIAGRAM_LABEL"             → "completion"        // Text input(s)
"MAP_LABEL"                 → "completion"        // Text input(s)

"MATCHING_INFORMATION"      → "matching_letter"   // Single letter input (A-J)
"MATCHING_FEATURES"         → "matching_letter"   // Single letter input (A-J)
"MATCHING_ENDINGS"          → "matching_letter"   // Single letter input (A-J)

"MATCHING_HEADING"          → "matching_heading"  // Dropdown select

"FLOW_CHART"                → "flow_chart"        // Drag & drop
```

---

## 🔒 BLANK PATTERN RULE

```javascript
// Frontend: SummaryCompletionCard.tsx
const re = /_{3,}/g; // 3+ underscores = blank input
```

| Pattern   | Valid? | Reason                    |
| --------- | ------ | ------------------------- |
| `_______` | ✅     | 7 underscores             |
| `___`     | ✅     | 3 underscores             |
| `____`    | ✅     | 4 underscores             |
| `...`     | ❌     | Dots không được recognize |
| `(...)`   | ❌     | Không match regex         |
| `[blank]` | ❌     | Không match regex         |

---

## 📋 TYPE-BY-TYPE STRICT SCHEMAS

---

### 1️⃣ TRUE_FALSE_NOT_GIVEN

| Field   | Backend              | Frontend                |
| ------- | -------------------- | ----------------------- |
| Grader  | `SingleChoiceGrader` |                         |
| UI      |                      | `choice_single` (Radio) |
| Options | `exam_options` table | Maps to choices         |

**STRICT JSON:**

```json
{
  "idx": 34,
  "type": "TRUE_FALSE_NOT_GIVEN",
  "promptMd": "Statement text without number.",
  "options": [
    { "id": "uuid1", "idx": 1, "contentMd": "TRUE", "isCorrect": false },
    { "id": "uuid2", "idx": 2, "contentMd": "FALSE", "isCorrect": true },
    { "id": "uuid3", "idx": 3, "contentMd": "NOT GIVEN", "isCorrect": false }
  ],
  "matchPairs": null,
  "blankAcceptTexts": null,
  "shortAnswerAcceptTexts": null
}
```

**STRICT RULES:**

- ✅ `options` PHẢI có CHÍNH XÁC 3 items: `TRUE`, `FALSE`, `NOT GIVEN`
- ✅ `isCorrect: true` cho ĐÚNG 1 option
- ✅ `promptMd` KHÔNG có số đầu (❌ "34. Statement" → ✅ "Statement")
- ❌ KHÔNG dùng `matchPairs` cho type này

**SQL Output:**

```sql
INSERT INTO exam_options ("ContentMd", "IsCorrect") VALUES ('TRUE', false);
INSERT INTO exam_options ("ContentMd", "IsCorrect") VALUES ('FALSE', true);
INSERT INTO exam_options ("ContentMd", "IsCorrect") VALUES ('NOT GIVEN', false);
```

---

### 2️⃣ YES_NO_NOT_GIVEN

**STRICT JSON:** (Same structure as TFNG)

```json
{
  "type": "YES_NO_NOT_GIVEN",
  "options": [
    { "contentMd": "YES", "isCorrect": true },
    { "contentMd": "NO", "isCorrect": false },
    { "contentMd": "NOT GIVEN", "isCorrect": false }
  ]
}
```

---

### 3️⃣ MULTIPLE_CHOICE_SINGLE

| Field  | Backend              | Frontend                |
| ------ | -------------------- | ----------------------- |
| Grader | `SingleChoiceGrader` |                         |
| UI     |                      | `choice_single` (Radio) |

**STRICT JSON:**

```json
{
  "idx": 28,
  "type": "MULTIPLE_CHOICE_SINGLE",
  "promptMd": "What is the main purpose of this passage?",
  "options": [
    {
      "id": "uuid1",
      "idx": 1,
      "contentMd": "A. To describe the history of...",
      "isCorrect": false
    },
    {
      "id": "uuid2",
      "idx": 2,
      "contentMd": "B. To explain the process of...",
      "isCorrect": true
    },
    {
      "id": "uuid3",
      "idx": 3,
      "contentMd": "C. To compare different...",
      "isCorrect": false
    },
    {
      "id": "uuid4",
      "idx": 4,
      "contentMd": "D. To argue against...",
      "isCorrect": false
    }
  ]
}
```

**STRICT RULES:**

- ✅ `options` có 3-5 items
- ✅ `contentMd` format: `"A. Full text"` (letter + dot + space + text)
- ✅ `isCorrect: true` cho ĐÚNG 1 option
- ✅ `promptMd` KHÔNG chứa options (options riêng biệt)

---

### 4️⃣ MULTIPLE_CHOICE_MULTIPLE

| Field  | Backend                | Frontend                     |
| ------ | ---------------------- | ---------------------------- |
| Grader | `MultipleChoiceGrader` |                              |
| UI     |                        | `choice_multiple` (Checkbox) |

**STRICT JSON:**

```json
{
  "type": "MULTIPLE_CHOICE_MULTIPLE",
  "promptMd": "Which TWO of the following are mentioned?",
  "options": [
    { "contentMd": "A. Option one", "isCorrect": true },
    { "contentMd": "B. Option two", "isCorrect": false },
    { "contentMd": "C. Option three", "isCorrect": true },
    { "contentMd": "D. Option four", "isCorrect": false }
  ]
}
```

**STRICT RULES:**

- ✅ Có thể có 2+ options với `isCorrect: true`
- ✅ Grading: User PHẢI chọn ĐÚNG TẤT CẢ correct options (set equality)

**⚠️ DETECTION RULE:**

- Prompt chứa "**TWO**", "**THREE**", "choose more than one" → **MCQ_MULTIPLE**
- Answer có dấu phẩy: "C, G" hoặc "A, B" → **MCQ_MULTIPLE**
- KHÔNG phải MATCHING_INFORMATION dù hỏi về films/paragraphs

**EXAMPLE - Film Selection:**

````json
{
  "type": "MULTIPLE_CHOICE_MULTIPLE",
  "promptMd": "These TWO films will best entertain a fun-loving audience.",
  "options": [
    {"contentMd": "A. Friends", "isCorrect": true},
    {"contentMd": "B. The Submarine", "isCorrect": true},
    {"contentMd": "C. Ghost Rider", "isCorrect": false},
    {"contentMd": "D. The Promise", "isCorrect": false},
    {"contentMd": "E. Scary Stuff", "isCorrect": false}
  ],
  "correct_answers": ["A", "B"]
}

---

### 5️⃣ MULTIPLE_CHOICE_SINGLE_IMAGE

**Same as MCQ_SINGLE** but `contentMd` có thể chứa image markdown.

---

### 6️⃣ CLASSIFICATION

| Field | Backend | Frontend |
|-------|---------|----------|
| Grader | `MatchingHeadingGrader` | |
| UI | | `choice_single` (Radio) |

**STRICT JSON:**
```json
{
  "type": "CLASSIFICATION",
  "promptMd": "Statement to classify",
  "options": [
    {"contentMd": "A. Category One", "isCorrect": false},
    {"contentMd": "B. Category Two", "isCorrect": true}
  ],
  "matchPairs": {"class-q20": ["B"]}
}
````

---

### 7️⃣ SHORT_ANSWER

| Field       | Backend             | Frontend                  |
| ----------- | ------------------- | ------------------------- |
| Grader      | `ShortAnswerGrader` |                           |
| UI          |                     | `completion` (Text input) |
| Blank regex |                     | `/_{3,}/g`                |

**STRICT JSON:**

```json
{
  "idx": 27,
  "type": "SHORT_ANSWER",
  "promptMd": "When did Herschel begin astronomy? _______",
  "options": [],
  "matchPairs": null,
  "shortAnswerAcceptTexts": ["1772", "seventeen seventy-two"],
  "shortAnswerAcceptRegex": ["17\\d{2}"]
}
```

**STRICT RULES:**

- ✅ `promptMd` PHẢI có `_{3,}` (3+ underscores) cho blank
- ✅ `options` = `[]` (empty array)
- ✅ `shortAnswerAcceptTexts` = array các đáp án chấp nhận
- ❌ KHÔNG dùng `blankAcceptTexts` cho SHORT_ANSWER

**Examples:**

```
✅ "The year was _______"
✅ "Answer: ____"
❌ "The year was ..." (no underscore = no input rendered!)
```

---

### 8️⃣ SUMMARY_COMPLETION / TABLE_COMPLETION / NOTE_COMPLETION / FORM_COMPLETION / SENTENCE_COMPLETION

| Field       | Backend            | Frontend                            |
| ----------- | ------------------ | ----------------------------------- |
| Grader      | `CompletionGrader` |                                     |
| UI          |                    | `completion` (Multiple text inputs) |
| Blank regex |                    | `/_{3,}/g`                          |

**STRICT JSON:**

```json
{
  "idx": 10,
  "type": "SUMMARY_COMPLETION",
  "promptMd": "Complete the summary.\\n\\nThe student pays _______ per week. The rent includes _______.",
  "options": [],
  "matchPairs": null,
  "blankAcceptTexts": {
    "0": ["$68.50", "68.50", "$68.5"],
    "1": ["utilities", "utility"]
  },
  "blankAcceptRegex": {
    "0": ["\\$?68\\.?50?"]
  }
}
```

**STRICT RULES:**

- ✅ `promptMd` có `_{3,}` cho MỖI blank
- ✅ `options` = `[]`
- ✅ `blankAcceptTexts` keys = blank index ("0", "1", "2"...)
- ✅ Frontend tokenize by regex, mỗi blank = 1 input

---

### 9️⃣ DIAGRAM_LABEL / MAP_LABEL

| Field  | Backend                                     | Frontend                   |
| ------ | ------------------------------------------- | -------------------------- |
| Grader | `LabelGrader` (uses CompletionGrader logic) |                            |
| UI     |                                             | `completion` (Text inputs) |

**STRICT JSON:**

```json
{
  "type": "DIAGRAM_LABEL",
  "promptMd": "Label the diagram.\\n\\n29. _______\\n30. _______\\n31. _______",
  "options": [],
  "blankAcceptTexts": {
    "29": ["label1"],
    "30": ["label2"],
    "31": ["label3"]
  }
}
```

**RULES:** Same as SUMMARY_COMPLETION. Keys có thể là question numbers.

---

### 🔟 MATCHING_HEADING

| Field   | Backend                 | Frontend                             |
| ------- | ----------------------- | ------------------------------------ |
| Grader  | `MatchingHeadingGrader` |                                      |
| UI      |                         | `matching_heading` (Dropdown)        |
| Options | Dùng để render dropdown | `value: opt.contentMd.split(".")[0]` |

**STRICT JSON:**

```json
{
  "idx": 28,
  "type": "MATCHING_HEADING",
  "promptMd": "Choose the correct heading for Section C",
  "options": [
    {
      "id": "uuid1",
      "idx": 1,
      "contentMd": "i. Where to buy the best Echinacea",
      "isCorrect": false
    },
    {
      "id": "uuid2",
      "idx": 2,
      "contentMd": "ii. What snake oil contained",
      "isCorrect": false
    },
    {
      "id": "uuid3",
      "idx": 3,
      "contentMd": "v. Earlier applications of Echinacea",
      "isCorrect": true
    }
  ],
  "matchPairs": {
    "section-c": ["v", "v. Earlier applications of Echinacea"]
  }
}
```

**STRICT RULES:**

- ✅ `options` = ALL headings (i, ii, iii... xi)
- ✅ `contentMd` format: `"i. Full heading text"`
- ✅ `matchPairs` = `{key: [value, fullLabel]}`
- ✅ Frontend extracts value by `contentMd.split(".")[0].trim()`
- ✅ `isCorrect: true` cho đúng 1 option

**PASSAGE RULE:**

```
✅ Passage chỉ có sections: "**A.** Content..." "**B.** Content..."
❌ Passage KHÔNG được chứa headings list (i-xi)
```

---

### 1️⃣1️⃣ MATCHING_INFORMATION

| Field  | Backend                 | Frontend                           |
| ------ | ----------------------- | ---------------------------------- |
| Grader | `MatchingHeadingGrader` |                                    |
| UI     |                         | `matching_letter` (Text input A-J) |

**STRICT JSON:**

```json
{
  "idx": 1,
  "type": "MATCHING_INFORMATION",
  "promptMd": "Which paragraph mentions algae bioreactors?",
  "options": [],
  "matchPairs": {
    "info-q1": ["E"]
  }
}
```

**STRICT RULES:**

- ✅ `options` = `[]` (empty - user types letter)
- ✅ `matchPairs` = `{key: [letter]}`
- ✅ Frontend: Input allows A-J only

---

### 1️⃣2️⃣ MATCHING_FEATURES

| Field  | Backend                 | Frontend                       |
| ------ | ----------------------- | ------------------------------ |
| Grader | `MatchingHeadingGrader` |                                |
| UI     |                         | `matching_letter` (Text input) |

**STRICT JSON:**

```json
{
  "type": "MATCHING_FEATURES",
  "promptMd": "Which person?\\nA. John Smith\\nB. Mary Jones\\nC. Peter Brown",
  "options": [],
  "matchPairs": {
    "feature-q36": ["Mary Jones", "B"]
  }
}
```

**STRICT RULES:**

- ✅ `promptMd` embed options (A. Name\\nB. Name...)
- ✅ `options` = `[]`
- ✅ `matchPairs` = `{key: [fullLabel, letter]}`

---

### 1️⃣3️⃣ MATCHING_ENDINGS

**Same as MATCHING_FEATURES.**

---

### 1️⃣4️⃣ FLOW_CHART

| Field  | Backend           | Frontend                   |
| ------ | ----------------- | -------------------------- |
| Grader | `FlowChartGrader` |                            |
| UI     |                   | `flow_chart` (Drag & drop) |

**STRICT JSON:**

```json
{
  "type": "FLOW_CHART",
  "promptMd": "Arrange the steps in correct order.",
  "options": [],
  "orderCorrects": ["step1", "step2", "step3"],
  "flowChartNodes": [
    { "key": "step1", "label": "First step" },
    { "key": "step2", "label": "Second step" },
    { "key": "step3", "label": "Third step" }
  ]
}
```

---

## 📊 COMPLETE REFERENCE TABLE

| #   | Type                         | Grader          | Frontend UI  | Options          | MatchPairs          | Blanks     | Answer Field            |
| --- | ---------------------------- | --------------- | ------------ | ---------------- | ------------------- | ---------- | ----------------------- |
| 1   | TRUE_FALSE_NOT_GIVEN         | SingleChoice    | Radio (3)    | ✅ T/F/NG        | null                | ❌         | SelectedOptionIds       |
| 2   | YES_NO_NOT_GIVEN             | SingleChoice    | Radio (3)    | ✅ Y/N/NG        | null                | ❌         | SelectedOptionIds       |
| 3   | MULTIPLE_CHOICE_SINGLE       | SingleChoice    | Radio (4+)   | ✅ A./B./C./D.   | null                | ❌         | SelectedOptionIds       |
| 4   | MULTIPLE_CHOICE_MULTIPLE     | MultipleChoice  | Checkbox     | ✅ multi-correct | null                | ❌         | SelectedOptionIds[]     |
| 5   | MULTIPLE_CHOICE_SINGLE_IMAGE | SingleChoice    | Radio        | ✅ with images   | null                | ❌         | SelectedOptionIds       |
| 6   | CLASSIFICATION               | MatchingHeading | Radio        | ✅ categories    | ✅                  | ❌         | SelectedOptionIds       |
| 7   | SHORT_ANSWER                 | ShortAnswer     | Text input   | `[]`             | null                | ✅ `_{3,}` | TextAnswer              |
| 8   | SUMMARY_COMPLETION           | Completion      | Multi-input  | `[]`             | null                | ✅ `_{3,}` | TextAnswer (JSON)       |
| 9   | TABLE_COMPLETION             | Completion      | Multi-input  | `[]`             | null                | ✅ `_{3,}` | TextAnswer (JSON)       |
| 10  | NOTE_COMPLETION              | Completion      | Multi-input  | `[]`             | null                | ✅ `_{3,}` | TextAnswer (JSON)       |
| 11  | FORM_COMPLETION              | Completion      | Multi-input  | `[]`             | null                | ✅ `_{3,}` | TextAnswer (JSON)       |
| 12  | SENTENCE_COMPLETION          | Completion      | Multi-input  | `[]`             | null                | ✅ `_{3,}` | TextAnswer (JSON)       |
| 13  | DIAGRAM_LABEL                | Label           | Multi-input  | `[]`             | null                | ✅ `_{3,}` | TextAnswer (JSON)       |
| 14  | MAP_LABEL                    | Label           | Multi-input  | `[]`             | null                | ✅ `_{3,}` | TextAnswer (JSON)       |
| 15  | MATCHING_HEADING             | MatchingHeading | Dropdown     | ✅ all headings  | ✅ `[val,label]`    | ❌         | TextAnswer              |
| 16  | MATCHING_INFORMATION         | MatchingHeading | Letter input | `[]`             | ✅ `[letter]`       | ❌         | TextAnswer              |
| 17  | MATCHING_FEATURES            | MatchingHeading | Letter input | `[]`             | ✅ `[label,letter]` | ❌         | TextAnswer              |
| 18  | MATCHING_ENDINGS             | MatchingHeading | Letter input | `[]`             | ✅ `[letter]`       | ❌         | TextAnswer              |
| 19  | FLOW_CHART                   | FlowChart       | Drag & drop  | `[]`             | null                | ❌         | TextAnswer (JSON array) |

---

## ✅ STRICT VALIDATION CHECKLIST

### For ALL types:

```
[ ] type = EXACT string (case-sensitive)
[ ] promptMd không có số đầu
[ ] idx là integer
```

### choice_single (TFNG, YNNG, MCQ_SINGLE, MCQ_IMAGE, CLASSIFICATION):

```
[ ] options có >=2 items
[ ] contentMd format "A. Text" hoặc "TRUE"/"FALSE"/"NOT GIVEN"
[ ] ĐÚNG 1 option có isCorrect=true
```

### choice_multiple (MCQ_MULTIPLE):

```
[ ] options có items
[ ] Có thể nhiều isCorrect=true
```

### completion (SHORT*ANSWER, *\_COMPLETION, \_\_LABEL):

```
[ ] promptMd chứa _{3,} cho MỖI blank
[ ] options = [] (empty)
[ ] shortAnswerAcceptTexts (SHORT_ANSWER) hoặc blankAcceptTexts (others) có data
```

### matching_heading (MATCHING_HEADING):

```
[ ] options = ALL headings (i-xi)
[ ] contentMd format "i. Heading text"
[ ] matchPairs = {key: [value, fullLabel]}
[ ] ĐÚNG 1 option có isCorrect=true
```

### matching_letter (MATCHING_INFO, FEATURES, ENDINGS):

```
[ ] options = [] (empty)
[ ] matchPairs có đúng format
```

### flow_chart:

```
[ ] orderCorrects có sequence array
[ ] flowChartNodes có key/label pairs
```

---

## 🚨 ADDITIONAL STRICT RULES

### 1. Answer Validation Rule

**Answer PHẢI match với options!**

```
✅ MATCHING_HEADING:
   - answer = "v"
   - options PHẢI có contentMd bắt đầu bằng "v."

✅ MCQ/TFNG/YNNG:
   - isCorrect=true option PHẢI tồn tại
   - answer optionId PHẢI có trong options list

❌ Answer không match → Backend grading FAIL
❌ 0 options với isCorrect=true → Impossible to grade
```

---

### 2. Slug/ID Format Rule

**SQL seed file names và exam slugs:**

```
✅ VALID:
   - "ielts-mentor-gt-reading-39-section-3-snake-oil"
   - "3205-snake-oil" (item_id)
   - lowercase, no spaces, use dashes

❌ INVALID:
   - "IELTS Mentor GT Reading" (uppercase, spaces)
   - "snake_oil" (underscores - use dashes)
   - "3205 snake oil" (spaces)
```

---

### 3. Passage Section Labels Rule

**Cho MATCHING_HEADING với sections A-H:**

```
✅ VALID (Bold labels):
   **A.** Section A content...
   **B.** Section B content...

❌ INVALID:
   A. Section content (not bold - hard to read)
   Section A: content (wrong format)
```

**Passage MUST NOT contain:**

```
❌ Headings list (i. First heading, ii. Second heading...)
❌ Answer key
❌ Question instructions ("Answer questions 1-7")
```

---

### 4. Special Characters Escaping Rule

**SQL:**

```sql
-- Single quotes MUST be doubled
✅ 'snake''s oil'
❌ 'snake's oil'  -- SQL syntax error!

-- Backslash in strings
✅ E'line1\\nline2'
```

**JSON:**

```json
// Newlines must be escaped
✅ "Line 1\\nLine 2"
❌ "Line 1
Line 2"  // Invalid JSON!

// Quotes must be escaped
✅ "He said \"hello\""
❌ "He said "hello""  // Invalid JSON!
```

---

### 5. PromptMd Number Prefix Rule

```
✅ VALID:
   "Statement text without number prefix."
   "Which paragraph mentions..."

❌ INVALID:
   "34. Statement text" (number duplicates question idx)
   "Question 28: Which..." (redundant)
```

**Reason:** Frontend already displays question number from `idx` field.

---

### 6. isCorrect Count Rule

| Type                              | Required isCorrect=true count |
| --------------------------------- | ----------------------------- |
| TFNG, YNNG, MCQ_SINGLE, MCQ_IMAGE | Exactly 1                     |
| MCQ_MULTIPLE                      | 2 or more                     |
| MATCHING_HEADING                  | Exactly 1                     |
| CLASSIFICATION                    | Exactly 1                     |

```
❌ 0 isCorrect=true → Cannot determine correct answer
❌ 2+ isCorrect=true for single-choice → Which one is correct?
```

---

### 7. Options contentMd Format Rule

| Type             | Format                      | Example                      |
| ---------------- | --------------------------- | ---------------------------- |
| TFNG             | Plain text                  | `TRUE`, `FALSE`, `NOT GIVEN` |
| YNNG             | Plain text                  | `YES`, `NO`, `NOT GIVEN`     |
| MCQ_SINGLE       | Letter + dot + space + text | `A. First option text`       |
| MATCHING_HEADING | Roman + dot + space + text  | `i. First heading text`      |

```
✅ "A. The history of astronomy"
✅ "i. Where to find the best herbs"
✅ "TRUE"

❌ "A) The history" (parenthesis instead of dot)
❌ "A The history" (missing dot)
❌ "a. The history" (lowercase letter for MCQ)
```

---

### 8. MatchPairs Key Format Rule

**Key format:** `{type-identifier}-q{idx}` hoặc descriptive key

```json
// MATCHING_HEADING
{"section-c": ["v", "v. Earlier applications"]}
{"choose-heading-section-c-q28": ["v", "v. Earlier applications"]}

// MATCHING_INFORMATION
{"info-q1": ["E"]}
{"paragraph": ["E"]}

// MATCHING_FEATURES
{"feature-q36": ["William Herschel", "D"]}
{"person": ["William Herschel", "D"]}
```

---

### 9. Exam Title Format Rule

```
✅ VALID:
   "GT Reading Test 39 Section 3 - Snake Oil"
   "Academic Reading Test 5 Section 2 - Climate Change"

❌ INVALID:
   "snake oil" (no context)
   "Test 39" (too vague)
```

**Pattern:** `{Category} Test {N} Section {S} - {Title}`

---

### 10. Passage Word Count Rule

```
✅ Full passage: >= 500 words
❌ Summary only: 100-200 words (WRONG!)
```

**Common Bug:** Crawler extracts summary completion text instead of full passage.

**Fix:** Extract from cleaned text between title and "Questions X-Y".

---

### 11. Question Index Rule (from models.py)

```python
# Pydantic validation
idx: int = Field(..., ge=1, le=50, description="Question number 1-50")
```

```
✅ VALID: idx = 1, 28, 40
❌ INVALID: idx = 0 (ge=1)
❌ INVALID: idx = 51+ (le=50)
❌ INVALID: idx = "28" (must be integer)
```

---

### 12. Option Count Minimums (from validate.py)

| Type                                   | Minimum Options                  |
| -------------------------------------- | -------------------------------- |
| SINGLE_CHOICE (TFNG, YNNG, MCQ_SINGLE) | >= 2                             |
| MULTIPLE_CHOICE (MCQ_MULTIPLE)         | >= 3                             |
| MATCHING_HEADING                       | >= 5 (i, ii, iii, iv, v minimum) |

```
❌ MCQ_SINGLE with 1 option → Error
❌ MCQ_MULTIPLE with 2 options → Error (need 3+)
❌ MATCHING_HEADING with 4 headings → Warning
```

---

### 13. Question Sequence Gap Rule (from models.py)

```python
# NormalizedExam validator
gap = indices[i+1] - indices[i]
if gap > 5:  # Allow small gaps (<=5) for section breaks
    raise ValueError(f"Large gap in question sequence: Q{indices[i]} -> Q{indices[i+1]}")
```

```
✅ VALID: Q1, Q2, Q3, Q4, Q5 (consecutive)
✅ VALID: Q1, Q2, Q7 (gap = 5, allowed for section break)
❌ INVALID: Q1, Q2, Q20 (gap = 18, too large!)
```

---

### 14. TFNG/YNNG Prompt Format Rule (from models.py)

```python
# Should not have options in prompt
if q.type in {QuestionType.TRUE_FALSE_NOT_GIVEN, QuestionType.YES_NO_NOT_GIVEN}:
    if 'A.' in q.prompt_md or 'B.' in q.prompt_md:
        warnings.append(f"... should be statement only, not options")
```

```
✅ VALID: "Scientists believe the universe is expanding."
❌ INVALID: "A. Scientists believe the universe is expanding. B. Scientists doubt..."
```

---

### 15. Completion Blank Marker Detection (from models.py)

```python
# Valid blank markers for frontend detection
blank_markers = ['_______', '...', '____', '[blank]', '(blank)']
```

**BUT frontend only recognizes:**

```javascript
const re = /_{3,}/g; // Only underscores!
```

```
✅ Frontend renders: _______ (7 underscores)
✅ Frontend renders: ____ (4 underscores)
❌ Frontend ignores: ... (dots)
❌ Frontend ignores: [blank]
❌ Frontend ignores: (blank)
```

**STRICT: Use only `_{3,}` for blanks!**

---

### 16. Passage Paragraph Marker Rule (from models.py)

```python
# For long passages, check for markers
if len(section.passage_md) > 500:
    has_markers = any(f"**{c}**" in section.passage_md or f"**{c}." in section.passage_md
                    for c in "ABCDEFGHIJ")
    if not has_markers:
        warnings.append("Long passage may need paragraph markers (A, B, C...)")
```

```
✅ Long passage with markers:
   **A.** First paragraph...
   **B.** Second paragraph...

❌ Long passage without markers (hard for MATCHING to reference)
```

---

### 17. Matching Heading Prompt Length Rule (from models.py)

```python
# MATCHING_HEADING prompt should be short
if q.type == QuestionType.MATCHING_HEADING:
    if len(q.prompt_md) > 100:
        warnings.append("MATCHING_HEADING prompt should be short (Section A/B/C)")
```

```
✅ VALID: "Choose the correct heading for Section C" (42 chars)
✅ VALID: "Section D" (9 chars)
❌ TOO LONG: Full paragraph explaining what heading to choose (150+ chars)
```

---

## 📋 VALIDATION SUMMARY

### From validate.py - Errors (will fail):

- Missing required key: `exam`, `sections`, `questions`
- `exam.title` is required
- `exam.slug` is required
- At least one section is required

### From validate.py - Warnings:

- `sections[i].passage_md` is very short (<50 chars)
- `Q{idx}: {type} should have at least 2 options`
- `Q{idx}: {type} should have exactly 1 correct`
- `Q{idx}: {type} missing correct_answers`

### From models.py - Strict Pydantic:

- `idx` must be 1-50
- `prompt_md` cannot be empty
- Slug must match `^[a-z0-9-]+$`
- Passage minimum 50 chars
- Question sequence gap <= 5

---

## 🖥️ FRONTEND STRICT RULES

### 18. HeadingDropdown Value Extraction (from HeadingDropdown.tsx)

```tsx
// How frontend extracts answer value from option
value={opt.contentMd.split(".")[0].trim()}  // "i", "ii", "v"
```

**STRICT:**

```
✅ "i. Where to buy..." → value = "i"
✅ "ii. What snake oil..." → value = "ii"
❌ "Where to buy..." → value = "" (no dot to split!)
❌ "i) Where to buy..." → value = "i)" (wrong format)
```

**contentMd PHẢI có format: `{roman}. {text}`**

---

### 19. MatchingLetterCard Input Validation (from MatchingLetterCard.tsx)

```tsx
// Only allows A-J letters
if (!/^[A-J]$/.test(v)) return;
```

**STRICT:**

```
✅ User can input: A, B, C, D, E, F, G, H, I, J
❌ Rejected: K, L, M... (beyond J)
❌ Rejected: a, b, c (lowercase)
❌ Rejected: 1, 2, 3 (numbers)
```

**MatchPairs answer PHẢI là A-J:**

```json
{"info-q1": ["E"]}  // ✅
{"info-q1": ["K"]}  // ❌ Frontend won't accept user input "K"
```

---

### 20. FlowChartCard Node Structure (from FlowChartCard.tsx)

```tsx
type FlowChartNode = {
  key: string; // Required
  label: string; // Required
};

// User answer = JSON array of labels in order
onChange(JSON.stringify(arranged)); // ["step1", "step2", "step3"]
```

**STRICT:**

```json
{
  "flowChartNodes": [
    { "key": "step1", "label": "First step" }, // ✅
    { "key": "step2", "label": "Second step" } // ✅
  ]
}
```

```
❌ Missing key: {"label": "Step"}
❌ Missing label: {"key": "step1"}
❌ Empty array: []
```

---

### 21. QuestionCard Choice Structure (from QuestionCard.tsx)

```tsx
type Choice = string | { value: string; label: string };

// Rendering
const value = typeof c === "string" ? c : c.value;
const label = typeof c === "string" ? c : c.label;
```

**STRICT: Options phải có value và label:**

```json
{
  "options": [
    { "value": "A", "label": "A. First option" }, // ✅
    { "value": "TRUE", "label": "TRUE" } // ✅
  ]
}
```

```
❌ Missing value: {"label": "First option"}
❌ Missing label: {"value": "A"}
```

---

### 22. SummaryCompletionCard Instruction Split (from SummaryCompletionCard.tsx)

```tsx
// Splits at "answer sheet" to separate instruction from content
const re = /answer sheet\.?/i;
const m = re.exec(text);

if (m) {
  instruction = text.slice(0, cut); // Before "answer sheet"
  notes = text.slice(cut); // After "answer sheet" (has blanks)
}
```

**STRICT for completion prompts:**

```
✅ "Complete the summary. Write NO MORE THAN TWO WORDS from
   the passage for each answer. Write your answers on the
   answer sheet.

   The student pays _______ per week."

❌ Just blanks without context:
   "_______ per week"
```

---

### 23. Markdown Newline Handling (from all components)

```tsx
// All components replace escaped newlines
const text = stem.replace(/\\n/g, "\n");
```

**STRICT:**

```
✅ In JSON: "Line 1\\nLine 2" → Renders as two lines
❌ Raw newline in JSON: "Line 1\nLine 2" → Invalid JSON!
```

---

### 24. ReactMarkdown Rendering (from QuestionCard.tsx)

```tsx
<ReactMarkdown
  components={{
    p: ({ node, ...props }) => <p className="whitespace-pre-wrap" {...props} />,
  }}
>
  {text}
</ReactMarkdown>
```

**Markdown syntax supported:**

- `**bold**` → **bold**
- `*italic*` → _italic_
- `[link](url)` → hyperlink
- Lists, headers, etc.

**STRICT:**

```
✅ "The **Echinacea** plant..." → bold rendering
❌ "The <b>Echinacea</b> plant..." → HTML tags may not render
```

---

### 25. Question Number Display Rule

**Frontend KHÔNG tự thêm số câu hỏi vào promptMd!**
**Backend idx field quyết định số câu hỏi hiển thị.**

```
✅ Data:
   {"idx": 15, "promptMd": "Which employees may choose not to work regular hours?"}

   Frontend hiển thị: "15. Which employees may choose not to work regular hours?"

❌ SAI - KHÔNG double số:
   {"idx": 15, "promptMd": "15. Which employees may choose not to work regular hours?"}

   Frontend hiển thị: "15. 15. Which employees..." (LỖI!)
```

**STRICT:**

- `idx` field = số câu hỏi (15, 16, 17...)
- `promptMd` KHÔNG chứa số đầu
- Frontend tự render: `{idx}. {promptMd}`

---

### 26. Passage Paragraph Labels Rule ⚠️ BẮT BUỘC

**Passage LUÔN CÓ paragraph labels (A, B, C...) cho MỌI question type!**

**Lý do:**

- Dễ đọc và reference
- Consistent format cho tất cả bài
- Hỗ trợ user locate thông tin

**Format CHUẨN:**

```markdown
**Title**

**Paragraph A.**
The standard working week for full-time council employees is 35 hours...

**Paragraph B.**
Staff are entitled to 3 weeks per annum sick or carer's leave...

**Paragraph C.**
Our Financial Advice Program is conducted in partnership with...
```

**STRICT RULES:**

- ✅ Label format: `**Paragraph A.**` + XUỐNG DÒNG + nội dung
- ✅ Chữ cái đầu nội dung VIẾT HOA
- ✅ Mỗi paragraph logic riêng biệt có 1 label
- ✅ Thứ tự A, B, C, D, E, F... (uppercase)
- ❌ KHÔNG dùng: `A.`, `A)`, `(A)`, `a.`
- ❌ KHÔNG đặt nội dung cùng dòng với label

---

## 🔗 RELATED

- @[/ielts-pipeline] - Pipeline workflow

---

## 🌍 INDUSTRY STANDARDS (Based on British Council / IDP / Cambridge)

> [!IMPORTANT] > **Standards researched from official IELTS providers:**
>
> - British Council (takeielts.britishcouncil.org)
> - IDP IELTS (ielts.idp.com)
> - Cambridge English (cambridgeenglish.org)

### 27. Paragraph Labeling Standard ⚠️ STRICT

**Official Format (British Council):**

- Labels: Bold uppercase letter **A**, **B**, **C**...
- Position: Left margin, vertically aligned with first line
- Naming: Instructions refer to "paragraphs A-H"

**Our Implementation:**

```markdown
**Paragraph A.**
Content starts on new line...

**Paragraph B.**
Content starts on new line...
```

| Source Style     | Our Equivalent       | Notes                           |
| ---------------- | -------------------- | ------------------------------- |
| `A` (margin)     | `**Paragraph A.**\n` | We use inline bold with newline |
| `paragraphs A–H` | `Paragraph A-H`      | Same reference style            |

---

### 28. Instruction Formatting Standard ⚠️ STRICT

**Official Format (British Council):**

- Question number range in bold: **Questions 1-6**
- Key references bolded: **A-H**, **i-x**, **boxes 1-6**
- Word limits bolded: **NO MORE THAN THREE WORDS**

**Our Implementation:**

```markdown
**Questions 1-8:** Complete the sentences below.
Choose **NO MORE THAN THREE WORDS** from the text for each answer.

**Questions 9-14:** Do the following statements agree with the information given in the text?
Write **TRUE** if the statement agrees with the information.
Write **FALSE** if the statement contradicts the information.
Write **NOT GIVEN** if there is no information on this.
```

**STRICT RULES:**

- ✅ `**Questions X-Y:**` bold heading for each question group
- ✅ Bold emphasis on ranges: **A-H**, **i-x**, **1-6**
- ✅ Bold emphasis on word limits: **ONE WORD**, **THREE WORDS**
- ✅ Line break between different question type instructions

---

### 29. Question Type Instruction Patterns ⚠️ REFERENCE

| Question Type    | Instruction Pattern                                                  |
| ---------------- | -------------------------------------------------------------------- |
| TFNG             | `Write **TRUE**, **FALSE** or **NOT GIVEN**.`                        |
| YNNG             | `Write **YES**, **NO** or **NOT GIVEN**.`                            |
| MATCHING_HEADING | `Choose the correct heading from the list **i-x** below.`            |
| MATCHING_INFO    | `Which paragraph contains the following information? Write **A-H**.` |
| COMPLETION       | `Complete the notes. Write **NO MORE THAN THREE WORDS**.`            |
| SHORT_ANSWER     | `Answer with **ONE WORD AND/OR A NUMBER**.`                          |
| MCQ_SINGLE       | `Choose the correct letter, **A**, **B**, **C** or **D**.`           |
| MCQ_MULTIPLE     | `Choose **TWO** letters, **A-E**.`                                   |

---

### 30. Layout Structure Standard

**Official British Council Layout:**

1. **Section Header**: `Reading Passage 1 has eight paragraphs, **A–H**.`
2. **Passage**: Full text with paragraph labels
3. **Question Groups**: Separated by type with bold headings
4. **Instructions**: Before each question group, not mixed with passage

**Our Implementation:**

```
[instruction_md]
  └── Questions 1-8: Instructions...
  └── Questions 9-14: Instructions...
  └── ---
[passage_md]
  └── # Title
  └── **Paragraph A.** Content...
  └── **Paragraph B.** Content...
```

---

### 31. Formatting Quick Checklist

```
[ ] Paragraph labels: **Paragraph A.** + newline
[ ] Instructions: **Questions X-Y:** format
[ ] Word limits: **NO MORE THAN X WORDS** bold
[ ] Ranges: **A-H**, **i-x** bold
[ ] Question numbers: Frontend auto-adds from idx field
[ ] Divider: --- between instruction and passage
```

---

## 🚨 PIPELINE ISSUES CHECKLIST (4 AI CHECK STEPS)

> **Check Order**: normalize.py → repair.py → Gemini POST → Claude CHECK

### Category 1: Passage Issues

| Issue ID | Issue                      | Detection                       | Fix                                |
| -------- | -------------------------- | ------------------------------- | ---------------------------------- |
| P-001    | Passage garbage            | User comments, ratings mixed in | Extract clean from source          |
| P-002    | Missing paragraph labels   | No `**Paragraph A.**` format    | Add labels                         |
| P-003    | Embedded questions         | Q1-8 statements in passage      | Remove → questions array           |
| P-004    | Passage too short          | Less than 100 words             | Expand from source                 |
| P-005    | Multi-Passage in 1 section | 2+ distinct texts merged        | Split into 2+ sections             |
| P-006    | Roman numerals in passage  | `i. ii. iii.` heading list      | Extract → MATCHING_HEADING options |

### Category 2: Question Type Issues

| Issue ID | Issue                            | Detection                       | Fix                     |
| -------- | -------------------------------- | ------------------------------- | ----------------------- |
| Q-001    | Wrong type detection             | MCQ_SINGLE ≠ source instruction | Change type             |
| Q-002    | TFNG/YNNG confusion              | Answer TRUE but type YNNG       | Match answer format     |
| Q-003    | MATCHING_INFO has options        | options[] not empty             | Clear to `[]`           |
| Q-004    | MATCHING_HEADING missing options | No `i-x` list                   | Add all heading options |
| Q-005    | MATCHING_FEATURES typed wrong    | Should be MATCHING_HEADING      | Fix type                |

### Category 3: Prompt Issues

| Issue ID | Issue                | Detection                    | Fix                      |
| -------- | -------------------- | ---------------------------- | ------------------------ |
| R-001    | Leading numbers      | `1. Statement` in prompt     | Remove number prefix     |
| R-002    | Embedded MCQ options | `A. opt B. opt` in prompt    | Extract to options array |
| R-003    | Missing blank marker | Completion without `_______` | Add blank marker         |
| R-004    | Wrong blank pattern  | `...` or `(...)`             | Replace with `_______`   |

### Category 4: Answer Issues

| Issue ID | Issue                      | Detection                 | Fix                                    |
| -------- | -------------------------- | ------------------------- | -------------------------------------- |
| A-001    | Missing correct_answers    | Empty array               | Extract from source                    |
| A-002    | Optional word not expanded | `(commemorative) coin`    | Expand to `[coin, commemorative coin]` |
| A-003    | Alternative not split      | `colour// color`          | Split to `[colour, color]`             |
| A-004    | Wrong is_correct marking   | MCQ but no correct option | Mark correct option                    |

### Category 5: Section/Structure Issues

| Issue ID | Issue                      | Detection                      | Fix               |
| -------- | -------------------------- | ------------------------------ | ----------------- |
| S-001    | Missing instruction_md     | No `**Questions X-Y:**`        | Add instruction   |
| S-002    | instruction_md wrong range | Q1-8 but passage has Q9-14 too | Add both ranges   |
| S-003    | Section mismatch           | 2 passages but 1 section       | Create 2 sections |

---

### Quick Detection Patterns

```python
# P-003: Embedded questions
if re.search(r'\n\d+\.\s+[A-Z]', passage):
    # Has numbered statements → embedded questions

# P-005: Multi-Passage
if 'Paragraph A.' in passage and 'Question' in passage:
    # Likely merged → split needed

# Q-003: MATCHING_INFO options
if q_type == 'MATCHING_INFORMATION' and len(options) > 0:
    # Violation → clear options

# R-001: Leading numbers
if re.match(r'^\d+\.\s+', prompt):
    # Has leading number → remove

# A-002: Optional word
if re.search(r'\([^)]+\)\s+\w+', answer):
    # Has optional word → expand
```
