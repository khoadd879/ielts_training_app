# AI Microservices Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tách AI processing (chatbot RAG, writing grading, speaking grading) thành 3 worker services riêng biệt, giao tiếp qua RabbitMQ với main app NestJS

**Architecture:** Monolith + AI Workers pattern. NestJS publish messages tới RabbitMQ, workers consume và process async. Grading results write back to Neon; Chatbot uses Supabase pgvector for RAG.

**Tech Stack:** TypeScript, Node.js, RabbitMQ (amqplib), Groq SDK, Supabase pgvector, Neon PostgreSQL, Docker

---

## File Structure Overview

```
ielts_training_app/
├── ai-workers/
│   ├── shared/                          # Shared types & config
│   │   ├── types/
│   │   │   └── messages.ts
│   │   ├── config/
│   │   │   └── rabbitmq.ts
│   │   └── package.json
│   ├── grading-worker/                  # Writing & Speaking grading
│   │   ├── src/
│   │   │   ├── index.ts
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
│   ├── chatbot-worker/                  # RAG Chatbot
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
│   └── embedding-worker/                # Document embedding
│       ├── src/
│       │   ├── index.ts
│       │   ├── handlers/
│       │   │   └── embed.handler.ts
│       │   └── services/
│       │       ├── groq.service.ts
│       │       ├── chunker.service.ts
│       │       └── supabase.service.ts
│       ├── package.json
│       └── tsconfig.json
└── src/                                # Modified NestJS
    └── module/
        ├── chat-bot/
        ├── user-writing-submission/
        └── user-speaking-submission/
```

---

## PHASE 1: Shared Package

### Task 1: Create shared types package

**Files:**
- Create: `ai-workers/shared/package.json`
- Create: `ai-workers/shared/tsconfig.json`
- Create: `ai-workers/shared/types/messages.ts`
- Create: `ai-workers/shared/config/rabbitmq.ts`

- [ ] **Step 1: Create shared/package.json**

```json
{
  "name": "@ai-workers/shared",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "watch": "tsc --watch"
  },
  "dependencies": {
    "amqplib": "^0.10.4"
  },
  "devDependencies": {
    "@types/amqplib": "^0.10.5",
    "typescript": "^5.9.3"
  }
}
```

- [ ] **Step 2: Create shared/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Create shared/types/messages.ts**

```typescript
// Exchange names
export const EXCHANGES = {
  GRADING: 'grading.exchange',
  CHATBOT: 'chatbot.exchange',
} as const;

// Queues
export const QUEUES = {
  GRADING_WRITE: 'grading.write',
  GRADING_SPEAK: 'grading.speak',
  CHATBOT_ASK: 'chatbot.ask',
  CHATBOT_EMBED: 'chatbot.embed',
  CHATBOT_REPLY: 'chatbot.reply',
  GRADING_FAILED: 'grading.failed',
} as const;

// Routing keys
export const ROUTING_KEYS = {
  WRITE: 'grading.write',
  SPEAK: 'grading.speak',
  ASK: 'chatbot.ask',
  EMBED: 'chatbot.embed',
  REPLY: 'chatbot.reply',
  FAILED: 'grading.failed',
} as const;

// Message types
export interface GradingWriteMessage {
  submissionId: string;
  userId: string;
  type: 'Task1' | 'Task2';
  submissionText: string;
  prompt: string;
  imageUrl?: string;
}

export interface GradingSpeakMessage {
  submissionId: string;
  userId: string;
  audioUrl: string;
  transcript?: string;
  taskTitle: string;
  questionsText: string;
}

export interface ChatbotAskMessage {
  sessionId: string;
  userId: string;
  message: string;
  conversationHistory?: Array<{sender: 'user' | 'bot'; message: string}>;
}

export interface ChatbotEmbedMessage {
  documentId: string;
  content: string;
  metadata: {
    source: string;
    category: 'ielts_tips' | 'grammar' | 'vocabulary' | 'sample_answers';
    userId?: string;
  };
}

export interface ChatbotReplyMessage {
  sessionId: string;
  userId: string;
  reply: string;
}

export interface GradingFailedMessage {
  originalMessage: GradingWriteMessage | GradingSpeakMessage;
  error: string;
  failedAt: string;
}
```

- [ ] **Step 4: Create shared/config/rabbitmq.ts**

```typescript
import * as amqp from 'amqplib';
import { EXCHANGES, QUEUES, ROUTING_KEYS } from '../types/messages';

export interface RabbitMQConfig {
  url: string;
  exchange: string;
  queue: string;
  routingKey: string;
}

export async function setupRabbitMQ(connectionUrl: string) {
  const conn = await amqp.connect(connectionUrl);
  const channel = await conn.createChannel();

  // Setup exchanges
  await channel.assertExchange(EXCHANGES.GRADING, 'direct', { durable: true });
  await channel.assertExchange(EXCHANGES.CHATBOT, 'direct', { durable: true });

  // Setup queues with dead letter exchange
  await channel.assertExchange('dlx.exchange', 'direct', { durable: true });

  // Grading queues
  await channel.assertQueue(QUEUES.GRADING_WRITE, {
    durable: true,
    deadLetterExchange: 'dlx.exchange',
    deadLetterRoutingKey: ROUTING_KEYS.FAILED,
  });
  await channel.assertQueue(QUEUES.GRADING_SPEAK, {
    durable: true,
    deadLetterExchange: 'dlx.exchange',
    deadLetterRoutingKey: ROUTING_KEYS.FAILED,
  });
  await channel.assertQueue(QUEUES.GRADING_FAILED, { durable: true });

  // Chatbot queues
  await channel.assertQueue(QUEUES.CHATBOT_ASK, { durable: true });
  await channel.assertQueue(QUEUES.CHATBOT_EMBED, { durable: true });
  await channel.assertQueue(QUEUES.CHATBOT_REPLY, { durable: true });

  // Bind queues to exchanges
  channel.bindQueue(QUEUES.GRADING_WRITE, EXCHANGES.GRADING, ROUTING_KEYS.WRITE);
  channel.bindQueue(QUEUES.GRADING_SPEAK, EXCHANGES.GRADING, ROUTING_KEYS.SPEAK);
  channel.bindQueue(QUEUES.GRADING_FAILED, 'dlx.exchange', ROUTING_KEYS.FAILED);
  channel.bindQueue(QUEUES.CHATBOT_ASK, EXCHANGES.CHATBOT, ROUTING_KEYS.ASK);
  channel.bindQueue(QUEUES.CHATBOT_EMBED, EXCHANGES.CHATBOT, ROUTING_KEYS.EMBED);
  channel.bindQueue(QUEUES.CHATBOT_REPLY, EXCHANGES.CHATBOT, ROUTING_KEYS.REPLY);

  return { conn, channel };
}

export async function publishMessage(
  channel: amqp.Channel,
  exchange: string,
  routingKey: string,
  message: object,
): Promise<boolean> {
  const content = Buffer.from(JSON.stringify(message));
  return channel.publish(exchange, routingKey, content, {
    persistent: true,
    contentType: 'application/json',
  });
}
```

---

## PHASE 2: Grading Worker

### Task 2: Scaffold grading-worker project

**Files:**
- Create: `ai-workers/grading-worker/package.json`
- Create: `ai-workers/grading-worker/tsconfig.json`
- Create: `ai-workers/grading-worker/Dockerfile`
- Create: `ai-workers/grading-worker/src/index.ts`

- [ ] **Step 1: Create grading-worker/package.json**

```json
{
  "name": "ai-grading-worker",
  "version": "1.0.0",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "ts-node src/index.ts",
    "watch": "tsc --watch"
  },
  "dependencies": {
    "@ai-workers/shared": "1.0.0",
    "@prisma/client": "^6.19.1",
    "amqplib": "^0.10.4",
    "axios": "^1.12.2",
    "groq-sdk": "^0.7.0"
  },
  "devDependencies": {
    "@types/amqplib": "^0.10.5",
    "@types/node": "^22.10.7",
    "prisma": "^6.19.1",
    "ts-node": "^10.9.2",
    "typescript": "^5.9.3"
  }
}
```

- [ ] **Step 2: Create grading-worker/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "paths": {
      "@ai-workers/shared": ["../shared/types"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Create grading-worker/Dockerfile**

```dockerfile
FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build

CMD ["npm", "start"]
```

- [ ] **Step 4: Create grading-worker/src/index.ts**

```typescript
import { setupRabbitMQ, publishMessage } from '@ai-workers/shared';
import { EXCHANGES, QUEUES, ROUTING_KEYS } from '@ai-workers/shared/types/messages';
import { processWriteGrading } from './handlers/write.handler';
import { processSpeakGrading } from './handlers/speak.handler';
import { GradingWriteMessage, GradingSpeakMessage } from '@ai-workers/shared/types/messages';

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';

async function main() {
  console.log('🚀 Starting Grading Worker...');

  const { conn, channel } = await setupRabbitMQ(RABBITMQ_URL);
  console.log('✅ Connected to RabbitMQ');

  // Consume write grading queue
  channel.consume(QUEUES.GRADING_WRITE, async (msg) => {
    if (!msg) return;

    try {
      const content = JSON.parse(msg.content.toString()) as GradingWriteMessage;
      console.log(`📝 Processing writing submission: ${content.submissionId}`);

      await processWriteGrading(content, channel);

      channel.ack(msg);
      console.log(`✅ Write grading completed: ${content.submissionId}`);
    } catch (error) {
      console.error('❌ Write grading failed:', error);
      // Nack without requeue - will go to DLQ
      channel.nack(msg, false, false);
    }
  });

  // Consume speak grading queue
  channel.consume(QUEUES.GRADING_SPEAK, async (msg) => {
    if (!msg) return;

    try {
      const content = JSON.parse(msg.content.toString()) as GradingSpeakMessage;
      console.log(`🎤 Processing speaking submission: ${content.submissionId}`);

      await processSpeakGrading(content, channel);

      channel.ack(msg);
      console.log(`✅ Speak grading completed: ${content.submissionId}`);
    } catch (error) {
      console.error('❌ Speak grading failed:', error);
      channel.nack(msg, false, false);
    }
  });

  // Handle connection close
  conn.on('close', () => {
    console.error('RabbitMQ connection closed');
    process.exit(1);
  });

  console.log('👂 Waiting for grading tasks...');
}

main().catch((err) => {
  console.error('Failed to start worker:', err);
  process.exit(1);
});
```

### Task 3: Implement grading-worker services

**Files:**
- Create: `ai-workers/grading-worker/src/services/groq.service.ts`
- Create: `ai-workers/grading-worker/src/services/neon.service.ts`

- [ ] **Step 1: Create groq.service.ts**

```typescript
import Groq from 'groq-sdk';

export class GroqService {
  private client: Groq;

  constructor(apiKey: string) {
    this.client = new Groq({ apiKey });
  }

  async chatcompletion(
    prompt: string,
    model: string = 'llama-3.3-70b-versatile',
  ): Promise<string> {
    const response = await this.client.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    return response.choices[0]?.message?.content || '';
  }

  async transcribeAudio(
    audioBuffer: Buffer,
    model: string = 'whisper-large-v3',
  ): Promise<string> {
    const file = new File([audioBuffer], 'audio.webm', { type: 'audio/webm' });

    const response = await this.client.audio.transcriptions.create({
      file,
      model,
    });

    return response.text || '';
  }
}

export function createGroqService(): GroqService {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not set');
  }
  return new GroqService(apiKey);
}
```

- [ ] **Step 2: Create neon.service.ts**

```typescript
import { PrismaClient, Prisma } from '@prisma/client';

export class NeonService {
  private prisma: PrismaClient;

  constructor(connectionString: string) {
    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: connectionString,
        },
      },
    });
  }

  async updateWritingSubmission(
    submissionId: string,
    data: {
      aiGradingStatus: 'COMPLETED' | 'FAILED';
      aiOverallScore: number;
      aiDetailedFeedback: Prisma.InputJsonValue;
      gradedAt: Date;
    },
  ): Promise<void> {
    await this.prisma.userWritingSubmission.update({
      where: { idWritingSubmission: submissionId },
      data,
    });
  }

  async updateSpeakingSubmission(
    submissionId: string,
    data: {
      aiGradingStatus: 'COMPLETED' | 'FAILED';
      transcript?: string;
      aiOverallScore: number;
      aiDetailedFeedback: Prisma.InputJsonValue;
      gradedAt: Date;
    },
  ): Promise<void> {
    await this.prisma.userSpeakingSubmission.update({
      where: { idSpeakingSubmission: submissionId },
      data,
    });
  }

  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}

export function createNeonService(): NeonService {
  const connectionString = process.env.NEON_DATABASE_URL;
  if (!connectionString) {
    throw new Error('NEON_DATABASE_URL is not set');
  }
  return new NeonService(connectionString);
}
```

### Task 4: Implement grading-worker prompts

**Files:**
- Create: `ai-workers/grading-worker/src/prompts/writing.prompt.ts`
- Create: `ai-workers/grading-worker/src/prompts/speaking.prompt.ts`

- [ ] **Step 1: Create writing.prompt.ts**

```typescript
export function buildWritingPrompt(
  submissionText: string,
  writingPrompt: string,
  type: 'Task1' | 'Task2',
): string {
  const taskTypeNote =
    type === 'Task1'
      ? `This is an IELTS Writing Task 1 (Report/Academic Writing).

CRITICAL: An image (chart/graph/diagram/table/map/process) has been provided.
You MUST carefully analyze the image to verify:
1. Whether the candidate accurately described the data/information shown in the image
2. Whether key features, trends, and comparisons match what's in the image
3. Whether the overview statement correctly summarizes the main trends/features
4. Whether specific numbers, percentages, or data points mentioned are accurate

DO NOT give a high Task Achievement score if:
- The essay describes data that doesn't exist in the image
- Key features visible in the image are completely missing from the essay
- The candidate fabricated data not shown in the image
- The overview doesn't match the actual main trends in the image

Evaluate strictly based on IELTS Task 1 criteria.`
      : 'This is an IELTS Writing Task 2 (Essay). Evaluate the arguments and ideas.';

  return `You are a certified IELTS Writing examiner.
${taskTypeNote}

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
${writingPrompt}

### Candidate's Essay:
${submissionText}
`;
}

export interface WritingGradingResult {
  score: number;
  task_response: string;
  coherence_and_cohesion: string;
  lexical_resource: string;
  grammatical_range_and_accuracy: string;
  general_feedback: string;
  detailed_corrections: Array<{
    mistake: string;
    correct: string;
    explanation: string;
    type: string;
  }>;
}
```

- [ ] **Step 2: Create speaking.prompt.ts**

```typescript
export function buildSpeakingPrompt(
  transcript: string,
  taskTitle: string,
  questionsText: string,
): string {
  return `You are a strict IELTS Speaking examiner.
Evaluate the candidate's response based on official IELTS criteria.

### Candidate Submission:
- **Transcript**: "${transcript}"

*(INSTRUCTION: Use the transcript to check Vocabulary and Grammar accuracy.)*

### Task Info:
Task: ${taskTitle}
Questions: ${questionsText}

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
`;
}

export interface SpeakingGradingResult {
  score_fluency: number;
  score_lexical: number;
  score_grammar: number;
  score_pronunciation: number;
  overall_score: number;
  comment_fluency: string;
  comment_lexical: string;
  comment_grammar: string;
  comment_pronunciation: string;
  general_feedback: string;
  detailed_corrections: Array<{
    mistake: string;
    correct: string;
    explanation: string;
    type: string;
  }>;
}
```

### Task 5: Implement grading-worker handlers

**Files:**
- Create: `ai-workers/grading-worker/src/handlers/write.handler.ts`
- Create: `ai-workers/grading-worker/src/handlers/speak.handler.ts`

- [ ] **Step 1: Create write.handler.ts**

```typescript
import { Channel } from 'amqplib';
import { GradingWriteMessage } from '@ai-workers/shared/types/messages';
import { createGroqService } from '../services/groq.service';
import { createNeonService } from '../services/neon.service';
import { buildWritingPrompt, WritingGradingResult } from '../prompts/writing.prompt';

const RETRY_CONFIG = {
  maxRetries: 3,
  backoffMs: [1000, 2000, 4000],
};

export async function processWriteGrading(
  msg: GradingWriteMessage,
  channel: Channel,
): Promise<void> {
  const groq = createGroqService();
  const neon = createNeonService();

  let lastError: unknown;

  for (let attempt = 0; attempt < RETRY_CONFIG.maxRetries; attempt++) {
    try {
      // Build prompt
      const prompt = buildWritingPrompt(
        msg.submissionText,
        msg.prompt,
        msg.type,
      );

      // Call Groq with retry
      const responseText = await groq.chatcompletion(prompt);

      // Parse response
      const cleanJson = responseText
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();

      const result = JSON.parse(cleanJson) as WritingGradingResult;

      // Write to Neon
      await neon.updateWritingSubmission(msg.submissionId, {
        aiGradingStatus: 'COMPLETED',
        aiOverallScore: result.score,
        aiDetailedFeedback: {
          taskResponse: result.task_response,
          coherenceAndCohesion: result.coherence_and_cohesion,
          lexicalResource: result.lexical_resource,
          grammaticalRangeAndAccuracy: result.grammatical_range_and_accuracy,
          generalFeedback: result.general_feedback,
          detailedCorrections: result.detailed_corrections,
        },
        gradedAt: new Date(),
      });

      return; // Success
    } catch (error) {
      lastError = error;
      console.error(
        `Attempt ${attempt + 1}/${RETRY_CONFIG.maxRetries} failed:`,
        error,
      );

      if (attempt < RETRY_CONFIG.maxRetries - 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, RETRY_CONFIG.backoffMs[attempt]),
        );
      }
    }
  }

  // All retries failed - mark as FAILED
  console.error('All retries exhausted for write grading:', lastError);

  await neon.updateWritingSubmission(msg.submissionId, {
    aiGradingStatus: 'FAILED',
    aiOverallScore: 0,
    aiDetailedFeedback: {
      error: lastError instanceof Error ? lastError.message : String(lastError),
    },
    gradedAt: new Date(),
  });

  await neon.disconnect();
  throw lastError;
}
```

- [ ] **Step 2: Create speak.handler.ts**

```typescript
import { Channel } from 'amqplib';
import axios from 'axios';
import { GradingSpeakMessage } from '@ai-workers/shared/types/messages';
import { createGroqService } from '../services/groq.service';
import { createNeonService } from '../services/neon.service';
import { buildSpeakingPrompt, SpeakingGradingResult } from '../prompts/speaking.prompt';

const RETRY_CONFIG = {
  maxRetries: 3,
  backoffMs: [1000, 2000, 4000],
};

async function downloadAudio(url: string): Promise<Buffer> {
  const response = await axios.get(url, { responseType: 'arraybuffer' });
  return Buffer.from(response.data);
}

export async function processSpeakGrading(
  msg: GradingSpeakMessage,
  channel: Channel,
): Promise<void> {
  const groq = createGroqService();
  const neon = createNeonService();

  let transcript = msg.transcript;
  let lastError: unknown;

  // Step 1: Transcribe audio if no transcript provided
  if (!transcript) {
    for (let attempt = 0; attempt < RETRY_CONFIG.maxRetries; attempt++) {
      try {
        console.log(`Transcribing audio for: ${msg.submissionId}`);
        const audioBuffer = await downloadAudio(msg.audioUrl);
        transcript = await groq.transcribeAudio(audioBuffer);
        console.log(`Transcription completed: ${transcript.substring(0, 50)}...`);
        break;
      } catch (error) {
        lastError = error;
        console.error(`Transcription attempt ${attempt + 1} failed:`, error);

        if (attempt < RETRY_CONFIG.maxRetries - 1) {
          await new Promise((resolve) =>
            setTimeout(resolve, RETRY_CONFIG.backoffMs[attempt]),
          );
        }
      }
    }

    if (!transcript) {
      console.error('Transcription failed after all retries');
      await neon.updateSpeakingSubmission(msg.submissionId, {
        aiGradingStatus: 'FAILED',
        aiOverallScore: 0,
        aiDetailedFeedback: {
          error: 'Transcription failed',
        },
        gradedAt: new Date(),
      });
      await neon.disconnect();
      throw lastError;
    }
  }

  // Step 2: Grade the transcript
  for (let attempt = 0; attempt < RETRY_CONFIG.maxRetries; attempt++) {
    try {
      const prompt = buildSpeakingPrompt(
        transcript,
        msg.taskTitle,
        msg.questionsText,
      );

      const responseText = await groq.chatcompletion(prompt);

      const cleanJson = responseText
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();

      const result = JSON.parse(cleanJson) as SpeakingGradingResult;

      await neon.updateSpeakingSubmission(msg.submissionId, {
        aiGradingStatus: 'COMPLETED',
        transcript,
        aiOverallScore: result.overall_score,
        aiDetailedFeedback: {
          scoreFluency: result.score_fluency,
          scoreLexical: result.score_lexical,
          scoreGrammar: result.score_grammar,
          scorePronunciation: result.score_pronunciation,
          overallScore: result.overall_score,
          commentFluency: result.comment_fluency,
          commentLexical: result.comment_lexical,
          commentGrammar: result.comment_grammar,
          commentPronunciation: result.comment_pronunciation,
          generalFeedback: result.general_feedback,
          detailedCorrections: result.detailed_corrections,
        },
        gradedAt: new Date(),
      });

      await neon.disconnect();
      return;
    } catch (error) {
      lastError = error;
      console.error(`Grading attempt ${attempt + 1} failed:`, error);

      if (attempt < RETRY_CONFIG.maxRetries - 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, RETRY_CONFIG.backoffMs[attempt]),
        );
      }
    }
  }

  // All retries failed
  await neon.updateSpeakingSubmission(msg.submissionId, {
    aiGradingStatus: 'FAILED',
    transcript,
    aiOverallScore: 0,
    aiDetailedFeedback: {
      error: lastError instanceof Error ? lastError.message : String(lastError),
    },
    gradedAt: new Date(),
  });

  await neon.disconnect();
  throw lastError;
}
```

---

## PHASE 3: Chatbot Worker

### Task 6: Scaffold chatbot-worker project

**Files:**
- Create: `ai-workers/chatbot-worker/package.json`
- Create: `ai-workers/chatbot-worker/tsconfig.json`
- Create: `ai-workers/chatbot-worker/Dockerfile`
- Create: `ai-workers/chatbot-worker/src/index.ts`

- [ ] **Step 1: Create chatbot-worker/package.json**

```json
{
  "name": "ai-chatbot-worker",
  "version": "1.0.0",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "ts-node src/index.ts"
  },
  "dependencies": {
    "@ai-workers/shared": "1.0.0",
    "@supabase/supabase-js": "^2.47.0",
    "amqplib": "^0.10.4",
    "groq-sdk": "^0.7.0"
  },
  "devDependencies": {
    "@types/amqplib": "^0.10.5",
    "@types/node": "^22.10.7",
    "ts-node": "^10.9.2",
    "typescript": "^5.9.3"
  }
}
```

- [ ] **Step 2: Create chatbot-worker/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Create chatbot-worker/Dockerfile**

```dockerfile
FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

CMD ["npm", "start"]
```

- [ ] **Step 4: Create chatbot-worker/src/index.ts**

```typescript
import { setupRabbitMQ, publishMessage } from '@ai-workers/shared';
import { EXCHANGES, QUEUES, ROUTING_KEYS } from '@ai-workers/shared/types/messages';
import { processChatbotAsk } from './handlers/ask.handler';
import { ChatbotAskMessage } from '@ai-workers/shared/types/messages';

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';

async function main() {
  console.log('🚀 Starting Chatbot Worker...');

  const { conn, channel } = await setupRabbitMQ(RABBITMQ_URL);
  console.log('✅ Connected to RabbitMQ');

  // Consume chatbot ask queue
  channel.consume(QUEUES.CHATBOT_ASK, async (msg) => {
    if (!msg) return;

    try {
      const content = JSON.parse(msg.content.toString()) as ChatbotAskMessage;
      console.log(`💬 Processing chatbot message for session: ${content.sessionId}`);

      await processChatbotAsk(content, channel);

      channel.ack(msg);
    } catch (error) {
      console.error('❌ Chatbot processing failed:', error);
      channel.nack(msg, false, false);
    }
  });

  conn.on('close', () => {
    console.error('RabbitMQ connection closed');
    process.exit(1);
  });

  console.log('👂 Waiting for chatbot messages...');
}

main().catch((err) => {
  console.error('Failed to start worker:', err);
  process.exit(1);
});
```

### Task 7: Implement chatbot-worker services

**Files:**
- Create: `ai-workers/chatbot-worker/src/services/groq.service.ts`
- Create: `ai-workers/chatbot-worker/src/services/supabase.service.ts`

- [ ] **Step 1: Create groq.service.ts**

```typescript
import Groq from 'groq-sdk';

export class GroqService {
  private client: Groq;

  constructor(apiKey: string) {
    this.client = new Groq({ apiKey });
  }

  async chatcompletion(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    model: string = 'llama-3.3-70b-versatile',
  ): Promise<string> {
    const response = await this.client.chat.completions.create({
      model,
      messages,
      temperature: 0.7,
    });

    return response.choices[0]?.message?.content || '';
  }

  async createEmbedding(text: string): Promise<number[]> {
    const response = await this.client.embeddings.create({
      model: 'embed-english-v2',
      input: text,
    });

    return response.data[0]?.embedding || [];
  }
}

export function createGroqService(): GroqService {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not set');
  }
  return new GroqService(apiKey);
}
```

- [ ] **Step 2: Create supabase.service.ts**

```typescript
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface RagDocument {
  id: string;
  content: string;
  metadata: {
    source: string;
    category: string;
    user_id?: string;
  };
  embedding: number[];
}

export class SupabaseService {
  private client: SupabaseClient;

  constructor(url: string, serviceKey: string) {
    this.client = createClient(url, serviceKey);
  }

  async searchDocuments(
    queryEmbedding: number[],
    matchThreshold: number = 0.7,
    matchCount: number = 5,
  ): Promise<RagDocument[]> {
    const { data, error } = await this.client.rpc('match_documents', {
      query_embedding: queryEmbedding,
      match_threshold: matchThreshold,
      match_count: matchCount,
    });

    if (error) {
      console.error('Supabase search error:', error);
      return [];
    }

    return data || [];
  }

  async insertDocument(doc: {
    content: string;
    metadata: object;
    embedding: number[];
  }): Promise<void> {
    const { error } = await this.client.from('rag_documents').insert({
      content: doc.content,
      metadata: doc.metadata,
      embedding: doc.embedding,
    });

    if (error) {
      console.error('Supabase insert error:', error);
      throw error;
    }
  }
}

export function createSupabaseService(): SupabaseService {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!url || !serviceKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY must be set');
  }

  return new SupabaseService(url, serviceKey);
}
```

### Task 8: Implement chatbot-worker prompts

**Files:**
- Create: `ai-workers/chatbot-worker/src/prompts/rag.prompt.ts`

- [ ] **Step 1: Create rag.prompt.ts**

```typescript
export interface RagContext {
  content: string;
  metadata: {
    source: string;
    category: string;
  };
}

export function buildRagSystemPrompt(contexts: RagContext[]): string {
  const contextText = contexts
    .map((ctx, i) => `[${i + 1}] (${ctx.metadata.source}) ${ctx.content}`)
    .join('\n\n');

  return `You are IELTS Assistant AI.
Your role: help the user improve English for IELTS (Writing, Speaking, Vocabulary, etc.)

## Context from knowledge base:
${contextText || 'No relevant context found.'}

## Instructions:
- Respond in a natural, friendly tone.
- Be concise, educational, and clear.
- Use the provided context to give accurate IELTS-specific answers.
- Answer in English if the user asks in English.
- Answer in Vietnamese if the user asks in Vietnamese.
- Don't answer if the question is not related to IELTS or English learning.
- If the context doesn't contain enough information, say so honestly.`;
}

export function formatConversationHistory(
  history: Array<{ sender: 'user' | 'bot'; message: string }> | undefined,
): string {
  if (!history || history.length === 0) {
    return '';
  }

  return history
    .map((m) => `${m.sender === 'user' ? 'User' : 'Assistant'}: ${m.message}`)
    .join('\n');
}
```

### Task 9: Implement chatbot-worker handler

**Files:**
- Create: `ai-workers/chatbot-worker/src/handlers/ask.handler.ts`

- [ ] **Step 1: Create ask.handler.ts**

```typescript
import { Channel } from 'amqplib';
import { ChatbotAskMessage, EXCHANGES, ROUTING_KEYS } from '@ai-workers/shared/types/messages';
import { publishMessage } from '@ai-workers/shared/config/rabbitmq';
import { createGroqService } from '../services/groq.service';
import { createSupabaseService } from '../services/supabase.service';
import { buildRagSystemPrompt, formatConversationHistory } from '../prompts/rag.prompt';

const RETRY_CONFIG = {
  maxRetries: 3,
  backoffMs: [1000, 2000, 4000],
};

export async function processChatbotAsk(
  msg: ChatbotAskMessage,
  channel: Channel,
): Promise<void> {
  const groq = createGroqService();
  const supabase = createSupabaseService();

  let lastError: unknown;

  for (let attempt = 0; attempt < RETRY_CONFIG.maxRetries; attempt++) {
    try {
      // Step 1: Generate embedding for user message
      const embedding = await groq.createEmbedding(msg.message);

      // Step 2: Query Supabase pgvector for relevant context
      const contexts = await supabase.searchDocuments(embedding, 0.7, 5);

      // Step 3: Build RAG prompt
      const systemPrompt = buildRagSystemPrompt(contexts);
      const historyText = formatConversationHistory(msg.conversationHistory);

      // Step 4: Build messages array for Groq
      const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
        { role: 'system', content: systemPrompt },
      ];

      // Add conversation history
      if (historyText) {
        messages.push({ role: 'user', content: historyText });
      }

      // Add current message
      messages.push({ role: 'user', content: msg.message });

      // Step 5: Call Groq LLM
      const reply = await groq.chatcompletion(messages);

      // Step 6: Publish reply to callback queue
      await publishMessage(channel, EXCHANGES.CHATBOT, ROUTING_KEYS.REPLY, {
        sessionId: msg.sessionId,
        userId: msg.userId,
        reply,
      });

      console.log(`✅ Chatbot reply published for session: ${msg.sessionId}`);
      return;
    } catch (error) {
      lastError = error;
      console.error(`Chatbot attempt ${attempt + 1} failed:`, error);

      if (attempt < RETRY_CONFIG.maxRetries - 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, RETRY_CONFIG.backoffMs[attempt]),
        );
      }
    }
  }

  // All retries failed - publish error reply
  await publishMessage(channel, EXCHANGES.CHATBOT, ROUTING_KEYS.REPLY, {
    sessionId: msg.sessionId,
    userId: msg.userId,
    reply: 'I apologize, but I encountered an error processing your message. Please try again.',
    error: lastError instanceof Error ? lastError.message : String(lastError),
  });

  throw lastError;
}
```

---

## PHASE 4: Embedding Worker

### Task 10: Scaffold embedding-worker project

**Files:**
- Create: `ai-workers/embedding-worker/package.json`
- Create: `ai-workers/embedding-worker/tsconfig.json`
- Create: `ai-workers/embedding-worker/Dockerfile`
- Create: `ai-workers/embedding-worker/src/index.ts`

- [ ] **Step 1: Create embedding-worker/package.json**

```json
{
  "name": "ai-embedding-worker",
  "version": "1.0.0",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "ts-node src/index.ts"
  },
  "dependencies": {
    "@ai-workers/shared": "1.0.0",
    "@supabase/supabase-js": "^2.47.0",
    "amqplib": "^0.10.4",
    "groq-sdk": "^0.7.0"
  },
  "devDependencies": {
    "@types/amqplib": "^0.10.5",
    "@types/node": "^22.10.7",
    "ts-node": "^10.9.2",
    "typescript": "^5.9.3"
  }
}
```

- [ ] **Step 2: Create embedding-worker/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Create embedding-worker/Dockerfile**

```dockerfile
FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

CMD ["npm", "start"]
```

- [ ] **Step 4: Create embedding-worker/src/index.ts**

```typescript
import { setupRabbitMQ } from '@ai-workers/shared';
import { QUEUES } from '@ai-workers/shared/types/messages';
import { processEmbed } from './handlers/embed.handler';
import { ChatbotEmbedMessage } from '@ai-workers/shared/types/messages';

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';

async function main() {
  console.log('🚀 Starting Embedding Worker...');

  const { conn, channel } = await setupRabbitMQ(RABBITMQ_URL);
  console.log('✅ Connected to RabbitMQ');

  // Consume embed queue
  channel.consume(QUEUES.CHATBOT_EMBED, async (msg) => {
    if (!msg) return;

    try {
      const content = JSON.parse(msg.content.toString()) as ChatbotEmbedMessage;
      console.log(`📄 Processing embed for document: ${content.documentId}`);

      await processEmbed(content, channel);

      channel.ack(msg);
      console.log(`✅ Embedding completed for document: ${content.documentId}`);
    } catch (error) {
      console.error('❌ Embedding failed:', error);
      channel.nack(msg, false, false);
    }
  });

  conn.on('close', () => {
    console.error('RabbitMQ connection closed');
    process.exit(1);
  });

  console.log('👂 Waiting for embedding tasks...');
}

main().catch((err) => {
  console.error('Failed to start worker:', err);
  process.exit(1);
});
```

### Task 11: Implement embedding-worker services

**Files:**
- Create: `ai-workers/embedding-worker/src/services/groq.service.ts`
- Create: `ai-workers/embedding-worker/src/services/supabase.service.ts`
- Create: `ai-workers/embedding-worker/src/services/chunker.service.ts`

- [ ] **Step 1: Create groq.service.ts**

```typescript
import Groq from 'groq-sdk';

export class GroqService {
  private client: Groq;

  constructor(apiKey: string) {
    this.client = new Groq({ apiKey });
  }

  async createEmbedding(text: string): Promise<number[]> {
    const response = await this.client.embeddings.create({
      model: 'embed-english-v2',
      input: text,
    });

    return response.data[0]?.embedding || [];
  }
}

export function createGroqService(): GroqService {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not set');
  }
  return new GroqService(apiKey);
}
```

- [ ] **Step 2: Create supabase.service.ts**

```typescript
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export class SupabaseService {
  private client: SupabaseClient;

  constructor(url: string, serviceKey: string) {
    this.client = createClient(url, serviceKey);
  }

  async insertDocument(doc: {
    content: string;
    metadata: object;
    embedding: number[];
  }): Promise<void> {
    const { error } = await this.client.from('rag_documents').insert({
      content: doc.content,
      metadata: doc.metadata,
      embedding: doc.embedding,
    });

    if (error) {
      console.error('Supabase insert error:', error);
      throw error;
    }
  }
}

export function createSupabaseService(): SupabaseService {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!url || !serviceKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY must be set');
  }

  return new SupabaseService(url, serviceKey);
}
```

- [ ] **Step 3: Create chunker.service.ts**

```typescript
export interface ChunkOptions {
  chunkSize: number;
  overlap: number;
}

export function chunkDocument(
  content: string,
  options: ChunkOptions = { chunkSize: 1000, overlap: 200 },
): string[] {
  const { chunkSize, overlap } = options;

  if (content.length <= chunkSize) {
    return [content];
  }

  const chunks: string[] = [];
  let startIndex = 0;

  while (startIndex < content.length) {
    let endIndex = startIndex + chunkSize;

    // Try to break at a sentence or paragraph boundary
    if (endIndex < content.length) {
      const breakPoint = findBreakPoint(content, startIndex, endIndex);
      endIndex = breakPoint;
    }

    chunks.push(content.substring(startIndex, endIndex));

    // Move start index with overlap
    startIndex = endIndex - overlap;
    if (startIndex < 0) startIndex = 0;
  }

  return chunks;
}

function findBreakPoint(text: string, start: number, end: number): number {
  // Try to find a paragraph break first
  const paragraphBreak = text.lastIndexOf('\n\n', end);
  if (paragraphBreak > start + 100) {
    return paragraphBreak + 2;
  }

  // Try to find a sentence break
  const sentenceBreaks = ['. ', '! ', '? ', '\n'];
  for (const br of sentenceBreaks) {
    const idx = text.lastIndexOf(br, end);
    if (idx > start + 50) {
      return idx + br.length;
    }
  }

  // Default to chunk size
  return end;
}
```

### Task 12: Implement embedding-worker handler

**Files:**
- Create: `ai-workers/embedding-worker/src/handlers/embed.handler.ts`

- [ ] **Step 1: Create embed.handler.ts**

```typescript
import { Channel } from 'amqplib';
import { ChatbotEmbedMessage } from '@ai-workers/shared/types/messages';
import { createGroqService } from '../services/groq.service';
import { createSupabaseService } from '../services/supabase.service';
import { chunkDocument } from '../services/chunker.service';

const RETRY_CONFIG = {
  maxRetries: 3,
  backoffMs: [1000, 2000, 4000],
};

export async function processEmbed(
  msg: ChatbotEmbedMessage,
  channel: Channel,
): Promise<void> {
  const groq = createGroqService();
  const supabase = createSupabaseService();

  // Step 1: Chunk document
  const chunks = chunkDocument(msg.content, {
    chunkSize: 1000,
    overlap: 200,
  });

  console.log(`📑 Document split into ${chunks.length} chunks`);

  // Step 2: Process each chunk
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    let lastError: unknown;

    for (let attempt = 0; attempt < RETRY_CONFIG.maxRetries; attempt++) {
      try {
        // Generate embedding
        const embedding = await groq.createEmbedding(chunk);

        // Insert into Supabase
        await supabase.insertDocument({
          content: chunk,
          metadata: {
            ...msg.metadata,
            documentId: msg.documentId,
            chunkIndex: i,
          },
          embedding,
        });

        console.log(`  ✅ Chunk ${i + 1}/${chunks.length} embedded`);
        break;
      } catch (error) {
        lastError = error;
        console.error(`  Attempt ${attempt + 1} failed for chunk ${i + 1}:`, error);

        if (attempt < RETRY_CONFIG.maxRetries - 1) {
          await new Promise((resolve) =>
            setTimeout(resolve, RETRY_CONFIG.backoffMs[attempt]),
          );
        }
      }
    }

    if (lastError) {
      console.error(`Failed to embed chunk ${i + 1} after all retries`);
      throw lastError;
    }
  }

  console.log(`✅ All chunks embedded for document: ${msg.documentId}`);
}
```

---

## PHASE 5: NestJS Integration

### Task 13: Add RabbitMQ publisher module to NestJS

**Files:**
- Create: `src/rabbitmq/rabbitmq.module.ts`
- Create: `src/rabbitmq/rabbitmq.service.ts`
- Create: `src/rabbitmq/rabbitmq.constants.ts`
- Modify: `src/app.module.ts`

- [ ] **Step 1: Create rabbitmq.constants.ts**

```typescript
export const EXCHANGES = {
  GRADING: 'grading.exchange',
  CHATBOT: 'chatbot.exchange',
} as const;

export const QUEUES = {
  GRADING_WRITE: 'grading.write',
  GRADING_SPEAK: 'grading.speak',
  CHATBOT_ASK: 'chatbot.ask',
  CHATBOT_EMBED: 'chatbot.embed',
} as const;

export const ROUTING_KEYS = {
  WRITE: 'grading.write',
  SPEAK: 'grading.speak',
  ASK: 'chatbot.ask',
  EMBED: 'chatbot.embed',
} as const;
```

- [ ] **Step 2: Create rabbitmq.service.ts**

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';
import { EXCHANGES, ROUTING_KEYS } from './rabbitmq.constants';

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMQService.name);
  private connection: amqp.Connection | null = null;
  private channel: amqp.Channel | null = null;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const url = this.configService.get<string>('RABBITMQ_URL');
    if (!url) {
      this.logger.warn('RABBITMQ_URL not configured - RabbitMQ disabled');
      return;
    }

    try {
      this.connection = await amqp.connect(url);
      this.channel = await this.connection.createChannel();
      this.logger.log('Connected to RabbitMQ');
    } catch (error) {
      this.logger.error('Failed to connect to RabbitMQ:', error);
    }
  }

  async onModuleDestroy() {
    if (this.channel) {
      await this.channel.close();
    }
    if (this.connection) {
      await this.connection.close();
    }
  }

  async publish(
    exchange: string,
    routingKey: string,
    message: object,
  ): Promise<boolean> {
    if (!this.channel) {
      this.logger.error('RabbitMQ channel not available');
      return false;
    }

    const content = Buffer.from(JSON.stringify(message));
    return this.channel.publish(exchange, routingKey, content, {
      persistent: true,
      contentType: 'application/json',
    });
  }

  async publishGradingWrite(message: object): Promise<boolean> {
    return this.publish(EXCHANGES.GRADING, ROUTING_KEYS.WRITE, message);
  }

  async publishGradingSpeak(message: object): Promise<boolean> {
    return this.publish(EXCHANGES.GRADING, ROUTING_KEYS.SPEAK, message);
  }

  async publishChatbotAsk(message: object): Promise<boolean> {
    return this.publish(EXCHANGES.CHATBOT, ROUTING_KEYS.ASK, message);
  }

  async publishChatbotEmbed(message: object): Promise<boolean> {
    return this.publish(EXCHANGES.CHATBOT, ROUTING_KEYS.EMBED, message);
  }
}
```

- [ ] **Step 3: Create rabbitmq.module.ts**

```typescript
import { Module, Global } from '@nestjs/common';
import { RabbitMQService } from './rabbitmq.service';

@Global()
@Module({
  providers: [RabbitMQService],
  exports: [RabbitMQService],
})
export class RabbitMQModule {}
```

- [ ] **Step 4: Modify app.module.ts - add RabbitMQModule import**

```typescript
// Add to imports array in @Module({ imports: [...] })
RabbitMQModule,
```

### Task 14: Modify UserWritingSubmissionService

**Files:**
- Modify: `src/module/user-writing-submission/user-writing-submission.service.ts`

- [ ] **Step 1: Read current file and prepare modifications**

Read the current `user-writing-submission.service.ts` to understand the structure, then modify:

1. Inject `RabbitMQService` in constructor
2. Modify `createUserWritingSubmission` to publish to queue instead of calling AI directly
3. Remove `evaluateWriting` method (moved to worker)

```typescript
// Add to constructor:
constructor(
  private readonly databaseService: DatabaseService,
  @Inject(CACHE_MANAGER) private cacheManager: Cache,
  private readonly configService: ConfigService,
  private readonly rabbitMQService: RabbitMQService, // ADD THIS
) {}
```

```typescript
// Modify createUserWritingSubmission method - replace AI call section with:
async createUserWritingSubmission(
  idTestResult: string,
  createUserWritingSubmissionDto: CreateUserWritingSubmissionDto,
) {
  const { idUser, idWritingTask, submissionText } =
    createUserWritingSubmissionDto;

  // Validate first
  const [user, writingTask, testResult] = await Promise.all([
    this.databaseService.user.findUnique({ where: { idUser } }),
    this.databaseService.writingTask.findUnique({
      where: { idWritingTask },
      include: { test: true },
    }),
    this.databaseService.userTestResult.findUnique({
      where: { idTestResult },
    }),
  ]);

  if (!user) throw new NotFoundException('User not found');
  if (!writingTask) throw new NotFoundException('Writing task not found');
  if (!testResult) throw new NotFoundException('Test result not found');

  // Create pending submission
  const submission = await this.databaseService.$transaction(async (tx) => {
    return tx.userWritingSubmission.create({
      data: {
        idUser,
        idWritingTask,
        idTestResult,
        submissionText,
        aiGradingStatus: 'PENDING',
      },
    });
  });

  // Publish to grading queue
  await this.rabbitMQService.publishGradingWrite({
    submissionId: submission.idWritingSubmission,
    userId: submission.idUser,
    type: writingTask.taskType,
    submissionText,
    prompt: writingTask.title,
    imageUrl: writingTask.image,
  });

  return {
    submissionId: submission.idWritingSubmission,
    aiGradingStatus: 'PENDING',
    status: 202,
  };
}
```

- [ ] **Step 2: Add RabbitMQService import**

```typescript
import { RabbitMQService } from 'src/rabbitmq/rabbitmq.service';
```

### Task 15: Modify UserSpeakingSubmissionService

**Files:**
- Modify: `src/module/user-speaking-submission/user-speaking-submission.service.ts`

- [ ] **Step 1: Read current file and prepare modifications**

Read the current `user-speaking-submission.service.ts`, then modify:

1. Inject `RabbitMQService` in constructor
2. Modify `create` to publish to queue instead of calling AI directly
3. Remove `evaluateSpeaking`, `transcribeAudio`, and AI-related methods (moved to worker)

```typescript
// Add to constructor:
constructor(
  private readonly cloudinaryService: CloudinaryService,
  private readonly databaseService: DatabaseService,
  private readonly configService: ConfigService,
  private readonly rabbitMQService: RabbitMQService, // ADD THIS
) {
  // Remove speechClient initialization - moved to worker
}
```

```typescript
// Modify create method - replace AI grading section with:
async create(
  createUserSpeakingSubmissionDto: CreateUserSpeakingSubmissionDto,
  file?: Express.Multer.File,
) {
  const { idUser, idSpeakingTask, idTestResult } =
    createUserSpeakingSubmissionDto;

  const [user, speakingTask] = await Promise.all([
    this.databaseService.user.findUnique({ where: { idUser } }),
    this.databaseService.speakingTask.findUnique({
      where: { idSpeakingTask },
      include: { questions: true },
    }),
  ]);

  if (!user) throw new NotFoundException('User not found');
  if (!speakingTask) throw new NotFoundException('Speaking task not found');

  // Handle audio upload
  let audioUrl = createUserSpeakingSubmissionDto.audioUrl;
  let transcript = '';

  if (file) {
    const cloudinaryRes = await this.cloudinaryService.uploadFile(file);
    audioUrl = cloudinaryRes.secure_url;
    // Note: transcription now happens in worker via Groq Whisper
  }

  if (!audioUrl) {
    throw new BadRequestException('Audio is required');
  }

  // Create pending submission
  const submission = await this.databaseService.$transaction(async (tx) => {
    return tx.userSpeakingSubmission.create({
      data: {
        idUser,
        idSpeakingTask,
        audioUrl,
        idTestResult: idTestResult || null,
        transcript: transcript || null,
        aiGradingStatus: 'PENDING',
      },
    });
  });

  // Publish to grading queue
  const questionsText = speakingTask.questions
    .sort((a, b) => a.order - b.order)
    .map((q) => {
      const subs = q.subPrompts ? JSON.stringify(q.subPrompts, null, 2) : '';
      return `Topic: ${q.topic ?? 'N/A'}\nMain Prompt: ${q.prompt}\nSub Prompts: ${subs}`;
    })
    .join('\n\n');

  await this.rabbitMQService.publishGradingSpeak({
    submissionId: submission.idSpeakingSubmission,
    userId: submission.idUser,
    audioUrl,
    transcript,
    taskTitle: speakingTask.title,
    questionsText,
  });

  return {
    message: 'Submission created, grading in progress',
    data: submission,
    status: 202,
  };
}
```

### Task 16: Modify ChatBotService

**Files:**
- Modify: `src/module/chat-bot/chat-bot.service.ts`

- [ ] **Step 1: Read current file and prepare modifications**

Read the current `chat-bot.service.ts`, then modify:

1. Inject `RabbitMQService` in constructor
2. Modify `handleUserMessage` to publish to queue instead of calling AI directly
3. Add method to poll for response or use WebSocket (suggested: SSE or polling endpoint)

```typescript
// Modify handleUserMessage:
async handleUserMessage(idUser: string, message: string): Promise<string> {
  // Save user message
  await this.saveMessage(idUser, 'user', message);

  // Get conversation history
  const messages = await this.getMessages(idUser);

  // Generate session ID (use user ID for simplicity, or create new if needed)
  const sessionId = `session:${idUser}:${Date.now()}`;

  // Publish to chatbot queue
  await this.rabbitMQService.publishChatbotAsk({
    sessionId,
    userId: idUser,
    message,
    conversationHistory: messages,
  });

  // Return pending status - actual response comes via WebSocket or polling
  return 'Processing your message...';
}
```

- [ ] **Step 2: Add RabbitMQService import and inject**

```typescript
import { RabbitMQService } from 'src/rabbitmq/rabbitmq.service';

// Add to constructor:
constructor(
  @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  private readonly configService: ConfigService,
  private readonly rabbitMQService: RabbitMQService, // ADD THIS
) {}
```

### Task 17: Add status polling endpoints

**Files:**
- Modify: `src/module/user-writing-submission/user-writing-submission.controller.ts`
- Modify: `src/module/user-speaking-submission/user-speaking-submission.controller.ts`

- [ ] **Step 1: Add status endpoint to user-writing-submission.controller.ts**

```typescript
@Get(':id/status')
async getWritingStatus(@Param('id') id: string) {
  const submission = await this.userWritingSubmissionService.findOne(id);

  return {
    idWritingSubmission: id,
    status: submission.data.aiGradingStatus,
    aiOverallScore: submission.data.aiOverallScore,
    aiDetailedFeedback: submission.data.aiDetailedFeedback,
  };
}
```

- [ ] **Step 2: Add status endpoint to user-speaking-submission.controller.ts**

```typescript
@Get(':id/status')
async getSpeakingStatus(@Param('id') id: string) {
  const submission = await this.userSpeakingSubmissionService.findOne(id);

  return {
    idSpeakingSubmission: id,
    status: submission.data.aiGradingStatus,
    aiOverallScore: submission.data.aiOverallScore,
    transcript: submission.data.transcript,
    aiDetailedFeedback: submission.data.aiDetailedFeedback,
  };
}
```

---

## PHASE 6: Supabase Setup

### Task 18: Create Supabase pgvector schema

**Files:**
- Create: `supabase/migrations/001_create_rag_schema.sql`

- [ ] **Step 1: Create Supabase migration SQL**

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Documents table for RAG
CREATE TABLE IF NOT EXISTS rag_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  embedding VECTOR(1536),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for vector similarity search
CREATE INDEX IF NOT EXISTS rag_documents_embedding_idx
ON rag_documents
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Create index on metadata for filtering
CREATE INDEX IF NOT EXISTS rag_documents_metadata_idx
ON rag_documents USING gin (metadata);

-- Function for matching documents
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    rd.id,
    rd.content,
    rd.metadata,
    1 - (rd.embedding <=> query_embedding) AS similarity
  FROM rag_documents rd
  WHERE 1 - (rd.embedding <=> query_embedding) > match_threshold
  ORDER BY rd.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Chat sessions table (optional - if not using Redis)
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  messages JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chat_sessions_user_id_idx
ON chat_sessions (user_id);
```

---

## PHASE 7: Docker Compose & Deployment

### Task 19: Update docker-compose.yml

**Files:**
- Modify: `docker-compose.yml`

- [ ] **Step 1: Add AI workers to docker-compose.yml**

Add these services to your existing docker-compose.yml:

```yaml
services:
  # ... existing services (nestjs, postgres, redis, rabbitmq)

  ai-grading-worker:
    build:
      context: ./ai-workers/grading-worker
      dockerfile: Dockerfile
    environment:
      - RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672
      - GROQ_API_KEY=${GROQ_API_KEY}
      - NEON_DATABASE_URL=${NEON_DATABASE_URL}
    depends_on:
      rabbitmq:
        condition: service_healthy
    restart: unless-stopped

  ai-chatbot-worker:
    build:
      context: ./ai-workers/chatbot-worker
      dockerfile: Dockerfile
    environment:
      - RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672
      - GROQ_API_KEY=${GROQ_API_KEY}
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_SERVICE_KEY=${SUPABASE_SERVICE_KEY}
    depends_on:
      rabbitmq:
        condition: service_healthy
    restart: unless-stopped

  ai-embedding-worker:
    build:
      context: ./ai-workers/embedding-worker
      dockerfile: Dockerfile
    environment:
      - RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672
      - GROQ_API_KEY=${GROQ_API_KEY}
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_SERVICE_KEY=${SUPABASE_SERVICE_KEY}
    depends_on:
      rabbitmq:
        condition: service_healthy
    restart: unless-stopped
```

---

## Task Summary Checklist

- [ ] Task 1: Create shared types package
- [ ] Task 2: Scaffold grading-worker project
- [ ] Task 3: Implement grading-worker services
- [ ] Task 4: Implement grading-worker prompts
- [ ] Task 5: Implement grading-worker handlers
- [ ] Task 6: Scaffold chatbot-worker project
- [ ] Task 7: Implement chatbot-worker services
- [ ] Task 8: Implement chatbot-worker prompts
- [ ] Task 9: Implement chatbot-worker handler
- [ ] Task 10: Scaffold embedding-worker project
- [ ] Task 11: Implement embedding-worker services
- [ ] Task 12: Implement embedding-worker handler
- [ ] Task 13: Add RabbitMQ publisher module to NestJS
- [ ] Task 14: Modify UserWritingSubmissionService
- [ ] Task 15: Modify UserSpeakingSubmissionService
- [ ] Task 16: Modify ChatBotService
- [ ] Task 17: Add status polling endpoints
- [ ] Task 18: Create Supabase pgvector schema
- [ ] Task 19: Update docker-compose.yml

---

## Environment Variables Required

```bash
# RabbitMQ
RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672

# Groq
GROQ_API_KEY=your_groq_api_key

# Neon (for grading worker)
NEON_DATABASE_URL=your_neon_connection_string

# Supabase (for chatbot/embedding workers)
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_KEY=your_supabase_service_key
```

---

## Testing Checklist

1. **Unit Tests per Worker**
   - Grading worker: mock Groq, verify prompt building, verify Neon write
   - Chatbot worker: mock Groq, mock Supabase, verify RAG query
   - Embedding worker: mock Groq, mock Supabase, verify chunking

2. **Integration Tests**
   - NestJS publishes to RabbitMQ → Worker consumes → Worker writes to DB
   - Full flow: Submit writing → Poll status → Status = COMPLETED

3. **E2E Tests**
   - User submits writing → Grading completes → Score returned
   - User chats with bot → RAG context retrieved → Response with context

---

**Plan saved to**: `docs/superpowers/plans/2026-04-17-ai-microservices-implementation-plan.md`
