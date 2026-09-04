# AI Grading — Architecture Notes

## Tổng quan

Writing và Speaking tests **chấm điểm bất đồng bộ** qua AI worker (RabbitMQ + Groq).
Reading và Listening chấm **đồng bộ** trong BE NestJS (synchronous, deterministic grading).

## Worker không update `userTestResult`

**Quan trọng:** AI grading worker (`ai-workers/grading-worker`) chỉ ghi vào bảng
**submission** (theo skill), **không bao giờ update** `userTestResult`:

| Worker handler              | Field được update                                                | Bảng                        |
|-----------------------------|------------------------------------------------------------------|-----------------------------|
| `write.handler.ts`          | `aiOverallScore`, `aiGradingStatus`, `aiDetailedFeedback`, `transcript` | `userWritingSubmission`     |
| `speak.handler.ts`          | `aiOverallScore`, `aiGradingStatus`, `aiDetailedFeedback`, `transcript` | `userSpeakingSubmission`    |
| ❌ Không có handler nào      | `bandScore`, `totalQuestions`, `score`                           | `userTestResult`            |

Hệ quả:
- `userTestResult.bandScore` cho Writing/Speaking sẽ **là `null`** sau khi submit.
- Score thật nằm ở `userWritingSubmission.aiOverallScore` / `userSpeakingSubmission.aiOverallScore`.
- FE phải **poll** `GET /user-test-result/get-test-result-and-answers/:idTestResult` để lấy score — endpoint này `include` relations `writingSubmissions` / `speakingSubmissions` (xem `getAllAnswerInTestResult` trong `user-test-result.service.ts`).
- Trong khi worker chưa chấm xong, các submission có `aiGradingStatus: 'PENDING'`. Khi xong → `'COMPLETED'`. Lỗi → `'FAILED'`.

## Vì sao thiết kế này

1. Worker chạy ngoài process (Python AI service), publish message qua RabbitMQ.
2. Worker chỉ chấm **submission** (một task / một part), không biết về `userTestResult`.
3. `userTestResult` aggregate từ nhiều submission (task1 + task2, hoặc part1 + part2 + part3).
4. Race condition: nếu worker update `userTestResult.bandScore`, cần tổng hợp từ N submissions — coupling giữa worker và schema aggregate.

## Endpoint behavior (current state)

### Reading / Listening
`POST /user-test-result/submit-reading-listening/:idUser`
- Đồng bộ: chấm + ghi `userAnswer` + update `userTestResult` trong 1 transaction.
- Response: `bandScore`, `totalCorrect`, `totalQuestions` có sẵn.

### Writing
`PATCH /user-test-result/finish-test-writing/:idTestResult/:idUser`
- Tạo `userWritingSubmission` (status: `PENDING`), publish queue.
- **BE poll worker** (`waitForWritingGrading` — `user-test-result.service.ts`):
  - Backoff 1s → 2s → 3s → 4s, timeout 60s.
  - Khi tất cả submissions ở terminal state (`COMPLETED` / `FAILED`) → lấy `aiOverallScore` thật.
  - Aggregate bandScore theo taskType: 0 task → 0; 1 task → điểm task đó; 2 task → `(t1 + t2*2)/3` rồi round half-band.
- `userTestResult.bandScore = aggregate thật` (không còn hardcode 0), `totalQuestions = submittedCount`.
- Cache `test-results:${idUser}` bị invalidate ngay sau update.

### Speaking
`PATCH /user-test-result/finish-test-speaking/:idTestResult/:idUser` (multipart, 3 audio parts)
- Tạo `userSpeakingSubmission` (status: `PENDING`) cho từng part có audio, publish queue.
- **BE poll worker** (`waitForSpeakingGrading` — `user-test-result.service.ts`):
  - Cùng backoff + timeout 60s như Writing.
  - Aggregate: average `aiOverallScore` của các parts đã submit, round half-band.
  - User submit 1 part → bandScore = điểm part đó (không penalty chia cho 3).
- `userTestResult.bandScore = aggregate thật` (không còn hardcode 0), `totalQuestions = submittedPartsCount`.
- Cache `test-results:${idUser}` bị invalidate ngay sau update.

## FE poll (không còn cần)

Đã fix: BE tự poll worker đến khi grading xong rồi aggregate `bandScore` trước khi response.
FE không cần poll hay tự compute — điểm trả về trong response của `finishTestWriting` /
`finishTestSpeaking` đã là giá trị thật.

Nếu sau này muốn xem feedback chi tiết từng submission, FE có thể gọi:
- `GET /user-writing-submission/:id/status`
- `GET /user-speaking-submission/:id/status`

(đã có sẵn, xem `user-writing-submission.controller.ts:43` và `user-speaking-submission.controller.ts:52`).

## Nếu sau này muốn worker update `userTestResult`

Khi đó cần:
1. Worker giữ reference `idTestResult` từ message payload (đã có).
2. Worker gọi HTTP callback hoặc dùng Prisma trực tiếp để update `userTestResult` sau khi chấm xong TẤT CẢ submissions của test đó.
3. Tín hiệu "đã chấm xong tất cả": check status tất cả submission của test → nếu hết `PENDING` thì aggregate bandScore.

Hiện tại **không cần** làm — FE poll pattern đã ổn.

## File liên quan

- `src/module/user-test-result/user-test-result.service.ts` — finishTestWriting, finishTestSpeaking
- `src/module/user-writing-submission/user-writing-submission.service.ts` — tạo submission + publish queue
- `src/module/user-speaking-submission/user-speaking-submission.service.ts` — tạo submission + publish queue
- `ai-workers/grading-worker/src/handlers/write.handler.ts` — worker chấm Writing
- `ai-workers/grading-worker/src/handlers/speak.handler.ts` — worker chấm Speaking
- `ai-workers/grading-worker/src/services/neon.service.ts` — worker ghi DB
