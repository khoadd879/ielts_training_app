# Admin Subscription Package CRUD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add admin endpoints + admin FE page to list, create, update, toggle-active, and soft-delete `SubscriptionPackage` records.

**Architecture:**
- BE adds 4 admin endpoints under `SubscriptionController` (GET all, PUT update, PATCH toggle-active, DELETE soft) plus 3 service methods + 1 DTO. Soft delete only (sets `isActive=false`). No DB migration.
- FE adds a new `/admin/subscriptions` page using antd `Table` + `Modal` form, following the `adminUserList.jsx` pattern. New service module `apiAdminSubscription.js`. New lazy import + route entry in `main.jsx`.

**Tech Stack:** NestJS 10 + Prisma 5 + class-validator, React + react-router-dom v6 + antd v5 + axios.

**Spec:** `docs/superpowers/specs/2026-06-26-admin-subscription-packages-design.md`

---

## File Structure

**New files**
- `ielts_training_app/src/module/subscription/dto/update-subscription-package.dto.ts` — DTO for PUT update (PartialType of Create).
- `IELTS-training-website/src/services/apiAdminSubscription.js` — 5 axios helpers for admin CRUD.
- `IELTS-training-website/src/Pages/admin/adminSubscriptionPackages.jsx` — admin page (Table + Modal form).

**Edited files**
- `ielts_training_app/src/module/subscription/subscription.service.ts` — add `getAllPackagesAdmin`, `updatePackage`, `setPackageActive`.
- `ielts_training_app/src/module/subscription/subscription.controller.ts` — add 4 admin endpoints.
- `IELTS-training-website/src/main.jsx` — lazy import + route under `/admin`.

**Untouched**
- `apiSubscription.js` — user-facing.
- `navBarAdmin.jsx` — admin nav stays as-is.
- DB schema — no migration.

---

## Task 1: Add `UpdateSubscriptionPackageDto`

**Files:**
- Create: `ielts_training_app/src/module/subscription/dto/update-subscription-package.dto.ts`

- [ ] **Step 1: Create the DTO file**

Write the file with this exact content:

```ts
import { PartialType } from '@nestjs/swagger';
import { CreateSubscriptionPackageDto } from './create-subscription-package.dto';

export class UpdateSubscriptionPackageDto extends PartialType(CreateSubscriptionPackageDto) {}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run from `ielts_training_app/`:

```bash
npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "update-subscription-package" || echo "OK"
```

Expected: `OK`.

- [ ] **Step 3: Commit**

```bash
cd /home/garan/code/doan1/ielts_training_app && git add src/module/subscription/dto/update-subscription-package.dto.ts && git commit -m "feat(subscription): add UpdateSubscriptionPackageDto"
```

---

## Task 2: Add admin service methods

**Files:**
- Modify: `ielts_training_app/src/module/subscription/subscription.service.ts:14-26` (insert new methods in the "Package Operations" section)

- [ ] **Step 1: Add new imports**

At the top of `subscription.service.ts`, the existing `NotFoundException` is already imported (line 3). Verify by reading the first 10 lines. No new import needed.

- [ ] **Step 2: Add 3 methods to the service**

After `createPackage` (line 26), insert the following block. Use `Edit` with the existing closing brace + blank line that follows `createPackage`:

```ts

  async getAllPackagesAdmin() {
    return this.db.subscriptionPackage.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async updatePackage(idPackage: string, dto: UpdateSubscriptionPackageDto) {
    const existing = await this.db.subscriptionPackage.findUnique({
      where: { idPackage },
    });
    if (!existing) {
      throw new NotFoundException('Subscription package not found');
    }
    return this.db.subscriptionPackage.update({
      where: { idPackage },
      data: dto,
    });
  }

  async setPackageActive(idPackage: string, isActive: boolean) {
    const existing = await this.db.subscriptionPackage.findUnique({
      where: { idPackage },
    });
    if (!existing) {
      throw new NotFoundException('Subscription package not found');
    }
    return this.db.subscriptionPackage.update({
      where: { idPackage },
      data: { isActive },
    });
  }
```

- [ ] **Step 3: Import the new DTO**

Edit `subscription.service.ts` top imports. Add this line after the existing `CreateSubscriptionPackageDto` import (or right above the class — there is currently no import for it in this file because `createPackage(dto: any)` is untyped). Insert just above the `@Injectable()` decorator:

```ts
import { UpdateSubscriptionPackageDto } from './dto/update-subscription-package.dto';
```

- [ ] **Step 4: TypeScript check**

```bash
cd /home/garan/code/doan1/ielts_training_app && npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "subscription\.service" || echo "OK"
```

Expected: `OK`.

- [ ] **Step 5: Commit**

```bash
cd /home/garan/code/doan1/ielts_training_app && git add src/module/subscription/subscription.service.ts && git commit -m "feat(subscription): add admin package service methods"
```

---

## Task 3: Add admin controller endpoints

**Files:**
- Modify: `ielts_training_app/src/module/subscription/subscription.controller.ts:1-26` (imports) and after line 119 (insert new admin endpoints)

- [ ] **Step 1: Update imports**

Edit the existing import block (lines 1-11) to add `Put` (already imported), `Patch`, `Delete`, `Param`. Final imports block:

```ts
import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  Inject,
  forwardRef,
} from '@nestjs/common';
```

- [ ] **Step 2: Import the new DTO**

After the existing `CreateSubscriptionPackageDto` import (line 24), add:

```ts
import { UpdateSubscriptionPackageDto } from './dto/update-subscription-package.dto';
```

- [ ] **Step 3: Insert admin endpoints before the closing brace**

Append a new admin block right before the closing `}` of the class (line 120). Find the existing admin `POST /packages` block end (line 105) and insert after the closing `}` of `createPackage`:

```ts

  // ===== Admin: List All Packages (incl. inactive) =====

  @Get('admin/packages')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  async listAllPackages() {
    return this.subscriptionService.getAllPackagesAdmin();
  }

  // ===== Admin: Update Package =====

  @Put('admin/packages/:idPackage')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  async updatePackage(
    @Param('idPackage') idPackage: string,
    @Body() dto: UpdateSubscriptionPackageDto,
  ) {
    return this.subscriptionService.updatePackage(idPackage, dto);
  }

  // ===== Admin: Toggle Active =====

  @Patch('admin/packages/:idPackage/active')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  async toggleActive(
    @Param('idPackage') idPackage: string,
    @Body('isActive') isActive: boolean,
  ) {
    return this.subscriptionService.setPackageActive(idPackage, !!isActive);
  }

  // ===== Admin: Soft Delete (set isActive=false) =====

  @Delete('admin/packages/:idPackage')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  async deletePackage(@Param('idPackage') idPackage: string) {
    return this.subscriptionService.setPackageActive(idPackage, false);
  }
```

- [ ] **Step 4: TypeScript check**

```bash
cd /home/garan/code/doan1/ielts_training_app && npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "subscription\.controller" || echo "OK"
```

Expected: `OK`.

- [ ] **Step 5: Commit**

```bash
cd /home/garan/code/doan1/ielts_training_app && git add src/module/subscription/subscription.controller.ts && git commit -m "feat(subscription): add admin CRUD endpoints"
```

---

## Task 4: Manual BE smoke check (dev server)

**Files:** none — verification only.

- [ ] **Step 1: Start backend in dev (if not already running)**

```bash
cd /home/garan/code/doan1/ielts_training_app && (pgrep -f "nest start" >/dev/null || (npm run start:dev > /tmp/be.log 2>&1 &))
sleep 8
curl -sS http://localhost:3000/subscriptions/packages | head -c 400
```

Expected: JSON array of active packages, e.g. `[{"idPackage":"...","name":"...","isActive":true,...}]`.

- [ ] **Step 2: Verify admin endpoints require auth (should 401 without token)**

```bash
curl -sS -o /dev/null -w "%{http_code}\n" http://localhost:3000/subscriptions/admin/packages
```

Expected: `401`.

- [ ] **Step 3: Stop background server (if we started it)**

```bash
pgrep -f "nest start" | xargs -r kill 2>/dev/null; echo "stopped"
```

Expected: `stopped`. Skip if server was already running.

(No commit — verification only.)

---

## Task 5: Create FE service module

**Files:**
- Create: `IELTS-training-website/src/services/apiAdminSubscription.js`

- [ ] **Step 1: Write the service file**

```js
import API from "./axios.custom";

export const adminListPackagesAPI = () =>
  API.get("/subscriptions/admin/packages").then((r) => r.data);

export const adminCreatePackageAPI = (payload) =>
  API.post("/subscriptions/packages", payload).then((r) => r.data);

export const adminUpdatePackageAPI = (idPackage, payload) =>
  API.put(`/subscriptions/admin/packages/${idPackage}`, payload).then(
    (r) => r.data
  );

export const adminTogglePackageActiveAPI = (idPackage, isActive) =>
  API.patch(
    `/subscriptions/admin/packages/${idPackage}/active`,
    { isActive }
  ).then((r) => r.data);

export const adminDeletePackageAPI = (idPackage) =>
  API.delete(`/subscriptions/admin/packages/${idPackage}`).then((r) => r.data);
```

- [ ] **Step 2: Verify axios.custom exists**

```bash
ls /home/garan/code/doan1/IELTS-training-website/src/services/axios.custom.js
```

Expected: file listed.

- [ ] **Step 3: Commit**

```bash
cd /home/garan/code/doan1/IELTS-training-website && git add src/services/apiAdminSubscription.js && git commit -m "feat(admin): add subscription package admin API client"
```

---

## Task 6: Create admin page

**Files:**
- Create: `IELTS-training-website/src/Pages/admin/adminSubscriptionPackages.jsx`

- [ ] **Step 1: Write the page file**

```jsx
import React, { useEffect, useState } from "react";
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Switch,
  Tag,
  Popconfirm,
  Space,
  message,
} from "antd";
import {
  adminListPackagesAPI,
  adminCreatePackageAPI,
  adminUpdatePackageAPI,
  adminTogglePackageActiveAPI,
  adminDeletePackageAPI,
} from "@/services/apiAdminSubscription";

const { TextArea } = Input;

const fmtPrice = (n) =>
  new Intl.NumberFormat("vi-VN").format(n ?? 0) + " ₫";

const AdminSubscriptionPackages = () => {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const fetchAll = async () => {
    setLoading(true);
    try {
      const res = await adminListPackagesAPI();
      const list = Array.isArray(res) ? res : res?.items ?? res?.data ?? [];
      setPackages(Array.isArray(list) ? list : []);
    } catch (e) {
      console.error("fetch packages failed", e);
      message.error("Không tải được danh sách gói");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({
      billingCycle: "MONTHLY",
      priceUnit: "VND",
      creditsQuota: 0,
      isFeatured: false,
      isActive: true,
      sortOrder: 0,
      features: [],
    });
    setModalOpen(true);
  };

  const openEdit = (record) => {
    setEditing(record);
    form.setFieldsValue({
      ...record,
      features: Array.isArray(record.features) ? record.features : [],
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editing) {
        await adminUpdatePackageAPI(editing.idPackage, values);
        message.success("Đã cập nhật gói");
      } else {
        await adminCreatePackageAPI(values);
        message.success("Đã tạo gói mới");
      }
      setModalOpen(false);
      fetchAll();
    } catch (e) {
      if (e?.errorFields) return; // validation error
      console.error(e);
      message.error("Lưu gói thất bại");
    }
  };

  const handleToggleActive = async (idPackage, next) => {
    const prev = packages;
    setPackages((p) =>
      p.map((it) => (it.idPackage === idPackage ? { ...it, isActive: next } : it))
    );
    try {
      await adminTogglePackageActiveAPI(idPackage, next);
      message.success(next ? "Đã kích hoạt" : "Đã ngừng kích hoạt");
    } catch (e) {
      console.error(e);
      message.error("Cập nhật trạng thái thất bại");
      setPackages(prev);
    }
  };

  const handleDelete = async (idPackage) => {
    try {
      await adminDeletePackageAPI(idPackage);
      message.success("Đã ngừng kích hoạt gói");
      fetchAll();
    } catch (e) {
      console.error(e);
      message.error("Xóa thất bại");
    }
  };

  const columns = [
    { title: "Tên", dataIndex: "name", key: "name" },
    {
      title: "Chu kỳ",
      dataIndex: "billingCycle",
      key: "billingCycle",
      render: (v) => (
        <Tag color={v === "ANNUAL" ? "purple" : "blue"}>{v}</Tag>
      ),
    },
    {
      title: "Giá",
      dataIndex: "price",
      key: "price",
      render: (v, r) => fmtPrice(v),
    },
    {
      title: "Credits",
      dataIndex: "creditsQuota",
      key: "creditsQuota",
      render: (v) => (v === 0 ? "Không giới hạn" : v),
    },
    {
      title: "Badge",
      dataIndex: "badge",
      key: "badge",
      render: (v) => (v ? <Tag color="gold">{v}</Tag> : "—"),
    },
    {
      title: "Nổi bật",
      dataIndex: "isFeatured",
      key: "isFeatured",
      render: (v) => (v ? <Tag color="magenta">Featured</Tag> : "—"),
    },
    {
      title: "Hoạt động",
      dataIndex: "isActive",
      key: "isActive",
      render: (v, r) => (
        <Switch
          checked={!!v}
          onChange={(next) => handleToggleActive(r.idPackage, next)}
        />
      ),
    },
    { title: "Thứ tự", dataIndex: "sortOrder", key: "sortOrder" },
    {
      title: "Hành động",
      key: "actions",
      render: (_, r) => (
        <Space>
          <Button size="small" onClick={() => openEdit(r)}>
            Sửa
          </Button>
          <Popconfirm
            title="Ngừng kích hoạt gói này?"
            okText="Ngừng"
            cancelText="Hủy"
            onConfirm={() => handleDelete(r.idPackage)}
          >
            <Button size="small" danger>
              Xóa
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <h2 style={{ margin: 0 }}>Quản lý gói đăng ký</h2>
        <Button type="primary" onClick={openCreate}>
          + Thêm gói
        </Button>
      </div>
      <Table
        rowKey="idPackage"
        loading={loading}
        dataSource={packages}
        columns={columns}
        pagination={{ pageSize: 10 }}
      />
      <Modal
        title={editing ? "Sửa gói đăng ký" : "Thêm gói đăng ký"}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        okText={editing ? "Lưu" : "Tạo"}
        cancelText="Hủy"
        width={720}
        destroyOnClose
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item label="Tên" name="name" rules={[{ required: true }]}>
            <Input placeholder="Monthly Pro" />
          </Form.Item>
          <Form.Item label="Mô tả" name="description">
            <TextArea rows={2} />
          </Form.Item>
          <Form.Item
            label="Chu kỳ"
            name="billingCycle"
            rules={[{ required: true }]}
          >
            <Select
              options={[
                { value: "MONTHLY", label: "Hàng tháng" },
                { value: "ANNUAL", label: "Hàng năm" },
              ]}
            />
          </Form.Item>
          <Form.Item label="Giá (VND)" name="price" rules={[{ required: true }]}>
            <InputNumber<number>
              min={0}
              style={{ width: "100%" }}
              formatter={(v) =>
                `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
              }
              parser={(v) => Number((v ?? "").replace(/,/g, ""))}
            />
          </Form.Item>
          <Form.Item label="Đơn vị giá" name="priceUnit">
            <Input placeholder="VND" />
          </Form.Item>
          <Form.Item
            label="Credits quota"
            name="creditsQuota"
            tooltip="0 = không giới hạn"
            rules={[{ required: true }]}
          >
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item label="Tính năng" name="features">
            <Select mode="tags" placeholder="Nhập và Enter" />
          </Form.Item>
          <Form.Item label="Badge" name="badge">
            <Input placeholder="Popular" />
          </Form.Item>
          <Form.Item label="Nổi bật" name="isFeatured" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item label="Thứ tự" name="sortOrder">
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AdminSubscriptionPackages;
```

- [ ] **Step 2: Vite check (no syntax errors)**

```bash
cd /home/garan/code/doan1/IELTS-training-website && npx vite build --mode development 2>&1 | tail -20
```

Expected: build completes (warnings OK, errors not).

If `vite build` is too heavy, fall back to:

```bash
cd /home/garan/code/doan1/IELTS-training-website && node --check src/Pages/admin/adminSubscriptionPackages.jsx 2>&1 || true
```

`node --check` will reject JSX; expected output is a parse error — that means the file parsed enough for `import` to be checked. Either result is acceptable; just confirm no "module not found" errors for `antd` or `@/services/apiAdminSubscription` (run the dev server instead if unsure — see Task 8).

- [ ] **Step 3: Commit**

```bash
cd /home/garan/code/doan1/IELTS-training-website && git add src/Pages/admin/adminSubscriptionPackages.jsx && git commit -m "feat(admin): add subscription package CRUD page"
```

---

## Task 7: Register route in main.jsx

**Files:**
- Modify: `IELTS-training-website/src/main.jsx:47-51` (add lazy import) and `main.jsx:161` (add route entry)

- [ ] **Step 1: Add lazy import**

Find the admin lazy-import block:

```jsx
const AdminDashboard = lazy(() => import("./Pages/admin/adminDashboard"));
const AdminUserList = lazy(() => import("./Pages/admin/adminUserList"));
// ...
const TeacherReviewManager = lazy(() => import("./Pages/admin/teacherReviewManager"));
```

Add a new line right after `AdminUserList`:

```jsx
const AdminSubscriptionPackages = lazy(() => import("./Pages/admin/adminSubscriptionPackages"));
```

- [ ] **Step 2: Add route entry**

Find this block inside the `/admin` router:

```jsx
{ path: "userList", element: <LazyRoute Component={AdminUserList} /> },
{ path: "moderation", element: <LazyRoute Component={ForumModeration} /> },
```

Add a new line right after the `userList` line:

```jsx
{ path: "subscriptions", element: <LazyRoute Component={AdminSubscriptionPackages} /> },
```

- [ ] **Step 3: Verify in dev**

```bash
cd /home/garan/code/doan1/IELTS-training-website && (pgrep -f "vite" >/dev/null || (npm run dev > /tmp/fe.log 2>&1 &))
sleep 6
curl -sS -o /dev/null -w "%{http_code}\n" http://localhost:3004/admin/subscriptions
```

Expected: `200` (or `304` if cached). If the dev server isn't on port 3004, check `/tmp/fe.log` for the actual port and re-test.

- [ ] **Step 4: Stop background dev server (if we started it)**

```bash
pgrep -f "vite" | xargs -r kill 2>/dev/null; echo "stopped"
```

Expected: `stopped`. Skip if server was already running.

- [ ] **Step 5: Commit**

```bash
cd /home/garan/code/doan1/IELTS-training-website && git add src/main.jsx && git commit -m "feat(admin): register /admin/subscriptions route"
```

---

## Task 8: End-to-end manual verification

**Files:** none.

- [ ] **Step 1: Start BE + FE**

```bash
cd /home/garan/code/doan1/ielts_training_app && (pgrep -f "nest start" >/dev/null || (npm run start:dev > /tmp/be.log 2>&1 &))
cd /home/garan/code/doan1/IELTS-training-website && (pgrep -f "vite" >/dev/null || (npm run dev > /tmp/fe.log 2>&1 &))
sleep 10
```

- [ ] **Step 2: Confirm dev URLs respond**

```bash
curl -sS -o /dev/null -w "BE: %{http_code}\n" http://localhost:3000/subscriptions/packages
curl -sS -o /dev/null -w "FE admin page: %{http_code}\n" http://localhost:3004/admin/subscriptions
```

Expected: `BE: 200`, `FE admin page: 200` (or 304).

- [ ] **Step 3: Manual browser smoke check**

In a browser logged in as admin:
1. Navigate to `http://localhost:3004/admin/subscriptions` → table loads with seed packages.
2. Click "+ Thêm gói" → fill form → submit → new row appears.
3. Click "Sửa" on a row → change price → save → row reflects new price.
4. Toggle the "Hoạt động" Switch → row updates + `GET /subscriptions/packages` (public) reflects change after refresh.
5. Click "Xóa" on a row → confirm Popconfirm → row's switch flips off.
6. Confirm no console errors (open DevTools console).

- [ ] **Step 4: Stop dev servers**

```bash
pgrep -f "nest start" | xargs -r kill 2>/dev/null
pgrep -f "vite" | xargs -r kill 2>/dev/null
echo "stopped"
```

Expected: `stopped`.

(No commit — verification only.)

---

## Self-Review

- **Spec coverage:** §3.1 DTO → Task 1. §3.2 service methods → Task 2. §3.3 controller endpoints → Task 3. §4.1 service module → Task 5. §4.2 page → Task 6. §4.3 routing → Task 7. §7 testing → Task 4 (BE smoke) + Task 8 (FE smoke).
- **Placeholder scan:** no TBD/TODO. All code blocks complete.
- **Type consistency:** `setPackageActive(idPackage, isActive)` used in service Task 2, controller Task 3 (toggleActive + deletePackage both call it). `UpdateSubscriptionPackageDto` defined Task 1, imported in service Task 2 step 3, used in controller Task 3. `apiAdminSubscription.js` exports (`adminListPackagesAPI`, `adminCreatePackageAPI`, `adminUpdatePackageAPI`, `adminTogglePackageActiveAPI`, `adminDeletePackageAPI`) match between Task 5 and Task 6 imports.