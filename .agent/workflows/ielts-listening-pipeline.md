---
description: Run IELTS Listening pipeline (HYBRID) - Rule-based + AI Validator
---

# /ielts-listening-pipeline <URL> - LISTENING PIPELINE

// turbo-all

> [!IMPORTANT]
> Khi user gọi `/ielts-listening-pipeline <URL>`, **TỰ ĐỘNG** chạy các bước bên dưới.
> 
> **Sources:** `mini-ielts.com` → SOURCE=`mini-ielts`

## 📍 QUICK INDEX
| Section | Jump To |
|---------|---------|
| Commands | [Steps 1-14](#-commands) |
| Fix Issues | [Claude FIX](#step-8-claude-fix) |
| Listening Rules | [Audio/Passage](#-listening-rules) |
| Hints | [Related Hints](#-hints) |

## 🔗 HINTS
Call `@[/hint-xxx]` for type details:
`summary-completion` `matching-information` `mcq-single` `mcq-multiple` `table-completion` `short-answer` `map-diagram`

---

## 🚀 COMMANDS

> [!CAUTION]
> **MANDATORY 14-STEP PIPELINE - KHÔNG ĐƯỢC BỎ QUA BẤT KỲ BƯỚC NÀO!**
> 
> Cho dù Step 1-5 SUCCESS, vẫn PHẢI chạy đủ 14 bước. Mỗi step PHẢI được execute.

### Step 1-5: Orchestrator
```bash
// turbo
cd /home/khoa/RiderProjects/Project_Langfens_Microservice/scripts/pipeline_v2 && python orchestrator.py "<URL>" --type listening --hints="<HINTS>" 2>&1
```

### Step 6: Gemini PRE
```bash
// turbo
cd /home/khoa/RiderProjects/Project_Langfens_Microservice/scripts/pipeline_v2 && timeout 90 python gemini_qa.py <SOURCE> <ITEM_ID> 2>&1
```

### Step 7: Codex PRE
```bash
// turbo
cd /home/khoa/RiderProjects/Project_Langfens_Microservice/scripts/pipeline_v2 && timeout 300 python codex_qa.py <SOURCE> <ITEM_ID> --mode pre 2>&1
```

### Step 8: Claude FIX
```python
import json
from pathlib import Path
json_path = Path("data/normalized/<SOURCE>/<ITEM_ID>.json")
data = json.loads(json_path.read_text())
# Fix issues from Step 6-7
json_path.write_text(json.dumps(data, indent=2, ensure_ascii=False))
```

After fix: `python reembed_images.py <SOURCE> <ITEM_ID>`

### Step 9: Gemini POST
```bash
// turbo
cd /home/khoa/RiderProjects/Project_Langfens_Microservice/scripts/pipeline_v2 && timeout 90 python gemini_qa.py <SOURCE> <ITEM_ID> 2>&1
```

### Step 10: Codex VALIDATE
```bash
// turbo
cd /home/khoa/RiderProjects/Project_Langfens_Microservice/scripts/pipeline_v2 && timeout 300 python codex_qa.py <SOURCE> <ITEM_ID> --mode validate 2>&1
```

### Step 11: Claude FIX #2 (if needed)

### Step 12: Invariants
```bash
// turbo
cd /home/khoa/RiderProjects/Project_Langfens_Microservice/scripts/pipeline_v2 && python invariants.py <SOURCE> <ITEM_ID> --type listening 2>&1
```

### Step 12.5: Cloudinary
```bash
// turbo
cd /home/khoa/RiderProjects/Project_Langfens_Microservice/scripts/pipeline_v2 && python upload_images.py <SOURCE> <ITEM_ID> 2>&1
```

### Step 13: Export
```bash
cd /home/khoa/RiderProjects/Project_Langfens_Microservice/scripts/pipeline_v2 && python export.py <SOURCE> <ITEM_ID> --type listening
```

### Step 14: Seed
```bash
PGPASSWORD=exam psql -h localhost -p 5433 -U exam -d exam-db -f "deploy/seeds/seed_exam_*.sql"
```

---

## 📋 LISTENING RULES

> [!IMPORTANT]
> **Listening pipeline GIỐNG HỆT Reading pipeline, chỉ khác `audioUrl`!**
> 
> - Cùng database schema (`exams`, `exam_sections`, `exam_questions`, `exam_question_groups`)
> - Cùng cách hiển thị `instructionMd` theo từng `questionGroup`
> - Cùng format cho `passageMd`, `instructionMd`, `options`, `matchPairs`

### Audio (KHÁC Reading):
- Format: `https://www.youtube.com/embed/VIDEO_ID`
- Field: `audio_url` in section metadata (BẮT BUỘC)

### Data Structure (GIỐNG Reading):
| Field | Content |
|-------|---------|
| `passage_md` | Transcript/notes |
| `instruction_md` | Full: headings, questions, options, maps |
| `questionGroups` | Groups với `startIdx`, `endIdx`, `instructionMd` |
| `audio_url` | YouTube embed URL (LISTENING ONLY) |
| Passage length | ≥ 100 words |

### instruction_md MUST include:
- Question group headings (`## QUESTIONS 1-6`)
- Full instruction text (từ source)
- Options list (A, B, C...) nếu có
- Maps/diagrams với Cloudinary URL (`![Map](cloudinary_url)`)
- Blanks với số thứ tự

### questionGroups Structure (CRITICAL):
```json
{
  "idx": 1,
  "start_idx": 1,
  "end_idx": 4,
  "instruction_md": "## Questions 1-4\n\n![Map](https://res.cloudinary.com/...)\n\n### Options:\n- **A** Location A\n..."
}
```

> [!IMPORTANT]
> **MỖI questionGroup PHẢI có đầy đủ:**
> - `instruction_md` với full text
> - Cloudinary images (NOT external URLs)
> - Options list nếu là map/matching questions

### Common Fixes:
| Issue | Fix |
|-------|-----|
| instruction_md quá ngắn | Extract đầy đủ từ source |
| Missing map in questionGroup | Add `![](cloudinary_url)` vào `question_groups[].instruction_md` |
| External image URL (timeout) | Upload to Cloudinary, update URL |
| MAP_LABEL type | Convert to `MATCHING_INFORMATION` |
| Choose TWO | Use `MULTIPLE_CHOICE_MULTIPLE` |
| Missing audio | Extract from iframe |
| questionGroups missing images | Run Cloudinary upload AFTER questionGroups created |

---

## 🔗 RELATED
- `@[/ielts-data-format]` - Strict JSON schemas
- `@[/hints]` - All question types reference

---

## 📤 OUTPUT FORMAT (MANDATORY)

> [!IMPORTANT]
> Khi pipeline hoàn thành, **LUÔN** output theo format sau:

### Completion Template:
```markdown
## ✅ Pipeline Complete: [EXAM_TITLE]

**All 14 steps completed successfully!**

### Summary
- **URL:** [URL]
- **Questions:** [COUNT] ([Question distribution])
- **Audio:** [YouTube embed URL]
- **Database Slug:** [SLUG]

### Key Fixes Applied
1. [Fix 1]
2. [Fix 2]
3. [Fix 3]

### Validation Results
- ✅/❌ Gemini POST: [STATUS]
- ✅/❌ Codex VALIDATE: [STATUS]
- ✅/❌ Invariants: [STATUS]
- ✅/❌ Database: [STATUS]

Exam is now available in the database and ready for testing!
```

### Required Fields:
| Field | Description |
|-------|-------------|
| `EXAM_TITLE` | Title từ URL (human readable) |
| `URL` | Original URL |
| `COUNT` | Total questions |
| `Question distribution` | VD: "Q1-6 notes, Q7-10 map, Q11-15 MCQ" |
| `Audio` | YouTube embed URL |
| `SLUG` | Database slug (e.g. `mini-ielts-listening-xxx`) |
| `Key Fixes` | List các fix đã apply (nếu không có fix thì ghi "No fixes needed") |
| `Validation Results` | Status của 4 checks: Gemini, Codex, Invariants, Database |

### Error Template (nếu pipeline fail):
```markdown
## ❌ Pipeline Failed: [EXAM_TITLE]

**Failed at Step [N]:** [STEP_NAME]

### Error Details
[Error description]

### Suggested Actions
1. [Action 1]
2. [Action 2]
```

