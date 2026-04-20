# AI Grading Verification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Verify AI grading endpoints hoạt động đúng contract, đảm bảo FE có thể gọi đúng API mà không bị mismatch.

**Architecture:**
- Audit existing writing/speaking submission endpoints and DTOs
- Verify contract responses match what FE expects
- Document contract for FE team
- No code changes needed if contracts are correct - this is an verification task

**Tech Stack:** NestJS, Swagger/OpenAPI, Postman (optional for testing)

---

## File Structure

```
src/module/user-writing-submission/
  user-writing-submission.controller.ts   # VERIFY - endpoint routes
  user-writing-submission.service.ts      # VERIFY - response shape
  dto/
    create-user-writing-submission.dto.ts # VERIFY - request shape
src/module/user-speaking-submission/
  user-speaking-submission.controller.ts  # VERIFY - endpoint routes
  user-speaking-submission.service.ts     # VERIFY - response shape
  dto/
    create-user-speaking-submission.dto.ts # VERIFY - request shape
docs/api/                                  # UPDATE - document contract
  writing-submission-contract.md
  speaking-submission-contract.md
```

---

## Task 1: Audit Writing Submission Endpoint

**Files:**
- Read: `src/module/user-writing-submission/user-writing-submission.controller.ts`
- Read: `src/module/user-writing-submission/dto/create-user-writing-submission.dto.ts`
- Read: `src/module/user-writing-submission/user-writing-submission.service.ts`

- [ ] **Step 1: Read controller**

Document:
- Route path (e.g., `/user-writing-submission/create`)
- HTTP method (POST/PATCH/etc)
- Request params and body structure
- Response structure

```bash
cat /home/khoa/Documents/ielts_training_app/src/module/user-writing-submission/user-writing-submission.controller.ts
```

- [ ] **Step 2: Read DTO**

Document:
- Required fields
- Optional fields
- Validation rules

```bash
cat /home/khoa/Documents/ielts_training_app/src/module/user-writing-submission/dto/create-user-writing-submission.dto.ts
```

- [ ] **Step 3: Read service create method**

Document:
- What validation happens
- What data is created
- What response is returned
- Side effects (RabbitMQ publish)

```bash
cat /home/khoa/Documents/ielts_training_app/src/module/user-writing-submission/user-writing-submission.service.ts
```

- [ ] **Step 4: Check grading response shape**

Read the grading result return:

Look at `findOne` method which returns grading details, and check the aiDetailedFeedback structure.

```bash
grep -A 50 "aiDetailedFeedback" /home/khoa/Documents/ielts_training_app/src/module/user-writing-submission/user-writing-submission.service.ts
```

Document:
- Response fields when grading is COMPLETED
- AI feedback structure (TA/CC/LR/GRA subscores)
- Band score field name (camelCase vs snake_case)

- [ ] **Step 5: Create contract document**

Create `docs/api/writing-submission-contract.md`:

```markdown
# Writing Submission API Contract

## Create Submission

**Endpoint:** `POST /user-writing-submission/create-writing-submission/:idTestResult`

**Request Body:**
```json
{
  "idUser": "uuid",
  "idWritingTask": "uuid",
  "submissionText": "string"
}
```

**Response (202 Accepted):**
```json
{
  "submissionId": "uuid",
  "aiGradingStatus": "PENDING",
  "status": 202
}
```

## Get Submission Details

**Endpoint:** `GET /user-writing-submission/:idWritingSubmission`

**Response (200 OK):**
```json
{
  "message": "Details retrieved successfully",
  "data": {
    "idWritingSubmission": "uuid",
    "idUser": "uuid",
    "idWritingTask": "uuid",
    "submissionText": "string",
    "aiGradingStatus": "COMPLETED",
    "aiOverallScore": 6.5,
    "aiDetailedFeedback": {
      "taskAchievement": { "score": 6.5, "comment": "..." },
      "coherenceAndCohesion": { "score": 6.0, "comment": "..." },
      "lexicalResource": { "score": 6.5, "comment": "..." },
      "grammaticalRangeAndAccuracy": { "score": 6.0, "comment": "..." },
      "generalFeedback": "...",
      "detailedCorrections": [...]
    },
    "submittedAt": "ISO date",
    "gradedAt": "ISO date"
  }
}
```

## List User Submissions

**Endpoint:** `GET /user-writing-submission/list/:idUser`

**Response (200 OK):**
```json
{
  "message": "User writing submissions retrieved successfully",
  "data": [
    {
      "idWritingSubmission": "uuid",
      "taskTitle": "string",
      "submittedAt": "ISO date",
      "aiGradingStatus": "COMPLETED",
      "bandScore": 6.5,
      "generalFeedback": "..."
    }
  ]
}
```

## Regrade Submission

**Endpoint:** `PATCH /user-writing-submission/:idWritingSubmission`

**Request Body:**
```json
{
  "regrade": true
}
```

**Response (202 Accepted):**
```json
{
  "message": "Regrade queued successfully",
  "data": {
    "aiGradingStatus": "PENDING"
  }
}
```

---

## Task 2: Audit Speaking Submission Endpoint

**Files:**
- Read: `src/module/user-speaking-submission/user-speaking-submission.controller.ts`
- Read: `src/module/user-speaking-submission/dto/create-user-speaking-submission.dto.ts`
- Read: `src/module/user-speaking-submission/user-speaking-submission.service.ts`

- [ ] **Step 1: Read all three files**

```bash
cat /home/khoa/Documents/ielts_training_app/src/module/user-speaking-submission/user-speaking-submission.controller.ts
cat /home/khoa/Documents/ielts_training_app/src/module/user-speaking-submission/dto/create-user-speaking-submission.dto.ts
cat /home/khoa/Documents/ielts_training_app/src/module/user-speaking-submission/user-speaking-submission.service.ts
```

- [ ] **Step 2: Create contract document**

Create `docs/api/speaking-submission-contract.md`:

```markdown
# Speaking Submission API Contract

## Create Submission

**Endpoint:** `POST /user-speaking-submission/create-speaking-submission`

**Request Body (multipart/form-data):**
```
idUser: string (uuid)
idSpeakingTask: string (uuid)
audio: file (mp3/wav, max 10MB)
```

Or for API with pre-uploaded audio:
```json
{
  "idUser": "uuid",
  "idSpeakingTask": "uuid",
  "audioUrl": "string"
}
```

**Response (202 Accepted):**
```json
{
  "submissionId": "uuid",
  "aiGradingStatus": "PENDING",
  "status": 202
}
```

## Get Submission Details

**Endpoint:** `GET /user-speaking-submission/:idSpeakingSubmission`

**Response (200 OK):**
```json
{
  "message": "Details retrieved successfully",
  "data": {
    "idSpeakingSubmission": "uuid",
    "idUser": "uuid",
    "idSpeakingTask": "uuid",
    "audioUrl": "string",
    "transcript": "string",
    "aiGradingStatus": "COMPLETED",
    "aiOverallScore": 6.5,
    "aiDetailedFeedback": {
      "fluencyAndCoherence": { "score": 6.5, "comment": "..." },
      "lexicalResource": { "score": 6.0, "comment": "..." },
      "grammaticalRangeAndAccuracy": { "score": 5.5, "comment": "..." },
      "pronunciation": { "score": 7.0, "comment": "..." },
      "generalFeedback": "...",
      "detailedCorrections": [...]
    },
    "submittedAt": "ISO date",
    "gradedAt": "ISO date"
  }
}
```

## List User Submissions

**Endpoint:** `GET /user-speaking-submission/list/:idUser`

**Response (200 OK):**
```json
{
  "message": "User speaking submissions retrieved successfully",
  "data": [
    {
      "idSpeakingSubmission": "uuid",
      "taskTitle": "string",
      "audioUrl": "string",
      "submittedAt": "ISO date",
      "aiGradingStatus": "COMPLETED",
      "bandScore": 6.5,
      "generalFeedback": "..."
    }
  ]
}
```
```

---

## Task 3: Check AI Worker Response Format

**Files:**
- Read: `ai-workers/grading-worker/write.handler.ts`
- Read: `ai-workers/grading-worker/speak.handler.ts`

- [ ] **Step 1: Verify grading update logic**

```bash
cat /home/khoa/Documents/ielts_training_app/ai-workers/grading-worker/write.handler.ts
```

Check:
- What fields are updated when grading completes?
- Is `aiOverallScore` in camelCase?
- Is `aiDetailedFeedback` JSON with the right structure?

- [ ] **Step 2: Verify speaking handler**

```bash
cat /home/khoa/Documents/ielts_training_app/ai-workers/grading-worker/speak.handler.ts
```

Same checks as Step 1.

- [ ] **Step 3: Verify the neon service update methods**

```bash
grep -A 20 "updateWritingSubmission" /home/khoa/Documents/ielts_training_app/ai-workers/neon.service.ts
grep -A 20 "updateSpeakingSubmission" /home/khoa/Documents/ielts_training_app/ai-workers/neon.service.ts
```

Verify they match the Prisma model fields.

---

## Task 4: Document Contract Discrepancies (if any)

- [ ] **Step 1: Identify any mismatches**

Compare what BE returns vs what FE expects based on:
- Field names (camelCase vs snake_case)
- Response structure (array vs object, nested vs flat)
- Status values (PENDING/GRADING vs PENDING/COMPLETED/FAILED)

If there are discrepancies:
1. Document them clearly
2. Decide: fix BE or update FE expectation
3. For Stage 1, prefer fixing BE if the fix is trivial

- [ ] **Step 2: Create discrepancy report (if issues found)**

Create `docs/api/grading-contract-discrepancies.md` with:
- Discrepancy description
- Current BE behavior
- Expected FE behavior
- Recommended fix
- Effort estimate

---

## Task 5: Create API Documentation Summary

**Files:**
- Update: `docs/README.md`
- Create: `docs/api/ai-grading-summary.md`

- [ ] **Step 1: Create AI grading summary doc**

```markdown
# AI Grading API Summary

## Flow

1. User submits writing/speaking via REST API
2. API returns 202 Accepted with submissionId and PENDING status
3. Message published to RabbitMQ grading queue
4. AI worker (grading-worker) processes asynchronously:
   - Writing: Groq LLM grades using IELTS rubric
   - Speaking: Whisper transcription + Groq LLM grading
5. Worker updates submission with results (COMPLETED or FAILED)
6. User polls GET endpoint or receives push notification

## Credit Cost

- Writing: 1 credit per submission
- Speaking: 2 credits per submission (Whisper + LLM)

## Response Times

- Writing: typically 5-15 seconds
- Speaking: typically 10-30 seconds (includes transcription)

## Webhook/Notification (future enhancement)

Not implemented in current version. User must poll:
```
GET /user-writing-submission/:id
GET /user-speaking-submission/:id
```

Check `aiGradingStatus` field for:
- `PENDING` - Queued, not yet processed
- `GRADING` - Worker is processing (if worker sets this)
- `COMPLETED` - Results ready
- `FAILED` - Grading failed, credits refunded
```

- [ ] **Step 2: Update docs/README.md**

Add entry for AI grading docs:

```markdown
- `docs/api/ai-grading-summary.md` - AI grading flow and endpoints
- `docs/api/writing-submission-contract.md` - Writing submission contract
- `docs/api/speaking-submission-contract.md` - Speaking submission contract
```

- [ ] **Step 3: Commit**

```bash
git add docs/api/writing-submission-contract.md docs/api/speaking-submission-contract.md docs/api/ai-grading-summary.md
git commit -m "docs: add AI grading API contract documentation"
```

---

## Verification Checklist

After implementation, verify:

- [ ] Writing submission create returns 202 with `submissionId` and `aiGradingStatus: 'PENDING'`
- [ ] Writing submission details returns `aiOverallScore` (camelCase, not `ai_overall_score`)
- [ ] Writing submission details returns `aiDetailedFeedback` with TA/CC/LR/GRA structure
- [ ] Speaking submission create returns 202 with `submissionId` and `aiGradingStatus: 'PENDING'`
- [ ] Speaking submission details returns `transcript` field
- [ ] Speaking submission details returns `aiDetailedFeedback` with FC/LR/GRA/P structure
- [ ] Regrade endpoint queues new grading job
- [ ] Polling for status works (PENDING → COMPLETED/FAILED)
- [ ] Failed grading results in `aiGradingStatus: 'FAILED'`
- [ ] Credits are refunded on failed grading (if credits system is implemented)

---

## Notes

**This is a verification task, not a coding task.**

If contracts are correct, no code changes are needed. The output of this task is documentation that FE team can use to integrate correctly.

If discrepancies are found, the fix is usually trivial (rename a field in DTO, adjust response mapping). Document the discrepancy and decide if it needs fixing before Stage 1 or can be handled in FE.

**Time estimate:** ~2-3 hours for thorough audit and documentation.
