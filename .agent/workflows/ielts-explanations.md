---
description: Generate AI explanations for IELTS exam questions using Gemini or Codex
---

# IELTS Explanation Generator Pipeline

This workflow generates Vietnamese explanations for IELTS questions using AI (Gemini or Codex).

## Prerequisites
- Exam must already be in normalized data (`data/normalized/<source>/<item_id>.json`)
- Gemini CLI or Codex CLI configured

## Usage

### Single Exam (Gemini - Default)
```bash
cd /home/khoa/RiderProjects/Project_Langfens_Microservice/scripts/pipeline_v2
python generate_explanations.py <source> <item_id>
```

### Single Exam with Provider
```bash
# Using Gemini (recommended)
python generate_explanations.py mini-ielts 1516-the-importance-of-law --provider gemini

# Using Codex
python generate_explanations.py mini-ielts 1516-the-importance-of-law --provider codex
```

### Batch Processing (All Exams)
```bash
# Process all exams with Gemini
python generate_explanations.py --all --provider gemini

# Resume only (skip exams that already have explanations)
python generate_explanations.py --all --resume --provider gemini
```

## Execution Steps

// turbo-all

### Step 1: Generate Explanations
```bash
cd /home/khoa/RiderProjects/Project_Langfens_Microservice/scripts/pipeline_v2
python generate_explanations.py <source> <item_id> --provider gemini
```

### Step 2: Re-export to SQL (Include Explanations)
```bash
python export.py <source> <item_id>
```

### Step 3: Seed Database
```bash
PGPASSWORD=exam psql -h localhost -p 5433 -U exam -d exam-db -f "/home/khoa/RiderProjects/Project_Langfens_Microservice/deploy/seeds/seed_exam_<slug>.sql"
```

## Output
- Updates `data/normalized/<source>/<item_id>.json` with `explanation_md` for each question
- Explanations are in Vietnamese
- Format: Quote passage evidence, cite paragraph, explain answer

## Example
```bash
# Full flow for exam 1516
cd /home/khoa/RiderProjects/Project_Langfens_Microservice/scripts/pipeline_v2
python generate_explanations.py mini-ielts 1516-the-importance-of-law --provider gemini
python export.py mini-ielts 1516-the-importance-of-law
PGPASSWORD=exam psql -h localhost -p 5433 -U exam -d exam-db -f "/home/khoa/RiderProjects/Project_Langfens_Microservice/deploy/seeds/seed_exam_mini-ielts-reading-the-importance-of-law.sql"
```
