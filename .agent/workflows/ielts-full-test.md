---
description: Run IELTS Full Reading Test pipeline - Crawl 3 passages + Merge + Seed
---

# /ielts-full-test - FULL READING TEST PIPELINE

// turbo-all

> [!IMPORTANT]
> Khi user gọi `/ielts-full-test`, Claude sẽ **TỰ ĐỘNG** parse input và chạy pipeline.

## 📍 INPUT FORMAT

User gọi:
```
/ielts-full-test 
URL1 @[hint-type1] @[hint-type2]
URL2 @[hint-type3] @[hint-type4]  
URL3 @[hint-type5] @[hint-type6]
--title "Test Title"
--output reading-full-test-XXX
```

**Claude sẽ:**
1. Parse 3 URLs từ input (mỗi dòng là 1 passage)
2. Extract hints từ các `@[hint-xxx]` references
3. Build command với đúng format `--p1`, `--h1`, etc.
4. Chạy `full_test_pipeline.py`

## 🔗 AVAILABLE HINTS
Refer to: `@[/hint-tfng]` `@[/hint-ynng]` `@[/hint-mcq-single]` `@[/hint-mcq-multiple]` `@[/hint-matching-information]` `@[/hint-matching-heading]` `@[/hint-matching-features]` `@[/hint-summary-completion]` `@[/hint-table-completion]` `@[/hint-short-answer]`

---

## 🚀 CLAUDE PARSING RULES

Khi nhận input, Claude phải:

1. **Tách 3 URLs** - mỗi URL trên 1 dòng hoặc cách nhau
2. **Map hints cho mỗi URL** dựa trên `@[hint-xxx]` đi kèm
3. **Build hints string**: `Q1-5:TYPE,Q6-13:TYPE2`
4. **Generate command**:

---

## 🚀 PIPELINE FLOW

```
📄 [1/3] Processing Passage 1 (Q1-13)...
📄 [2/3] Processing Passage 2 (Q14-26)...
📄 [3/3] Processing Passage 3 (Q27-40)...
🔗 Merging 3 passages...
💾 Seeding database...
✅ FULL TEST PIPELINE COMPLETE!
```

---

## 📋 EXAMPLE

### Example 1: ielts-mentor Test 119
```bash
// turbo
cd /home/khoa/RiderProjects/Project_Langfens_Microservice/scripts/pipeline_v2 && \
python full_test_pipeline.py \
  --p1 "https://www.ielts-mentor.com/reading-sample/academic-reading/3753-nutmeg-a-valuable-spice" \
  --p2 "https://www.ielts-mentor.com/reading-sample/academic-reading/3754-driverless-cars" \
  --p3 "https://www.ielts-mentor.com/reading-sample/academic-reading/3755-what-is-exploration" \
  --title "IELTS Academic Reading Test 119" \
  --output reading-full-test-119
```

### Example 2: mini-ielts Full Test
```bash
// turbo
cd /home/khoa/RiderProjects/Project_Langfens_Microservice/scripts/pipeline_v2 && \
python full_test_pipeline.py \
  --p1 "https://mini-ielts.com/123/reading/passage-1" --h1 "Q1-5:TFNG,Q6-13:SUMMARY" \
  --p2 "https://mini-ielts.com/124/reading/passage-2" --h2 "Q14-18:MATCHING_HEADING,Q19-26:MCQ_SINGLE" \
  --p3 "https://mini-ielts.com/125/reading/passage-3" --h3 "Q27-32:MATCHING_FEATURES,Q33-40:SUMMARY" \
  --title "Mini IELTS Full Reading Test" \
  --output reading-full-test-mini
```

---

## ⚠️ IF INDIVIDUAL PASSAGE FAILS

Nếu 1 trong 3 passages fail, chạy reading pipeline riêng cho passage đó:

```bash
// turbo
cd /home/khoa/RiderProjects/Project_Langfens_Microservice/scripts/pipeline_v2 && \
python orchestrator.py "<FAILED_URL>" --hints="<HINTS>"
```

Sau khi fix xong, chạy lại full_test_pipeline hoặc merge thủ công:

```bash
// turbo
python merge_full_test.py <ITEM_ID_1> <ITEM_ID_2> <ITEM_ID_3> \
  --title "<TITLE>" --output <OUTPUT_ID>
```

Rồi export multi-section:
```bash
// turbo
python multi_section_export.py ielts-mentor <OUTPUT_ID>
```

---

## 📤 OUTPUT FORMAT

```markdown
## ✅ Full Test Complete: [TEST_TITLE]

**3 passages processed and merged successfully!**

### Summary
- **Passage 1:** [URL1] → Q1-13
- **Passage 2:** [URL2] → Q14-26
- **Passage 3:** [URL3] → Q27-40
- **Database Slug:** ielts-mentor-[OUTPUT_ID]

### Structure
| Section | Questions | Groups |
|---------|-----------|--------|
| 1 | Q1-13 | [GROUPS] |
| 2 | Q14-26 | [GROUPS] |
| 3 | Q27-40 | [GROUPS] |

Exam is now available in the database!
```

---

## 🔗 RELATED
- `@[/ielts-reading-pipeline]` - Single passage pipeline
- `@[/hints]` - Question type hints
