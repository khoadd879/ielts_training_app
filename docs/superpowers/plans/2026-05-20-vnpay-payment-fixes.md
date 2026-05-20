# VNPay Payment & DB Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the VNPay payment flow actually work end-to-end (create URL → user pays → IPN callback → credits/subscription provisioned) and make the schema honest about payment state with full referential integrity.

**Architecture:** Introduce a single source of truth for payment attempts (`PaymentTransaction`) that owns the VNPay lifecycle (PENDING → SUCCESS/FAILED), then provision credits or subscriptions only on a verified IPN callback inside an idempotent Prisma transaction. Wire the dead `PaymentModule`/`SubscriptionModule` into `AppModule`. Replace the trust-based `PurchaseCreditsDto.paymentRef` string with a server-side flow that reads the verified `PaymentTransaction`.

**Phases:**
- **Phase 0 — Validate baseline (Hướng B). DO THIS FIRST.** Lock the signature with unit tests, wire `PaymentModule` (1 import line), configure sandbox `.env`, run a real browser payment. Proves what already works. Reversible. ~30 min.
- **Phase 1 — Full fixes (Tasks 1–10).** DB schema, idempotent IPN handler, controller method fix, atomic provisioning, secure refactors, end-to-end sandbox verification with credits actually granted. Only proceed once Phase 0 passes.

**Tech Stack:** NestJS 10, Prisma 5 (PostgreSQL), `class-validator`, `crypto` (HMAC SHA512), Jest for tests, VNPay sandbox (https://sandbox.vnpayment.vn).

---

## Context: What's Broken Today

Code reviewed at `master` branch (commit `f93998c`):

1. **`src/app.module.ts`** — only `CreditsModule` is registered. `PaymentModule` and `SubscriptionModule` exist but are NEVER imported → every endpoint under `/payment/*` and `/subscriptions/*` returns 404.
2. **`src/module/payment/payment.controller.ts:45`** — `amount: 50000` hard-coded. Real package price ignored.
3. **`src/module/payment/payment.controller.ts:82`** — IPN uses `@Post @Body`, but VNPay calls IPN as **GET with query string**. Real callbacks would 404.
4. **`src/module/payment/payment.service.ts:127-149`** — `handleVnpayIpn` returns `00` to VNPay but does NOT credit the user, activate subscription, or persist anything. Money is lost.
5. **`src/module/payment/payment.service.ts:162-169`** — `formatDate` reads server's local time; VNPay requires GMT+7. Wrong timezone → instant expiry.
6. **`src/module/payment/payment.service.ts:154`** — `queryTransaction` is an empty stub.
7. **`src/module/credits/credits.service.ts:59`** — `purchaseCredits(idUser, dto)` just adds credits because the client sent a `paymentRef` string. No verification. **Anyone can mint unlimited credits by hitting `/credits/purchase`.**
8. **`src/module/credits/dto/purchase-credit.dto.ts`** — `paymentRef` is a plain `IsString`, not validated against any payment record.
9. **No DB model** for payment attempts. `CreditTransaction` records the credit grant but cannot represent a PENDING/FAILED VNPay attempt; `UserSubscription.paymentRef` is a nullable free-text string.
10. **`UserSubscription`** has no unique constraint on `(idUser, status='ACTIVE')` and `subscribe()` works around it by `updateMany` → race condition under concurrent webhooks.
11. **No idempotency:** VNPay retries IPN until it gets `rspCode: 00`. Without a unique key on `vnp_TxnRef` we'd double-credit on retry.
12. **`.env.example`** — uses `VNPAY_*` prefixed names but `payment.service.ts` reads them; no validation that they're set, no warning if empty.

## File Structure (after this plan)

**Create:**
- `prisma/migrations/<timestamp>_add_payment_transaction/migration.sql` — new table + FK
- `src/module/payment/payment.utils.spec.ts` — unit tests for HMAC sign/verify
- `src/module/payment/payment.service.spec.ts` — unit tests with mocked Prisma
- `src/module/payment/dto/create-payment.dto.ts` — modify (drop `ipAddress` from body, take from `req.ip`)

**Modify:**
- `prisma/schema.prisma` — add `PaymentTransaction` model + enums, link to `User`, `CreditPackage`, `SubscriptionPackage`
- `src/app.module.ts` — register `PaymentModule` and `SubscriptionModule`
- `src/module/payment/payment.module.ts` — import `DatabaseModule`, `CreditsModule`, `SubscriptionModule`
- `src/module/payment/payment.service.ts` — persist transactions, GMT+7 dates, real IPN handler that credits/activates subscription atomically
- `src/module/payment/payment.controller.ts` — fix amount lookup, IPN to `@Get @Query`, return JSON not redirect for `/create`
- `src/module/payment/dto/create-payment.dto.ts` — remove client-supplied `ipAddress`
- `src/module/credits/credits.service.ts` — remove the trust-based `purchaseCredits`; replace with internal `creditFromPayment(tx, idTransaction)` called by `PaymentService`
- `src/module/credits/credits.controller.ts` — remove `POST /credits/purchase` (replaced by `POST /payment/vnpay/create`)
- `src/module/subscription/subscription.service.ts` — split `subscribe` into `requestSubscribe` (only validates) and internal `activateFromPayment(tx, idTransaction)` called by `PaymentService`
- `src/module/subscription/subscription.controller.ts` — make `POST /subscriptions/subscribe` create a payment URL via `PaymentService`, not directly activate

**Delete:** none (we keep `adminAdjustBalance` and `adminCreateSubscription` for back-office).

---

## DB Schema Audit Summary

Current state of payment-related models (`prisma/schema.prisma`):

| Model | Lines | Status | Issue |
|---|---|---|---|
| `User` | 14-71 | OK | Has both `creditBalance` and `subscriptions` relations |
| `CreditPackage` | 534-550 | OK | Has `price`, `priceUnit`, `creditAmount` |
| `CreditBalance` | 552-563 | OK | One-to-one with User, `frozenCredits` already there |
| `CreditTransaction` | 565-585 | Partial | Only records DONE state, not the VNPay attempt; `idPackage` nullable so a PURCHASE row can lack a package |
| `SubscriptionPackage` | 591-612 | OK | Prices, billing cycle, `creditsQuota` |
| `UserSubscription` | 614-641 | Weak | `paymentRef` is free string, no FK; no unique on active per user |
| `PaymentMethod` enum | 672-678 | OK | Includes `VNPAY` |
| (none) | — | **Missing** | No `PaymentTransaction` model. We need it. |

The new `PaymentTransaction` is the single audit-trail for every VNPay attempt and the FK target the rest of the system can trust.

---

# Phase 0 — Validate Baseline (Hướng B)

> **Mục tiêu:** Chứng minh phần code đã có (HMAC signing + tạo URL + browser return) hoạt động với VNPay sandbox thật, **trước khi** refactor lớn ở Phase 1. Reversible: chỉ thêm 1 dòng import + 1 file test, không sửa schema/DB.
>
> **Tiêu chí pass Phase 0:**
> 1. Unit tests HMAC sign/verify pass (4/4)
> 2. `POST /payment/vnpay/create` trả 302 redirect tới `https://sandbox.vnpayment.vn/...`
> 3. Thanh toán thẻ test NCB → browser quay về `/payment/vnpay/return` không lỗi signature
>
> Sau khi Phase 0 pass → tiếp Phase 1. Nếu fail bất kỳ bước nào → STOP và investigate trước khi refactor.

---

## Task 0A: Unit tests cho HMAC signature (5 phút, không cần sandbox)

**Files:**
- Create: `src/module/payment/payment.utils.spec.ts`

- [ ] **Step 1: Tạo file test**

```typescript
import { VnpayUtils } from './payment.utils';

describe('VnpayUtils', () => {
  const secret = 'TESTSECRET12345';

  describe('sortAndBuildQueryString', () => {
    it('sorts keys alphabetically and excludes vnp_SecureHash', () => {
      const qs = VnpayUtils.sortAndBuildQueryString({
        vnp_TxnRef: 'T1',
        vnp_Amount: 100,
        vnp_SecureHash: 'IGNORED',
      });
      expect(qs).toBe('vnp_Amount=100&vnp_TxnRef=T1');
    });

    it('skips empty/null/undefined values', () => {
      const qs = VnpayUtils.sortAndBuildQueryString({
        vnp_A: '',
        vnp_B: null as any,
        vnp_C: undefined as any,
        vnp_D: 'kept',
      });
      expect(qs).toBe('vnp_D=kept');
    });
  });

  describe('signature roundtrip', () => {
    it('verify passes for self-signed params', () => {
      const params: any = { vnp_TxnRef: 'T1', vnp_Amount: 100 };
      params.vnp_SecureHash = VnpayUtils.generateSignature(params, secret);
      expect(VnpayUtils.verifySignature(params, secret)).toBe(true);
    });

    it('verify fails when secret wrong', () => {
      const params: any = { vnp_TxnRef: 'T1', vnp_Amount: 100 };
      params.vnp_SecureHash = VnpayUtils.generateSignature(params, secret);
      expect(VnpayUtils.verifySignature(params, 'WRONG')).toBe(false);
    });

    it('verify fails when no hash present', () => {
      expect(VnpayUtils.verifySignature({ vnp_TxnRef: 'T1' }, secret)).toBe(false);
    });

    it('verify fails when params tampered', () => {
      const params: any = { vnp_TxnRef: 'T1', vnp_Amount: 100 };
      params.vnp_SecureHash = VnpayUtils.generateSignature(params, secret);
      params.vnp_Amount = 999;
      expect(VnpayUtils.verifySignature(params, secret)).toBe(false);
    });
  });
});
```

- [ ] **Step 2: Chạy test**

Run: `npm run test -- payment.utils`
Expected: 6 tests pass (2 + 4).

- [ ] **Step 3: Commit**

```bash
git add src/module/payment/payment.utils.spec.ts
git commit -m "test(payment): unit tests for VNPay HMAC signature"
```

✅ **Checkpoint:** signature đúng spec VNPay. Đây là phần duy nhất hiện hoạt động.

---

## Task 0B: Wire `PaymentModule` vào AppModule (1 phút)

**Files:**
- Modify: `src/app.module.ts`

- [ ] **Step 1: Tìm chỗ import modules**

Run: `grep -n "Module" src/app.module.ts | head -30`
Note dòng `CreditsModule` đang ở đâu để chèn cùng vùng.

- [ ] **Step 2: Thêm import**

Trong `src/app.module.ts`, thêm dòng import bên cạnh các import module khác:

```typescript
import { PaymentModule } from './module/payment/payment.module';
```

Và thêm `PaymentModule,` vào mảng `imports: [...]` (ngay sau `CreditsModule,`).

- [ ] **Step 3: Verify endpoint sống**

Run: `npm run start:dev` (chờ `Nest application successfully started`).

Trong terminal khác:
```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/payment/vnpay/ipn
```
Expected: `401` hoặc `400` hoặc `500` — **bất kỳ thứ gì khác `404`** đều OK. `404` = module chưa wire.

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/payment/vnpay/return
```
Expected: `302` hoặc `400`. KHÔNG phải `404`.

Stop server (Ctrl-C).

- [ ] **Step 4: Commit**

```bash
git add src/app.module.ts
git commit -m "fix(app): register PaymentModule so VNPay routes are reachable"
```

✅ **Checkpoint:** endpoint không còn 404.

---

## Task 0C: Đăng ký VNPay sandbox & cấu hình `.env` (10 phút)

**Files:**
- Modify: `.env` (LOCAL ONLY, không commit)

- [ ] **Step 1: Đăng ký sandbox merchant**

1. Vào https://sandbox.vnpayment.vn/devreg/
2. Đăng ký bằng email cá nhân (sandbox không cần KYC)
3. Confirm email → login
4. Vào tab **"Cấu hình"** hoặc **"Merchant"** → lấy:
   - `vnp_TmnCode` (8 ký tự, vd. `KMTAYP1Y`)
   - `vnp_HashSecret` (chuỗi alphanumeric ~32 ký tự)

- [ ] **Step 2: Cập nhật `.env`**

Mở `/home/khoa/Documents/ielts_training_app/.env`, sửa 5 dòng `VNPAY_*`:

```
VNPAY_TMN_CODE=<TMN code từ sandbox>
VNPAY_HASH_SECRET=<hash secret từ sandbox>
VNPAY_RETURN_URL=http://localhost:3000/payment/vnpay/return
VNPAY_IPN_URL=http://localhost:3000/payment/vnpay/ipn
VNPAY_SANDBOX=true
```

> Phase 0 chưa cần ngrok cho IPN — chỉ test create URL + browser return. IPN sẽ test ở Phase 1 Task 10.

- [ ] **Step 3: Verify env load**

Run: `npm run start:dev`. Trong logs khi boot, KHÔNG được thấy lỗi `VNPAY_TMN_CODE missing` (sau khi Phase 1 thêm warning) — Phase 0 chỉ cần server start không crash.

Trong terminal khác:
```bash
node -e "
require('dotenv').config({path:'.env'});
console.log('TMN:', process.env.VNPAY_TMN_CODE ? 'SET ('+process.env.VNPAY_TMN_CODE.length+' chars)' : 'MISSING');
console.log('SECRET:', process.env.VNPAY_HASH_SECRET ? 'SET ('+process.env.VNPAY_HASH_SECRET.length+' chars)' : 'MISSING');
console.log('RETURN:', process.env.VNPAY_RETURN_URL);
"
```
Expected: cả 3 đều `SET` với độ dài hợp lý (TMN 8, SECRET ≥ 32).

Stop server.

✅ **Checkpoint:** credentials sandbox sẵn sàng.

---

## Task 0D: Test end-to-end qua browser (10 phút)

Task này thuần execution, không sửa code. Cần server chạy + 1 user account thật trong DB.

- [ ] **Step 1: Start server**

```bash
npm run start:dev
```

Confirm log có dòng `Mapped {/payment/vnpay/create, POST}` và `Mapped {/payment/vnpay/return, GET}`.

- [ ] **Step 2: Login lấy JWT**

Dùng tài khoản test có sẵn (hoặc tạo qua `/auth/register`):

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"<your-email>","password":"<your-pwd>"}'
```

Copy `access_token` từ response. Save vào biến shell:
```bash
TOKEN="<access_token>"
```

- [ ] **Step 3: Tạo payment URL**

```bash
curl -i -X POST http://localhost:3000/payment/vnpay/create \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"packageType":"CREDIT","idPackage":"00000000-0000-0000-0000-000000000000","ipAddress":"127.0.0.1"}'
```

> Phase 0: `idPackage` truyền UUID nào cũng được vì code hiện tại không validate (sẽ fix ở Phase 1 Task 5). Amount sẽ luôn là 50,000 VND vì hard-code.

Expected response: HTTP `302` với header:
```
Location: https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_Amount=5000000&vnp_Command=pay&...&vnp_SecureHash=ABC123...
```

Copy URL trong header `Location:`.

- [ ] **Step 4: Inspect URL**

Mắt thường kiểm:
- `vnp_Amount=5000000` (= 50,000 × 100, đúng spec VNPay)
- `vnp_TmnCode=<TMN của bạn>`
- `vnp_TxnRef=CREDIT_<userId>_00000000_<timestamp>`
- `vnp_SecureHash=<128 hex chars uppercase>`

Nếu thiếu hash hoặc hash là chữ thường → BUG. Stop và investigate.

- [ ] **Step 5: Mở URL trong browser**

Paste URL vào Chrome/Firefox. Trang VNPay sandbox phải load với:
- Logo VNPay
- Số tiền `50,000 VNĐ`
- Order info (OrderID + mô tả)
- Danh sách ngân hàng

Nếu thấy **"Sai chữ ký"** hoặc **"Mã đối tác không hợp lệ"** → secret/TMN code sai. Quay lại Task 0C.

- [ ] **Step 6: Thanh toán thẻ test NCB**

Click **NCB**. Nhập:

| Field | Value |
|---|---|
| Số thẻ | `9704198526191432198` |
| Tên chủ thẻ | `NGUYEN VAN A` |
| Ngày phát hành | `07/15` |
| OTP | `123456` |

Click **Thanh toán** → **Tiếp tục** → nhập OTP → **Xác nhận**.

(Danh sách thẻ test khác: https://sandbox.vnpayment.vn/apis/vnpay-demo/)

- [ ] **Step 7: Verify return URL**

Browser sẽ redirect tới `http://localhost:3000/payment/vnpay/return?vnp_Amount=5000000&vnp_BankCode=NCB&vnp_ResponseCode=00&...&vnp_SecureHash=XYZ`.

Mở **DevTools > Network**, click vào request `return?...`:
- Status `302` (redirect tiếp)
- Response header `Location: /payment/success?txnRef=CREDIT_..._...&amount=50000`

Nếu thấy `Location: /payment/failed?message=Invalid%20signature` → signature verification thất bại trên đường về. Phổ biến do `.env` `VNPAY_HASH_SECRET` có khoảng trắng/quotes thừa. Sửa và retry.

- [ ] **Step 8: Test happy-path failure (cancel)**

Lặp lại Step 3 → Step 5. Trong trang VNPay click **Hủy giao dịch**.

Browser quay về `/payment/vnpay/return?vnp_ResponseCode=24&...`.
Expected: redirect cuối cùng tới `/payment/failed?message=Customer%20cancelled`.

- [ ] **Step 9: Document kết quả**

Append section dưới đây vào cuối file plan này:

```markdown
## Phase 0 Verification Log

- Date: 2026-05-20
- TMN code: <8 ký tự>
- Test cases passed:
  - [x] HMAC unit tests (6/6)
  - [x] Module wire (POST /payment/vnpay/ipn returns non-404)
  - [x] Create URL returns 302 with valid signed VNPay URL
  - [x] NCB happy path → return → /payment/success
  - [x] Cancel → return → /payment/failed
- Anomalies: <none | mô tả>
- Ready for Phase 1: YES
```

- [ ] **Step 10: Commit log**

```bash
git add docs/superpowers/plans/2026-05-20-vnpay-payment-fixes.md
git commit -m "docs(payment): record Phase 0 baseline verification"
```

✅ **Phase 0 done.** Baseline được chứng minh hoạt động. Có thể tự tin refactor lớn ở Phase 1.

---

## Phase 0 → Phase 1 Decision Gate

**Continue Phase 1 chỉ khi:**
- [ ] Tất cả 4 task 0A, 0B, 0C, 0D pass
- [ ] Không có anomaly bất thường
- [ ] Bạn đã hiểu flow tạo URL + browser return

**STOP và escalate nếu:**
- Sandbox trả "Sai chữ ký" — có thể phiên bản VNPay (`vnp_Version`) khác, cần sync với docs mới nhất
- Thẻ test bị reject — sandbox account chưa được activate, contact VNPay support
- Browser return verify fail — secret bị mangle khi đọc từ `.env`, debug trước

---

# Phase 1 — Full Fixes

**Files:**
- Modify: `prisma/schema.prisma:534` (add new model after `CreditPackage`-area block, before `enum CreditTransType` at line 643)
- Modify: `prisma/schema.prisma:55` (add relation on `User`)
- Modify: `prisma/schema.prisma:547` (add relation on `CreditPackage`)
- Modify: `prisma/schema.prisma:608` (add relation on `SubscriptionPackage`)
- Modify: `prisma/schema.prisma:614-641` (add relation on `UserSubscription`, add FK)
- Modify: `prisma/schema.prisma:565-585` (add relation on `CreditTransaction`)

- [ ] **Step 1: Add `PaymentTransaction` model and enums**

Insert after line 641 (right before `enum CreditTransType` at line 643), add:

```prisma
// ============================================================================
// PAYMENT (VNPay/MoMo/etc. attempts — single source of truth)
// ============================================================================

model PaymentTransaction {
  idTransaction String              @id @default(uuid())
  idUser        String
  packageType   PaymentPackageType  // CREDIT or SUBSCRIPTION
  idCreditPackage      String?
  idSubscriptionPackage String?
  amount        Float               // in VND
  priceUnit     String              @default("VND")
  paymentMethod PaymentMethod       @default(VNPAY)
  status        PaymentStatus       @default(PENDING)

  // VNPay-specific (kept here so we don't grow another table)
  vnpTxnRef         String  @unique // e.g. "CREDIT_<idUser>_<idPackage>_<ts>"
  vnpTransactionNo  String? // VNPay's own transaction id (vnp_TransactionNo)
  vnpResponseCode   String? // "00" = success
  vnpBankCode       String?
  vnpPayDate        String? // raw vnp_PayDate string from VNPay
  rawCallback       Json?   // full IPN/return payload for audit

  // Result links — populated only after successful IPN
  idCreditTransaction String? @unique
  idSubscription      String? @unique

  ipAddress    String?
  errorMessage String?
  createdAt    DateTime @default(now())
  paidAt       DateTime?
  updatedAt    DateTime @updatedAt

  // Relations
  user                User                 @relation(fields: [idUser], references: [idUser], onDelete: Cascade)
  creditPackage       CreditPackage?       @relation(fields: [idCreditPackage], references: [idPackage])
  subscriptionPackage SubscriptionPackage? @relation(fields: [idSubscriptionPackage], references: [idPackage])
  creditTransaction   CreditTransaction?   @relation(fields: [idCreditTransaction], references: [idTransaction])
  subscription        UserSubscription?    @relation(fields: [idSubscription], references: [idSubscription])

  @@index([idUser, status])
  @@index([status, createdAt])
  @@index([vnpTxnRef])
}

enum PaymentStatus {
  PENDING    // URL generated, waiting for callback
  SUCCESS    // IPN verified, provisioning done
  FAILED     // VNPay returned non-"00" or signature invalid
  EXPIRED    // 15-min window passed without callback
  REFUNDED   // Manual reversal
}

enum PaymentPackageType {
  CREDIT
  SUBSCRIPTION
}
```

- [ ] **Step 2: Add reverse relations on existing models**

In `User` (line 55-59 area), add after `creditTransactions CreditTransaction[]`:

```prisma
  paymentTransactions PaymentTransaction[]
```

In `CreditPackage` (line 547), add after `transactions CreditTransaction[]`:

```prisma
  paymentTransactions PaymentTransaction[]
```

In `SubscriptionPackage` (line 608), add after `subscriptions UserSubscription[]`:

```prisma
  paymentTransactions PaymentTransaction[]
```

In `CreditTransaction` (line 565-585), add inside the model:

```prisma
  paymentTransaction PaymentTransaction?
```

In `UserSubscription` (line 614-641), add inside the model:

```prisma
  paymentTransaction PaymentTransaction?
```

- [ ] **Step 3: Validate schema compiles**

Run: `npx prisma validate`
Expected: `The schema at prisma/schema.prisma is valid 🚀`

- [ ] **Step 4: Generate migration**

Run: `npx prisma migrate dev --name add_payment_transaction --create-only`
Expected: a new file `prisma/migrations/<timestamp>_add_payment_transaction/migration.sql` is created.

- [ ] **Step 5: Inspect migration SQL**

Open the new migration file. Verify it contains:
- `CREATE TABLE "PaymentTransaction"`
- `CREATE TYPE "PaymentStatus"`
- `CREATE TYPE "PaymentPackageType"`
- `ALTER TABLE "PaymentTransaction" ADD CONSTRAINT ... FOREIGN KEY ("idUser") REFERENCES "User"`
- `CREATE UNIQUE INDEX "PaymentTransaction_vnpTxnRef_key"`

- [ ] **Step 6: Apply migration**

Run: `npx prisma migrate dev`
Expected: `Database is now in sync with your schema.` and Prisma Client regenerated.

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(payment): add PaymentTransaction model and enums"
```

---

## Task 2: Wire `PaymentModule` and `SubscriptionModule` into `AppModule`

**Files:**
- Modify: `src/app.module.ts`
- Modify: `src/module/payment/payment.module.ts`

- [ ] **Step 1: Read current app module**

Run: `grep -n "Module" src/app.module.ts | head -40`
Note where modules are imported and the exact existing list.

- [ ] **Step 2: Register modules in `AppModule`**

In `src/app.module.ts`, add the imports near the other module imports:

```typescript
import { PaymentModule } from './module/payment/payment.module';
import { SubscriptionModule } from './module/subscription/subscription.module';
```

Add them to the `imports: [...]` array (alphabetical or where peers are listed).

- [ ] **Step 3: Update `PaymentModule` to use Database, Credits, Subscription**

Replace `src/module/payment/payment.module.ts` contents:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from 'src/database/database.module';
import { CreditsModule } from '../credits/credits.module';
import { SubscriptionModule } from '../subscription/subscription.module';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';

@Module({
  imports: [ConfigModule, DatabaseModule, CreditsModule, SubscriptionModule],
  controllers: [PaymentController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}
```

- [ ] **Step 4: Verify app boots**

Run: `npm run build`
Expected: `webpack compiled successfully` (or equivalent), no `Nest can't resolve dependencies` error.

Run: `npm run start:dev` then in another shell `curl -s http://localhost:3000/payment/vnpay/return | head`. Stop the server (Ctrl-C).
Expected: any response other than 404 — even an error is fine; we just want proof the route exists.

- [ ] **Step 5: Commit**

```bash
git add src/app.module.ts src/module/payment/payment.module.ts
git commit -m "fix(app): register PaymentModule and SubscriptionModule"
```

---

## Task 3: Unit tests for VNPay signature

**Files:**
- Create: `src/module/payment/payment.utils.spec.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
import { VnpayUtils } from './payment.utils';

describe('VnpayUtils', () => {
  const secret = 'TESTSECRET12345';

  describe('sortAndBuildQueryString', () => {
    it('sorts keys alphabetically and excludes vnp_SecureHash', () => {
      const qs = VnpayUtils.sortAndBuildQueryString({
        vnp_TxnRef: 'T1',
        vnp_Amount: 100,
        vnp_SecureHash: 'IGNORED',
      });
      expect(qs).toBe('vnp_Amount=100&vnp_TxnRef=T1');
    });

    it('skips empty/null/undefined values', () => {
      const qs = VnpayUtils.sortAndBuildQueryString({
        vnp_A: '',
        vnp_B: null as any,
        vnp_C: undefined as any,
        vnp_D: 'kept',
      });
      expect(qs).toBe('vnp_D=kept');
    });
  });

  describe('signature roundtrip', () => {
    it('verify passes for self-signed params', () => {
      const params: any = { vnp_TxnRef: 'T1', vnp_Amount: 100 };
      params.vnp_SecureHash = VnpayUtils.generateSignature(params, secret);
      expect(VnpayUtils.verifySignature(params, secret)).toBe(true);
    });

    it('verify fails when secret wrong', () => {
      const params: any = { vnp_TxnRef: 'T1', vnp_Amount: 100 };
      params.vnp_SecureHash = VnpayUtils.generateSignature(params, secret);
      expect(VnpayUtils.verifySignature(params, 'WRONG')).toBe(false);
    });

    it('verify fails when no hash present', () => {
      expect(VnpayUtils.verifySignature({ vnp_TxnRef: 'T1' }, secret)).toBe(false);
    });

    it('verify fails when params tampered', () => {
      const params: any = { vnp_TxnRef: 'T1', vnp_Amount: 100 };
      params.vnp_SecureHash = VnpayUtils.generateSignature(params, secret);
      params.vnp_Amount = 999;
      expect(VnpayUtils.verifySignature(params, secret)).toBe(false);
    });
  });
});
```

- [ ] **Step 2: Run and verify all tests pass**

Run: `npm run test -- payment.utils.spec`
Expected: 5 tests pass. (No implementation change needed; this locks current behavior.)

- [ ] **Step 3: Commit**

```bash
git add src/module/payment/payment.utils.spec.ts
git commit -m "test(payment): unit tests for VNPay signature"
```

---

## Task 4: Fix `formatDate` to use GMT+7

**Files:**
- Modify: `src/module/payment/payment.service.ts:162-169`
- Create test in: `src/module/payment/payment.service.spec.ts`

- [ ] **Step 1: Write failing test**

Create `src/module/payment/payment.service.spec.ts`:

```typescript
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PaymentService } from './payment.service';
import { DatabaseService } from 'src/database/database.service';
import { CreditsService } from '../credits/credits.service';
import { SubscriptionService } from '../subscription/subscription.service';

describe('PaymentService', () => {
  let service: PaymentService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        PaymentService,
        { provide: ConfigService, useValue: { get: () => '' } },
        { provide: DatabaseService, useValue: {} },
        { provide: CreditsService, useValue: {} },
        { provide: SubscriptionService, useValue: {} },
      ],
    }).compile();
    service = moduleRef.get(PaymentService);
  });

  describe('formatDate (GMT+7)', () => {
    it('formats UTC date to GMT+7 yyyyMMddHHmmss', () => {
      // 2026-05-20 00:00:00 UTC → 2026-05-20 07:00:00 GMT+7
      const utc = new Date('2026-05-20T00:00:00Z');
      // @ts-expect-error access private for test
      expect(service.formatDate(utc)).toBe('20260520070000');
    });

    it('handles day rollover correctly (UTC 23:00 → GMT+7 06:00 next day)', () => {
      const utc = new Date('2026-05-19T23:00:00Z');
      // @ts-expect-error access private for test
      expect(service.formatDate(utc)).toBe('20260520060000');
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- payment.service.spec`
Expected: FAIL — output depends on host's local TZ.

- [ ] **Step 3: Fix `formatDate`**

Replace the `formatDate` method in `src/module/payment/payment.service.ts` (lines 162-169) with:

```typescript
  /**
   * Format date to yyyyMMddHHmmss in GMT+7 (VNPay requirement)
   */
  private formatDate(date: Date): string {
    // Shift epoch by +7h, then read UTC components
    const gmt7 = new Date(date.getTime() + 7 * 60 * 60 * 1000);
    const yyyy = gmt7.getUTCFullYear();
    const MM = String(gmt7.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(gmt7.getUTCDate()).padStart(2, '0');
    const HH = String(gmt7.getUTCHours()).padStart(2, '0');
    const mm = String(gmt7.getUTCMinutes()).padStart(2, '0');
    const ss = String(gmt7.getUTCSeconds()).padStart(2, '0');
    return `${yyyy}${MM}${dd}${HH}${mm}${ss}`;
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- payment.service.spec`
Expected: 2 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/module/payment/payment.service.ts src/module/payment/payment.service.spec.ts
git commit -m "fix(payment): format VNPay dates in GMT+7 regardless of host TZ"
```

---

## Task 5: Refactor `PaymentService` — persist `PaymentTransaction` in `createPaymentUrl`

**Files:**
- Modify: `src/module/payment/payment.service.ts`

- [ ] **Step 1: Add new dependencies and constructor injection**

At the top of `src/module/payment/payment.service.ts`, replace the imports/constructor block (lines 1-24) with:

```typescript
import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from 'src/database/database.service';
import { CreditsService } from '../credits/credits.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { VnpayUtils } from './payment.utils';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private readonly vnpTmnCode: string;
  private readonly vnpHashSecret: string;
  private readonly vnpReturnUrl: string;
  private readonly vnpIpnUrl: string;
  private readonly isSandbox: boolean;

  private readonly VNP_URL = 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
  private readonly VNP_API_URL =
    'https://sandbox.vnpayment.vn/merchant_webapi/api/transaction';

  constructor(
    private readonly configService: ConfigService,
    private readonly db: DatabaseService,
    private readonly creditsService: CreditsService,
    private readonly subscriptionService: SubscriptionService,
  ) {
    this.vnpTmnCode = this.configService.get('VNPAY_TMN_CODE') ?? '';
    this.vnpHashSecret = this.configService.get('VNPAY_HASH_SECRET') ?? '';
    this.vnpReturnUrl = this.configService.get('VNPAY_RETURN_URL') ?? '';
    this.vnpIpnUrl = this.configService.get('VNPAY_IPN_URL') ?? '';
    this.isSandbox = this.configService.get('VNPAY_SANDBOX', 'true') === 'true';

    if (!this.vnpTmnCode || !this.vnpHashSecret || !this.vnpReturnUrl) {
      this.logger.error('VNPay env vars missing: VNPAY_TMN_CODE / VNPAY_HASH_SECRET / VNPAY_RETURN_URL');
    }
  }
```

- [ ] **Step 2: Replace `createPaymentUrl` to look up real price and persist a PENDING transaction**

Replace the existing `createPaymentUrl` (lines 29-72) with:

```typescript
  async createPaymentUrl(params: {
    idUser: string;
    idPackage: string;
    packageType: 'CREDIT' | 'SUBSCRIPTION';
    ipAddress: string;
  }): Promise<{ paymentUrl: string; idTransaction: string; vnpTxnRef: string }> {
    const { idUser, idPackage, packageType, ipAddress } = params;

    // 1. Look up package + price from DB (no client-supplied amount)
    let amount: number;
    let orderInfo: string;
    let idCreditPackage: string | null = null;
    let idSubscriptionPackage: string | null = null;

    if (packageType === 'CREDIT') {
      const pkg = await this.db.creditPackage.findUnique({ where: { idPackage } });
      if (!pkg || !pkg.isActive) {
        throw new NotFoundException('Credit package not found or inactive');
      }
      amount = pkg.price;
      orderInfo = `Mua ${pkg.creditAmount} credits - ${pkg.name}`;
      idCreditPackage = pkg.idPackage;
    } else {
      const pkg = await this.db.subscriptionPackage.findUnique({ where: { idPackage } });
      if (!pkg || !pkg.isActive) {
        throw new NotFoundException('Subscription package not found or inactive');
      }
      amount = pkg.price;
      orderInfo = `Goi ${pkg.name}`;
      idSubscriptionPackage = pkg.idPackage;
    }

    // 2. Persist PENDING transaction
    const now = new Date();
    const expireDate = new Date(now.getTime() + 15 * 60 * 1000);
    const vnpTxnRef = `${packageType}_${idUser.slice(0, 8)}_${Date.now()}`;

    const tx = await this.db.paymentTransaction.create({
      data: {
        idUser,
        packageType,
        idCreditPackage,
        idSubscriptionPackage,
        amount,
        paymentMethod: 'VNPAY',
        status: 'PENDING',
        vnpTxnRef,
        ipAddress,
      },
    });

    // 3. Build VNPay params
    const vnpParams: Record<string, string | number> = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: this.vnpTmnCode,
      vnp_Amount: Math.round(amount * 100),
      vnp_CurrCode: 'VND',
      vnp_Locale: 'vn',
      vnp_IpAddr: ipAddress,
      vnp_OrderInfo: orderInfo,
      vnp_OrderType: 'topup',
      vnp_ReturnUrl: this.vnpReturnUrl,
      vnp_ExpireDate: this.formatDate(expireDate),
      vnp_TxnRef: vnpTxnRef,
      vnp_CreateDate: this.formatDate(now),
    };

    vnpParams['vnp_SecureHash'] = VnpayUtils.generateSignature(
      vnpParams,
      this.vnpHashSecret,
    );

    const paymentUrl = `${this.VNP_URL}?${new URLSearchParams(
      vnpParams as any,
    ).toString()}`;

    return { paymentUrl, idTransaction: tx.idTransaction, vnpTxnRef };
  }
```

- [ ] **Step 3: Build verifies, no test added yet (covered in Task 6 with IPN tests)**

Run: `npm run build`
Expected: build succeeds, no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add src/module/payment/payment.service.ts
git commit -m "feat(payment): persist PENDING PaymentTransaction in createPaymentUrl"
```

---

## Task 6: Implement real IPN handler (idempotent provisioning)

**Files:**
- Modify: `src/module/payment/payment.service.ts` (replace `handleVnpayIpn` and `handleVnpayReturn`)
- Modify: `src/module/credits/credits.service.ts` (add `creditFromPayment`)
- Modify: `src/module/subscription/subscription.service.ts` (add `activateFromPayment`)
- Modify: `src/module/payment/payment.service.spec.ts` (extend tests)

- [ ] **Step 1: Add `creditFromPayment` to `CreditsService`**

Add this method in `src/module/credits/credits.service.ts` after `purchaseCredits` (before `deductCredit` at line 107):

```typescript
  /**
   * Internal: provision credits from a verified PaymentTransaction.
   * Must be called inside a Prisma transaction to share the same `tx`.
   */
  async creditFromPayment(
    tx: any,
    payment: { idTransaction: string; idUser: string; idCreditPackage: string | null },
  ): Promise<{ idTransaction: string }> {
    if (!payment.idCreditPackage) {
      throw new BadRequestException('Payment has no credit package');
    }

    const pkg = await tx.creditPackage.findUnique({
      where: { idPackage: payment.idCreditPackage },
    });
    if (!pkg) throw new NotFoundException('Credit package vanished');

    let balance = await tx.creditBalance.findUnique({ where: { idUser: payment.idUser } });
    if (!balance) {
      balance = await tx.creditBalance.create({
        data: { idUser: payment.idUser, totalCredits: 0, usedCredits: 0 },
      });
    }

    await tx.creditBalance.update({
      where: { idUser: payment.idUser },
      data: { totalCredits: balance.totalCredits + pkg.creditAmount },
    });

    const creditTx = await tx.creditTransaction.create({
      data: {
        idUser: payment.idUser,
        idPackage: pkg.idPackage,
        creditsAmount: pkg.creditAmount,
        transactionType: 'PURCHASE',
        description: `VNPay purchase ${pkg.name}`,
        status: 'COMPLETED',
      },
    });

    return { idTransaction: creditTx.idTransaction };
  }
```

Mark the existing public `purchaseCredits` (lines 59-105) as `@deprecated` by adding above it:

```typescript
  /** @deprecated Direct credit purchase without payment is no longer allowed. Use POST /payment/vnpay/create. */
```

- [ ] **Step 2: Add `activateFromPayment` to `SubscriptionService`**

Add in `src/module/subscription/subscription.service.ts` after `subscribe` (before `checkQuota` at line 88):

```typescript
  /**
   * Internal: activate subscription from a verified PaymentTransaction.
   * Must be called inside a Prisma transaction.
   */
  async activateFromPayment(
    tx: any,
    payment: { idUser: string; idSubscriptionPackage: string | null; idTransaction: string },
  ): Promise<{ idSubscription: string }> {
    if (!payment.idSubscriptionPackage) {
      throw new BadRequestException('Payment has no subscription package');
    }

    const pkg = await tx.subscriptionPackage.findUnique({
      where: { idPackage: payment.idSubscriptionPackage },
    });
    if (!pkg) throw new NotFoundException('Subscription package vanished');

    const now = new Date();
    const expiresAt = new Date(now);
    if (pkg.billingCycle === 'MONTHLY') {
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    } else {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    }

    await tx.userSubscription.updateMany({
      where: { idUser: payment.idUser, status: 'ACTIVE' },
      data: { status: 'CANCELLED' },
    });

    const sub = await tx.userSubscription.create({
      data: {
        idUser: payment.idUser,
        idPackage: pkg.idPackage,
        status: 'ACTIVE',
        startedAt: now,
        expiresAt,
        nextBillingAt: null,
        autoRenew: false,
        creditsQuotaThisPeriod: pkg.creditsQuota,
        creditsUsedThisPeriod: 0,
        paymentRef: payment.idTransaction,
        paymentMethod: 'VNPAY',
      },
    });

    return { idSubscription: sub.idSubscription };
  }
```

- [ ] **Step 3: Replace `handleVnpayReturn` and `handleVnpayIpn` in PaymentService**

Replace lines 77-149 of `src/module/payment/payment.service.ts` with:

```typescript
  /**
   * Browser return — display-only. Does NOT provision (IPN does that).
   */
  async handleVnpayReturn(
    query: Record<string, string>,
  ): Promise<{ success: boolean; message: string; vnpTxnRef?: string; amount?: number }> {
    if (!VnpayUtils.verifySignature(query, this.vnpHashSecret)) {
      return { success: false, message: 'Invalid signature' };
    }
    const responseCode = query['vnp_ResponseCode'];
    const vnpTxnRef = query['vnp_TxnRef'];
    const amount = parseInt(query['vnp_Amount'], 10) / 100;

    if (responseCode === '00') {
      return { success: true, message: 'Payment successful', vnpTxnRef, amount };
    }
    return {
      success: false,
      message: this.mapResponseCode(responseCode),
      vnpTxnRef,
      amount,
    };
  }

  /**
   * IPN (server-to-server). Idempotent: provisions credits/subscription
   * exactly once, even on VNPay retry.
   */
  async handleVnpayIpn(
    query: Record<string, string>,
  ): Promise<{ RspCode: string; Message: string }> {
    if (!VnpayUtils.verifySignature(query, this.vnpHashSecret)) {
      return { RspCode: '97', Message: 'Invalid signature' };
    }

    const vnpTxnRef = query['vnp_TxnRef'];
    const responseCode = query['vnp_ResponseCode'];
    const transactionStatus = query['vnp_TransactionStatus'];
    const amountVnp = parseInt(query['vnp_Amount'], 10);

    const payment = await this.db.paymentTransaction.findUnique({ where: { vnpTxnRef } });
    if (!payment) {
      return { RspCode: '01', Message: 'Order not found' };
    }

    // Amount tampering check
    if (Math.round(payment.amount * 100) !== amountVnp) {
      await this.db.paymentTransaction.update({
        where: { idTransaction: payment.idTransaction },
        data: { status: 'FAILED', errorMessage: 'Amount mismatch', rawCallback: query },
      });
      return { RspCode: '04', Message: 'Invalid amount' };
    }

    // Idempotency: already SUCCESS → return 02 (already confirmed)
    if (payment.status === 'SUCCESS') {
      return { RspCode: '02', Message: 'Order already confirmed' };
    }

    if (responseCode !== '00' || transactionStatus !== '00') {
      await this.db.paymentTransaction.update({
        where: { idTransaction: payment.idTransaction },
        data: {
          status: 'FAILED',
          vnpResponseCode: responseCode,
          vnpTransactionNo: query['vnp_TransactionNo'] ?? null,
          vnpBankCode: query['vnp_BankCode'] ?? null,
          vnpPayDate: query['vnp_PayDate'] ?? null,
          errorMessage: this.mapResponseCode(responseCode),
          rawCallback: query,
        },
      });
      return { RspCode: '00', Message: 'Order processed' };
    }

    // Success path — provision atomically
    try {
      await this.db.$transaction(async (tx) => {
        let idCreditTransaction: string | null = null;
        let idSubscription: string | null = null;

        if (payment.packageType === 'CREDIT') {
          const r = await this.creditsService.creditFromPayment(tx, {
            idTransaction: payment.idTransaction,
            idUser: payment.idUser,
            idCreditPackage: payment.idCreditPackage,
          });
          idCreditTransaction = r.idTransaction;
        } else {
          const r = await this.subscriptionService.activateFromPayment(tx, {
            idTransaction: payment.idTransaction,
            idUser: payment.idUser,
            idSubscriptionPackage: payment.idSubscriptionPackage,
          });
          idSubscription = r.idSubscription;
        }

        await tx.paymentTransaction.update({
          where: { idTransaction: payment.idTransaction },
          data: {
            status: 'SUCCESS',
            paidAt: new Date(),
            vnpResponseCode: responseCode,
            vnpTransactionNo: query['vnp_TransactionNo'] ?? null,
            vnpBankCode: query['vnp_BankCode'] ?? null,
            vnpPayDate: query['vnp_PayDate'] ?? null,
            idCreditTransaction,
            idSubscription,
            rawCallback: query,
          },
        });
      });

      return { RspCode: '00', Message: 'Confirm Success' };
    } catch (err: any) {
      this.logger.error(`Provision failed for ${vnpTxnRef}: ${err.message}`);
      return { RspCode: '99', Message: 'Provision failed' };
    }
  }

  private mapResponseCode(code: string): string {
    const map: Record<string, string> = {
      '00': 'Thanh cong',
      '07': 'Nghi ngo gian lan',
      '09': 'Khach hang chua dang ky InternetBanking',
      '10': 'Xac thuc thong tin sai qua 3 lan',
      '11': 'Het han thanh toan',
      '24': 'Khach hang huy',
      '51': 'Khong du so du',
      '65': 'Vuot han muc giao dich trong ngay',
      '75': 'Ngan hang dang bao tri',
      '79': 'Sai mat khau qua so lan quy dinh',
      '99': 'Loi khac',
    };
    return map[code] ?? `Loi (${code})`;
  }
```

- [ ] **Step 4: Add IPN test cases**

Append to `src/module/payment/payment.service.spec.ts`:

```typescript
import { VnpayUtils } from './payment.utils';

describe('handleVnpayIpn', () => {
  let service: PaymentService;
  let db: any;
  let creditsService: any;
  let subscriptionService: any;
  const secret = 'TESTSECRET';

  beforeEach(async () => {
    db = {
      paymentTransaction: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(async (fn: any) => fn(db)),
    };
    creditsService = { creditFromPayment: jest.fn().mockResolvedValue({ idTransaction: 'ct-1' }) };
    subscriptionService = { activateFromPayment: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        PaymentService,
        { provide: ConfigService, useValue: { get: (k: string) => k === 'VNPAY_HASH_SECRET' ? secret : '' } },
        { provide: DatabaseService, useValue: db },
        { provide: CreditsService, useValue: creditsService },
        { provide: SubscriptionService, useValue: subscriptionService },
      ],
    }).compile();
    service = moduleRef.get(PaymentService);
  });

  function signed(p: Record<string, string>) {
    return { ...p, vnp_SecureHash: VnpayUtils.generateSignature(p, secret) };
  }

  it('rejects bad signature with 97', async () => {
    const r = await service.handleVnpayIpn({ vnp_TxnRef: 'X', vnp_SecureHash: 'BAD' });
    expect(r).toEqual({ RspCode: '97', Message: 'Invalid signature' });
  });

  it('returns 01 if order not found', async () => {
    db.paymentTransaction.findUnique.mockResolvedValue(null);
    const r = await service.handleVnpayIpn(signed({
      vnp_TxnRef: 'X', vnp_Amount: '10000', vnp_ResponseCode: '00', vnp_TransactionStatus: '00',
    }));
    expect(r.RspCode).toBe('01');
  });

  it('returns 04 on amount mismatch', async () => {
    db.paymentTransaction.findUnique.mockResolvedValue({
      idTransaction: 'p1', amount: 100, status: 'PENDING', packageType: 'CREDIT',
      idCreditPackage: 'pk1', idUser: 'u1',
    });
    const r = await service.handleVnpayIpn(signed({
      vnp_TxnRef: 'X', vnp_Amount: '99', vnp_ResponseCode: '00', vnp_TransactionStatus: '00',
    }));
    expect(r.RspCode).toBe('04');
    expect(creditsService.creditFromPayment).not.toHaveBeenCalled();
  });

  it('is idempotent — second SUCCESS callback returns 02', async () => {
    db.paymentTransaction.findUnique.mockResolvedValue({
      idTransaction: 'p1', amount: 100, status: 'SUCCESS', packageType: 'CREDIT',
      idCreditPackage: 'pk1', idUser: 'u1',
    });
    const r = await service.handleVnpayIpn(signed({
      vnp_TxnRef: 'X', vnp_Amount: '10000', vnp_ResponseCode: '00', vnp_TransactionStatus: '00',
    }));
    expect(r.RspCode).toBe('02');
    expect(creditsService.creditFromPayment).not.toHaveBeenCalled();
  });

  it('credits user on first successful CREDIT payment', async () => {
    db.paymentTransaction.findUnique.mockResolvedValue({
      idTransaction: 'p1', amount: 100, status: 'PENDING', packageType: 'CREDIT',
      idCreditPackage: 'pk1', idUser: 'u1',
    });
    const r = await service.handleVnpayIpn(signed({
      vnp_TxnRef: 'X', vnp_Amount: '10000', vnp_ResponseCode: '00', vnp_TransactionStatus: '00',
    }));
    expect(r.RspCode).toBe('00');
    expect(creditsService.creditFromPayment).toHaveBeenCalledTimes(1);
  });

  it('marks FAILED on non-00 response and does not provision', async () => {
    db.paymentTransaction.findUnique.mockResolvedValue({
      idTransaction: 'p1', amount: 100, status: 'PENDING', packageType: 'CREDIT',
      idCreditPackage: 'pk1', idUser: 'u1',
    });
    const r = await service.handleVnpayIpn(signed({
      vnp_TxnRef: 'X', vnp_Amount: '10000', vnp_ResponseCode: '24', vnp_TransactionStatus: '02',
    }));
    expect(r.RspCode).toBe('00');
    expect(creditsService.creditFromPayment).not.toHaveBeenCalled();
    expect(db.paymentTransaction.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'FAILED' }) }),
    );
  });
});
```

- [ ] **Step 5: Run all payment tests**

Run: `npm run test -- payment`
Expected: all suites green (utils + service).

- [ ] **Step 6: Commit**

```bash
git add src/module/payment src/module/credits/credits.service.ts src/module/subscription/subscription.service.ts
git commit -m "feat(payment): idempotent IPN handler with atomic provisioning"
```

---

## Task 7: Fix controller — IPN method, body shape, JSON return

**Files:**
- Modify: `src/module/payment/payment.controller.ts`
- Modify: `src/module/payment/dto/create-payment.dto.ts`

- [ ] **Step 1: Drop client-supplied `ipAddress` from DTO**

Replace `src/module/payment/dto/create-payment.dto.ts` with:

```typescript
import { IsUUID, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePaymentDto {
  @ApiProperty({ enum: ['CREDIT', 'SUBSCRIPTION'] })
  @IsIn(['CREDIT', 'SUBSCRIPTION'])
  packageType: 'CREDIT' | 'SUBSCRIPTION';

  @ApiProperty()
  @IsUUID()
  idPackage: string;
}
```

- [ ] **Step 2: Replace controller**

Replace `src/module/payment/payment.controller.ts` with:

```typescript
import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Request,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Public } from 'src/decorator/customize';
import { JwtAuthGuard } from 'src/auth/passport/jwt-auth.guard';
import { PaymentService } from './payment.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import type { Response } from 'express';

@ApiTags('payment')
@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  /**
   * Create a VNPay payment URL. Returns JSON; client navigates to `paymentUrl`.
   */
  @Post('vnpay/create')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async createPayment(@Request() req: any, @Body() dto: CreatePaymentDto) {
    const { userId } = req.user;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || '0.0.0.0';

    return this.paymentService.createPaymentUrl({
      idUser: userId,
      idPackage: dto.idPackage,
      packageType: dto.packageType,
      ipAddress,
    });
  }

  /**
   * Browser return URL. Display-only; provisioning happens in IPN.
   */
  @Public()
  @Get('vnpay/return')
  async vnpayReturn(@Query() query: Record<string, string>, @Res() res: Response) {
    const result = await this.paymentService.handleVnpayReturn(query);
    const frontend = process.env.FRONTEND_URL || '';
    if (result.success) {
      return res.redirect(`${frontend}/payment/success?ref=${result.vnpTxnRef}`);
    }
    return res.redirect(
      `${frontend}/payment/failed?msg=${encodeURIComponent(result.message)}`,
    );
  }

  /**
   * VNPay IPN (server-to-server, GET with query string).
   * Returns plain JSON `{RspCode, Message}` per VNPay spec.
   */
  @Public()
  @Get('vnpay/ipn')
  async vnpayIpn(@Query() query: Record<string, string>) {
    return this.paymentService.handleVnpayIpn(query);
  }
}
```

- [ ] **Step 3: Verify build + run end-to-end smoke**

Run: `npm run build`
Expected: success.

Run: `npm run start:dev`. In another shell:

```bash
curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:3000/payment/vnpay/ipn?vnp_TxnRef=NOTFOUND&vnp_SecureHash=BAD"
```
Expected: `200` (returns `{RspCode:'97'}`).

Stop the server.

- [ ] **Step 4: Commit**

```bash
git add src/module/payment
git commit -m "fix(payment): IPN as GET, drop client-supplied IP, JSON response on create"
```

---

## Task 8: Lock down `/credits/purchase` (remove the trust-based endpoint)

**Files:**
- Modify: `src/module/credits/credits.controller.ts`

- [ ] **Step 1: Remove the public `purchaseCredits` endpoint**

In `src/module/credits/credits.controller.ts`, delete the entire `@Post('purchase')` handler (the block under `// ===== User Routes =====` that contains `purchaseCredits`). Also remove its now-unused `PurchaseCreditsDto` import.

- [ ] **Step 2: Build + verify**

Run: `npm run build`
Expected: success.

- [ ] **Step 3: Manual sanity**

Run: `npm run start:dev`. Then:

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/credits/purchase \
  -H "Authorization: Bearer <any>" \
  -H "Content-Type: application/json" \
  -d '{"idPackage":"x","paymentRef":"y"}'
```
Expected: `404`.

- [ ] **Step 4: Commit**

```bash
git add src/module/credits/credits.controller.ts
git commit -m "fix(credits): remove unauthenticated purchase endpoint (replaced by /payment/vnpay/create)"
```

---

## Task 9: Make `SubscriptionController.subscribe` go through payment

**Files:**
- Modify: `src/module/subscription/subscription.controller.ts`
- Modify: `src/module/subscription/subscription.module.ts`

- [ ] **Step 1: Inject `PaymentService` into the controller**

Update `src/module/subscription/subscription.module.ts` to import `PaymentModule`. To avoid a circular import, use `forwardRef`:

```typescript
import { Module, forwardRef } from '@nestjs/common';
import { DatabaseModule } from 'src/database/database.module';
import { SubscriptionService } from './subscription.service';
import { SubscriptionController } from './subscription.controller';
import { PaymentModule } from '../payment/payment.module';

@Module({
  imports: [DatabaseModule, forwardRef(() => PaymentModule)],
  controllers: [SubscriptionController],
  providers: [SubscriptionService],
  exports: [SubscriptionService],
})
export class SubscriptionModule {}
```

And in `src/module/payment/payment.module.ts`, wrap the SubscriptionModule import:

```typescript
imports: [
  ConfigModule,
  DatabaseModule,
  CreditsModule,
  forwardRef(() => SubscriptionModule),
],
```

- [ ] **Step 2: Replace `subscribe` handler to redirect via payment**

In `src/module/subscription/subscription.controller.ts`, change the `subscribe` method:

```typescript
import { Inject, forwardRef } from '@nestjs/common';
import { PaymentService } from '../payment/payment.service';

// in constructor:
constructor(
  private readonly subscriptionService: SubscriptionService,
  @Inject(forwardRef(() => PaymentService))
  private readonly paymentService: PaymentService,
) {}

@Post('subscribe')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
async subscribe(@Request() req: any, @Body() dto: SubscribeDto) {
  const { userId } = req.user;
  const ipAddress = req.ip || '0.0.0.0';
  return this.paymentService.createPaymentUrl({
    idUser: userId,
    idPackage: dto.idPackage,
    packageType: 'SUBSCRIPTION',
    ipAddress,
  });
}
```

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: success, no circular DI errors at runtime.

- [ ] **Step 4: Commit**

```bash
git add src/module/subscription src/module/payment/payment.module.ts
git commit -m "fix(subscription): subscribe must go through VNPay payment"
```

---

## Task 10: End-to-end manual test against VNPay sandbox

This task is execution-only (no code changes). Mark each step as you complete it.

- [ ] **Step 1: Set sandbox credentials**

Edit `.env` (NOT `.env.example`):

```
VNPAY_TMN_CODE=<từ https://sandbox.vnpayment.vn/devreg/>
VNPAY_HASH_SECRET=<secret>
VNPAY_RETURN_URL=http://localhost:3000/payment/vnpay/return
VNPAY_IPN_URL=https://<ngrok>.ngrok.io/payment/vnpay/ipn
VNPAY_SANDBOX=true
FRONTEND_URL=http://localhost:5173
```

- [ ] **Step 2: Seed a credit package**

Run via psql or Prisma Studio (`npx prisma studio`) and insert one row:

```sql
INSERT INTO "CreditPackage" ("idPackage","name","creditAmount","price","isActive")
VALUES (gen_random_uuid(), 'Demo 10', 10, 50000, true);
```

Note the returned `idPackage`.

- [ ] **Step 3: Expose IPN with ngrok**

In a separate terminal:

```bash
ngrok http 3000
```

Copy the `https://...ngrok.io` URL into `VNPAY_IPN_URL` and restart the server.

- [ ] **Step 4: Start the API**

Run: `npm run start:dev`
Expected: no `VNPay env vars missing` error in logs.

- [ ] **Step 5: Login + create payment**

```bash
TOKEN=<JWT from /auth/login>
curl -X POST http://localhost:3000/payment/vnpay/create \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"packageType":"CREDIT","idPackage":"<uuid from step 2>"}'
```

Expected: JSON like `{ "paymentUrl": "https://sandbox.vnpayment.vn/...", "idTransaction": "...", "vnpTxnRef": "..." }`.

- [ ] **Step 6: Verify PENDING row**

In Prisma Studio (`npx prisma studio`), open `PaymentTransaction`. Confirm:
- one row with `status = PENDING`
- `vnpTxnRef` matches Step 5 response
- `amount = 50000`

- [ ] **Step 7: Pay in browser**

Open the `paymentUrl` in browser. Use the sandbox NCB test card:
- Card: `9704198526191432198`
- Name: `NGUYEN VAN A`
- Expiry: `07/15`
- OTP: `123456`

- [ ] **Step 8: Verify IPN provisioned**

After redirect, check Prisma Studio:
- `PaymentTransaction.status` = `SUCCESS`
- `idCreditTransaction` populated
- `paidAt` set

Check `CreditBalance` for your user → `totalCredits` increased by 10.

Check server logs for `IPN` activity (no errors).

- [ ] **Step 9: Test idempotency manually**

Re-trigger IPN (you can copy the IPN URL from VNPay's sandbox merchant dashboard or replay from logs). Server should respond `{RspCode:'02', Message:'Order already confirmed'}` and `CreditBalance` must NOT change.

- [ ] **Step 10: Test failure path**

Repeat Step 5 + Step 7 but in the VNPay UI click "Cancel" / use OTP `999999` (invalid). Confirm:
- `PaymentTransaction.status = FAILED`
- `errorMessage` populated
- `CreditBalance` NOT changed

- [ ] **Step 11: Document the run**

Append a short note (date, commits-tested, any anomaly) to `docs/superpowers/plans/2026-05-20-vnpay-payment-fixes.md` under a new `## Verification log` section at the bottom.

- [ ] **Step 12: Commit (only if you added the verification log)**

```bash
git add docs/superpowers/plans/2026-05-20-vnpay-payment-fixes.md
git commit -m "docs(payment): record sandbox verification run"
```

---

## Out of Scope (do NOT do in this plan)

- VNPay `queryTransaction` reconciliation cron (separate plan once core flow works).
- Auto-renew / recurring billing (`UserSubscription.nextBillingAt` cron).
- Refund flow (`PaymentStatus.REFUNDED` is in the schema but not exercised here).
- MoMo or Stripe wiring — the abstraction exists in the enum, but only VNPay path is implemented here.
- Frontend changes (`/payment/success`, `/payment/failed` pages).
- Production-grade webhook signing rotation, fraud rules, KYC.

## Risk Log

| Risk | Mitigation |
|---|---|
| Two IPN callbacks race on the same `vnpTxnRef` | `vnpTxnRef` is `@unique`; the SUCCESS branch reads-then-updates inside `$transaction`; the second one sees `status='SUCCESS'` and returns `02`. |
| `forwardRef` between `PaymentModule` ↔ `SubscriptionModule` causes runtime "cannot resolve" | Both modules use `forwardRef`; covered by `npm run build` + manual smoke (Task 7 Step 3, Task 9 Step 3). |
| Existing `purchaseCredits` callers break | Callers grep: only `CreditsController.purchaseCredits` referenced it; that endpoint is removed in Task 8. |
| Migration drops/renames a column → data loss | The migration is purely additive (`CREATE TABLE`, new enums, new optional FK columns). No `DROP`. |
| Server time drift breaks signature/expiry | `formatDate` now derives GMT+7 from epoch; doesn't depend on host TZ (Task 4). |
