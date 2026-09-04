# Docker Architecture — ielts_training_app

Ghi chú tổng hợp kiến trúc Docker của project.

## Tổng quan

Compose file: `ielts_training_app/docker-compose.yml` + `docker-compose.override.yml`.
Trạng thái: **running(5/8)** — 3 worker AI + Redis + RabbitMQ đang up.

```
Browser / Mobile
       ↓
  ngrok (public URL cho VNPay IPN)
       ↓
  ielts_training_app :3000   (Node API + auth + payment + business logic)
       ↓ publish queue
  RabbitMQ :5672   ◄────── consume
       ↓                          ↓
  3 worker độc lập              Redis :6380
  - grading :3001               (cache, session,
  - chatbot :3002                pub/sub, rate-limit)
  - embedding :3003

  docling-serve :5001   (extract text từ PDF scan)
```

Tất cả container dùng `network_mode: host` → truy cập nhau qua `127.0.0.1:<port>`. Network `ielts_network` (bridge) dùng cho Redis + RabbitMQ.

## Các service

| Service | Port | Vai trò |
|---------|------|---------|
| `ielts_training_app` | 3000 | API chính. Healthcheck wget `/health`. Phụ thuộc Redis + RabbitMQ healthy mới start. |
| `ngrok` | host | Tunnel localhost → public URL để VNPay sandbox gọi IPN callback. |
| `redis` | 6380→6379 | Cache, session, rate-limit, pub/sub. Volume `redis_data` persist. |
| `rabbitmq` | 5672, 15672 | Queue chính. Volume `rabbitmq_data` persist. UI quản lý ở `:15672` (guest/guest). |
| `ai-grading-worker` | 3001 | Chấm điểm bài IELTS (writing/speaking) qua LLM. |
| `ai-chatbot-worker` | 3002 | Trả lời hỏi đáp học viên. |
| `ai-embedding-worker` | 3003 | Sinh vector embedding cho chatbot RAG. |
| `docling-serve` | 5001 | REST API convert PDF scan → text/markdown. |

## Cơ chế hoạt động

1. **Health-gated startup** — `depends_on: { rabbitmq: { condition: service_healthy } }`. App chính chờ Redis + RabbitMQ ping OK mới khởi động. Worker chờ RabbitMQ.
2. **Queue-based async** — API publish message vào RabbitMQ (`CHATBOT_EMBED`, `GRADING_*`, ...), worker consume xử lý. App không block thread gọi AI — request trả về ngay, worker chạy nền.
3. **Volume persistence** — `redis_data`, `rabbitmq_data` named volume → restart container không mất dữ liệu.
4. **Env injection** — App chính đọc `.env` ở root (DATABASE_URL, JWT, VNPay, Gemini, Groq, Cloudinary...). Worker đọc `./ai-workers/.env` riêng.
5. **Build cache** — Worker share `context: ./ai-workers` → build layer chung, đỡ tốn dung lượng image.
6. **Scale** — Muốn grading nhanh hơn → `docker compose up --scale ai-grading-worker=N`. RabbitMQ round-robin phân job.
7. **Graceful shutdown** — Worker có handler `SIGTERM/SIGINT` → đóng channel + connection trước khi exit. Health server báo status cho Docker healthcheck.

## Embedding worker — mục đích và flow

**Mục đích: chatbot RAG. Không phải chấm điểm.**

Bằng chứng trực tiếp từ code (`ai-workers/embedding-worker/src/index.ts:3-5`):

```ts
import { QUEUES } from '@ai-workers/shared/types/messages';
import { ChatbotEmbedMessage } from '@ai-workers/shared/types/messages';
// ...
channel.consume(QUEUES.CHATBOT_EMBED, async (msg) => {
  const content = JSON.parse(msg.content.toString()) as ChatbotEmbedMessage;
```

Tên queue `CHATBOT_EMBED` + type `ChatbotEmbedMessage` → mục đích rõ ràng cho chatbot.

### Tại sao tách embedding khỏi chatbot?

- **Embedding**: batch, tốn API call, không cần real-time. Chạy nền khi admin upload tài liệu.
- **Chatbot**: real-time, latency thấy. Tách ra để embedding chậm/retry không ảnh hưởng user chat.

### Tại sao grading không dùng embedding?

| Chức năng | Worker | Cần embedding? |
|-----------|--------|----------------|
| Chấm điểm writing/speaking | `ai-grading-worker` | Không. Gửi bài làm cho LLM (Groq/Gemini) → nhận về band score + feedback. So sánh kiểu rubric, không search. |
| Chatbot trả lời | `ai-chatbot-worker` | **Có**. Cần search trong tài liệu IELTS để lấy context trả lời. |

Grading worker hoàn toàn độc lập — không dùng embedding, không dùng Supabase vector, chỉ gọi LLM chấm trực tiếp.

### Flow index tài liệu (embedding)

```
RabbitMQ message { documentId, content, metadata }
        ↓
[1] chunkDocument(content, size: 1000, overlap: 200)
        ↓
    ["chunk 1 (1000 chars)", "chunk 2 (1000 chars)", ...]  ← overlap 200 để giữ ngữ cảnh ranh giới
        ↓
[2] Với mỗi chunk:
    groq.createEmbedding(chunk)  →  vector N chiều (vd 1536)
        ↓
    supabase.insertDocument({
      content, metadata{ documentId, chunkIndex }, embedding
    })
        ↓
    Retry 3 lần, backoff 1s/2s/4s nếu fail
```

File liên quan:
- `ai-workers/embedding-worker/src/index.ts` — entry, consume queue, health server.
- `ai-workers/embedding-worker/src/handlers/embed.handler.ts` — pipeline chunk → embed → insert.
- `ai-workers/embedding-worker/src/services/chunker.service.ts` — chia chunk với overlap.
- `ai-workers/embedding-worker/src/services/groq.service.ts` — gọi Groq embedding API.
- `ai-workers/embedding-worker/src/services/supabase.service.ts` — insert vào pgvector.

### Flow trả lời user (chatbot RAG)

```
User: "Cách viết task 2 dạng opinion essay?"
        ↓
ai-chatbot-worker
        ↓
[1] Embed câu hỏi → vector
        ↓
[2] Supabase: match document chunks gần vector nhất (cosine similarity)
        ↓
    Trả về top-K chunks: "Task 2 opinion thường có 4 đoạn..."
        ↓
[3] Gửi cho LLM: câu hỏi + context chunks → sinh câu trả lời
```

`ai-embedding-worker` đóng vai trò **indexer** — biến tài liệu gốc thành vector lưu Supabase trước. Khi user hỏi, `ai-chatbot-worker` mới query vector đó.

### Khi nào trigger embed?

App publish message vào queue `CHATBOT_EMBED` khi:
- Admin upload tài liệu mới (bài mẫu, giáo trình).
- Update nội dung tài liệu → re-embed lại.
- Cron job batch index tài liệu cũ.

### Scripts hỗ trợ (trong `embedding-worker/scripts/`)

- `import_supabase.js` / `query_supabase.js` — seed và query dữ liệu mẫu trên Supabase.
- `export_chroma.js` — export index sang ChromaDB (alternative vector DB).
- `upload-sample.ts` / `upload-writing.ts` — upload batch bài mẫu vào pipeline.
- `delete-all.ts` / `delete-speaking.ts` — clear index (toàn bộ hoặc theo category speaking).

## Stack kỹ thuật embedding worker

- **Groq SDK** — gọi embedding model.
- **Supabase** (`@supabase/supabase-js`) — lưu `content` + `embedding` (pgvector).
- **better-sqlite3 + chromadb** — fallback/test local (có trong deps).
- **amqplib** — RabbitMQ client.
- **TypeScript** — build sang `dist/index.js` chạy trong container.