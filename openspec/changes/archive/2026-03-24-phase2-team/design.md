## Context

Phase 1 的名片資料儲存在 `namecard/{user_id}/{card_id}/`，以 LINE userId 為隔離邊界。Phase 2 需要讓多位使用者共享同一份名片庫，因此必須引入「組織（organization）」作為新的資料隔離邊界，並建立 user → org 的對應關係。

系統部署在 Cloud Run，使用 Firebase RTDB 作為主要資料庫，透過 LINE Webhook 接收所有使用者互動。遷移需確保現有使用者的名片資料不遺失。

## Goals / Non-Goals

**Goals:**
- 引入 `org_id` 作為名片庫的隔離邊界
- 建立 user → org 映射（`user_org_map`）
- 實作 admin / member 兩種角色的權限控制
- 提供 LINE 內的邀請加入流程
- 提供資料遷移腳本（Phase 1 → Phase 2）

**Non-Goals:**
- 名片私人可見性（`private` flag）
- 一個 user 加入多個 org
- Web UI 管理介面
- 細粒度的欄位級別權限

## Decisions

### 1. 組織資料結構：flat 節點 vs 巢狀

**選擇**：在 RTDB 使用 flat 結構，`organizations/` 和 `namecard/` 獨立節點，透過 `user_org_map` 建立關聯。

**理由**：Firebase RTDB 不支援 JOIN，巢狀結構（`organizations/{org_id}/namecards/`）在讀取單筆名片時需載入整個 org 樹。Flat 結構讓 `namecard/{org_id}/` 可獨立讀寫，效能更好，也符合 Firebase 官方建議。

**替代方案**：Firestore（更好的 query 支援）— 但短期遷移成本高，且現有 RTDB 免費額度足夠 MVP 規模。

---

### 2. 邀請機制：邀請碼 + LINE URI Scheme 分享

**選擇**：後端使用 6 字元隨機邀請碼（`invite_codes/{code}`），Flex Message 附加「分享邀請」按鈕，使用 LINE URI Scheme 讓 Admin 一鍵把邀請文字傳給 LINE 好友。

**實作方式**：
- 邀請 Flex Message 包含「分享邀請」`uri` action 按鈕，URI 為：
  ```
  https://line.me/R/msg/text/加入我們的名片管理團隊！%0A邀請碼：ABCDEF%0A請到 Bot 輸入「加入 ABCDEF」
  ```
- Admin 點按鈕 → LINE 開啟選人介面 → Admin 選好友 → 好友收到邀請文字
- 受邀者在 Bot 輸入「加入 ABCDEF」完成加入

**理由**：不需 LIFF，純 Flex Message 即可實作；Admin 體驗從「複製貼上」升級為「一鍵分享」；後端邀請碼邏輯不需改動。

**替代方案**：LIFF `shareTargetPicker()` — 可直接發送 Flex Message 給好友，體驗更佳，但需額外建立 LIFF app，延後至 Phase 3。

---

### 3. 角色儲存位置

**選擇**：角色存在 `organizations/{org_id}/members/{user_id}/role`。

**理由**：角色是組織層級的屬性（同一個 user 在不同 org 可有不同角色），不應存在 `user_org_map`。查詢成本：每次操作需先讀 `user_org_map/{user_id}` 取得 `org_id`，再讀 `organizations/{org_id}/members/{user_id}/role`，兩次 RTDB 讀取，可接受。

---

### 4. 名片 `added_by` 欄位

**選擇**：每筆名片新增 `added_by: user_id`，記錄掃入者。

**理由**：支援「member 只能刪除自己掃入的名片」的權限規則，以及未來的統計分析需求。

---

### 5. Phase 1 → Phase 2 遷移策略

**選擇**：提供一次性遷移腳本 `scripts/migrate_phase2.py`。執行時：
1. 建立一個 default org（`org_default`）
2. 將所有 `namecard/{user_id}/` 下的名片複製至 `namecard/org_default/{card_id}/`，加上 `added_by: user_id`
3. 將所有已知 user 加入 `user_org_map` 並設為 `member`（第一個執行者設為 `admin`）
4. 原始資料保留 30 天後手動刪除

**理由**：不做 in-place 修改，降低風險。保留舊資料作為回退備份。

## Firebase Schema

```
organizations/
  {org_id}/
    name: string
    created_by: user_id
    created_at: timestamp
    members/
      {user_id}/
        role: "admin" | "member"
        joined_at: timestamp

user_org_map/
  {user_id}: org_id   # 簡單的 string 值

namecard/
  {org_id}/
    {card_id}/
      name, title, company, address, phone, email, memo?
      added_by: user_id   # 新增欄位

invite_codes/
  {code}/               # 6-char alphanumeric
    org_id: string
    created_by: user_id
    expires_at: timestamp  # 建立後 7 天
```

## Risks / Trade-offs

- **Breaking schema change** → Mitigation：遷移腳本 + 舊資料保留；部署時先跑腳本再上線新版本
- **user_org_map 讀取成本** → 每次 webhook 都需多一次 RTDB 讀取；Mitigation：加入簡單的 in-process cache（`dict`），TTL 5 分鐘，Cloud Run 重啟後清空，可接受
- **邀請碼安全性** → 6 字元 = 36^6 ≈ 21 億組合，加上 7 天過期，暴力破解風險低；若需更高安全性可改為 UUID
- **多人同時掃描同一張名片** → 重複偵測邏輯（by email）在 org 層級仍有效，無需修改

## Migration Plan

1. 部署遷移腳本至 Cloud Run Job 或本機執行
2. 執行 `python scripts/migrate_phase2.py --admin-user-id <LINE_USER_ID>`
3. 驗證 `namecard/org_default/` 資料正確
4. 部署新版本 app（包含 Phase 2 logic）
5. 測試邀請流程、共享名片存取
6. 30 天後刪除 `namecard/{user_id}/` 舊資料

**Rollback**：舊版 app image 仍指向 `namecard/{user_id}/`，可直接回滾 Cloud Run revision。

## Open Questions

- 組織名稱由誰設定？目前設計為第一個建立者（admin）透過 LINE Bot 設定；需要確認 UX 流程
- 若 user 還沒加入任何 org，第一次使用時是自動建立個人 org 還是強制邀請加入？建議：自動建立個人 org（`org_{user_id}`），這樣單人使用場景仍有效
