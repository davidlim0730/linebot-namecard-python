# Phase 4 CRM Completion Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete Phase 4 Conversational CRM by adding CRM navigation to BottomNav, setting up Cloud Scheduler on production, and verifying end-to-end acceptance criteria.

**Architecture:** All LIFF views (CrmInput, DealList, DealDetail, ActionList, ContactCrm, ManagerPipeline, ProductList) are already implemented. The only missing UI piece is a CRM tab in BottomNav — users currently have no way to navigate to CRM features from the main nav. Cloud Scheduler jobs need to be created on the production Cloud Run service.

**Tech Stack:** Vue 3 (no-build, ESM), FastAPI, Firebase RTDB, LINE Bot SDK, Google Cloud Scheduler

---

## Context (read before starting)

### Existing file structure
- `app/liff_app/components/BottomNav.js` — currently has 3 tabs: 名片(`#/`), 團隊(`#/team`), 設定(`#/settings`)
- `app/liff_app/app.js:145` — `showBottomNav` already includes CrmInput, DealList, ActionList, ManagerPipeline; `tab` is passed as `"crm"` for these routes
- `app/liff_app/app.js:29-38` — `parseRoute()` hash router; `/crm` → `{view:"CrmInput", tab:"crm"}`, `/deals` → `{view:"DealList", tab:"crm"}`, `/actions` → `{view:"ActionList", tab:"cards"}`
- `scripts/setup_scheduler.sh` — already written; takes `PROJECT_ID`, `SERVICE_URL`, `REGION`, `SA_EMAIL` env vars
- `app/api/internal.py` — `/internal/push-action-reminders` and `/internal/push-weekly-summary` endpoints exist

### Production env
- Project: `linebot-namecard-488409`
- Service URL: `https://linebot-namecard-prod-572410685034.asia-east1.run.app`
- Region: `asia-east1`

---

## Task 1: Add CRM Tab to BottomNav

**Files:**
- Modify: `app/liff_app/components/BottomNav.js`

Current BottomNav has: 名片 / 團隊 / 設定

New BottomNav: 名片 / **CRM** / 團隊 / 設定

- [ ] **Step 1: Verify current BottomNav**

Read `app/liff_app/components/BottomNav.js` — confirm it uses `template:` string with `v-for` over `tabs` array.

- [ ] **Step 2: Add CRM tab to BottomNav**

Replace `app/liff_app/components/BottomNav.js` with:

```javascript
// BottomNav.js — Navigation component with 4 tabs (Cards, CRM, Team, Settings)
import { defineComponent } from "https://unpkg.com/vue@3/dist/vue.esm-browser.js";

export default defineComponent({
  name: "BottomNav",
  props: {
    currentTab: {
      type: String,
      default: "cards"  // 'cards', 'crm', 'team', 'settings'
    }
  },
  setup(props) {
    const tabs = [
      { id: "cards",    label: "名片", icon: "🗂️", path: "#/" },
      { id: "crm",      label: "CRM",  icon: "📊", path: "#/crm" },
      { id: "team",     label: "團隊", icon: "👥", path: "#/team" },
      { id: "settings", label: "設定", icon: "⚙️", path: "#/settings" },
    ];

    return { tabs };
  },
  template: `
    <nav class="bottom-nav">
      <a
        v-for="tab in tabs"
        :key="tab.id"
        :href="tab.path"
        class="bottom-nav-item"
        :class="{ active: currentTab === tab.id }"
      >
        <div class="bottom-nav-item-icon">{{ tab.icon }}</div>
        <div class="bottom-nav-item-label">{{ tab.label }}</div>
      </a>
    </nav>
  `
});
```

- [ ] **Step 3: Verify app.js routes already pass correct tab**

Open `app/liff_app/app.js` lines 29-38. Confirm:
- `#/crm` → `{view:"CrmInput", tab:"crm"}` ✓
- `#/deals` → `{view:"DealList", tab:"crm"}` ✓
- `#/actions` → `{view:"ActionList", tab:"cards"}` (待辦歸 cards tab — acceptable)

No changes needed to app.js.

- [ ] **Step 4: Manual smoke test**

Open `https://liff.line.me/{LIFF_ID}` in LINE. Confirm:
1. BottomNav shows 4 tabs: 名片 / CRM / 團隊 / 設定
2. Tapping CRM → navigates to `#/crm` (CrmInput view)
3. Active tab highlight follows navigation

- [ ] **Step 5: Commit**

```bash
git add app/liff_app/components/BottomNav.js
git commit -m "feat(liff): add CRM tab to BottomNav for Phase 4 navigation"
```

---

## Task 2: Set Up Cloud Scheduler on Production

**Files:**
- Read-only: `scripts/setup_scheduler.sh`

- [ ] **Step 1: Check if scheduler jobs already exist**

```bash
gcloud scheduler jobs list \
  --project=linebot-namecard-488409 \
  --location=asia-east1 \
  2>&1
```

Expected: either empty list or jobs `crm-push-action-reminders` / `crm-push-weekly-summary`.

If jobs already exist and look correct, skip to Step 4.

- [ ] **Step 2: Run setup_scheduler.sh**

```bash
PROJECT_ID=linebot-namecard-488409 \
SERVICE_URL=https://linebot-namecard-prod-572410685034.asia-east1.run.app \
REGION=asia-east1 \
bash scripts/setup_scheduler.sh
```

Expected output:
```
Setting up Cloud Scheduler in project=linebot-namecard-488409, region=asia-east1
✅ crm-push-action-reminders: created/updated
✅ crm-push-weekly-summary: created/updated
```

- [ ] **Step 3: Verify jobs created**

```bash
gcloud scheduler jobs list \
  --project=linebot-namecard-488409 \
  --location=asia-east1
```

Expected: two jobs visible with schedules `0 9 * * *` and `0 18 * * 5`.

- [ ] **Step 4: Manual trigger test**

```bash
gcloud scheduler jobs run crm-push-action-reminders \
  --project=linebot-namecard-488409 \
  --location=asia-east1
```

Check Cloud Run logs for the invocation:
```bash
gcloud logging read \
  'resource.type="cloud_run_revision" AND resource.labels.service_name="linebot-namecard-prod" AND textPayload:"push-action-reminders"' \
  --project=linebot-namecard-488409 \
  --limit=5 \
  --format="value(textPayload)"
```

Expected: log line showing `push_action_reminders` was called (even if 0 actions sent).

---

## Task 3: E2E Acceptance Verification

This task verifies all Phase 4 acceptance criteria. No code changes — pure verification.

**Files:**
- No changes

- [ ] **Step 1: Verify CrmInput → confirm flow**

In LINE, send: `「今天拜訪ABC公司的王總，談產品報價，下週跟進」`
→ LINE Bot should NOT handle this (it's sent via LIFF, not chat)

Instead open LIFF `#/crm`, type the same text, tap 分析.
Expected:
- NLU 解析結果顯示 pipeline + action
- 確認後 Firebase `deals/{org_id}/` and `actions/{org_id}/` have new records

- [ ] **Step 2: Verify LINE Chat 「查王總」**

In LINE chat, send: `查 王總`
Expected: LINE Bot replies with Contact name + latest deal status Flex Message.
(Handler: `app/line_handlers.py` line 652 → `handle_crm_query`)

- [ ] **Step 3: Verify LINE Chat 「我的待辦」**

In LINE chat, send: `我的待辦`
Expected: LINE Bot replies with today's due actions list.

- [ ] **Step 4: Verify LINE Chat 「pipeline」 (admin only)**

In LINE chat with admin account, send: `pipeline`
Expected: stage breakdown summary + LIFF link.

- [ ] **Step 5: Verify ManagerPipeline LIFF (admin)**

Open LIFF `#/pipeline` with admin token.
Expected: pipeline stage bar chart + overdue actions + members visible.

Open same with non-admin token.
Expected: `❌ 僅限主管查看`

- [ ] **Step 6: Regression — namecard features**

Test these existing features still work:
1. Send image → OCR scan → card saved
2. `查 [name]` with a known namecard contact → returns card detail
3. CSV export (「匯出」)

- [ ] **Step 7: Update roadmap Phase 4 status**

In `docs/product/00_strategy/roadmap.md`, change Phase 4 LIFF Frontend items to `[x]`:

```markdown
- [x] **CrmInput**：意識流輸入 → NLU 預覽 → 確認寫入（`#/crm`）
- [x] **DealList / DealDetail**：Pipeline Kanban + 案件詳情 + Stakeholders（`#/deals`）
- [x] **ActionList**：今日 / 本週 / 全部待辦，一鍵完成（`#/actions`）
- [x] **ContactCrm**：聯絡人 CRM 視角（deals + activities timeline）（`#/contacts/:id/crm`）
- [x] **ManagerPipeline**：主管 team pipeline 儀表板（`#/pipeline`，admin only）
- [x] **ProductList**：產品線管理（`#/products`，admin only）
```

Update Phase 4 status line:

```markdown
**狀態**：✅ 完成
```

- [ ] **Step 8: Commit roadmap update**

```bash
git add docs/product/00_strategy/roadmap.md
git commit -m "docs: mark Phase 4 LIFF frontend complete"
```

---

## Summary of Changes

| File | Change |
|------|--------|
| `app/liff_app/components/BottomNav.js` | Add CRM tab (4th tab, `📊 CRM → #/crm`) |
| `docs/product/00_strategy/roadmap.md` | Mark Phase 4 LIFF items as complete |
| Cloud Scheduler (infra) | Create 2 jobs on production project |
