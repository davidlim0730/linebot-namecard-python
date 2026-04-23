# 桌面版 CRM 後台 — 設計規格（MVP）

**日期**：2026-04-17
**狀態**：Spec（待實作計畫）
**作者**：David Lin
**相關文件**：
- [評估文件](../../product/01_features/desktop-crm-admin/evaluation.md)（路線選擇 C'）
- [PRD conversational-crm](../../product/01_features/conversational-crm/prd.md)（資料模型與 API）

---

## 1. 目標

為業務執行者提供桌面網頁版 CRM 後台，在大螢幕把 LINE 收集的名片與對話轉化為 Kanban 案件並推進階段。完全沿用現有 FastAPI + Firebase 後端，LIFF 與 LINE Bot 不受影響。

### 成功標準
- 業務人員可以在桌面瀏覽器登入（LINE Login），看到自己的 Deal Kanban
- 可以在 Kanban 上拖曳卡片改變 stage
- 可以點開 Deal 看完整詳情 + Activity Timeline
- 可以在桌面用意識流 NLU 輸入新互動（全域 + Deal 內 in-context 兩個入口）
- 可以瀏覽 / 搜尋 / inline 編輯 Contact Table

### 非目標（Phase 2 再做）
- Pipeline Dashboard（主管報表）
- Product 管理
- Action List 獨立頁面（MVP 只在 Deal Detail 內顯示相關 actions）
- Custom fields / 自訂欄位
- Cmd+K command bar
- Contact Detail 獨立頁（MVP 用 drawer）

---

## 2. 技術棧

### Frontend
| 項目 | 選擇 | 理由 |
|---|---|---|
| Build | **Vite 5 + React 18 + TypeScript** | 快速 HMR、SPA bundle 容易 static serve |
| Router | **React Router v6** | 成熟穩定，MVP 不需要 file-based routing |
| Data fetching | **TanStack Query v5** | cache + stale-while-revalidate + 樂觀更新 |
| State | **Zustand** | 輕量，適合 auth / UI state |
| Styling | **Tailwind CSS v3** | Utility-first，solo dev 速度最快，與 Twenty 視覺哲學一致 |
| Table | **TanStack Table v8** | Headless，支援 sort / filter / inline edit |
| Drag-drop | **@hello-pangea/dnd** | `react-beautiful-dnd` 維護分支，Kanban 業界標配 |
| Form | **react-hook-form + zod** | 型別安全、錯誤處理好 |
| Date | **dayjs** | 2kb，處理 YYYY-MM-DD 與 relative time |
| Icons | **lucide-react** | 開源、style 一致 |

### Backend（既有，無需改動核心）
- FastAPI（新增 `/admin/` static mount + catch-all、`/api/auth/line-login/*` endpoints）
- Firebase Realtime DB（不動）
- 現有 `/api/v1/...` CRM REST endpoints（**無需改動**）

### 部署
- **同既有 Cloud Run 服務**（`linebot-namecard-python`）
- `/liff/` 繼續跑 Vue LIFF
- `/admin/` 新增 React SPA static
- `/api/` 繼續跑 REST API

---

## 3. 系統架構

```
                           Cloud Run (既有)
                    ┌──────────────────────────────┐
Desktop Browser ────►  FastAPI (app/main.py)       │
                    │  ├─ /liff/ (StaticFiles)     │ ← 現有 Vue
                    │  ├─ /admin/ (StaticFiles)    │ ← 新增 React
                    │  │   + catch-all → index.html│
                    │  ├─ /api/v1/* (既有 CRM)     │ ← 無需改
                    │  └─ /api/auth/line-login/*   │ ← 新增
                    │       ├─ authorize           │
                    │       ├─ callback            │
                    │       ├─ me                  │
                    │       └─ refresh             │
                    └──────────────────────────────┘
                           │
                           ▼
                    Firebase Realtime DB
                    (namecard / contacts / deals / ...)
```

---

## 4. 認證流程（LINE Login OAuth2）

### 建立 LINE Login Channel
1. LINE Developers Console 新建「LINE Login Channel」（與現有 LIFF Channel 並存）
2. Callback URL：`https://<cloud-run-url>/api/auth/line-login/callback`
3. Scopes：`profile`、`openid`（不需 email）
4. Channel ID / Secret 設為 env var：`LINE_LOGIN_CHANNEL_ID`、`LINE_LOGIN_CHANNEL_SECRET`

### 流程

```
1. 使用者開 /admin/ → React 檢查記憶體 JWT
     ├─ 有  → 直接進 /admin/deals
     └─ 無  → 呼叫 /api/auth/me（帶 HttpOnly cookie）
              ├─ cookie 有效 → 回 {access_token, user} → 進 /admin/deals
              └─ cookie 無效 → 301 /admin/login

2. /admin/login → 「以 LINE 登入」按鈕
     └─ 點擊 → GET /api/auth/line-login/authorize
          - 後端產生 state = secrets.token_urlsafe(32)
          - 存入短效 HttpOnly cookie `line_login_state`（5 min TTL）
          - 301 → https://access.line.me/oauth2/v2.1/authorize?
                  response_type=code
                  &client_id=LINE_LOGIN_CHANNEL_ID
                  &redirect_uri=<callback_url>
                  &state=<state>
                  &scope=profile+openid

3. LINE 登入完成 → GET /api/auth/line-login/callback?code=<>&state=<>
     - 比對 cookie state vs query state（不符 → 400 CSRF）
     - 清除 state cookie
     - POST access.line.me/oauth2/v2.1/token 交換 id_token
     - Verify id_token（簽章 + aud + iss + exp）
     - 拿 sub（LINE userId） + name
     - ensure_user_org(userId) → 自動建立個人 org（沿用現有邏輯）
     - 發 JWT（sub=userId, org_id, role, exp=2h）
     - 發 refresh token（exp=30d）
     - Set-Cookie: admin_refresh=<refresh>; HttpOnly; Secure; SameSite=Lax
     - 301 → /admin/auth-callback#access_token=<jwt>

4. /admin/auth-callback 頁面 → 讀 URL fragment → 存入 Zustand → 清 URL → 301 /admin/deals

5. 所有 /api/v1/* 呼叫都帶 Authorization: Bearer <access_token>
     - 現有 auth middleware 驗 JWT（與 LIFF 共用）

6. Silent refresh
   - React interceptor 在 access_token 過期前 5 min 呼叫 POST /api/auth/refresh
   - 後端讀 admin_refresh cookie → 驗 → 發新 access_token（不動 refresh）
   - refresh cookie 過期 → 401 → React 導回 /admin/login
```

### 安全注意（同事建議三點全部實作）
1. **State CSRF**：`secrets.token_urlsafe(32)`，存 HttpOnly cookie，callback 比對
2. **Token 儲存**：access_token **只存 Zustand 記憶體**（頁面 reload 丟失會觸發 refresh 流程重新取得）；refresh_token 只存 HttpOnly cookie；**完全不碰 localStorage**
3. **SPA catch-all**：FastAPI 加 `@app.get("/admin/{full_path:path}")`，找不到實體檔案回 index.html

---

## 5. Frontend 架構

### 目錄結構

```
app/admin_app/           # 放在既有 repo 下，不另開 repo
├── index.html
├── vite.config.ts
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── src/
│   ├── main.tsx          # React entry
│   ├── App.tsx           # Router
│   ├── api/              # REST client + TanStack Query hooks
│   │   ├── client.ts     # fetch wrapper + auth interceptor
│   │   ├── auth.ts       # login / me / refresh
│   │   ├── deals.ts      # listDeals, getDeal, updateDeal, ...
│   │   ├── contacts.ts
│   │   ├── activities.ts
│   │   └── actions.ts
│   ├── auth/
│   │   ├── AuthStore.ts  # Zustand auth state
│   │   ├── useAuth.ts
│   │   └── AuthGuard.tsx # <Route> wrapper
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppShell.tsx   # Sidebar + Header + Outlet
│   │   │   ├── Sidebar.tsx
│   │   │   └── Header.tsx
│   │   └── common/             # Button, Modal, Drawer, Avatar, ...
│   ├── pages/
│   │   ├── Login.tsx
│   │   ├── AuthCallback.tsx
│   │   ├── DealsKanban.tsx     # 首頁 (/admin/deals)
│   │   ├── DealDetail.tsx      # /admin/deals/:id
│   │   ├── ContactsTable.tsx   # /admin/contacts
│   │   └── NotFound.tsx
│   ├── features/               # 領域特定 component
│   │   ├── deal/
│   │   │   ├── DealKanban.tsx
│   │   │   ├── DealCard.tsx
│   │   │   ├── DealStageTabs.tsx     # 活躍 / 成交 / 失敗
│   │   │   ├── DealPropertiesPanel.tsx
│   │   │   ├── ActivityTimeline.tsx
│   │   │   ├── StakeholderList.tsx
│   │   │   └── DealActionsTab.tsx
│   │   ├── contact/
│   │   │   ├── ContactTable.tsx
│   │   │   └── ContactDrawer.tsx
│   │   └── nlu/
│   │       ├── NluInputModal.tsx     # 全域意識流輸入
│   │       └── NluInlineInput.tsx    # Deal Detail 內 in-context
│   └── constants/
│       └── stages.ts
└── dist/                # build output → FastAPI 掛 /admin/
```

### 路由

| Path | Component | 需認證 |
|---|---|---|
| `/admin/login` | Login | ❌ |
| `/admin/auth-callback` | AuthCallback | ❌ |
| `/admin/` | → redirect `/admin/deals` | ✅ |
| `/admin/deals` | DealsKanban（首頁） | ✅ |
| `/admin/deals/:id` | DealDetail | ✅ |
| `/admin/contacts` | ContactsTable | ✅ |
| `/admin/*` | NotFound | ✅ |

---

## 6. 頁面設計

### 6.1 Layout（AppShell）

- **Sidebar**（左側 220px）：Logo / 📊 案件（active） / 👥 聯絡人 / 分隔線 / Settings / Logout
- **Header**（上方 56px）：
  - 左：頁面 title + breadcrumb
  - 右：`+ 意識流輸入`（綠色 primary button，點擊開 NluInputModal）/ 使用者 avatar（點擊彈出選單含 Logout）
- **Main**：`<Outlet>`，上下捲動

### 6.2 Deals Kanban（`/admin/deals`）

#### 結構
```
[Tab: 活躍 (12) | ✅ 成交 (8) | ❌ 失敗 (3)]
────────────────────────────────────────────────────────
[洽詢 3]  [報價 2]  [提案 1]  [評估 2]  [談判 1]  [決策 0]  [簽約 0]
 ┌──┐    ┌──┐    ┌──┐    ┌──┐
 │卡│    │卡│    │卡│    │卡│
 └──┘    └──┘    └──┘    └──┘
 ┌──┐    ┌──┐            ┌──┐
 │卡│    │卡│            │卡│
 └──┘    └──┘            └──┘
```

- **活躍 Tab**：Kanban，7 欄等寬，drag-drop 切換 stage
- **成交 / 失敗 Tab**：List 視圖（按 updated_at 遞減），卡片可拖回活躍欄（需確認 dialog）
- **空欄 placeholder**：顯示「拖曳卡片到此」+ 虛線邊框

#### Deal Card（Standard 密度）
```
┌─────────────────────────┐ ← 左 3px accent border（stage 顏色）
│ 台積電 - Pro 方案        │
│ NT$ 500,000             │
│ 📅 4/23（6 天）    🟢 D │ ← 日期 / 負責人 avatar
└─────────────────────────┘
```
- Title：`entity_name`（若有 `product_id` 就加「 - {product.name}」）
- Value：`NT$ {est_value.toLocaleString()}` 或「未估金額」
- Next action date：YYYY/MM/DD + 距今天數；**逾期顯示紅色 + 警告 icon**
- Owner：`added_by` 對應 LINE 顯示名稱首字 avatar（背景色 hash from user_id）
- Click → `/admin/deals/:id`
- Drag → drop 到另一欄時：`PUT /api/v1/deals/:id { stage: new_stage }` + 樂觀更新 + 成功 toast

### 6.3 Deal Detail（`/admin/deals/:id`）

#### 結構（兩欄）
```
Header: Breadcrumb + Deal Title + Stage badge

┌─────────────────────┐ ┌──────────────────────────────────┐
│ 📝 屬性              │ │ [💬 Timeline | ✅ Actions (2)]   │
│ Company: 台積電       │ │ ─────────────────────────────    │
│ Stage:   提案 ▾      │ │ [➕ 新增 activity（意識流）]     │
│ Amount:  500K ✏️     │ │                                   │
│ Next:    4/23        │ │ ● 見面 · Positive (2h 前)        │
│ Owner:   David       │ │   王總同意評估，下週三前需報價     │
│                     │ │                                   │
│ 👥 Stakeholders (3) │ │ ● Stage 變更 (昨天)              │
│ 王總 · Champion      │ │   評估 → 提案                    │
│ 李協理 · DM          │ │                                   │
│ + 新增              │ │ ● 電話 · Neutral (3 天前)         │
└─────────────────────┘ └──────────────────────────────────┘
```

#### 左欄：DealPropertiesPanel
- 每列：Label + Value（hover 顯示 ✏️，click → inline edit）
- **可 inline edit 欄位**：`entity_name`、`est_value`、`next_action_date`、`status_summary`、`product_id`（dropdown）
- **Stage**：dropdown 切換（等同於 Kanban 拖曳效果）
- **Company/POC/Contract Contact FK**：MVP 顯示名稱但不可在這裡改（改用 Stakeholder 流程）
- **Stakeholders**：列表 + 「+ 新增」→ Modal（name / title / role / attitude / link to contact）

#### 右欄：Tabs
- **Timeline Tab**（預設）
  - 最上方：`[➕ 新增 activity（意識流）]` 按鈕 → 展開 NluInlineInput（預填 `contact_id=deal.company_contact_id`、`entity_name=deal.entity_name`）
  - 時間序列（新 → 舊）三種事件：
    - **Activity**（`activity_repo.list_by_deal`）：左 accent color 3px、raw_transcript + ai_key_insights bullet + sentiment icon + 時間 + 作者
    - **Stage Change**（`stage_change_events`）：系統灰色事件
    - **Action 完成**（option，有 activity_id 關聯就顯示）
- **Actions Tab**（計數 badge）
  - List of actions `action_repo.list_by_deal` filter status
  - 每行：checkbox（切換 pending/completed）+ task_detail + due_date
  - 最上方：「+ 新增待辦」→ 小 form

### 6.4 Contacts Table（`/admin/contacts`）

#### 結構
```
[🔍 搜尋 display_name / email / phone ...]  [Filter: 類型▾] [Tag▾]  [+ 新增聯絡人]
─────────────────────────────────────────────────────────────
┌───────────────────────────────────────────────────────────┐
│ 顯示名稱      類型    職稱     公司       電話      更新日 │
├───────────────────────────────────────────────────────────┤
│ 王大明        Person 業務總監  台積電    0912...   4/17   │ ← click 開 drawer
│ 台積電        Company                              4/16   │
│ 李協理        Person 採購經理  日月光    0938...   4/15   │
└───────────────────────────────────────────────────────────┘
```

#### 欄位
- `display_name`（若 contact_type=person，加小字 title）
- `contact_type`（badge: Person / Company）
- `title`
- `company`（若 contact_type=person → 顯示 `parent_company_id` 對應的 display_name）
- `phone`（优先 mobile → phone）
- `email`
- `updated_at`（相對時間）

#### 互動
- **搜尋**：前端 filter `display_name` / `legal_name` / `aliases` / `email` / `phone`（資料量不大，不需後端分頁）
- **Filter**：contact_type（all / company / person）
- **Inline edit**：click 欄位 → textarea 顯示 → Enter / blur 儲存 → `PUT /api/v1/contacts/:id`
  - 可編輯：`display_name`、`title`、`phone`、`mobile`、`email`、`memo`
  - 不可編輯：`contact_type`、`parent_company_id`、`aliases`（MVP 外）
- **Row click**：開右側 Drawer 顯示：
  - 基本資訊
  - Deals（`deal_repo.list_by_company_contact_id`）
  - Activities（`activity_repo.list_by_contact_id`，限 10 筆）
  - CTA：「在新分頁開 Deal 詳情」
- **「+ 新增聯絡人」**：Modal，必填 `display_name` + `contact_type`

### 6.5 NLU 意識流輸入

#### 全域 Modal（Header + 按鈕）
- 彈出置中 640px Modal
- 結構：
  - textarea（autofocus、10 行）
  - `🔍 分析` button → `POST /api/v1/crm/parse`（無 context_hint）
  - 預覽：案件 / 互動 / 待辦 卡片
  - `✅ 確認` button → `POST /api/v1/crm/confirm`
  - 成功後 toast + close

#### Deal Detail 內 in-context 輸入（`NluInlineInput`）
- 在 Timeline Tab 頂端展開區塊（類似 Twitter 新推文框）
- 預填 `contextHint`：
  ```ts
  const contextHint = {
    contact_name: deal.company_contact?.display_name,
    entity_name:  deal.entity_name,
    contact_id:   deal.company_contact_id,
  };
  ```
- textarea + 「解析」button → parse with context hint → preview → confirm
- 成功後：Timeline 自動 invalidate refetch、toast「已加入 activity」

---

## 7. API 使用清單（無需新增 REST endpoint）

| Method | Path | 用途 |
|---|---|---|
| POST | `/api/auth/line-login/authorize` | **新增** — 產 state + redirect LINE |
| GET | `/api/auth/line-login/callback` | **新增** — 交換 token + 發 JWT |
| GET | `/api/auth/me` | **新增** — bootstrap（cookie-auth） |
| POST | `/api/auth/refresh` | **新增** — silent refresh |
| POST | `/api/auth/logout` | **新增** — 清 cookie |
| GET | `/api/v1/deals` | Kanban 列表 |
| GET | `/api/v1/deals/:id` | Deal Detail 基本資料 |
| PUT | `/api/v1/deals/:id` | 改 stage / 欄位 |
| GET | `/api/v1/deals/:id/activities` | Timeline |
| GET | `/api/v1/deals/:id/stakeholders` | Stakeholder 列表 |
| POST | `/api/v1/deals/:id/stakeholders` | 新增 |
| GET | `/api/v1/contacts` | Contact Table（**目前沒有這個 endpoint**，需新增） |
| GET | `/api/v1/contacts/:id` | Contact Drawer（**需確認是否存在**） |
| PUT | `/api/v1/contacts/:id` | Inline edit（**需確認是否存在**） |
| GET | `/api/v1/contacts/:id/activities` | Drawer |
| GET | `/api/v1/contacts/:id/crm` | Drawer（現有） |
| POST | `/api/v1/crm/parse` | NLU 解析 |
| POST | `/api/v1/crm/confirm` | NLU 寫入 |
| GET | `/api/v1/actions?status=pending` | Deal Detail Actions Tab |
| PUT | `/api/v1/actions/:id` | 完成待辦 |

> **TODO 待釐清**：現有 `/api/v1/contacts/...` 只有 CRM view endpoint，若 ContactTable 需要 list / update，實作階段需補 `GET /api/v1/contacts` 與 `PUT /api/v1/contacts/:id`。寫 plan 時確認現況。

---

## 8. 技術約束與注意事項

### 8.1 從同事 feedback 萃取的 guardrails（必守）

1. **State CSRF 驗證**
   - Authorize 前 `secrets.token_urlsafe(32)` 產生 state
   - 存 HttpOnly cookie `line_login_state`（`Max-Age=300`）
   - Callback 比對 `query.state == cookie.state`；不符回 400；用畢清除

2. **JWT 儲存**
   - Access token：**僅存 Zustand 記憶體**。頁面 reload 時透過 `/api/auth/me`（cookie-authed）重新取得
   - Refresh token：**僅存 HttpOnly + Secure + SameSite=Lax cookie**
   - **完全不寫 localStorage**
   - Access TTL = 2h；每次 API call 前檢查，<5 min 到期自動 refresh

3. **SPA Catch-all**
   ```python
   @app.get("/admin/{full_path:path}")
   async def spa_catchall(full_path: str):
       # 先找實體檔
       file = Path("app/admin_app/dist") / full_path
       if file.is_file():
           return FileResponse(file)
       # fallback index.html（React Router 接手）
       return FileResponse("app/admin_app/dist/index.html")
   ```

### 8.2 Firebase RTDB 的限制
- 沒有 SQL join。Deal Detail 需 stakeholder contact 名稱時，要 list_by_deal 再逐筆 contact_repo.get（前端 TanStack Query 併發）
- 沒有 full-text search。Contact 搜尋 MVP 走前端 filter（假設單一 org < 5000 contacts）

### 8.3 與 LIFF 的對稱與差異
- 同一 backend、同一 JWT secret（session 不衝突，但 JWT payload 相同可跨用）
- 設計 token 時：LIFF 用 `/api/auth/token` (id_token)，Admin 用 `/api/auth/line-login/callback`（授權碼）。兩條 flow 最終都發同格式 JWT
- 資料變更即時：Admin 改 stage → LIFF 下次打開看得到（不做 real-time push，用 TanStack Query invalidate）

### 8.4 效能
- Kanban 首次載入：`GET /api/v1/deals` 回全部（預期 < 200 筆），前端 group by stage
- Contact Table：類似，前端 filter / sort
- Deal Detail：4 個 endpoint 併發（deal / activities / stakeholders / actions）

---

## 9. 非功能性需求

- **瀏覽器支援**：Chrome / Safari / Edge 最新 2 版；Firefox 最新 1 版
- **響應式**：MVP 只需 1280px 以上正確顯示；不做 tablet / mobile（那是 LIFF 的責任）
- **i18n**：MVP 僅繁體中文，寫 code 預留 i18n key 但不接 library
- **Analytics**：MVP 不加
- **Error tracking**：接 console.error；未來接 Sentry

---

## 10. 後端需要做的改動摘要

| 變更 | 檔案 | 工作量 |
|---|---|---|
| 新增 LINE Login OAuth endpoints | `app/api/auth.py`（新檔） | M |
| 新增 refresh token 機制 | `app/services/auth_service.py` | S |
| 新增 `/admin/` StaticFiles + catch-all | `app/main.py` | XS |
| 新增 env vars：`LINE_LOGIN_CHANNEL_ID` / `LINE_LOGIN_CHANNEL_SECRET` | `app/config.py` + Cloud Run | XS |
| **（待確認）** 新增 `GET /api/v1/contacts` + `PUT /api/v1/contacts/:id` | `app/api/liff.py` 或 `crm.py` | S |

---

## 11. 實作階段規劃（概要）

> 詳細 task list 由 writing-plans 產出

- **Sprint 1（Week 1）**：Vite 骨架 + Login OAuth + AppShell + Sidebar + Header
- **Sprint 2（Week 2）**：Deals Kanban + drag-drop + Tab switcher
- **Sprint 3（Week 3）**：Deal Detail + Timeline + Stakeholders + Actions Tab + NluInlineInput
- **Sprint 4（Week 4）**：Contacts Table + Drawer + NluInputModal（header 全域）
- **Sprint 5（buffer）**：Polishing、部署到 prod、bug fix

---

## 12. 開放決策（實作時確認，不阻塞 spec）

- [ ] Stage 顏色 palette（目前 LIFF 只有 primary + 灰色，desktop Kanban 可能需要 7 種 accent）
- [ ] Owner avatar 策略：LINE display name 首字 + hash 背景色 vs. 拉 LINE profile picture
- [ ] NluInlineInput 收合行為：失敗後保留輸入 vs. 關閉
- [ ] Kanban card 逾期警示 threshold（過期顯示紅色 or 3 天內黃色？）

---

## 附錄 A：資料模型對照（無變更）

見 [conversational-crm/prd.md §2](../../product/01_features/conversational-crm/prd.md)。

## 附錄 B：Twenty CRM 參考對照

| Twenty | 我們 Admin |
|---|---|
| Workspace | Org |
| Companies | Contact（type=company） |
| People | Contact（type=person） |
| Opportunities Kanban | Deals Kanban |
| Opportunity Show Page | Deal Detail |
| Notes / Activities | Activity |
| Tasks | Action |
| Command Bar (Cmd+K) | **延後** |
| Custom Fields | **不做** |
