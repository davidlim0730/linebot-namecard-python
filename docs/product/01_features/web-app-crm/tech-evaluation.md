# Web App CRM — 技術路線評估

**撰寫日期**：2026-04-17  
**決策日期**：2026-04-21  
**決策結果**：✅ **選擇 C'（React + Vite 輕量重寫）**  
**UI 規格**：見同目錄 `designer-brief.md`

---

## 決策摘要

選擇 **C'：React 18 + Vite + TanStack Query，直接接現有 REST API**。

已確認 MVP 範圍：
- [x] Contact Table（搜尋、tag filter）
- [x] Deal Kanban（按 stage 分欄）
- [x] Deal Detail + Activity Timeline + Stakeholders
- [x] Action List（今日 / 本週 / 逾期）
- [x] Pipeline Dashboard（admin only）
- [x] LINE Login 桌面登入

Auth：LINE Login OAuth（與 LIFF 同一套 channel）

---

## 1. 為什麼要做這個評估

產品側希望打造**桌面版 CRM 後台**，參照 [Twenty CRM](https://github.com/twentyhq/twenty) 的介面設計（Table / Kanban / Record Detail / Timeline / Filter 等），套上我們現有的 data schema。

Twenty CRM 是目前開源界公認最像 Salesforce/HubSpot 的 modern CRM，介面精緻、功能完整。但它與我們的技術棧有顯著差異，**「直接拿來修改」** 並非單一動作，而是**四種不同等級的 commitment**，成本差距可達 10 倍以上。

---

## 2. 技術棧落差

| 層 | Twenty CRM | 我們現有 |
|---|---|---|
| Frontend | React 18 + TypeScript + Jotai + Linaria + GraphQL codegen | Vue 3 ESM（LIFF）— 無 build tool |
| API | GraphQL（schema-first, 強型別） | REST（FastAPI, OpenAPI） |
| Backend | NestJS + BullMQ + TypeORM | FastAPI + Cloud Tasks + Firebase Admin SDK |
| 資料庫 | PostgreSQL（支援 join / 子查詢 / 全文搜尋） | Firebase Realtime DB（無 join、flat key tree） |
| Auth | Workspace-based email / OAuth | LINE id_token → JWT |
| 部署 | Docker Compose / Helm | Cloud Run 單容器 |
| 客製化 | Custom objects / fields（使用者可自訂 schema） | Schema 寫死在 Pydantic |

**核心衝突**：
- Twenty 的前端元件（TableView / KanbanBoard / RecordShow）在 React component 層就注入了 GraphQL hooks（`useQuery` / `useFragment`），資料型別從 `.graphql` schema codegen。**拆掉 GraphQL = 拆掉 80% 元件組裝線。**
- Twenty 的後端依賴 Postgres 關聯（`LEFT JOIN`、`GROUP BY`）做 filter 與 aggregation。**Firebase RTDB 無法原生做這件事**，要嘛搬家到 Postgres，要嘛在 Node/Python 層 in-memory filter（不 scale）。

---

## 3. 四個選項

### 選項 A：只拿 Frontend，接我們的 REST API

**做法**
1. Fork `twentyhq/twenty`，只留 `packages/twenty-front/`
2. 移除 GraphQL client（Apollo / codegen）
3. 為每個頁面重新接線到 `/api/v1/...` REST endpoint
4. 刪除所有 workspace/user 管理、metadata engine（我們用 org_id + Firebase）
5. Backend / Firebase 完全不動，LIFF 繼續跑

**工作量估算**：4–6 週（1 人）
**Lines of code touched**：~30k LOC（Twenty frontend 約 80k LOC，移除 customization engine 後剩 30k 左右需要 rewire）

**優點**
- Backend 不動，風險小
- LIFF 不受影響
- UI 美感直接拿到

**缺點**
- Twenty 元件深度綁定 GraphQL `useFragment`，每個 RecordShow/RecordBoard 都要改接線
- Custom fields / filter engine 大概率要整段刪掉（我們 schema 寫死）
- 其實「拿現成」的收益被整合成本吃掉大半——有時直接重寫還比較快

**何時選 A**：你很喜歡 Twenty 的 UI 細節（動畫、shortcut、command bar），願意花時間把它的 React component 拔掉 GraphQL 再接 REST。

---

### 選項 B：Fork 全端 Twenty，雙系統並存 + 資料同步

**做法**
1. 另開一個 Cloud Run / VM，跑完整 Twenty stack（NestJS + Postgres + Redis）
2. LINE Bot / LIFF 繼續寫 Firebase，**同時**透過 Twenty REST API 寫 Postgres
3. 桌面後台 = 原生 Twenty（完全不改）
4. NLU / 權限 / 業務邏輯要在**兩邊**實作

**工作量估算**：6–10 週（1 人）+ 長期維運成本

**優點**
- Twenty 所有功能（custom fields / filter / automation）都免費
- 桌面後台幾乎零開發（跑原廠 Twenty）

**缺點**
- **雙 DB 不一致風險高**：Firebase 寫成功但 Postgres 寫失敗 → 資料分歧
- 兩套 schema、兩套 auth、兩套 business logic（Gemini NLU、stage 變更規則、通知……）
- 運維成本 double（兩個服務、兩個 DB、兩套 monitoring）
- 如果之後要改一個欄位，要改兩邊

**何時選 B**：團隊有 2+ 工程師、可以接受雙系統並存成本、想快速 demo 給客戶看。

---

### 選項 C：全面搬家到 Twenty

**做法**
1. Firebase 資料全量遷移到 Postgres（寫 migration script）
2. LINE Bot 改成 Twenty GraphQL client（`handle_text_event` → `mutation createOpportunity`）
3. LIFF 重寫為 Twenty 頁面（或關掉，改用 Twenty mobile PWA）
4. Gemini NLU 變成 Twenty 的 custom workflow / webhook
5. 現有用戶資料遷移

**工作量估算**：3–5 個月（1 人全職）

**優點**
- 最乾淨的終點狀態
- 長期可以吃 Twenty 社群 roadmap（他們每週發版）
- 客戶看到的是業界標準 CRM

**缺點**
- 幾個月 feature freeze
- Migration 高風險（客戶資料）
- NLU/LINE 整合是 Twenty 沒有的情境，要自己維護 fork
- 一旦 fork 就無法 upstream merge，長期追版本痛苦

**何時選 C**：認定 Twenty 就是最終架構、願意把這次當成系統 v2 重構。

---

### 選項 C'：Twenty 當參考，React + Vite 輕量重寫（建議）

**做法**
1. 開一個 `packages/desktop-admin/` 子目錄（或新 repo）
2. 用 React 18 + Vite + TanStack Query + TanStack Table 搭一個薄殼
3. **直接接現有 REST API**（`/api/v1/deals`, `/api/v1/contacts/...`）
4. UI/UX 設計模仿 Twenty（sidebar layout / Kanban / Detail + Timeline）
5. **選擇性** copy Twenty 的單一元件（例如他們的 Kanban drag-drop 邏輯、command bar）
6. 共用 LIFF 後端 auth（改 desktop 專用的 LINE Login OAuth flow）

**工作量估算**：3–5 週（1 人）
- Week 1：骨架 + auth + Sidebar + Contact Table
- Week 2：Deal Kanban + Deal Detail
- Week 3：Activity Timeline + Action list + Product 管理
- Week 4：Pipeline dashboard + 優化 + 部署
- Week 5：buffer

**優點**
- Backend / LIFF 完全不動，風險最低
- 技術棧現代（React + Vite 是團隊未來可以累積的技能）
- Code 量可控（~5k–8k LOC，單人可維護）
- UI/UX 可以模仿 Twenty 最漂亮的部分，捨棄其他
- 三週內可交付 MVP

**缺點**
- 不是「拿現成」，要自己動手寫（雖然是 thin shell）
- Twenty 的 custom fields / filter engine 拿不到（但我們 schema 寫死、本來也用不到）
- 桌面後台會有自己的 component library，跟 LIFF（Vue）共用度低

**何時選 C'**：想要最短上線時間、保留現有投資、能接受「看起來像 Twenty 但不是 Twenty」。

---

## 4. 決策矩陣

| 維度 | A（只拿前端） | B（雙系統） | C（全搬） | **C'（參考重寫）** |
|---|:---:|:---:|:---:|:---:|
| 工作量 | 🟡 4–6 週 | 🔴 6–10 週 + 維運 | 🔴🔴 3–5 個月 | 🟢 3–5 週 |
| Backend 改動 | 0 | 新增一套 | 全換 | 0 |
| Firebase 資料動到 | ❌ | ❌ | ✅ 全遷 | ❌ |
| LIFF 受影響 | ❌ | ❌ | ✅ 要重寫 | ❌ |
| LINE Bot 受影響 | ❌ | ⚠️ 要雙寫 | ✅ 要重寫 | ❌ |
| 是否扛 Twenty monorepo | ⚠️ 前端扛一半 | ✅ 全扛 | ✅ 全扛 | ❌ |
| NLU 整合難度 | 🟢 不動 | 🔴 要雙邊 | 🔴 要移植 | 🟢 不動 |
| 未來吃 Twenty roadmap | ❌ | ✅ | ✅ | ❌ |
| MVP 交付風險 | 🟡 中 | 🔴 高 | 🔴🔴 很高 | 🟢 低 |
| 長期維運成本 | 🟡 中 | 🔴 高（雙系統） | 🟢 低（單系統） | 🟢 低 |
| 成品像 Twenty 的程度 | 🟢 90% | 🟢 100% | 🟢 100% | 🟡 70%（樣貌像） |

---

## 5. 風險總覽

### 選項 A 的隱形成本
Twenty 前端元件清單（部分）：
- `<RecordTableRow>` 用 `useRecordTableContextOrThrow` → 依賴 `ObjectMetadataItem`（metadata engine）
- `<RecordBoardCard>` 用 `useRecordBoardCard` → 依賴 GraphQL fragment `RecordBoardCardFragment`
- `<RecordShowPage>` 用 `useFindOneRecord` → GraphQL query

光是把這三個 rewire 到 REST，預估 2 週。而 Twenty 有 **50+ 個這種 record-level 元件**。

### 選項 B 的資料一致性問題
雙寫情境常見 bug：
- 名片進入 Firebase 成功，但 Postgres 寫失敗 → 桌面後台看不到
- 桌面後台改 deal stage → 同步到 Firebase → LIFF 衝突
- 刪除操作極難同步（soft delete 策略要兩邊一致）

要解決得做 event bus + retry queue + reconciliation job——又一個子系統。

### 選項 C 的客戶衝擊
現有用戶的 LINE Bot 行為會在幾個月內不穩定——因為 LINE Bot 要重寫成 GraphQL client、NLU 要移植、所有 rich menu / LIFF 要重新整合。Migration 期間若出 bug，用戶可能直接棄用。

### 選項 C' 的侷限
桌面後台與 LIFF UI 不共用元件（一個 React、一個 Vue）。如果之後要統一技術棧，還是得挑一個重寫另一個。但這是**可延後的決定**，不影響 MVP。

---

## 6. 建議

**選 C'。**

理由：
1. **最低風險**：不動現有 backend、LIFF、LINE Bot
2. **最短時間**：3–5 週可以看到成果
3. **工作量可控**：一個人可以 own 全部
4. **選項開放**：如果之後真的想 fork Twenty，這個薄殼可以丟掉重來，沒有 lock-in
5. **收益合理**：用戶看到的「像 Twenty」部分（Sidebar / Table / Kanban / Detail）都可以做到 70% 以上還原度

---

## 7. 給讀者的決策問題

請在回覆時告訴我你的答案：

1. **你選 A / B / C / C'？**
2. **如果選 C'**，這些 MVP 範圍是否同意？
   - [ ] Contact Table（可 inline 編輯、搜尋、tag filter）
   - [ ] Deal Kanban（按 stage 分欄、drag 換 stage）
   - [ ] Deal Detail + Activity Timeline + Stakeholders
   - [ ] Action List（今日 / 本週 / 逾期）
   - [ ] Pipeline Dashboard（admin only）
   - [ ] Product 管理（admin only）
   - [ ] LINE Login 桌面登入
3. **Auth 偏好**：桌面版要用 LINE Login / Email magic link / Google OAuth？
4. **首波要做的對象是「主管」還是「業務」還是兩者皆有**？（這決定預設頁面、側欄排序）
5. **時程希望**：3 週做到什麼？8 週做到什麼？

---

## 附錄 A：Twenty CRM 的核心資產（如果之後選 A/B/C 想參考）

- 介面精緻度：animation、keyboard shortcut、command bar（Cmd+K）
- Kanban：`packages/twenty-front/src/modules/object-record/record-board/`
- Table：`packages/twenty-front/src/modules/object-record/record-table/`
- Detail：`packages/twenty-front/src/modules/object-record/record-show/`
- Filter engine：`packages/twenty-front/src/modules/object-record/record-filter/`
- Custom fields：`packages/twenty-front/src/modules/object-metadata/`（複雜，不建議拿）

## 附錄 B：我們 Data Schema 對 Twenty Object 對照

| Twenty Object | 我們的 Model | 檔案位置 |
|---|---|---|
| Person | Contact（contact_type=person） | `app/models/card.py` |
| Company | Contact（contact_type=company） | `app/models/card.py` |
| Opportunity | Deal | `app/models/deal.py` |
| Note / Activity | Activity | `app/models/activity.py` |
| Task | Action | `app/models/action.py` |
| — | Stakeholder | `app/models/stakeholder.py` |
| — | Product | `app/models/product.py` |
| Workspace | Org | `app/models/org.py` |
| WorkspaceMember | Member | `app/models/org.py` |
