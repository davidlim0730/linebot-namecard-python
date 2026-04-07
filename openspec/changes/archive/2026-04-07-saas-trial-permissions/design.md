## Context

智慧名片管家已完成 Phase 1-3（OCR、搜尋、標籤、CSV 匯出、批量上傳），所有組織皆無用量限制。需為新組織加入試用期機制（7 天 / 50 張 / 3 人），Alpha 舊組織透過祖父條款不受影響。

現有架構：`line_handlers.py` → `firebase_utils.py`，權限邏輯已有 `require_admin()` 模式。組織資料存於 `organizations/{org_id}/`。

## Goals / Non-Goals

**Goals:**
- 集中式權限檢查，與既有 `require_admin()` 風格一致
- 精準計數防止 race condition（Firebase Transaction）
- 付費牆 UI 與核心邏輯解耦（flex_messages 只負責渲染）
- 零 downtime 部署，舊組織不受影響

**Non-Goals:**
- 不新增檔案或 decorator — 所有邏輯放入既有模組
- 不做自動付款流程
- 不做用量警告推播
- 不做後台管理介面

## Decisions

### D1: 集中式 `check_org_permission()` vs Decorator vs Inline 檢查

**選擇**：集中式函式放在 `firebase_utils.py`

**原因**：與既有 `require_admin()` 風格一致；呼叫端只需一行 `if not permission['allowed']`；避免引入新的抽象層。Decorator 方案需要 async handler 包裝，增加複雜度但無實質收益。Inline 檢查則會散落各處，難以維護。

### D2: `ensure_user_org` 回傳 tuple `(org_id, is_new)` vs 事件機制

**選擇**：回傳 tuple

**原因**：最小改動。只有 3 個呼叫端需要 unpack，且 onboarding 推播只在 `is_new=True` 時觸發。事件機制（pub/sub）過度工程化。

### D3: `increment_scan_count` 用 Firebase Transaction vs 先讀後寫

**選擇**：Firebase Transaction (`ref.transaction()`)

**原因**：用戶可能瞬間連傳多張圖片，先讀後寫存在 race condition。Transaction 保證原子性遞增。

### D4: 付費牆升級按鈕用 URIAction → LINE OA vs PostbackAction

**選擇**：URIAction（`line://ti/p/@{OA_ID}`）

**原因**：直接開啟 LINE OA 對話，零摩擦。`LINE_OA_ID` 缺失時 fallback 為 MessageAction 回傳聯繫資訊。

### D5: 歡迎訊息用 push_message vs reply_message

**選擇**：push_message

**原因**：`ensure_user_org` 在處理流程中間被呼叫，reply_token 可能已被使用或即將用於其他回覆。Push 不佔用 reply_token。

## Risks / Trade-offs

**[In-memory state loss]** → `user_states` 在 Cloud Run 重啟後消失。已知限制，不在本次解決。

**[scan_count 只增不減]** → 重複名片也計數（因為 OCR 已消耗資源）。若未來需要「刪除名片退回額度」，需額外邏輯。→ 暫不處理，觀察用戶回饋。

**[祖父條款長期維護]** → 舊組織永遠沒有 `plan_type`，查詢時多一次 null check。→ 可接受，未來可做一次性 migration 補上 `plan_type=pro`。

**[Firebase Transaction 效能]** → 在低併發場景（目前使用量）無疑慮。高併發時 Transaction 可能 retry 多次。→ 目前不是問題，未來可改用 Cloud Firestore 的原生 increment。

## Migration Plan

1. 部署新版程式碼 → 舊組織無 `plan_type`，自動走祖父條款，零影響
2. 新組織自動獲得 trial 欄位
3. 無需資料遷移、無 breaking change
4. **Rollback**：移除權限檢查程式碼即可，`plan_type` 欄位留存不影響運作
