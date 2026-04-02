## 1. 基礎工具函式（utils.py）

- [x] 1.1 在 `app/utils.py` 頂部加入 `import re`
- [x] 1.2 實作 `validate_namecard_fields(card: dict) -> dict`：驗證 phone（台灣市話格式）、mobile（台灣手機格式）、email（標準格式）、line_id（4–20 字元英數字底線句點），不符格式設為 N/A
- [x] 1.3 實作 `merge_namecard_data(front: dict, back: dict) -> dict`：以正面為主，背面補充正面為 N/A 或空字串的欄位
- [x] 1.4 建立 `tests/test_utils.py`，為 `validate_namecard_fields` 新增測試
- [x] 1.5 為 `merge_namecard_data` 新增測試
- [x] 1.6 執行測試確認全部通過

## 2. OCR Prompt 更新（config.py）

- [x] 2.1 更新 `app/config.py` 的 `IMGAGE_PROMPT`：加入 `mobile`、`line_id` 兩個欄位說明

## 3. 資料模型擴展（firebase_utils.py、line_handlers.py）

- [x] 3.1 更新 `app/firebase_utils.py` `ALLOWED_EDIT_FIELDS`：加入 `"mobile"` 與 `"line_id"`
- [x] 3.2 更新 `app/line_handlers.py` `FIELD_LABELS`：加入 `"mobile": "手機"` 與 `"line_id": "LINE ID"`

## 4. Quick Reply 按鈕更新（line_handlers.py）

- [x] 4.1 在 `get_quick_reply_items()` 中，將「🧪 測試」按鈕替換為「🔍 搜尋名片」按鈕（`action=start_search`）

## 5. Flex Message 新欄位顯示（flex_messages.py）

- [x] 5.1 在 `get_namecard_flex_msg()` 加入 `mobile`、`line_id` 欄位讀取
- [x] 5.2 更新 body contents：mobile、line_id 欄位固定顯示（N/A 時也顯示）；edit options 新增手機與 LINE ID

## 6. 雙面掃描流程（line_handlers.py）

- [x] 6.1 重構 `handle_image_event`：無 state 時 OCR 後暫存 `scanning_back` state，回覆詢問背面
- [x] 6.2 加入 `scanning_back` state 處理：OCR 背面 → merge → validate → 儲存
- [x] 6.3 新增 `_save_and_reply_namecard()` helper
- [x] 6.4 `handle_postback_event` 加入 `scan_back` handler（移至 card_id guard 之前）
- [x] 6.5 `handle_postback_event` 加入 `save_front` handler（移至 card_id guard 之前）

## 7. 智慧搜尋重構（line_handlers.py）

- [x] 7.1 `handle_postback_event` 加入 `start_search` handler
- [x] 7.2 `handle_postback_event` 加入 `cancel_search` handler
- [x] 7.3 `handle_text_event` 加入 `searching` state 處理
- [x] 7.4 移除 `handle_text_event` 末尾的 fallback，改回覆引導文字

## 8. 整合驗證

- [x] 8.1 執行完整測試：16 passed
- [x] 8.2 驗證 app 可正常 import
- [x] 8.3 部署至 Cloud Run 並驗收通過
