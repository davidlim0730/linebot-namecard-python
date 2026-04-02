## Context

目前 Phase 1 的名片掃描流程是「傳圖 → OCR → 直接儲存」，沒有中間確認步驟。智慧搜尋則是將所有無法匹配指令的文字訊息 fallback 到 Gemini LLM，與其他文字指令（如「邀請」、「匯出」）互相干擾。資料模型的 `phone` 欄位混合了市話與手機，且缺少 LINE ID 欄位。

核心約束：
- `user_states` 是 in-memory dict（`bot_instance.py`），Cloud Run 重啟後會消失——這是已知限制，不在本次解決
- 所有業務邏輯應放在 `utils.py` / service utils，不應與 LINE SDK 耦合
- Firebase 讀寫維持同步呼叫

## Goals / Non-Goals

**Goals:**
- 雙面掃描：正面 OCR 後暫存於 `user_states`，詢問背面後合併儲存
- 搜尋明確化：需透過按鈕進入 `searching` state 才觸發 LLM 搜尋
- 資料模型擴展：新增 `mobile`、`line_id` 欄位，加入格式驗證層

**Non-Goals:**
- 舊資料 backfill
- State 持久化（Cloud Run 重啟）
- 搜尋排序優化、名片 carousel 顯示 mobile

## Decisions

### 1. 雙面掃描的暫存位置：user_states（而非 Firebase）

**選擇**：正面 OCR 結果暫存在 `user_states[user_id]['front_data']`

**理由**：這是 session-level 的暫時狀態，與已有的 `adding_memo`、`editing_field` 等 state 一致；寫入 Firebase 會增加不必要的 I/O 和 cleanup 邏輯。

**已考慮替代方案**：Firebase 暫存 → 需要獨立路徑與 TTL 清理，複雜度不值得。

---

### 2. 雙面掃描的觸發時機：第一張圖後詢問

**選擇**：Option B（傳第一張圖後，Bot 問「還有背面嗎？」）

**理由**：不打斷用戶掃描習慣（先拍再決定），符合 LINE 聊天室的自然互動節奏。

**已考慮替代方案**：
- Option A（拍前先問）→ 需要額外的「進入掃描模式」按鈕，流程更長
- Option C（兩張圖傳完再問）→ 難以判斷第二張圖是背面還是新名片

---

### 3. 合併策略：正面優先、背面補充

**選擇**：`merge_namecard_data(front, back)` — 背面只補充正面為 `N/A` 或空字串的欄位

**理由**：正面通常資訊更完整，背面可能有廣告語等非結構化文字干擾主要欄位。

---

### 4. 欄位驗證位置：`utils.py` 純函式

**選擇**：`validate_namecard_fields(card: dict) -> dict` 放在 `utils.py`，儲存前統一呼叫

**理由**：與 LINE SDK 完全解耦，易於單元測試；handler 只負責呼叫，不含驗證邏輯。

**驗證策略**：不符格式設為 `N/A`（不拋例外），確保 OCR 失敗時流程不中斷。

---

### 5. 搜尋觸發：Quick Reply 按鈕 + `searching` state

**選擇**：移除 fallback，以 postback `action=start_search` 進入 `searching` state

**理由**：現有 fallback 行為造成誤觸（用戶打任何字都觸發搜尋），且 LLM 搜尋延遲較高，不適合作為 catch-all。

**已考慮替代方案**：保留 fallback 但加條件過濾 → 邊界難定義，仍有誤觸風險。

## Risks / Trade-offs

| 風險 | 緩解方式 |
|------|---------|
| `user_states` 在 Cloud Run 重啟後消失，雙面掃描 state 會卡住 | 已知限制，文件記錄；未來可考慮 Redis 持久化 |
| 移除 fallback 後，用戶習慣「打字搜尋」的人需要重新學習 | Quick Reply 按鈕位置明顯，且回覆有引導文字 |
| Gemini OCR 對 `mobile` / `line_id` 的辨識準確度未知 | 加入欄位驗證作為第二道防線，驗證失敗設 N/A 不影響流程 |
| LINE Quick Reply 上限 10 個，替換「🧪 測試」按鈕 | 測試按鈕為 debug 用途，正式用戶不依賴此按鈕 |

## Migration Plan

1. 部署新版本後，舊有名片資料無 `mobile` / `line_id` 欄位 → Flex Message 讀取時 `card_data.get("mobile", "N/A")` 回傳 `N/A`，條件顯示邏輯不顯示該列，向後相容。
2. 無需資料庫 migration。
3. Rollback：直接 redeploy 前一個 Cloud Run revision。

## Open Questions

（無——所有設計決策已在 brainstorming 階段確認）
