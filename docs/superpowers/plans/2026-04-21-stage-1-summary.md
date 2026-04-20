# Stage 1 Implementation Plan Summary

> **Priority Order:** Credits System → AI Grading Verification → Learning Plan API

---

## Overview

Stage 1 gồm 3 features chính:

1. **Credits System** - Kiểm soát chi phí AI grading, nền tảng monetization
2. **AI Grading Verification** - Đảm bảo contract đúng, FE gọi được
3. **Learning Plan API** - Dashboard AI suggestions, personalized roadmap

---

## Files Created

| File | Description |
|------|-------------|
| `docs/superpowers/plans/2026-04-21-credits-system.md` | Chi tiết 7 tasks, ~500 lines |
| `docs/superpowers/plans/2026-04-21-learning-plan-api.md` | Chi tiết 5 tasks, ~400 lines |
| `docs/superpowers/plans/2026-04-21-ai-grading-verification.md` | Chi tiết 5 tasks, ~200 lines |

---

## Recommended Execution Order

### Week 1: Credits System (Highest Priority)
**Lý do:** AI grading đã có, cần kiểm soát chi phí NGAY. Credits là nền tảng cho tất cả monetization features sau này.

**Effort:** ~4-6 hours
**Files changed:** 8-10 files
```
Task 1: Prisma schema - Add 3 models + enum
Task 2: Database service - Add model references
Task 3: Credits module/controller/service
Task 4: Integrate into writing submission
Task 5: Integrate into speaking submission
Task 6: Grading worker - Refund on failure
Task 7: Seed initial credit packages
```

### Week 2: AI Grading Verification
**Lý do:** Phát hiện contract mismatch trước khi FE tích hợp. Nếu có lỗi, fix sớm.

**Effort:** ~2-3 hours (mostly documentation)
**Files changed:** 2-3 files (documentation only unless issues found)
```
Task 1: Audit writing submission endpoint
Task 2: Audit speaking submission endpoint
Task 3: Check AI worker response format
Task 4: Document discrepancies (if any)
Task 5: Create API documentation summary
```

### Week 3: Learning Plan API
**Lý do:** Cần user data tích lũy để generate good plan. Chờ 1-2 weeks để có dữ liệu band scores.

**Effort:** ~4-6 hours
**Files changed:** 5-6 files
```
Task 1: Learning Plan Service - Core algorithm
Task 2: Learning Plan Controller
Task 3: Learning Plan Module
Task 4: Enhance recommend-test (optional)
Task 5: Add Dashboard endpoint for user progress
```

---

## Dependencies

```
Credits System
    ↓
    ├─→ AI Grading Verification (can run parallel)
    │
    └─→ Learning Plan API (can run parallel, uses CreditsService for future entitlement)
```

Credits System không blocking AI Grading Verification hay Learning Plan API về code, nhưng:
- Learning Plan API sẽ dùng `CreditsService` trong tương lai để check entitlement cho premium features
- AI Grading Verification nên chạy song song với Credits System

---

## What to Skip / Deprioritize

Based on the analysis, these features from the original plan are **NOT in Stage 1 scope:**

| Feature | Original Plan Section | Reason to Deprioritize |
|---------|----------------------|----------------------|
| Packages/Subscription pricing tiers | Giai đoạn 2 | Cần Credits System trước, có thể bắt đầu từ Week 4 |
| Payment gateway integration | Giai đoạn 2 | Stripe/VNPay cần business requirements rõ ràng |
| On-Demand Review Ticket System | Giai đoạn 3 | Teacher marketplace phức tạp, chỉ cần nếu muốn kết nối với giáo viên freelance |
| Teacher Queue / Workspace | Giai đoạn 3 | Phụ thuộc Ticket System |
| Teacher Earnings tracking | Giai đoạn 3 | Phụ thuộc Ticket System |
| Admin Control Panel (full) | Giai đoạn 4 | Basic admin dashboard đã có, mở rộng sau |
| Mobile optimization | Giai đoạn 4 | Responsive design đã có với Tailwind |
| KPI analytics dashboard | Giai đoạn 4 | Cần data tích lũy trước |

---

## Verification Commands

After implementing each plan, run these to verify:

**Credits System:**
```bash
# Check migration ran
npx prisma migrate status

# Check new tables exist
psql $DATABASE_URL -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'credit%';"

# Run seed
npm run db:seed

# Test balance endpoint
curl -X GET http://localhost:3000/credits/balance -H "Authorization: Bearer <token>"

# Test packages endpoint
curl -X GET http://localhost:3000/credits/packages -H "Authorization: Bearer <token>"
```

**AI Grading Verification:**
```bash
# Verify docs created
ls -la docs/api/writing-submission-contract.md
ls -la docs/api/speaking-submission-contract.md
ls -la docs/api/ai-grading-summary.md

# Run existing tests
npm test -- --testPathPattern="user-writing|user-speaking"
```

**Learning Plan API:**
```bash
# Test learning plan endpoint
curl -X GET http://localhost:3000/learning-plan -H "Authorization: Bearer <token>"

# Test user dashboard endpoint
curl -X GET http://localhost:3000/dashboard/user/<userId> -H "Authorization: Bearer <token>"
```

---

## Effort Summary

| Plan | Tasks | Est. Hours | Files |
|------|-------|------------|-------|
| Credits System | 7 | 4-6h | 8-10 |
| AI Grading Verification | 5 | 2-3h | 2-3 |
| Learning Plan API | 5 | 4-6h | 5-6 |
| **Total Stage 1** | **17** | **10-15h** | **15-19** |

---

## Next Steps (Stage 2 Preview)

After Stage 1 is complete, these can be tackled in Stage 2:

1. **Packages/Subscription + Pricing Tiers** - Extend Credits with subscription plans
2. **Payment Gateway Integration** - Stripe/VNPay for purchasing credits
3. **Entitlement Middleware** - Guard premium features based on package/credits

Stage 3 (Teacher Marketplace) can be planned later if there's demand.
