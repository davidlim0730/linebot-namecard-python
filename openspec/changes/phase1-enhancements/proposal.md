## Why

Phase 1 MVP 的名片掃描只支援單面、搜尋功能會與所有文字訊息衝突、資料模型缺少手機與 LINE ID 這兩個台灣名片最常見的欄位，導致掃描品質低落且用戶操作體驗混亂。在進入 Phase 2 團隊化之前，必須先補強這三個基礎缺口。

## What Changes

- **雙面名片掃描**：傳送第一張名片圖片後，Bot 詢問是否有背面；若有，等待第二張圖片並自動合併正反面資訊後儲存。
- **智慧搜尋改為按鈕觸發**：移除「任何文字 fallback 到 LLM 搜尋」行為，改由 Quick Reply「🔍 搜尋名片」按鈕觸發搜尋模式，用戶明確輸入關鍵字後才執行搜尋。
- **新增 `mobile` 與 `line_id` 欄位**：Gemini OCR Prompt 更新以提取行動電話與 LINE ID；Firebase schema 新增兩個欄位；Flex Message 顯示邏輯更新（N/A 時隱藏）。
- **欄位格式驗證**：`phone`、`mobile`、`email`、`line_id` 在儲存前統一驗證格式，不符合者設為 `N/A`。

## Capabilities

### New Capabilities

- `dual-side-scan`：雙面名片掃描流程，包含 state machine 擴展（`scanning_back` state）、正反面 OCR 合併邏輯、以及觸發儲存的 postback 處理。
- `search-mode`：明確的搜尋模式，包含 `searching` state、按鈕觸發流程、取消搜尋，以及移除不受控的 fallback 行為。
- `namecard-extended-fields`：新增 `mobile` 與 `line_id` 欄位至資料模型、OCR Prompt、Flex Message 顯示、及欄位驗證邏輯。

### Modified Capabilities

（無現有 spec 需要更新——本次為全新功能）

## Impact

- **`app/line_handlers.py`**：handle_image_event、handle_postback_event、handle_text_event、get_quick_reply_items、FIELD_LABELS 皆有改動
- **`app/utils.py`**：新增 `validate_namecard_fields()`、`merge_namecard_data()`
- **`app/config.py`**：更新 `IMGAGE_PROMPT`
- **`app/firebase_utils.py`**：`ALLOWED_EDIT_FIELDS` 新增欄位
- **`app/flex_messages.py`**：名片詳細 Flex 新增 mobile/line_id 列
- **Firebase schema**：`namecard/{org_id}/{card_id}/` 新增 `mobile?` 與 `line_id?` 欄位（向後相容，舊資料無此欄位顯示為空白）
- **無 breaking change**：現有名片資料不受影響

## Non-goals

- 舊有名片資料的 backfill（不補寫 mobile/line_id）
- 雙面掃描的 timeout / state 過期處理（屬 Cloud Run 已知限制，不在本次範圍）
- 搜尋結果排序優化
- 名片 carousel 顯示 mobile 欄位
