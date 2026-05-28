# REMAINING PLAN - Core Features

## Xác nhận: Đây có phải 3 chức năng CUỐI CÙNG không?

**Trả lời: CÓ**

Các features đã implement:
- ✅ Study Planner (backend + frontend basic)
- ✅ Nullable band types (currentBand/targetBand)
- ✅ Redis caching cho Study Planner
- ✅ Completion data từ DB

Các features còn lại (Infrastructure):
- Subscription System (P0) - revenue model
- Cost Optimization (P2) - AI caching
- Premium Features (P2) - offline, weekly report

**Các features còn lại (Learning Core):**

| # | Feature | Priority | Status |
|---|---------|----------|--------|
| 1 | **QuestionType Performance + Weak Detection** | P1 | ✅ Done (backend + AI integration) |
| 2 | **Grammar Tracking** | P1 | ✅ Done (backend + AI integration) |
| 3 | **Vocab Daily Exercise + Crawl** | P1 | ✅ Done (backend + frontend) |

### Vocabulary Data Status
| Source | Words | Status |
|--------|-------|--------|
| Cambridge IELTS 19 | 1,662 | ✅ Seeded |
| Cambridge IELTS 20 | 567 | ✅ Seeded |
| AWL | ~570 | ⚠️ Need to re-seed |
| Nation's 3,000 | 0 | ❌ Source not found |

### Grammar Topics Status
| Source | Topics | Status |
|--------|--------|--------|
| British Council + IELTS Liz | 10 | ✅ Seeded |
| More topics needed | +20 | ❌ Need research |

---

## FEATURE 1: Vocab Daily Exercise + Crawl

### 1.1 Nguồn Vocab

**Research cơ sở:**
- Nation's lexical coverage: 90% = ~3,000 words, 95% = ~5,000 words
- Coxhead's AWL: 570 academic words (~10% IELTS texts)
- Target: **5,500 words = 95% IELTS coverage**

| Nguồn | Số lượng | Tier | Frequency Rank |
|-------|----------|------|----------------|
| Nation's High Frequency | 3,000 | 1 | 1-3000 |
| Coxhead's AWL | 570 | 2 | 3001-3570 |
| Cambridge IELTS extract | ~2,000 | 3 | 3571-5570 |

### 1.2 VocabWord Model (đã có - cần enrich)

```prisma
model VocabWord {
  idVocab      String @id @default(uuid())
  word         String
  phonetic     String?
  meaning      String?
  example      String?
  
  // SM-2 fields (đã có)
  timesReviewed Int @default(0)
  easinessFactor Float @default(2.5)
  interval      Int @default(1)
  nextReviewAt  DateTime?
  status        String @default("new") // new|learning|review|mastered
  
  // Enrich fields
  tier          Int?   // 1, 2, 3
  frequencyRank Int?   // 1 = most common
  source        String? // "nation", "awl", "cambridge"
}
```

### 1.3 Vocab Daily Exercise Flow

```
DAILY EXERCISE FLOW:
┌─────────────────────────────────────────────────────────────┐
│ 1. USER STARTS DAILY VOCAB                                 │
│    → Get 10 words chưa mastered từ tier phù hợp            │
│    → Ưu tiên: frequency cao + chưa review gần nhất         │
├─────────────────────────────────────────────────────────────┤
│ 2. SHOW WORDS                                              │
│    Word: "ubiquitous"                                      │
│    Meaning: "existing everywhere"                          │
│    [NEXT] → [SHOW ANSWER]                                  │
├─────────────────────────────────────────────────────────────┤
│ 3. USER COMPLETES                                          │
│    → Each word: isCorrect (true/false)                     │
│    → SM-2 update: easiness, interval, nextReviewAt         │
│    → Status: new → learning → review → mastered            │
├─────────────────────────────────────────────────────────────┤
│ 4. PROGRESSION                                              │
│    • Tier 1: 80% mastered → gợi ý Tier 2 (AWL)              │
│    • Daily: "Bạn đã học X/10 từ hôm nay"                   │
│    • Band recommendation: "Cần Y từ để đạt 6.5 band"       │
└─────────────────────────────────────────────────────────────┘
```

### 1.4 Database Schema Updates

```prisma
// Thêm fields vào VocabWord (migration)
model VocabWord {
  // ... existing fields ...
  tier          Int?   // 1, 2, 3
  frequencyRank Int?
  source        String? // "nation", "awl", "cambridge"
}

// VocabDailyProgress (mới - track daily)
model VocabDailyProgress {
  id          String @id @default(uuid())
  idUser      String
  date        DateTime @db.Date
  wordsStudied Int @default(0)
  correctCount Int @default(0)
  createdAt   DateTime @default(now())
  
  @@unique([idUser, date])
}
```

### 1.5 API Endpoints

```typescript
// GET /vocab/daily
// → Lấy 10 words cho daily exercise
// → Filter: tier phù hợp với band, status != mastered

// POST /vocab/daily/complete
// Body: { answers: [{ vocabId, isCorrect }] }
// → Update SM-2 for each word
// → Track daily progress

// GET /vocab/stats
// → Progress: X/3000 words mastered
// → Tier progress: Tier 1: X%, Tier 2: X%
// → Band recommendation: Cần Y từ cho band Z
```

### 1.6 Implementation Steps

```
Step 1: Crawl Nation's 3000 words → populate DB with tier=1, frequencyRank
Step 2: Crawl AWL 570 words → populate DB with tier=2
Step 3: Extract from Cambridge readings → populate DB with tier=3
Step 4: Create VocabDailyProgress model
Step 5: Implement /vocab/daily endpoint
Step 6: Implement /vocab/daily/complete endpoint (SM-2 update)
Step 7: Create vocab exercise UI component
Step 8: Add band recommendation logic
```

---

## FEATURE 2: QuestionType Performance + Weak Detection

### 2.1 QuestionType Enum (14 types)

| # | QuestionType | Mô tả | Skill Type |
|---|--------------|-------|-----------|
| 1 | MULTIPLE_CHOICE | 4-option MCQ | R/L |
| 2 | TRUE_FALSE_NOT_GIVEN | 3-option fact check | R/L |
| 3 | YES_NO_NOT_GIVEN | 3-option opinion check | R/L |
| 4 | MATCHING_HEADING | Match paragraphs to headings | R |
| 5 | MATCHING_INFORMATION | Match statements to paragraphs | R/L |
| 6 | MATCHING_FEATURES | Match features to categories | R/L |
| 7 | MATCHING_SENTENCE_ENDINGS | Complete sentence endings | R/L |
| 8 | SENTENCE_COMPLETION | Fill blank in sentence | R/L |
| 9 | SUMMARY_COMPLETION | Fill blanks in summary | R |
| 10 | NOTE_COMPLETION | Fill blanks in notes | L |
| 11 | TABLE_COMPLETION | Fill table cells | R/L |
| 12 | FLOW_CHART_COMPLETION | Fill flowchart steps | R |
| 13 | DIAGRAM_LABELING | Label diagram | R/L |
| 14 | SHORT_ANSWER | Open short answer | R/L |

**Note:** R = Reading, L = Listening, W = Writing, S = Speaking
- **Reading/Listening:** Có questionType
- **Writing/Speaking:** Không có questionType, chỉ có overall band score

### 2.2 Database Model

```prisma
model QuestionTypePerformance {
  id            String @id @default(uuid())
  idUser        String
  skillType     String // "READING" | "LISTENING"
  questionType  String // QuestionType enum values (null for W/S)
  
  // Stats
  totalAttempts Int @default(0)
  correctCount  Int @default(0)
  
  // Computed
  errorRate     Float @default(0) // (totalAttempts - correctCount) / totalAttempts
  
  lastAttemptAt DateTime?
  
  @@unique([idUser, skillType, questionType])
}
```

### 2.3 Track When Submit Test

```typescript
async trackQuestionTypePerformance(userId: string, testResultId: string, skillType: string) {
  const answers = await db.userAnswer.findMany({
    where: { idTestResult: testResultId },
    include: { question: true }
  });
  
  // Group theo questionType
  const grouped = {};
  for (const answer of answers) {
    const qt = answer.question.questionType;
    if (!grouped[qt]) grouped[qt] = { total: 0, correct: 0 };
    grouped[qt].total++;
    if (answer.isCorrect) grouped[qt].correct++;
  }
  
  // Upsert each questionType
  for (const [questionType, stats] of Object.entries(grouped)) {
    const errorRate = (stats.total - stats.correct) / stats.total;
    
    await db.questionTypePerformance.upsert({
      where: { idUser_skillType_questionType: { idUser, skillType, questionType } },
      update: {
        totalAttempts: { increment: stats.total },
        correctCount: { increment: stats.correct },
        errorRate // Recalculate
      },
      create: {
        idUser, skillType, questionType,
        totalAttempts: stats.total,
        correctCount: stats.correct,
        errorRate
      }
    });
  }
}
```

### 2.4 Weak Detection

```typescript
async getWeakQuestionTypes(userId: string) {
  const performances = await db.questionTypePerformance.findMany({
    where: { idUser: userId, totalAttempts: { gte: 3 }, errorRate: { gte: 0.4 } }
  });
  
  // Sort by errorRate cao nhất → yếu nhất
  return performances.sort((a, b) => b.errorRate - a.errorRate);
}
```

### 2.5 Recommendation

```typescript
async getQuestionTypeRecommendations(userId: string) {
  const weakTypes = await getWeakQuestionTypes(userId);
  
  return weakTypes.map(w => ({
    skillType: w.skillType,
    questionType: w.questionType,
    errorRate: w.errorRate,
    // Strategy tips cho từng question type
    tips: STRATEGY_TIPS[w.questionType],
    // Practice questions
    practiceCount: 10
  }));
}
```

### 2.6 Strategy Tips

```typescript
const STRATEGY_TIPS = {
  'TRUE_FALSE_NOT_GIVEN': [
    'FALSE = chắc chắn sai, phủ định rõ ràng trong text',
    'NOT GIVEN = không đủ info để kết luận hoặc có mâu thuẫn',
    'Dấu hiệu "cannot be concluded", "not mentioned" → NOT GIVEN'
  ],
  'YES_NO_NOT_GIVEN': [
    'YES = đồng ý với claim/opinion trong text',
    'NO = phản đối claim/opinion trong text',
    'NOT GIVEN = không đủ info hoặc opinion khác'
  ],
  'MATCHING_HEADING': [
    'Đọc nhanh 12 heading options trước',
    'Mỗi heading chỉ dùng 1 lần',
    'Para có 2 phần → đọc đầu+cuaối para trước'
  ],
  'MATCHING_INFORMATION': [
    'Đọc statements → tìm keyword',
    'Scan từng paragraph tìm info tương ứng',
    'Statements có thể dùng nhiều lần'
  ],
  'MATCHING_FEATURES': [
    'Đọc bảng features trước',
    'Match theo keyword hoặc definition'
  ],
  'MATCHING_SENTENCE_ENDINGS': [
    'Đọc phần A trước (câu bắt đầu)',
    'Đọc phần B để guess nghĩa',
    'Chọn ending phù hợp nhất'
  ],
  'SENTENCE_COMPLETION': [
    'Đọc câu hoàn chỉnh → guess từ cần điền',
    'Check grammar agreement',
    'Giới hạn số từ cần điền'
  ],
  'SUMMARY_COMPLETION': [
    'Cần hiểu global idea của passage',
    'Word bank có thể dùng hoặc không',
    'Check grammar + meaning'
  ],
  'NOTE_COMPLETION': [
    'Nghe选择性 - chỉ cần keywords',
    'Spelling chính xác'
  ],
  'TABLE_COMPLETION': [
    'Đọc headings của table trước',
    'Scan tìm row/column chính xác'
  ],
  'FLOW_CHART_COMPLETION': [
    'Follow process flow',
    'Words từ passage hoặc word bank'
  ],
  'DIAGRAM_LABELING': [
    'Study diagram trước khi đọc',
    'Labels có thể từ passage hoặc word bank'
  ],
  'SHORT_ANSWER': [
    'Đọc câu hỏi → tìm keyword trong passage',
    'Answer cần đúng nghĩa, không cần exact match',
    'Max 1-3 words tùy yêu cầu'
  ]
};
```

### 2.7 Implementation Steps

```
Step 1: Create QuestionTypePerformance model
Step 2: Add tracking in submitReadingListeningTest()
Step 3: Create getWeakQuestionTypes() service
Step 4: Create getQuestionTypeRecommendations() service
Step 5: Frontend: Weakness Dashboard (show weak types + tips)
Step 6: Frontend: Practice mode (filter by question type)
```

---

## FEATURE 3: Grammar Tracking (RAG-lite + Violations)

### 3.1 Concept

Track grammar proficiency in REAL-TIME via Writing/Speaking submissions. AI grades AND identifies grammar violations with evidence (which sentence, what correction). No RAG infrastructure needed - just include grammar topics in prompt.

### 3.2 Database Models

**Grammar Topic (exists):**
```prisma
model Grammar {
  id          String @id @default(uuid())
  title       String  // "Subject-Verb Agreement"
  // ...
}
```

**UserGrammarProficiency (existing - needs new fields):**
```prisma
model UserGrammarProficiency {
  idUser       String
  idGrammar    String
  proficiency  String // "unknown" | "weak" | "medium" | "strong"
  
  // Track stats
  totalAttempts Int @default(0)  // Tổng (exercises + submissions)
  correctCount  Int @default(0)   // Đúng
  wrongCount    Int @default(0)   // Sai (violations + exercises)
  
  @@unique([idUser, idGrammar])
}
```

**UserGrammarViolation (NEW):**
```prisma
model UserGrammarViolation {
  id            String @id @default(uuid())
  idUser        String
  source        String // "WRITING" | "SPEAKING"
  idGrammar     String  // FK → Grammar.id
  
  // Evidence - bằng chứng
  submissionId  String  // UserWritingSubmission.id
  userSentence String  // "I goes to school" (exact from essay)
  correctedSentence String // "I go to school" (AI correction)
  
  createdAt DateTime @default(now())
  
  @@index([idUser, idGrammar])
}
```

### 3.3 AI Grading Prompt (Modified)

```typescript
const GRAMMAR_TOPICS_PROMPT = `
GRAMMAR TOPICS (chỉ ID và tên):
| topicId | Topic Name |
|---------|------------|
| subject_verb | Subject-Verb Agreement |
| verb_tenses | Verb Tenses |
| articles | Articles (a/an/the) |
| prepositions | Prepositions |
| conditionals | Conditionals |
| passive_voice | Passive Voice |
| relative_clauses | Relative Clauses |
| sentence_structure | Sentence Structure |
| word_forms | Word Forms |
| connectors | Connectors/Coherence |

USER SUBMISSION:
[essay content]

TASK:
1. Grade overall band score
2. For each grammar error, identify which topicId it violates
3. Provide exact error sentence and correction

OUTPUT (JSON only):
{
  "overallBand": 6.0,
  "grammarBand": 5.5,
  "grammarViolations": [
    {
      "topicId": "subject_verb",
      "userSentence": "I goes to school everyday",
      "correctedSentence": "I go to school every day",
      "explanation": "First person singular requires 'go'"
    }
  ]
}

IMPORTANT:
- topicId must match exactly from the table above
- userSentence must be EXACT text from user submission
- Only include topics from the table above
`;
```

### 3.4 AI Response Format

```json
{
  "overallBand": 6.0,
  "grammarBand": 5.5,
  "grammarViolations": [
    {
      "topicId": "subject_verb",
      "userSentence": "He go to school",
      "correctedSentence": "He goes to school",
      "explanation": "Third person singular"
    }
  ]
}
```

### 3.5 Save Flow

```typescript
async function saveGrammarViolations(
  userId: string,
  source: 'WRITING' | 'SPEAKING',
  submissionId: string,
  aiResponse: any
) {
  const validTopicIds = await getGrammarTopicIds();
  
  for (const v of aiResponse.grammarViolations) {
    if (!validTopicIds.has(v.topicId)) continue;
    
    await db.userGrammarViolation.create({
      data: {
        idUser: userId,
        source,
        idGrammar: v.topicId,
        submissionId,
        userSentence: v.userSentence,
        correctedSentence: v.correctedSentence
      }
    });
    
    await db.userGrammarProficiency.upsert({
      where: { idUser_idGrammar: { idUser, idGrammar: v.topicId } },
      update: { wrongCount: { increment: 1 } },
      create: { idUser, idGrammar: v.topicId, wrongCount: 1, totalAttempts: 1 }
    });
  }
}
```

### 3.6 Proficiency Calculation

```typescript
async function recalculateProficiency(userId: string, idGrammar: string) {
  const prof = await db.userGrammarProficiency.findUnique({
    where: { idUser_idGrammar: { userId, idGrammar } }
  });
  
  if (!prof || prof.totalAttempts < 3) return;
  
  const accuracy = prof.correctCount / prof.totalAttempts;
  
  let proficiency = 'unknown';
  if (accuracy < 0.4) proficiency = 'weak';
  else if (accuracy < 0.7) proficiency = 'medium';
  else proficiency = 'strong';
  
  await db.userGrammarProficiency.update({
    where: { idUser_idGrammar: { userId, idGrammar } },
    data: { proficiency }
  });
}
```

### 3.7 Frontend UI

**Grammar Progress Dashboard:**
```
┌─────────────────────────────────────────────────────────┐
│ GRAMMAR PROGRESS                            │
├─────────────────────────────────────────────────────────┤
│ WEAK AREAS (từ Writing/Speaking):                    │
│ 1. [HIGH] Subject-Verb Agreement (4 lần sai)          │
│ 2. [HIGH] Verb Tenses (3 lần sai)                     │
│ 3. [MEDIUM] Articles (2 lần sai)                       │
├─────────────────────────────────────────────────────────┤
│ [ÔN SUBJECT-VERB]  [ÔN VERB TENSES]  [ÔN ARTICLES]    │
└─────────────────────────────────────────────────────────┘
```

**Topic Detail:**
```
┌─────────────────────────────────────────────────────────┐
│ Subject-Verb Agreement                     [ÔN TOPIC] │
├─────────────────────────────────────────────────────────┤
│ TỪ WRITING:                                             │
│ • "He go to school" → "He goes to school"              │
│ • "She don't like it" → "She doesn't like it"          │
├─────────────────────────────────────────────────────────┤
│ TỪ SPEAKING:                                            │
│ • "People has" → "People have"                          │
├─────────────────────────────────────────────────────────┤
│ [LUYỆN 10 CÂU]                    [TIẾP TỤC]           │
└─────────────────────────────────────────────────────────┘
```

### 3.8 Token Cost

| Component | Tokens | Cost |
|-----------|--------|------|
| System + topics | 130 | $0.00013 |
| User essay (500w) | 700 | $0.0007 |
| Few-shot + response | 300 | $0.0003 |
| **TOTAL** | ~1,130 | **~$0.00113** (~20 VND) |

**Chênh lệch vs không có grammar:** ~6 VND/request

### 3.9 Implementation Steps

```
Step 1: Add fields to UserGrammarProficiency (totalAttempts, correctCount, wrongCount)
Step 2: Create UserGrammarViolation model
Step 3: Update grading worker prompt to include grammar topics
Step 4: Add few-shot examples for accuracy
Step 5: Implement saveGrammarViolations() function
Step 6: Update recalculateProficiency()
Step 7: Create getGrammarRecommendations() service
Step 8: Frontend: Grammar Progress dashboard
Step 9: Frontend: Topic detail with violations list
```

---

## Tổng Kết Implementation Order

| Order | Feature | Estimated Time |
|-------|---------|----------------|
| 1 | Vocab Daily Exercise + Crawl | 4-6 hours |
| 2 | QuestionType Performance + Weak Detection | 5-7 hours |
| 3 | Grammar Tracking | 4-6 hours |

---

## Files Cần Tạo/Sửa

### Backend
```
src/module/vocabulary/
  - vocabulary.service.ts (add daily exercise methods)
  - vocabulary.controller.ts (add daily endpoints)
  
src/module/question-type-performance/ (NEW)
  - question-type-performance.module.ts
  - question-type-performance.service.ts
  - question-type-performance.controller.ts

src/module/grammar-error/ (NEW)
  - grammar-error.module.ts
  - grammar-error.service.ts
  - grammar-error.controller.ts
```

### Frontend
```
src/Pages/client/VocabDaily/
  - index.jsx (daily vocab exercise)
  
src/Pages/client/WeaknessDashboard/
  - index.jsx (question type + grammar weaknesses)
```

---

## Verification Checklist

### Vocab Daily
- [ ] Crawl 3000 Nation's words → DB
- [ ] Crawl AWL 570 words → DB
- [ ] Daily exercise shows 10 words
- [ ] SM-2 updates correctly
- [ ] Progress tracking works

### QuestionType Performance
- [ ] Tracking on test submit
- [ ] Weak detection (errorRate >= 40%)
- [ ] Pattern analysis shows user confusion
- [ ] Strategy tips display
- [ ] Practice questions load

### Grammar Tracking
- [ ] Track from Grammar Exercise
- [ ] Parse AI detailedCorrections
- [ ] Map to categories (fuzzy matching)
- [ ] Unknown errors go to GRAMMAR_GENERAL
- [ ] Recommendation based on combined sources