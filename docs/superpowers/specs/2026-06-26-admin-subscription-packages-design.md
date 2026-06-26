# Admin: Subscription Package CRUD

**Date:** 2026-06-26
**Status:** Approved (pending plan)
**Scope:** BE (`ielts_training_app`) + FE (`IELTS-training-website`)

---

## 1. Goal

Add an admin page that lets an `ADMIN` user list, create, edit, toggle-active, and soft-delete `SubscriptionPackage` records. Today the BE only exposes `POST /subscriptions/packages` (admin-create) and `GET /subscriptions/packages` (public, active-only); there is no admin list, no update, and no delete. The FE has no admin subscription surface.

---

## 2. Non-goals (YAGNI)

- Hard delete of packages. Soft delete only (set `isActive=false`).
- Bulk import, package analytics, promo codes, MRR dashboards.
- Audit-log entries on package changes (no module hook today; future work).
- Admin top-nav link (current admin pages are reachable via direct URL, matching existing pattern).
- A11y review beyond antd defaults.

---

## 3. Backend changes (`ielts_training_app`)

### 3.1 DTO

**New** `src/module/subscription/dto/update-subscription-package.dto.ts`:

```ts
import { PartialType } from '@nestjs/swagger';
import { CreateSubscriptionPackageDto } from './create-subscription-package.dto';

export class UpdateSubscriptionPackageDto extends PartialType(CreateSubscriptionPackageDto) {}
```

`PartialType` makes every field optional while preserving validators (`@Min(0)` on `price` and `creditsQuota`, enum on `billingCycle`). `name` becomes optional on update.

### 3.2 Service additions

`SubscriptionService` gains:

```ts
async getAllPackagesAdmin() {
  return this.db.subscriptionPackage.findMany({
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
  });
}

async updatePackage(idPackage: string, dto: UpdateSubscriptionPackageDto) {
  const existing = await this.db.subscriptionPackage.findUnique({ where: { idPackage } });
  if (!existing) throw new NotFoundException('Subscription package not found');
  return this.db.subscriptionPackage.update({ where: { idPackage }, data: dto });
}

async setPackageActive(idPackage: string, isActive: boolean) {
  const existing = await this.db.subscriptionPackage.findUnique({ where: { idPackage } });
  if (!existing) throw new NotFoundException('Subscription package not found');
  return this.db.subscriptionPackage.update({
    where: { idPackage },
    data: { isActive },
  });
}
```

Notes:
- No DB migration. Prisma already has `isActive` on `SubscriptionPackage`.
- Unique constraint on `name` → Prisma throws `P2002`, which Nest maps to 500 by default. We accept this for now (a name collision is a programming error, not a runtime expectation). Future hardening: catch `P2002` and return 409 — flag for later.
- `getActivePackages()` (public) is untouched and continues to filter `isActive: true`.

### 3.3 Controller additions

Append to `subscription.controller.ts`:

```ts
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiBearerAuth()

@Get('admin/packages')
async listAllPackages() {
  return this.subscriptionService.getAllPackagesAdmin();
}

@Put('admin/packages/:idPackage')
async updatePackage(
  @Param('idPackage') idPackage: string,
  @Body() dto: UpdateSubscriptionPackageDto,
) {
  return this.subscriptionService.updatePackage(idPackage, dto);
}

@Patch('admin/packages/:idPackage/active')
async toggleActive(
  @Param('idPackage') idPackage: string,
  @Body('isActive') isActive: boolean,
) {
  return this.subscriptionService.setPackageActive(idPackage, !!isActive);
}

@Delete('admin/packages/:idPackage')
async deletePackage(@Param('idPackage') idPackage: string) {
  // Soft delete only — sets isActive=false.
  return this.subscriptionService.setPackageActive(idPackage, false);
}
```

Existing `POST /subscriptions/packages` (admin-create) and `POST /subscriptions/admin/grant` stay as-is.

---

## 4. Frontend changes (`IELTS-training-website`)

### 4.1 Service module

**New** `src/services/apiAdminSubscription.js`:

```js
import API from "./axios.custom";

export const adminListPackagesAPI = () =>
  API.get("/subscriptions/admin/packages").then((r) => r.data);

export const adminCreatePackageAPI = (payload) =>
  API.post("/subscriptions/packages", payload).then((r) => r.data);

export const adminUpdatePackageAPI = (idPackage, payload) =>
  API.put(`/subscriptions/admin/packages/${idPackage}`, payload).then((r) => r.data);

export const adminTogglePackageActiveAPI = (idPackage, isActive) =>
  API.patch(`/subscriptions/admin/packages/${idPackage}/active`, { isActive })
    .then((r) => r.data);

export const adminDeletePackageAPI = (idPackage) =>
  API.delete(`/subscriptions/admin/packages/${idPackage}`).then((r) => r.data);
```

Existing `apiSubscription.js` (user-facing reads + subscribe/cancel) is untouched.

### 4.2 Page

**New** `src/Pages/admin/adminSubscriptionPackages.jsx`:

- Fetches `adminListPackagesAPI` on mount into a `useState` array.
- antd `Table` with columns: name, billingCycle (Tag), price (formatted `Intl.NumberFormat('vi-VN')` VND), creditsQuota (number or "Không giới hạn" when 0), badge, isFeatured (Tag), isActive (Switch bound to `adminTogglePackageActiveAPI` with optimistic update + rollback), sortOrder, actions (Edit + Delete).
- "+ Thêm gói" header button opens Modal form.
- Modal form fields:
  - name (Input, required)
  - description (Input.TextArea, optional)
  - billingCycle (Select: MONTHLY / ANNUAL, required)
  - price (InputNumber with `formatter` showing "₫", required, min 0)
  - priceUnit (Input, default "VND", optional)
  - creditsQuota (InputNumber, helper text "0 = không giới hạn", min 0)
  - features (Select `mode="tags"` for live-tag input)
  - badge (Input optional)
  - isFeatured (Switch)
  - sortOrder (InputNumber optional)
- Edit button opens the same Modal pre-filled.
- Delete uses antd `Popconfirm` with text "Ngừng kích hoạt gói này?" — calls `adminDeletePackageAPI` (soft).
- Toasts on success/failure via `message` from antd, matching `adminUserList.jsx` pattern.
- Loading state while fetch is in flight.

Pattern follows `adminUserList.jsx`:
- Page owns state and fetch.
- API helpers are pure functions returning the response payload.
- `message` for user feedback; `console.error` for diagnostics.

### 4.3 Routing

In `src/main.jsx`, inside the `/admin` block (around line 161):

```jsx
const AdminSubscriptionPackages = lazy(() => import("./Pages/admin/adminSubscriptionPackages"));
// ...
{ path: "subscriptions", element: <LazyRoute Component={AdminSubscriptionPackages} /> },
```

Final URL: `/admin/subscriptions`. Page sits under the existing `<NavbarAdmin />` wrapper.

No changes to `navBarAdmin.jsx` — admin pages are reachable via direct URL like the existing teacher-review page.

---

## 5. Data flow

1. Page mount → `adminListPackagesAPI` → table populates.
2. Create → Modal submit → `adminCreatePackageAPI` → `fetchAll()` → table reload.
3. Edit → Modal submit → `adminUpdatePackageAPI` → `fetchAll()` → table reload.
4. Toggle Switch inline → `adminTogglePackageActiveAPI` → optimistic state update; rollback + error toast on failure.
5. Delete → `Popconfirm` confirm → `adminDeletePackageAPI` (BE sets `isActive=false`) → `fetchAll()` → table reload.

---

## 6. Error handling

- 401 / 403 — handled by existing `axios.custom` interceptor (token refresh + redirect).
- 404 (edit a stale id) — toast "Gói không tồn tại" + `fetchAll()` to refresh.
- 500 (DB unique violation on `name`) — toast "Tên gói đã tồn tại hoặc thao tác thất bại".
- Network/timeout — generic toast "Thao tác thất bại".

---

## 7. Testing

- **BE:** if a `subscription.service.spec.ts` exists, extend it with cases for `getAllPackagesAdmin` (includes inactive), `updatePackage` (404 on missing), `setPackageActive(false)` (subsequent `getActivePackages` excludes it). If absent, add one. Skip e2e — no subscription e2e harness in this project.
- **FE:** smoke check — page mounts under `/admin/subscriptions`, lists seed packages, create/edit/toggle/delete round-trips work in dev. No Jest setup exists for FE in this project.

---

## 8. File touch summary

**New files**
- `ielts_training_app/src/module/subscription/dto/update-subscription-package.dto.ts`
- `IELTS-training-website/src/services/apiAdminSubscription.js`
- `IELTS-training-website/src/Pages/admin/adminSubscriptionPackages.jsx`
- This spec doc

**Edited files**
- `ielts_training_app/src/module/subscription/subscription.service.ts` — add 3 methods.
- `ielts_training_app/src/module/subscription/subscription.controller.ts` — add 4 endpoints (admin block).
- `IELTS-training-website/src/main.jsx` — lazy import + route entry under `/admin`.

**Untouched (deliberate)**
- `apiSubscription.js` — user-facing reads stay separate.
- `navBarAdmin.jsx` — admin nav stays as-is.
- DB schema — no migration.