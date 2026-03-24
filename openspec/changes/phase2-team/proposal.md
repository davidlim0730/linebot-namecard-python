## Why

Phase 1 建立了單人名片管理的完整流程（OCR、搜尋、QR Code 匯出），但企業業務團隊的核心需求是**共享名片庫**——同事掃的名片、全隊都能查。目前每位使用者各自擁有獨立的名片庫，無法協作，限制了產品對企業客戶的價值。Phase 2 引入「組織（organization）」概念，讓名片資料從個人層級升級為團隊層級。

## What Changes

- **新增 Organization 資料結構**：Firebase RTDB 增加 `organizations/` 節點，儲存組織資訊與成員清單
- **名片歸屬改為組織**：名片從 `namecard/{user_id}/` 遷移至 `namecard/{org_id}/`，個人仍可存取自己所屬組織的全部名片
- **角色權限**：兩種角色 — `admin`（管理員）與 `member`（一般成員）；admin 可管理成員、刪除任何名片；member 只能刪除自己掃入的名片
- **邀請機制**：admin 透過 LINE 產生邀請連結或 QR Code，新成員掃碼後加入組織
- **名片可見性**：預設為組織共享；未來保留 `private` 旗標擴展空間（本次不實作）
- **Google Sheets 同步升級**：同步範圍改為整個組織的名片庫

## Capabilities

### New Capabilities

- `organization-management`: 建立/查看組織、管理成員清單、角色指派（admin/member）
- `team-invite`: 透過 LINE 邀請成員加入組織（產生邀請碼、處理加入流程）
- `team-namecard-access`: 組織成員存取共享名片庫（查詢、搜尋、瀏覽全組織名片）
- `role-based-permissions`: 根據角色控制刪除、管理等操作的存取權限

### Modified Capabilities

- `namecard-storage`: **BREAKING** — 名片資料路徑從 `namecard/{user_id}/` 改為 `namecard/{org_id}/`，每筆名片新增 `added_by` 欄位記錄掃入者

## Non-goals

- 名片私人可見性（`private` flag）— 保留資料結構空間，但本次不實作 UI
- 跨組織名片共享
- 多組織成員（一個 user 加入多個 org）— 本次一人只屬於一個組織
- 組織層級的 Google Sheets 進階權限控制

## Impact

- **Firebase RTDB schema**：新增 `organizations/{org_id}/`、`user_org_map/{user_id}` 節點；`namecard/` 路徑結構 breaking change（需資料遷移腳本）
- **app/firebase_utils.py**：所有名片 CRUD 需改以 `org_id` 為路徑前綴
- **app/line_handlers.py**：新增邀請流程的 postback handler；所有操作前需查詢 user 所屬 org
- **app/gsheets_utils.py**：同步範圍改為 org 層級
- **app/config.py**：可能需新增初始化 org 的環境變數（default org for migration）
- **Roadmap Phase**：Phase 2
