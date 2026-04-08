## Context

目前 `ensure_user_org(user_id)` 被所有事件 handler 無條件呼叫。它的行為是：若 `user_org_map/{user_id}` 不存在，就立即建立一個個人組織並設定 user 為 admin。新用戶只要發出任何訊息（非 `加入 xxx`），就會在毫無選擇的情況下被建立個人 org，之後 `handle_join` 的前置檢查 `existing_org` 就會擋住他們加入別人的團隊。

三個進入點：
- `handle_text_event`：text 訊息
- `handle_image_event`：圖片訊息
- `handle_postback_event`：按鈕回傳

## Goals / Non-Goals

**Goals:**
- 新用戶第一次互動時看到「建立團隊 / 加入既有團隊」選擇
- 選擇完成前，任何操作持續被攔截（不會 fallthrough 建立 org）
- 既有用戶零影響，不多一次 Firebase 讀寫

**Non-Goals:**
- 多 org 支援（一個 user 隸屬多個 org）
- Welcome Message 設定（LINE 後台操作）
- 團隊管理 LIFF

## Decisions

**決策 1：攔截邏輯放在 handler 入口，不放在 `ensure_user_org` 內**

`ensure_user_org` 在 onboarding 之後仍有正當呼叫場景（`create_org` postback），若在函式內部攔截會讓職責混亂。在 handler 入口攔截，`ensure_user_org` 語意保持單純。

**決策 2：用 `get_user_org_id` 單次讀取，不引入新狀態機**

方案比較：
- `user_states` in-memory pending 狀態：Cloud Run 重啟後消失，新用戶恰好重啟前後各發一則訊息，會遺失選擇 → 但因為 org 還沒建立，重啟後再次攔截行為仍正確，只是多顯示一次 onboarding 訊息，可接受
- Firebase RTDB pending 狀態：持久但多一次讀寫，onboarding 是一次性事件，不值得
- **直接 `get_user_org_id` 讀取（選用）**：最簡單，`ensure_user_org` 內部本就要讀一次，等於零額外成本；攔截邏輯集中在 `check_onboarding` helper，各 handler 呼叫一行

**決策 3：`加入 <code>` 指令不攔截**

`handle_join` 本身就處理 org=None 的情況，不需要 onboarding 選擇。保持現有行為。

**決策 4：`action=create_org` postback 在攔截前處理**

攔截邏輯依賴 `get_user_org_id`，而 `create_org` 的目的正是建立 org，若被攔截會形成死鎖。在 `handle_postback_event` 的開頭提前處理 `create_org`，再執行 onboarding 攔截。

## Risks / Trade-offs

**[Risk] Cloud Run 重啟期間新用戶發兩則訊息** → onboarding Quick Reply 會出現兩次，無資料損失，行為仍正確。

**[Risk] 既有用戶 `get_user_org_id` 讀取多一次** → 現有 `ensure_user_org` 內部就有這個讀取，`check_onboarding` 改成讀一次後傳 org_id 給後續邏輯可以避免，但實作複雜度上升。初版接受此重複讀取，待效能問題發生再優化。

## Migration Plan

1. 部署新版本（含攔截邏輯）
2. 既有用戶 `user_org_map` 已有 org_id，不受影響
3. 無需資料遷移，無 schema 變更
4. Rollback：回退上一個 container image 即可
