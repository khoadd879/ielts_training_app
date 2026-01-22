---
description: Run IELTS Reading pipeline (HYBRID) - Rule-based + AI Validator
---

# /ielts-pipeline <URL> - READING PIPELINE

// turbo-all

> [!IMPORTANT]
> Khi user gọi `/ielts-pipeline <URL>`, **TỰ ĐỘNG** chạy các bước bên dưới.
> 
> **Sources:** `mini-ielts.com` → SOURCE=`mini-ielts`, `ielts-mentor.com` → SOURCE=`ielts-mentor`

## 📍 QUICK INDEX
| Section | Jump To |
|---------|---------|
| Commands | [Steps 1-14](#-commands) |
| Fix Issues | [Claude FIX](#step-8-claude-fix) |
| Hints | [Related Hints](#-hints) |

## 🔗 HINTS
Call `@[/hint-xxx]` for type details:
`tfng` `ynng` `mcq-single` `mcq-multiple` `matching-information` `matching-heading` `matching-features` `summary-completion` `table-completion` `short-answer` `map-diagram`

---

## 🚀 COMMANDS

> [!CAUTION]
> **MANDATORY 14-STEP PIPELINE - KHÔNG ĐƯỢC BỎ QUA BẤT KỲ BƯỚC NÀO!**
> 
> Cho dù Step 1-5 SUCCESS, vẫn PHẢI chạy đủ 14 bước. Mỗi step PHẢI được execute.

### Step 1-5: Orchestrator
```bash
// turbo
cd /home/khoa/RiderProjects/Project_Langfens_Microservice/scripts/pipeline_v2 && python orchestrator.py "<URL>" --hints="<HINTS>" 2>&1
```

### Step 6: Gemini PRE
```bash
// turbo
cd /home/khoa/RiderProjects/Project_Langfens_Microservice/scripts/pipeline_v2 && timeout 90 python gemini_qa.py <SOURCE> <ITEM_ID> 2>&1
```

### Step 7: Codex PRE
```bash
// turbo
cd /home/khoa/RiderProjects/Project_Langfens_Microservice/scripts/pipeline_v2 && timeout 600 python codex_qa.py <SOURCE> <ITEM_ID> --mode pre 2>&1
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
cd /home/khoa/RiderProjects/Project_Langfens_Microservice/scripts/pipeline_v2 && timeout 600 python codex_qa.py <SOURCE> <ITEM_ID> --mode validate 2>&1
```

### Step 11: Claude FIX #2 (if needed)

### Step 12: Invariants
```bash
// turbo
cd /home/khoa/RiderProjects/Project_Langfens_Microservice/scripts/pipeline_v2 && python invariants.py <SOURCE> <ITEM_ID> 2>&1
```

### Step 12.5: Cloudinary
```bash
// turbo
cd /home/khoa/RiderProjects/Project_Langfens_Microservice/scripts/pipeline_v2 && python upload_images.py <SOURCE> <ITEM_ID> 2>&1
```

### Step 13: Export
```bash
cd /home/khoa/RiderProjects/Project_Langfens_Microservice/scripts/pipeline_v2 && python export.py <SOURCE> <ITEM_ID>
```

### Step 14: Seed
```bash
PGPASSWORD=exam psql -h localhost -p 5433 -U exam -d exam-db -f "deploy/seeds/seed_exam_*.sql"
```

---

## 📋 READING RULES

### passage_md Format (PARAGRAPHS ONLY):
```markdown
**Paragraph A.**
Text of paragraph A...

**Paragraph B.**
Text of paragraph B...
```

### instruction_md Format (FULL QUESTION DETAILS):
```markdown
## QUESTIONS 1-4

Do the following statements agree with the information given in the passage?

Write:
- **YES** if the statement agrees with the view of the writer
- **NO** if the statement contradicts the view of the writer
- **NOT GIVEN** if it is impossible to say what the writer thinks about this

**1.** First statement text.
**2.** Second statement text.
**3.** Third statement text.
**4.** Fourth statement text.

---

## QUESTIONS 5-9

Label the diagram below.
Choose **NO MORE THAN TWO WORDS** from the passage.

![Diagram](https://cloudinary.com/xxx/diagram.jpg)

**5.** Label 5: _______
**6.** Label 6: _______
```

> [!IMPORTANT]
> **KHÔNG merge instruction_md vào passage_md!**
> 
> - `passage_md`: Chỉ paragraphs (A, B, C...)
> - `instruction_md`: Full question details với statements, diagrams, options
> - Frontend hiển thị `instruction_md` sau `passage_md` (bên trái)

### Key Rules:
| Field | Content |
|-------|---------|
| `passage_md` | Paragraphs only |
| `instruction_md` | Full: headings, statements, diagrams, options |
| Passage length | ≥ 100 words |
| Paragraph labels | `**Paragraph A.**\n` |

### instruction_md MUST include:
- Question group headings (`## QUESTIONS 1-4`)
- Full instruction text (từ source)
- Statement/question text với số thứ tự
- Diagrams/images nếu có (`![](cloudinary_url)`)
- Notes/table templates nếu có

### Common Fixes:
| Issue | Fix |
|-------|-----|
| instruction_md quá ngắn | Extract đầy đủ từ source |
| Missing image in instruction | Add `![](cloudinary_url)` |
| Type mismatch | Change `type` field |
| MATCHING has options | Set `options = []` |

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
| `Question distribution` | VD: "Q1-4 diagram, Q5-9 MCQ, Q10-13 summary" |
| `SLUG` | Database slug (e.g. `mini-ielts-reading-xxx`) |
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

