---
description: Full IELTS Writing pipeline (separate from reading/listening)
---

1. **FETCH**: `orchestrator.py --type writing <URL>`
2. **CLEAN**: `orchestrator.py - extract transcript`
3. **PARSE**: `orchestrator.py - extract questions`
4. **NORMALIZE**: `orchestrator.py - convert to schema`
5. **VALIDATE**: `orchestrator.py - schema check`
6. **GEMINI PRE**: `gemini_qa.py --type writing`
7. **CODEX PRE**: `codex_qa.py --mode pre`
8. **CLAUDE FIX #1**: Manual fixes based on AI output (e.g., slug, imageUrl)
9. **GEMINI POST**: `gemini_qa.py --type writing`
10. **CODEX VALIDATE**: `codex_qa.py --mode validate`
11. **CLAUDE FIX #2**: Additional manual fixes if needed
12. **INVARIANTS**: `invariants.py --type writing`
13. **EXPORT**: `export.py --type writing`
14. **EXPLANATIONS**: `generate_explanations.py --provider gemini`
15. **SEED**: `psql -f "deploy/seeds/seed_exam_mini-ielts-writing-<slug>.sql"`

> **NOTE**: This pipeline is isolated from the existing reading/listening pipelines to avoid conflicts. Ensure the `--type writing` flag is supported in all scripts.
