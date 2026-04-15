# Product Roadmap — LINE 名片管理機器人

> 「用 LINE 就能管名片」——為台灣企業業務團隊打造的共享名片管理工具。

---

## 設計原則

1. **LINE 優先，但不綁定**：LINE 是現階段主要介面，核心邏輯不與 LINE SDK 耦合，未來可擴展至 Web UI 或其他平台。
2. **平台解耦**：業務邏輯與資料存取層分離（service layer），Firebase 是 MVP 階段選擇，架構上保持可替換性。
3. **團隊優先於個人**：功能設計以團隊協作為核心，資料結構與權限預留組織層級擴展空間。
4. **搜尋即核心體驗**：名片量大時仍能快速找人，檢索效能與準確度持續優化。

---

## Phase 1 — MVP + 穩定化

**狀態**：開發中，需補強監控與互動體驗

### 已完成
- [x] 名片 OCR 掃描與結構化儲存
- [x] 自然語言智慧搜尋
- [x] 名片編輯與備註
- [x] vCard QR Code 匯出
- [x] Google Sheets 同步

### 已完成
- [x] **互動取消防呆機制**（v3.7.0，2026-04-13）：Quick Reply 視覺化取消（`❌ 取消操作`）套用於全部 5 種 state handler（`editing_field`、`adding_memo`、`adding_tag`、`exporting_csv`、`reporting_issue`），統一引導文案
- [x] **用戶回報機制**（v3.7.0，2026-04-13）：LINE 介面問題回報流程（`reporting_issue` state → Firebase `feedback/` 寫入 → 可選 email 通知）

### 待完成：基礎建設與防呆
- [ ] **狀態超時 (Timeout) 機制**：進入等待輸入狀態 1 分鐘後自動失效（LINE API 自然超時已部分覆蓋）
- [ ] **錯誤監控**：
  - OCR 成功率量測（記錄每次辨識的成功/失敗）
  - Firebase 讀寫錯誤率監控
- [ ] **一鍵加入通訊錄**（取代 QR Code）：現有 vCard QR Code 操作反直覺，改為直接產生 `.vcf` 下載連結，iOS / Android 原生支援一鍵匯入通訊錄

---

## Phase 2 — 團隊化

**狀態**：功能完整，Pilot 驗收指標可執行

**Pilot 目標**：內部業務團隊優先試用，跑 4 週，收集真實回饋後再決定下一步。

### 功能清單
- [x] 組織（organization）資料結構重構
- [x] 名片可見性控制（私人 vs 團隊共享）
- [x] 角色權限（建立者即為管理員 vs 一般成員）
- [x] **成員權限隔離**（v3.6.0，2026-04-10）：
  - 成員僅能搜尋、檢視、編輯、匯出自己建立的名片
  - 管理員維持全團隊可見性
  - CSV 匯出自動反映權限範圍
- [x] **修復/優化加入機制（Onboarding Flow）**：
  - 解決「預設建立個人團隊導致無法輸入邀請碼加入他人團隊」的架構問題。
  - 新用戶加入時，提供明確選項：「建立我的專屬名片庫」或「輸入邀請碼加入團隊」。
  - Follow event 主動推播歡迎訊息（Proactive Onboarding，v3.5.0）
- [x] **CSV 匯出（基本版）**：
  - 支援匯出全部名片，透過 LINE 觸發，以 email 寄出 CSV 檔案。
  - 欄位格式以現有資料模型為準，權限範圍依角色自動篩選（v3.6.0）。

### Pilot 驗收指標
- 團隊成員能夠順利完成 onboarding（無需協助）
- 管理員能夠管理成員與名片可見性
- 收集 4 週使用回饋，識別最常見的痛點

---

## Phase 3 — 體驗升級 (LIFF 化) 與資料整合

**狀態**：進行中，已上線批量上傳、試用機制、Proactive Onboarding

> 本階段目標是透過 Web 介面大幅提升資料管理的體驗，並讓資料能夠流動出去，為 CRM 串接打基礎。

### 已完成
- [x] 批量上傳（Cloud Tasks 非同步 OCR）
- [x] **試用機制**（v3.4.0）：
  - 新用戶自動開通 7 天 / 50 張 / 3 人限制
  - 觸頂後進入 read-limited 狀態（可搜尋、匯出，無法新增）
  - 舊 Alpha 組織祖父條款（無 `plan_type` → 預設 `pro`）
  - 批量上傳迴圈內精確檢查額度，防超刷
- [x] Proactive Onboarding（Follow event 主動推播）
- [x] Rich Menu Navigation（3 區段主選單）
- [x] CSV 基本匯出（SMTP email）
- [x] **批量上傳 UX 優化**（v3.7.0，2026-04-13）：
  - 5 秒 Idle Detection（Cloud Scheduler + Firebase `last_image_time`）
  - 批量完成摘要含成功/失敗清單（姓名、公司、失敗原因）
  - 兩條完成路徑（手動「完成」＋ Idle 自動觸發）統一摘要格式

### 待完成
- [ ] **系統全面 LIFF 化**：
  - **名片編輯 LIFF**：取代單線對話，透過表單一次修改所有欄位。
  - **標籤管理 LIFF**：新增/刪除標籤、多選標籤介面。
  - **團隊管理 LIFF**：管理員管理成員列表與產生邀請連結。
- [ ] **CSV 匯出（進階版）**：
  - 支援依條件篩選匯出。
  - 匯出欄位格式對齊主流 CRM（HubSpot、Salesforce）標準欄位。
  - 透過 LIFF 觸發，回傳下載連結。
- [ ] **Web 管理介面**：瀏覽器版名片庫管理、圖表儀表板

---

## Phase 4 — Conversational CRM

**狀態**：後端已完成，LIFF 前端開發中

> 透過 AI 讓業務人員在 LINE 上用說話完成所有 CRM 操作。主介面升級為 LIFF App，LINE Chat 保留推播通知與名片上傳。

### 後端（已完成）
- [x] **資料模型**：Deal、Activity、Action、Product、Stakeholder（`app/models/`）
- [x] **Repositories**：Firebase CRUD for all CRM entities（`app/repositories/`）
- [x] **NLU Service**：Gemini 解析自然語言 → 結構化 CRM 資料，含 Grounding Context（`app/services/nlu_service.py`）
- [x] **業務 Services**：DealService（pipeline upsert + 階段追蹤）、ActivityService（互動紀錄 + auto-link）、ActionService（待辦 + 到期查詢）
- [x] **API 路由**：`/crm/parse`、`/crm/confirm`、`/deals`、`/activities`、`/actions`、`/pipeline/summary`、`/contacts/:id/crm`（`app/api/crm.py`）
- [x] **推播 Service**：`push_action_reminders`（每日 09:00）、`push_weekly_summary`（週五 18:00）
- [x] **排程端點**：`/internal/push-action-reminders`、`/internal/push-weekly-summary`
- [x] **Cloud Scheduler 設定腳本**：`scripts/setup_scheduler.sh`
- [x] **Rich Menu 重設計**：業務版（6 格）+ 主管版（含 Pipeline 總覽）
- [x] **LINE Chat 快速指令**：`「我的待辦」`、`「查 [名稱]」`、`「pipeline」`（admin）

### LIFF 前端（待完成）
- [ ] **CrmInput**：意識流輸入 → NLU 預覽 → 確認寫入（`#/crm`）
- [ ] **DealList / DealDetail**：Pipeline Kanban + 案件詳情 + Stakeholders（`#/deals`）
- [ ] **ActionList**：今日 / 本週 / 全部待辦，一鍵完成（`#/actions`）
- [ ] **ContactCrm**：聯絡人 CRM 視角（deals + activities timeline）（`#/contacts/:id/crm`）
- [ ] **ManagerPipeline**：主管 team pipeline 儀表板（`#/pipeline`，admin only）
- [ ] **ProductList**：產品線管理（`#/products`，admin only）

### 驗收標準
- 意識流輸入 → NLU 解析 → 預覽確認 → Firebase 寫入 → LIFF 顯示
- 「查王總」→ LINE Chat 回傳 Contact + Deal 摘要
- 主管 Pipeline 視角：admin 帳號可見 ManagerPipeline
- 現有名片功能迴歸測試通過（OCR / 邀請 / 匯出 不受影響）

---

## Phase 5 — 進階串接與自動化

**狀態**：留白，由真實用戶行為數據驅動

### 可能方向（未承諾）
- 企業內部 CRM / MA 系統 API 對接（HubSpot、Salesforce）
- CSV 匯出對齊主流 CRM 標準欄位
- 互動數據分析與自動化跟進建議
- 進階篩選：依標籤、公司、職稱多維交叉

---

## 里程碑總覽

| 階段 | 重點 | 進入下一階段的條件 |
|------|------|------------------|
| Phase 1 穩定化 | 監控、防呆機制上線 | 操作不易誤觸、錯誤有追蹤 |
| Phase 2 Pilot | 修復 Onboarding、CSV 基本匯出 | 完成 onboarding、收集回饋 |
| Phase 3 體驗升級 | 系統 LIFF 化、CSV 進階匯出 | 編輯體驗流暢、匯出格式符合標準 |
| Phase 4 Conversational CRM | NLU + LIFF CRM 全功能 | LIFF 前端完成，端對端主流程通過 |
| Phase 5 串接與自動化 | 外部 CRM 串接、進階分析 | 由真實用戶行為數據驅動 |