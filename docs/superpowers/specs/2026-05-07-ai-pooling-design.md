# AI Pooling System Design

**Date:** 2026-05-07
**Status:** Approved for implementation

## Overview

Implement AI pooling system để handle token exhaustion và rate limiting khi quá nhiều users sử dụng AI đồng thời. Hệ thống bao gồm multi-key rotation, rate limiting, caching, và cascading fallback.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER REQUESTS                             │
└──────┬──────────────────────────────────────┬───────────────────┘
       │                                      │
       ▼                                      ▼
┌─────────────────┐                  ┌─────────────────┐
│   CHATBOT POOL   │                  │   GRADING POOL   │
│  (Priority LOW)  │                  │  (Priority HIGH)│
│                 │                  │                 │
│ • Multi-key 1-3 │                  │ • Multi-key 4-6 │
│ • Free 10/day   │                  │ • Subscription  │
│ • Credits after │                  │ • Credits      │
└────────┬────────┘                  └────────┬────────┘
         │                                    │
         ▼                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SHARED LAYER (Redis)                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ Rate     │  │ Daily    │  │ Cache    │  │ Queue    │       │
│  │ Limit    │  │ Quota    │  │ (Hybrid) │  │ Depth    │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

## Components Implemented

### Phase 1: Shared AI Pool Library (`ai-workers/shared/src/config/`)

| Component | File | Description |
|-----------|------|-------------|
| AIKeyPool | `ai-pool.ts` | Multi-key rotation với health tracking |
| RateLimiter | `rate-limiter.ts` | Redis-based rate limiting |
| AICache | `rate-limiter.ts` | Hybrid cache (exact + keyword-based) |
| ChatbotLimitService | `rate-limiter.ts` | Free tier 10/day + credits integration |

### Phase 2: Chatbot Worker (`ai-workers/chatbot-worker/src/`)

| Component | File | Description |
|-----------|------|-------------|
| ask-pool.handler.ts | `handlers/` | AI Pool integration for chatbot |
| Legacy handlers | `handlers/ask.handler.ts` | Original handler (fallback) |
| Pool initialization | `index.ts` | Dynamic switch via USE_AI_POOL env |

**Features:**
- Free tier (10 requests/day/user)
- Multi-key rotation (key 1-3)
- Cache lookup before AI call
- Fallback cascade: cache → retry → message
- `/health` endpoint shows pool stats

### Phase 3: Grading Worker (`ai-workers/grading-worker/src/`)

| Component | File | Description |
|-----------|------|-------------|
| grading-pool.handler.ts | `handlers/` | AI Pool for writing + speaking grading |
| Legacy handlers | `handlers/write.handler.ts`, `speak.handler.ts` | Original handlers (fallback) |
| Pool initialization | `index.ts` | Dynamic switch via USE_GRADING_POOL env |

**Features:**
- Multi-key rotation (key 4-6) - separate from chatbot
- Automatic refund on failure
- Transcription + grading retry loop
- `/health` endpoint shows pool stats
Multi-key rotation với health tracking

**Features:**
- Round-robin key selection với health check
- Tự động disable key khi quota exhausted hoặc 3+ consecutive failures
- Daily quota tracking per key
- Rate limit window (30s) per key

**Key Methods:**
```typescript
getGroqClient(): { client: Groq; key: AIKeyConfig } | null
recordSuccess(keyName: string): void
recordRateLimitError(keyName: string): void
recordQuotaExhausted(keyName: string): void
getPoolStats(): PoolStats
```

### 2. RateLimiter (`rate-limiter.ts`)
Redis-based rate limiting

**Features:**
- Sliding window rate limiting
- Daily quota tracking
- Per-user usage tracking

### 3. AICache (`rate-limiter.ts`)
Hybrid cache (exact + keyword-based)

**Features:**
- Exact match caching
- Keyword extraction
- TTL-based invalidation
- Pattern-based invalidation

### 4. ChatbotLimitService (`rate-limiter.ts`)
Kết hợp tất cả components cho chatbot

**Features:**
- Free tier (10 requests/day/user)
- Credits-based access after free tier exhausted
- Cache integration
- AI pool integration

## Flow

### Chatbot Flow
```
User sends message
        │
        ▼
Check Redis: Free tier used?
  ├── < 10 today → Process FREE
  └── >= 10 → Check credits
        │
        ▼
Cache Lookup
  ├── Exact match → Return cached
  └── No match → Continue
        │
        ▼
Rate Limit Check (Redis per-key)
  ├── OK → AI Pool (key 1-3)
  │     ├── Try key 1
  │     ├── 429/Quota → Rotate to key 2
  │     └── All exhausted → Fallback
  │
  └── Over limit → Queue
```

### Grading Flow
```
User submits assignment
        │
        ▼
Payment Check (Subscription quota → Credits)
        │
        ▼
Publish to Grading Queue (HIGH priority)
        │
        ▼
Grading Worker picks up
  ├── Key available → Process
  ├── Rate limited → Rotate key
  └── All keys exhausted → Retry 3x with backoff
        │
        ▼
On FAIL → Refund credits/quota
```

## Edge Cases Handled

| Case | Handling |
|------|----------|
| ALL_KEYS_EXHAUSTED | Return null, trigger fallback |
| QUEUE_OVERFLOW | Reject new requests |
| CACHE_MISS | Continue to AI call |
| CONCURRENT_REFUND | Idempotent operations |
| TIER_SWITCH_MID_REQUEST | Check tier at call time |
| MIDNIGHT_ROLLOVER | Reset counters daily |
| REDIS_CONNECTION_LOST | Fail-open, allow requests |
| PARTIAL_KEY_FAILURE | Skip unhealthy, use healthy |

## Test Coverage

**Total: 60+ unit tests covering:**

### Shared Library (ai-workers/shared)
- AIKeyPool: key rotation, health check, quota tracking (23 tests)
- RateLimiter: rate limit, daily quota, user usage (24 tests)
- AICache: get, set, invalidate, TTL
- ChatbotLimitService: free tier, access check
- Edge cases: concurrent access, redis failure, midnight rollover

### Chatbot Worker
- Pool initialization with multiple keys
- Key rotation and health tracking
- Fallback message when no healthy keys
- Free tier quota checking

### Grading Worker
- Pool initialization with multiple keys
- Key rotation on rate limit errors
- Automatic refund on grading failure
- Transcription + grading retry loop

## Next Steps

1. ~~Integrate AIKeyPool into chatbot-worker~~ ✅
2. ~~Integrate ChatbotLimitService into chatbot flow~~ ✅
3. ~~Update grading workers to use shared pool~~ ✅
4. Add health check endpoint for monitoring (Phase 4)
5. Implement SSE for grading status updates
6. Add Redis integration for production deployment
