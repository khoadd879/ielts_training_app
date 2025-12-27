---
description: Common question type hints for IELTS pipelines
---

# /hints - Question Type Reference

## 🎧 LISTENING Common Patterns:

### Pattern 1: MCQ + Completion + Map
```
--hints="Q1-2:MCQ_MULTIPLE,Q3-7:SUMMARY_COMPLETION,Q8-10:MATCHING_INFORMATION"
```

### Pattern 2: All Completion (Notes/Table)
```
--hints="Q1-10:SUMMARY_COMPLETION"
```

### Pattern 3: MCQ + Short Answer
```
--hints="Q1-3:MCQ_SINGLE,Q4-10:SHORT_ANSWER"
```

---

## 📖 READING Common Patterns:

### Pattern 1: Headings + Completion + TFNG
```
--hints="Q1-6:MATCHING_HEADING,Q7-13:SUMMARY_COMPLETION,Q14-20:TRUE_FALSE_NOT_GIVEN"
```

### Pattern 2: Headings + Features + MCQ
```
--hints="Q1-5:MATCHING_HEADING,Q6-10:MATCHING_FEATURES,Q11-13:MCQ_SINGLE"
```

### Pattern 3: TFNG + Completion + MCQ
```
--hints="Q1-7:TRUE_FALSE_NOT_GIVEN,Q8-13:SUMMARY_COMPLETION,Q14-20:MCQ_SINGLE"
```

---

## 📋 All Available Types:

| Short | Full Type | When to use |
|-------|-----------|-------------|
| `MCQ_S` | `MCQ_SINGLE` | Choose ONE letter |
| `MCQ_M` | `MCQ_MULTIPLE` | Choose TWO/THREE letters |
| `SUM` | `SUMMARY_COMPLETION` | Fill gaps, write words |
| `TAB` | `TABLE_COMPLETION` | Complete table |
| `SHORT` | `SHORT_ANSWER` | Write short answer |
| `HEAD` | `MATCHING_HEADING` | Match paragraphs i-x |
| `FEAT` | `MATCHING_FEATURES` | Match features |
| `INFO` | `MATCHING_INFORMATION` | Match info / Map labels |
| `TFNG` | `TRUE_FALSE_NOT_GIVEN` | TRUE/FALSE/NOT GIVEN |
| `YNNG` | `YES_NO_NOT_GIVEN` | YES/NO/NOT GIVEN |

---

## 🔧 Quick Copy-Paste:

**Listening (choose one):**
```bash
--hints="Q1-2:MCQ_MULTIPLE,Q3-7:SUMMARY_COMPLETION,Q8-10:MATCHING_INFORMATION"
```

**Reading (choose one):**
```bash
--hints="Q1-6:MATCHING_HEADING,Q7-13:SUMMARY_COMPLETION"
```
