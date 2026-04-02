## 1. 基礎工具函式（utils.py）

- [ ] 1.1 在 `app/utils.py` 頂部加入 `import re`
- [ ] 1.2 實作 `validate_namecard_fields(card: dict) -> dict`：驗證 phone（台灣市話格式）、mobile（台灣手機格式）、email（標準格式）、line_id（4–20 字元英數字底線句點），不符格式設為 N/A
- [ ] 1.3 實作 `merge_namecard_data(front: dict, back: dict) -> dict`：以正面為主，背面補充正面為 N/A 或空字串的欄位
- [ ] 1.4 建立 `tests/test_utils.py`，為 `validate_namecard_fields` 新增測試：有效/無效 phone、mobile、email、line_id、N/A 保持不變、缺失欄位不被新增
- [ ] 1.5 為 `merge_namecard_data` 新增測試：背面補充 N/A 欄位、不覆蓋正面、新增正面沒有的欄位、空字串視為 N/A
- [ ] 1.6 執行測試確認全部通過：`python -m pytest tests/test_utils.py -v`

## 2. OCR Prompt 更新（config.py）

- [ ] 2.1 更新 `app/config.py` 的 `IMGAGE_PROMPT`：加入 `mobile`、`line_id` 兩個欄位說明，明確指示 phone（市話）與 mobile（手機）為不同欄位，line_id 從名片上的 LINE: 或 ID: 標示辨識

## 3. 資料模型擴展（firebase_utils.py、line_handlers.py）

- [ ] 3.1 更新 `app/firebase_utils.py` `ALLOWED_EDIT_FIELDS`（line 426）：加入 `"mobile"` 與 `"line_id"`
- [ ] 3.2 更新 `app/line_handlers.py` `FIELD_LABELS`（lines 13–16）：加入 `"mobile": "手機"` 與 `"line_id": "LINE ID"`

## 4. Quick Reply 按鈕更新（line_handlers.py）

- [ ] 4.1 在 `app/line_handlers.py` `get_quick_reply_items()` 中，將「🧪 測試」按鈕（`action=show_test`）替換為「🔍 搜尋名片」按鈕（`action=start_search`）；預期：Quick Reply 共 10 個按鈕，含「🔍 搜尋名片」

## 5. Flex Message 新欄位顯示（flex_messages.py）

- [ ] 5.1 在 `app/flex_messages.py` `get_namecard_flex_msg()` 中，於 line 99 後加入 `mobile = card_data.get("mobile", "N/A")` 與 `line_id = card_data.get("line_id", "N/A")`
- [ ] 5.2 更新 body contents：Phone 列後條件插入 Mobile 列（mobile != N/A 時顯示），Email 列後條件插入 LINE ID 列（line_id != N/A 時顯示）；預期：有值時顯示對應列，N/A 時該列不出現

## 6. 雙面掃描流程（line_handlers.py）

- [ ] 6.1 重構 `handle_image_event`：無 state 時執行正面 OCR → 暫存 `user_states[user_id] = {'action': 'scanning_back', 'front_data': card_obj}` → 回覆「已辨識：{name}（{company}）\n\n這張名片還有背面嗎？」並附「📷 有背面」與「✅ 直接儲存」Quick Reply
- [ ] 6.2 在 `handle_image_event` 中加入 `scanning_back` state 處理：OCR 背面 → `merge_namecard_data` → `validate_namecard_fields` → 去重 → 儲存 → 清除 state → 顯示 Flex Message
- [ ] 6.3 新增 `_save_and_reply_namecard(event, user_id, org_id, card_obj)` helper：去重、儲存、回覆名片 Flex Message（供正面直接儲存與雙面合併共用）
- [ ] 6.4 在 `handle_postback_event` 加入 `scan_back` handler：state 存在時回覆「請傳送名片背面照片 📷」，否則回覆找不到正面資料的錯誤訊息
- [ ] 6.5 在 `handle_postback_event` 加入 `save_front` handler：取出 front_data → `validate_namecard_fields` → 清除 state → 呼叫 `_save_and_reply_namecard`

## 7. 智慧搜尋重構（line_handlers.py）

- [ ] 7.1 在 `handle_postback_event` 加入 `start_search` handler：設定 `user_states[user_id] = {'action': 'searching'}` → 回覆「🔍 請輸入姓名、公司或職稱關鍵字：」並附「❌ 取消」Quick Reply
- [ ] 7.2 在 `handle_postback_event` 加入 `cancel_search` handler：清除 state → 回覆「已取消搜尋。」並恢復標準 Quick Reply
- [ ] 7.3 在 `handle_text_event` 加入 `searching` state 處理：清除 state 後呼叫 `handle_smart_query`
- [ ] 7.4 移除 `handle_text_event` 末尾的 `else: await handle_smart_query(...)` fallback，改為回覆「找不到對應指令，請點下方按鈕操作。」並附標準 Quick Reply

## 8. 整合驗證

- [ ] 8.1 執行完整測試：`python -m pytest tests/ -v`，確認全部通過
- [ ] 8.2 驗證 app 可正常 import：`python -c "from app import main; print('OK')"`
