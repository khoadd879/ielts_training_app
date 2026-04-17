# IELTS Training App - Microservices Architecture Design

## Context

**Problem:** Hiện tại app có cấu trúc "mono + AI workers" - 1 NestJS monolith và 3 Node.js workers (grading, chatbot, embedding) kết nối qua RabbitMQ. Workers đã tách về code nhưng chưa deploy độc lập, dùng chung config và không có health checks/isolation.

**Goal:** Chuyển sang microservices architecture chuẩn trong monorepo, mỗi service deploy và scale độc lập.

**Decision made:**
- Monorepo (không tách repo riêng cho từng service)
- Shared database (PostgreSQL + Supabase) - workers vẫn write vào đây
- Không có API Gateway (main app vẫn là single entry point)
- Main app giữ nguyên (chỉ tách workers ra)
- Env riêng per worker (security + flexibility)

---

## Target Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     ielts_training_app                          │
│                  (NestJS - Main API)                            │
│              port 3000, single entry point                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐                   │
│   │ Writing  │  │ Speaking │  │ ChatBot  │  (publish only)    │
│   │Controller│  │Controller│  │Controller│                   │
│   └────┬─────┘  └────┬─────┘  └────┬─────┘                   │
│        └──────────────┼──────────────┘                        │
│                       ↓                                        │
│              RabbitMQService                                    │
└───────────────────────┬─────────────────────────────────────────┘
                        │ RabbitMQ
        ┌───────────────┼───────────────┐
        ↓               ↓               ↓
┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│grading-worker │ │chatbot-worker │ │embedding-worker│
│               │ │               │ │                │
│ Node.js       │ │ Node.js       │ │ Node.js        │
│ port: (none)  │ │ port: (none)  │ │ port: (none)   │
│               │ │               │ │                │
│ → Neon DB     │ │ → Supabase    │ │ → Supabase     │
└───────────────┘ └───────────────┘ └────────────────┘
```

---

## Service Definitions

### 1. ielts_training_app (Main API)

| Aspect | Detail |
|--------|--------|
| **Role** | Single HTTP entry point, business logic, publishes AI tasks |
| **Tech** | NestJS 11, TypeScript |
| **Port** | 3000 (HTTP) |
| **Database** | PostgreSQL (Neon) via Prisma, Redis (caching) |
| **Env** | `.env` root |
| **Dependencies** | None (does not call workers directly) |
| **Health** | `GET /health` |

### 2. grading-worker

| Aspect | Detail |
|--------|--------|
| **Role** | Grades IELTS Writing and Speaking asynchronously |
| **Tech** | Node.js, TypeScript, amqplib, groq-sdk |
| **Queues consumed** | `grading.write`, `grading.speak` |
| **Database** | PostgreSQL (Neon) - direct connection for writing results |
| **Env** | `ai-workers/grading-worker/.env` |
| **Dependencies** | `GROQ_API_KEY`, `DATABASE_URL` |
| **Health** | `GET /health` (via HTTP server or file-based) |

### 3. chatbot-worker

| Aspect | Detail |
|--------|--------|
| **Role** | RAG-based IELTS chatbot using embedded document context |
| **Tech** | Node.js, TypeScript, amqplib, groq-sdk, @supabase/supabase-js |
| **Queues consumed** | `chatbot.ask` |
| **Database** | Supabase (pgvector for RAG) |
| **Env** | `ai-workers/chatbot-worker/.env` |
| **Dependencies** | `GROQ_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY` |
| **Health** | `GET /health` |

### 4. embedding-worker

| Aspect | Detail |
|--------|--------|
| **Role** | Chunks documents and generates embeddings for RAG knowledge base |
| **Tech** | Node.js, TypeScript, amqplib, groq-sdk, @supabase/supabase-js |
| **Queues consumed** | `chatbot.embed` |
| **Database** | Supabase (pgvector) |
| **Env** | `ai-workers/embedding-worker/.env` |
| **Dependencies** | `GROQ_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY` |
| **Health** | `GET /health` |

---

## Directory Structure

```
ielts_training_app/
├── src/                                    # Main NestJS app
│   ├── module/
│   ├── rabbitmq/
│   ├── database/
│   └── ...
├── ai-workers/                            # AI microservices (existing)
│   ├── grading-worker/                    # Deploy as container
│   │   ├── .env                          # [NEW] Per-worker env
│   │   ├── Dockerfile                    # [NEW] Multi-stage build
│   │   ├── docker-entrypoint.sh          # [NEW]
│   │   └── src/
│   │       ├── index.ts
│   │       ├── handlers/
│   │       └── ...
│   ├── chatbot-worker/                   # Deploy as container
│   │   ├── .env                          # [NEW]
│   │   ├── Dockerfile                    # [NEW]
│   │   └── ...
│   ├── embedding-worker/                 # Deploy as container
│   │   ├── .env                          # [NEW]
│   │   ├── Dockerfile                    # [NEW]
│   │   └── ...
│   └── shared/                           # Shared types & config
│       └── src/
│           ├── types/
│           └── config/
├── services/                             # [NEW] Future domain services
├── docker-compose.yml                     # [UPDATED] Root orchestrator
├── docker-compose.override.yml            # [NEW] Local dev override
├── .env                                   # Root env (main app + shared)
└── docs/superpowers/specs/
```

---

## Implementation Steps

### Phase 1: Worker Containerization

1. **Add Dockerfiles per worker**
   - Multi-stage build: builder → production
   - Non-root user for security
   - Health check script
   - Graceful shutdown handling

2. **Add .env files per worker**
   - `ai-workers/grading-worker/.env.example`
   - `ai-workers/chatbot-worker/.env.example`
   - `ai-workers/embedding-worker/.env.example`
   - `.gitignore` entries for `.env`

3. **Add health check endpoints**
   - Workers expose HTTP server on random port for `/health`
   - RabbitMQ consumer also monitors connection status

4. **Graceful shutdown**
   - Handle `SIGTERM` to finish processing current message before exit
   - Consumer acknowledgment properly managed

### Phase 2: Docker Compose Restructuring

5. **Update root docker-compose.yml**
   - Each worker as separate service
   - Volume mounts for env files
   - Health checks configured
   - Restart policies
   - Resource limits (optional)

6. **Create docker-compose.override.yml** for local dev
   - Hot reload for workers (mount source)
   - Local RabbitMQ/Redis dependencies

### Phase 3: Health & Monitoring

7. **Unified logging**
   - JSON format logging across all services
   - Request correlation IDs via RabbitMQ message headers
   - Log levels configurable per service

8. **Health check aggregation**
   - Main app `/health` checks: DB, Redis, RabbitMQ
   - Worker `/health` checks: RabbitMQ connection, API keys

### Phase 4: CI/CD Foundation

9. **Add Dockerfile to main app** (root)

10. **Add .dockerignore** per service (avoid oversized images)

11. **GitHub Actions workflow stubs** (per-service deployment)

---

## Data Flow (No Changes)

### Writing Grading Flow
```
User → POST /user-writing-submission/:idTestResult
  → ielts_training_app (creates submission, PENDING)
  → RabbitMQ.publishGradingWrite()
  → grading-worker (consumes)
  → Groq API (LLM evaluation)
  → Neon DB (writes result)
  → User polls /user-writing-submission/:id
```

### Chatbot Flow
```
User → POST /chat-bot/send { message }
  → ielts_training_app
  → RabbitMQ.publishChatbotAsk()
  → chatbot-worker (consumes)
  → Groq (embed query) → Supabase (RAG search)
  → Groq (RAG response)
  → RabbitMQ.publishChatbotReply()
  → User polls /chat-bot/messages/:sessionId
```

---

## What Stays The Same

- ✅ Shared PostgreSQL (Neon) - grading-worker writes results here
- ✅ Shared Supabase (pgvector) - chatbot/embedding workers use this
- ✅ RabbitMQ as message broker
- ✅ Message formats (unchanged)
- ✅ API endpoints
- ✅ Main app single entry point
- ✅ Prisma schema (shared)

## What Changes

- ❌ Workers were "embedded" - now fully independent containers
- ❌ No health checks - now each service has `/health`
- ❌ Shared env (mostly) - now per-worker env
- ❌ Manual deployment - now `docker compose up` per service
- ❌ No isolation - now workers can be restarted/scaled independently

---

## Verification

1. **Build each service**: `docker compose build grading-worker`
2. **Run all services**: `docker compose up -d`
3. **Check health**: `curl localhost:3000/health` + worker health endpoints
4. **Test grading flow**: Submit writing, verify grading completes
5. **Test chatbot flow**: Send message, verify RAG response
6. **Verify isolation**: Kill one worker, others continue working
7. **Test restart**: `docker compose restart grading-worker`

---

## Files to Modify/Create

### Modified
- `docker-compose.yml` - restructure for independent workers
- `Dockerfile` (root) - already exists, ensure it works standalone

### New Files
- `ai-workers/grading-worker/Dockerfile`
- `ai-workers/grading-worker/.env.example`
- `ai-workers/chatbot-worker/Dockerfile`
- `ai-workers/chatbot-worker/.env.example`
- `ai-workers/embedding-worker/Dockerfile`
- `ai-workers/embedding-worker/.env.example`
- `docker-compose.override.yml`
- `docs/superpowers/specs/2026-04-17-microservices-architecture-design.md`
