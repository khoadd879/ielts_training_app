# AI Microservices Architecture Design

**Date**: 2026-04-17
**Status**: Approved
**Architecture Type**: Monolith + AI Workers with RabbitMQ

---

## Overview

Tách AI processing (chatbot RAG, writing grading, speaking grading) thành các worker services riêng biệt, giao tiếp qua RabbitMQ. Main app vẫn giữ nguyên là monolith NestJS trên Neon database.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      MAIN NESTJS APP                             │
│                        (Neon PostgreSQL)                        │
│  ├── Users, Tests, Forum, Writing, Speaking Modules            │
│  ├── RabbitMQ Publisher (amqplib)                              │
│  └── Redis Cache (conversation history)                        │
└─────────────────────────────────────────────────────────────────┘
                                │
                    ┌───────────┴───────────┐
                    ▼                       ▼
         ┌──────────────────┐    ┌──────────────────┐
         │  GRADING QUEUE   │    │  CHATBOT QUEUE   │
         │  grading.write   │    │  chatbot.ask     │
         │  grading.speak   │    │  chatbot.embed   │
         └──────────────────┘    └──────────────────┘
                    │                       │
        ┌───────────┴───────────┐           │
        ▼                       ▼           ▼
┌──────────────┐        ┌──────────────┐ ┌──────────────┐
│ Grading      │        │ Chatbot      │ │ Embedding    │
│ Worker       │        │ Worker       │ │ Worker       │
│ (TypeScript) │        │ (TypeScript) │ │ (TypeScript) │
└──────────────┘        └──────────────┘ └──────────────┘
        │                       │                       │
        ▼                       ▼                       ▼
   ┌─────────┐           ┌─────────────┐          ┌─────────────┐
   │  Neon   │           │ Supabase    │          │ Supabase    │
   │ (write) │           │ (pgvector)  │          │ (pgvector)  │
   └─────────┘           └─────────────┘          └─────────────┘
```

---

## Infrastructure Decisions

| Component | Technology | Purpose |
|-----------|------------|---------|
| Main App DB | Neon (PostgreSQL) | Existing - users, tests, submissions |
| RAG Vector DB | Supabase (pgvector) | Chatbot document storage |
| Message Queue | RabbitMQ | Async task distribution |
| STT | Groq Whisper | Speech-to-text |
| LLM | Groq | All AI inference |
| Cache | Redis | Conversation history (existing) |

---

## Database Schemas

### Neon (Existing - No Changes)
```prisma
model UserWritingSubmission {
  idWritingSubmission  String
  idUser                String
  idWritingTask         String
  idTestResult          String?
  submissionText        String
  aiGradingStatus       GradingStatus @default(PENDING)
  aiOverallScore        Float?
  aiDetailedFeedback    Json?
  gradedAt              DateTime?
  // ... existing fields
}

model UserSpeakingSubmission {
  idSpeakingSubmission  String
  idUser                String
  idSpeakingTask        String
  idTestResult          String?
  audioUrl              String
  transcript            String?
  aiGradingStatus       GradingStatus @default(PENDING)
  aiOverallScore        Float?
  aiDetailedFeedback    Json?
  gradedAt              DateTime?
  // ... existing fields
}
```

### Supabase (New - RAG Vector Store)
```sql
-- Documents table for RAG
CREATE TABLE rag_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  metadata JSONB, -- {source, category, user_id}
  embedding VECTOR(1536), -- Groq embeddings dimension
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX ON rag_documents USING ivfflat (embedding vector_cosine_ops);

-- Chat sessions (optional - if not using Redis)
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  messages JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Message Queue Specifications

### RabbitMQ Exchanges & Queues

```typescript
// Exchange names
const EXCHANGES = {
  GRADING: 'grading.exchange',
  CHATBOT: 'chatbot.exchange',
} as const;

// Queues
const QUEUES = {
  GRADING_WRITE: 'grading.write',    // Writing submission grading
  GRADING_SPEAK: 'grading.speak',    // Speaking submission grading
  CHATBOT_ASK: 'chatbot.ask',        // User message to chatbot
  CHATBOT_EMBED: 'chatbot.embed',    // Document embedding task
} as const;

// Routing keys
const ROUTING_KEYS = {
  WRITE: 'grading.write',
  SPEAK: 'grading.speak',
  ASK: 'chatbot.ask',
  EMBED: 'chatbot.embed',
} as const;
```

### Message Payloads

#### grading.write
```typescript
interface GradingWriteMessage {
  submissionId: string;
  userId: string;
  type: 'Task1' | 'Task2';
  submissionText: string;
  prompt: string;
  imageUrl?: string; // Task 1 only
}
```

#### grading.speak
```typescript
interface GradingSpeakMessage {
  submissionId: string;
  userId: string;
  audioUrl: string;
  transcript?: string; // Pre-transcribed if available
  taskTitle: string;
  questionsText: string;
}
```

#### chatbot.ask
```typescript
interface ChatbotAskMessage {
  sessionId: string;
  userId: string;
  message: string;
  conversationHistory?: Array<{sender: 'user' | 'bot'; message: string}>;
}
```

#### chatbot.embed
```typescript
interface ChatbotEmbedMessage {
  documentId: string;
  content: string;
  metadata: {
    source: string;
    category: 'ielts_tips' | 'grammar' | 'vocabulary' | 'sample_answers';
    userId?: string;
  };
}
```

---

## Worker Specifications

### 1. Grading Worker

**Location**: `ai-workers/grading-worker/`

**Dependencies**:
- `groq` SDK (LLM)
- `@groq/webrtc-noise` (if needed)
- `@prisma/client` (Neon)
- `amqplib`
- `axios`

**Flow**:

```typescript
// Pseudocode
async function processWriteGrading(msg: GradingWriteMessage) {
  // 1. Build IELTS grading prompt
  const prompt = buildWritingPrompt(msg.submissionText, msg.prompt, msg.type);

  // 2. Call Groq LLM
  const result = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
  });

  // 3. Parse and validate response
  const feedback = JSON.parse(result.choices[0].message.content);

  // 4. Write to Neon
  await prisma.userWritingSubmission.update({
    where: { idWritingSubmission: msg.submissionId },
    data: {
      aiGradingStatus: 'COMPLETED',
      aiOverallScore: feedback.overall_score,
      aiDetailedFeedback: feedback,
      gradedAt: new Date(),
    },
  });
}

async function processSpeakGrading(msg: GradingSpeakMessage) {
  // 1. If no transcript, use Groq Whisper
  let transcript = msg.transcript;
  if (!transcript) {
    const audioBuffer = await downloadAudio(msg.audioUrl);
    transcript = await groq.audio.transcriptions.create({
      file: audioBuffer,
      model: 'whisper-large-v3',
    });
  }

  // 2. Build speaking prompt with transcript
  const prompt = buildSpeakingPrompt(transcript, msg.taskTitle, msg.questionsText);

  // 3. Call Groq LLM
  const result = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
  });

  // 4. Parse and write to Neon
  const feedback = JSON.parse(result.choices[0].message.content);
  await prisma.userSpeakingSubmission.update({
    where: { idSpeakingSubmission: msg.submissionId },
    data: {
      aiGradingStatus: 'COMPLETED',
      transcript,
      aiOverallScore: feedback.overall_score,
      aiDetailedFeedback: feedback,
      gradedAt: new Date(),
    },
  });
}
```

**Prompts**: Xem Section 6.

### 2. Chatbot Worker

**Location**: `ai-workers/chatbot-worker/`

**Dependencies**:
- `groq` SDK (LLM + Embeddings)
- `@supabase/supabase-js` (pgvector)
- `amqplib`

**Flow**:

```typescript
async function processChatbotAsk(msg: ChatbotAskMessage) {
  // 1. Generate embedding for user message
  const embedding = await groq.embeddings.create({
    model: 'embed-english-v2',
    input: msg.message,
  });

  // 2. Query Supabase pgvector for relevant context
  const { data: contexts } = await supabase
    .rpc('match_documents', {
      query_embedding: embedding.data[0].embedding,
      match_threshold: 0.7,
      match_count: 5,
    });

  // 3. Build RAG prompt
  const systemPrompt = buildRagSystemPrompt(contexts);
  const fullPrompt = `${systemPrompt}\n\nConversation:\n${formatHistory(msg.conversationHistory)}\n\nUser: ${msg.message}\nBot:`;

  // 4. Call Groq LLM
  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: systemPrompt },
      ...msg.conversationHistory.map(m => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.message,
      })),
      { role: 'user', content: msg.message },
    ],
  });

  // 5. Return response (via callback queue or WebSocket)
  const reply = response.choices[0].message.content;
  await publishToCallbackQueue(msg.sessionId, reply);
}
```

### 3. Embedding Worker

**Location**: `ai-workers/embedding-worker/`

**Dependencies**:
- `groq` SDK (Embeddings)
- `@supabase/supabase-js` (pgvector)
- `amqplib`

**Flow**:

```typescript
async function processEmbed(msg: ChatbotEmbedMessage) {
  // 1. Chunk document (overlap for context)
  const chunks = chunkDocument(msg.content, {
    chunkSize: 1000,
    overlap: 200,
  });

  // 2. Generate embeddings for each chunk
  for (const chunk of chunks) {
    const embedding = await groq.embeddings.create({
      model: 'embed-english-v2',
      input: chunk,
    });

    // 3. Insert into Supabase pgvector
    await supabase.from('rag_documents').insert({
      content: chunk,
      metadata: {
        ...msg.metadata,
        documentId: msg.documentId,
      },
      embedding: embedding.data[0].embedding,
    });
  }
}
```

---

## Prompts

### Writing Grading Prompt
```markdown
You are a certified IELTS Writing examiner.
{{TASK_TYPE_NOTE}}

RULES:
1. Act as a strict but fair IELTS examiner.
2. Follow IELTS public band descriptors.
3. For each of the 4 criteria (TR/TA, CC, LR, GRA), provide detailed feedback.
4. Identify specific mistakes. Provide: original text, correction, and explanation.
5. Return ONLY pure JSON.

JSON OUTPUT FORMAT:
{
  "score": number,
  "task_response": string,
  "coherence_and_cohesion": string,
  "lexical_resource": string,
  "grammatical_range_and_accuracy": string,
  "general_feedback": string,
  "detailed_corrections": [
    {
      "mistake": "string",
      "correct": "string",
      "explanation": "string",
      "type": "Grammar | Lexis | Spelling | Cohesion"
    }
  ]
}

### Writing Prompt:
{{PROMPT}}

### Candidate's Essay:
{{ESSAY_TEXT}}
```

### Speaking Grading Prompt
```markdown
You are a strict IELTS Speaking examiner.
Evaluate the candidate's response based on official IELTS criteria.

### Candidate Submission:
- **Transcript**: "{{TRANSCRIPT}}"

*(INSTRUCTION: Use the transcript to check Vocabulary and Grammar accuracy.
Use the Audio to check Pronunciation and Fluency/Intonation.)*

### Task Info:
Task: {{TASK_TITLE}}
Questions: {{QUESTIONS}}

----------------------------------
Return valid JSON only (no markdown):
{
  "score_fluency": 6.5,
  "score_lexical": 6.0,
  "score_grammar": 5.5,
  "score_pronunciation": 7.0,
  "overall_score": 6.5,
  "comment_fluency": "...",
  "comment_lexical": "...",
  "comment_grammar": "...",
  "comment_pronunciation": "...",
  "general_feedback": "...",
  "detailed_corrections": [...]
}
```

### Chatbot RAG System Prompt
```markdown
You are IELTS Assistant AI.
Your role: help the user improve English for IELTS (Writing, Speaking, Vocabulary, etc.)

## Context from knowledge base:
{{RAG_CONTEXTS}}

## Instructions:
- Respond in a natural, friendly tone.
- Be concise, educational, and clear.
- Use the provided context to give accurate IELTS-specific answers.
- Answer in English if the user asks in English.
- Answer in Vietnamese if the user asks in Vietnamese.
- Don't answer if the question is not related to IELTS or English learning.
- If the context doesn't contain enough information, say so honestly.
```

---

## API Changes (NestJS)

### Current Flow (Synchronous)
```typescript
// BEFORE: UserWritingSubmissionService
async create(...) {
  // 1. Validate
  // 2. Call AI (blocking 3-8s)
  const result = await this.evaluateWriting(text, prompt);
  // 3. Save to DB
  await this.prisma.userWritingSubmission.create({...});
}
```

### New Flow (Async via RabbitMQ)
```typescript
// AFTER: UserWritingSubmissionService
async create(...) {
  // 1. Validate
  // 2. Create pending submission
  const submission = await this.prisma.userWritingSubmission.create({
    data: { aiGradingStatus: 'PENDING', ... }
  });
  // 3. Publish to queue
  await this.rabbitMQService.publish('grading.write', {
    submissionId: submission.idWritingSubmission,
    userId: submission.idUser,
    type: writingTask.taskType,
    submissionText,
    prompt: writingTask.title,
    imageUrl: writingTask.image,
  });
  // 4. Return immediately
  return { status: 202, submissionId: submission.idWritingSubmission };
}
```

### New Endpoints for Status Polling
```typescript
// GET /writing-submissions/:id/status
// Returns: { status: 'PENDING' | 'GRADING' | 'COMPLETED' | 'FAILED', result? }

// GET /chat-bot/history/:userId  (existing - may need adjustment)
// GET /chat-bot/sessions/:userId (new - for session management)
```

---

## Error Handling

### Retry Policy
```typescript
const RETRY_CONFIG = {
  maxRetries: 3,
  backoff: { initial: 1000, multiplier: 2 }, // 1s, 2s, 4s
  deadLetterQueue: 'grading.failed',
};
```

### Dead Letter Queue
- Messages that fail after max retries go to `*.failed` queue
- Manual intervention or scheduled job to retry

### Circuit Breaker
- If Groq API fails X times in Y seconds, open circuit
- Return "Service temporarily unavailable" to users

---

## File Structure

```
ielts_training_app/
├── src/                          # Main NestJS app (existing)
│   └── module/
│       ├── user-writing-submission/
│       │   └── user-writing-submission.service.ts  # Modified - async
│       ├── user-speaking-submission/
│       │   └── user-speaking-submission.service.ts # Modified - async
│       └── chat-bot/
│           └── chat-bot.service.ts                # Modified - async publish
├── ai-workers/                   # NEW - AI microservices
│   ├── grading-worker/
│   │   ├── src/
│   │   │   ├── index.ts         # Entry point, queue consumer
│   │   │   ├── handlers/
│   │   │   │   ├── write.handler.ts
│   │   │   │   └── speak.handler.ts
│   │   │   ├── prompts/
│   │   │   │   ├── writing.prompt.ts
│   │   │   │   └── speaking.prompt.ts
│   │   │   └── services/
│   │   │       ├── groq.service.ts
│   │   │       └── neon.service.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── chatbot-worker/
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── handlers/
│   │   │   │   └── ask.handler.ts
│   │   │   ├── prompts/
│   │   │   │   └── rag.prompt.ts
│   │   │   └── services/
│   │   │       ├── groq.service.ts
│   │   │       └── supabase.service.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── embedding-worker/
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── handlers/
│   │   │   │   └── embed.handler.ts
│   │   │   ├── services/
│   │   │   │   ├── groq.service.ts
│   │   │   │   ├── chunker.service.ts
│   │   │   │   └── supabase.service.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── shared/
│       ├── types/
│       │   └── messages.ts
│       ├── config/
│       │   └── rabbitmq.ts
│       └── package.json
├── docs/
│   └── superpowers/
│       └── specs/
│           └── 2026-04-17-ai-microservices-architecture-design.md
├── docker-compose.yml            # Updated with AI workers
├── Dockerfile.ai-grading        # For grading worker
├── Dockerfile.ai-chatbot        # For chatbot worker
└── Dockerfile.ai-embedding     # For embedding worker
```

---

## Deployment Configuration

### Docker Compose (AI Workers)
```yaml
services:
  # ... existing services (NestJS, Neon, Redis, RabbitMQ)

  ai-grading-worker:
    build:
      context: ./ai-workers/grading-worker
    environment:
      - RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672
      - GROQ_API_KEY=${GROQ_API_KEY}
      - NEON_DATABASE_URL=${NEON_DATABASE_URL}
    depends_on:
      - rabbitmq

  ai-chatbot-worker:
    build:
      context: ./ai-workers/chatbot-worker
    environment:
      - RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672
      - GROQ_API_KEY=${GROQ_API_KEY}
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
      - SUPABASE_SERVICE_KEY=${SUPABASE_SERVICE_KEY}
    depends_on:
      - rabbitmq

  ai-embedding-worker:
    build:
      context: ./ai-workers/embedding-worker
    environment:
      - RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672
      - GROQ_API_KEY=${GROQ_API_KEY}
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
      - SUPABASE_SERVICE_KEY=${SUPABASE_SERVICE_KEY}
    depends_on:
      - rabbitmq
```

---

## Migration Plan

### Phase 1: Infrastructure Setup
1. Set up RabbitMQ
2. Create Supabase project with pgvector
3. Create AI worker projects (scaffolding)

### Phase 2: Grading Worker
1. Implement grading-worker
2. Add RabbitMQ publisher to NestJS
3. Modify UserWritingSubmissionService to publish (not call AI directly)
4. Modify UserSpeakingSubmissionService similarly
5. Test with writing grading
6. Test with speaking grading

### Phase 3: Chatbot + RAG
1. Implement embedding-worker (document ingestion)
2. Implement chatbot-worker (RAG query)
3. Add document ingestion endpoint
4. Modify ChatBotService to use queue
5. Seed initial IELTS content

### Phase 4: Polish
1. Error handling & retry logic
2. Dead letter queue processing
3. Monitoring & logging
4. Performance optimization

---

## Success Metrics

- All AI processing goes through RabbitMQ (no direct API calls from NestJS)
- Writing/Speaking grading: < 10s end-to-end latency
- Chatbot RAG: relevant context retrieved in < 1s
- Workers are stateless and horizontally scalable
- No degradation in existing functionality

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Groq API rate limits | Implement batching, exponential backoff |
| Supabase pgvector performance | Index tuning, connection pooling |
| Message loss | Publisher confirms, persistent queues |
| Worker crash during processing | Manual ack only after successful DB write |
| Neon connection overload | Connection pooling, rate limiting |
