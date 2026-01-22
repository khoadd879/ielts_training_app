---
description: FULL Pipeline - Auto fetch + cloudinary + export + seed
---

# /full <URL> - FULL 15-STEP PIPELINE

> [!IMPORTANT]
> `/full` = Chạy đầy đủ 15 bước như `/ielts-listening-pipeline` hoặc `/ielts-pipeline`
> Bao gồm: AI Validators (Gemini, Codex) + Claude FIX

## 🚀 EXECUTION

Khi user gọi `/full <URL>`:

### 1. Detect exam type từ URL:
- `listening` trong URL → listening exam
- Còn lại → reading exam

### 2. Chạy đủ 15 steps:

```bash
// turbo
cd /home/khoa/RiderProjects/Project_Langfens_Microservice/scripts/pipeline_v2 && python orchestrator.py "<URL>" --type <TYPE> 2>&1
```

### 3. GEMINI PRE-CHECK
```bash
// turbo
cd /home/khoa/RiderProjects/Project_Langfens_Microservice/scripts/pipeline_v2 && timeout 90 python gemini_qa.py mini-ielts <ITEM_ID> --type <TYPE> 2>&1
```

### 4. CODEX PRE-CHECK  
```bash
// turbo
cd /home/khoa/RiderProjects/Project_Langfens_Microservice/scripts/pipeline_v2 && timeout 300 python codex_qa.py mini-ielts <ITEM_ID> --mode pre 2>&1
```

### 5. CLAUDE FIX #1
Đọc output Gemini/Codex và FIX với python script

### 6. GEMINI POST-CHECK
```bash
// turbo
cd /home/khoa/RiderProjects/Project_Langfens_Microservice/scripts/pipeline_v2 && timeout 90 python gemini_qa.py mini-ielts <ITEM_ID> --type <TYPE> 2>&1
```

### 7. CODEX VALIDATE
```bash
// turbo
cd /home/khoa/RiderProjects/Project_Langfens_Microservice/scripts/pipeline_v2 && timeout 300 python codex_qa.py mini-ielts <ITEM_ID> --mode validate 2>&1
```

### 8. CLAUDE FIX #2 (if needed)

### 9. INVARIANTS
```bash
// turbo
cd /home/khoa/RiderProjects/Project_Langfens_Microservice/scripts/pipeline_v2 && python invariants.py mini-ielts <ITEM_ID> --type <TYPE> 2>&1
```

### 10. CLOUDINARY
```bash
// turbo
cd /home/khoa/RiderProjects/Project_Langfens_Microservice/scripts/pipeline_v2 && python upload_images.py mini-ielts <ITEM_ID> 2>&1
```

### 11. EXPORT
```bash
// turbo
cd /home/khoa/RiderProjects/Project_Langfens_Microservice/scripts/pipeline_v2 && python export.py mini-ielts <ITEM_ID> --type <TYPE> 2>&1
```

### 12. EXPLANATIONS (Optional)
```bash
// turbo
cd /home/khoa/RiderProjects/Project_Langfens_Microservice/scripts/pipeline_v2 && python generate_explanations.py mini-ielts <ITEM_ID> --provider gemini 2>&1
```

### 13. SEED
```bash
PGPASSWORD=exam psql -h localhost -p 5433 -U exam -d exam-db -f "deploy/seeds/seed_exam_*.sql"
```

## ✅ DIFFERENCE vs /ielts-listening-pipeline

| | /ielts-listening-pipeline | /full |
|---|---|---|
| Steps | 15 | 15 (same) |
| AI Validators | ✅ | ✅ |
| Claude FIX | ✅ | ✅ |
| Difference | Listening only | Auto-detect type |

## 📋 USAGE

```
/full https://mini-ielts.com/1171/listening/the-horton-castle-site-
/full https://mini-ielts.com/123/reading/some-passage
```

## 🔗 RELATED
- `/ielts-listening-pipeline` - Listening specific
- `/ielts-pipeline` - Reading specific  
- `/hints` - Question type reference
