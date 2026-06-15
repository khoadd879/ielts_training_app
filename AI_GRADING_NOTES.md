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
- Tạo `userWritingSubmission` (status: `PENDING`), publish queue, return ngay.
- `userTestResult.bandScore = 0` (BE hardcode — bug đã biết, xem bên dưới), `totalQuestions = submittedCount`.
- ⚠️ **Bug:** `finishTestWriting` set `scoreTask1 = 0`, `scoreTask2 = 0` hardcode, `bandScore = 0`. Worker chấm xong cũng không ai update lại testResult → score cuối cùng = 0 mãi mãi.
- Response hiện tại: `{ bandScore: 0, breakdown: { task1Score: 0, task2Score: 0 }, submissions: [{ score: null, ... }] }`.

### Speaking
`PATCH /user-test-result/finish-test-speaking/:idTestResult/:idUser` (multipart, 3 audio parts)
- Tạo `userSpeakingSubmission` (status: `PENDING`) cho từng part có audio, publish queue, return ngay.
- `userTestResult.bandScore = 0` (cùng bug), `totalQuestions = submittedPartsCount`.
- ⚠️ **Bug:** `finishTestSpeaking` set `score = 0` cho mỗi part → `bandScore = 0`. Worker không update testResult.
- Response hiện tại: `{ bandScore: 0, breakdown: { PART1: 0, PART2: 0, PART3: 0 }, submissions: [{ score: 0, ... }] }`.

## FE phải poll

Score thật nằm ở `userWritingSubmission.aiOverallScore` / `userSpeakingSubmission.aiOverallScore`.
Endpoint `GET /user-test-result/get-test-result-and-answers/:idTestResult` đã `include` relations
này (`getAllAnswerInTestResult` trong `user-test-result.service.ts`).

**Hiện tại BE không làm**, nên FE cần tự poll + tự compute bandScore từ submissions:

```js
// Frontend pseudo-code
async function pollUntilGraded(idTestResult) {
  for (let i = 0; i < 30; i++) {
    const res = await getTestResultAndAnswersAPI(idTestResult);
    const submissions = res.data.writingSubmissions || res.data.speakingSubmissions || [];
    if (submissions.length === 0) break;
    const allDone = submissions.every(s => s.aiGradingStatus === 'COMPLETED' || s.aiGradingStatus === 'FAILED');
    if (allDone) {
      // ⚠️ userTestResult.bandScore vẫn = 0 do bug BE.
      // Phải compute từ submissions:
      return computeBandFromSubmissions(submissions);
    }
    await sleep(2000);
  }
  // Fallback: trả bandScore = 0 (giá trị BE set)
  return 0;
}
```

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
