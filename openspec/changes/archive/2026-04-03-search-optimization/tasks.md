## 1. 本地關鍵字搜尋（line_handlers.py）

- [x] 1.1 重寫 `handle_smart_query`：移除 Gemini API 呼叫，改為對 `all_cards_dict` 做 `query in name.lower() or query in company.lower()` substring match
- [x] 1.2 無名片時回覆「目前團隊尚未建立任何名片。」
- [x] 1.3 無符合結果回覆「查無「{msg}」相關名片。」
- [x] 1.4 單筆結果回傳完整 `get_namecard_flex_msg`
- [x] 1.5 多筆結果回傳 `get_namecard_carousel_msg`（最多 10 筆），超過 10 筆附加提示文字
- [x] 1.6 搜尋迴圈加入 `if not isinstance(card_data, dict): continue` 防禦性跳過

## 2. 錯誤處理強化（line_handlers.py）

- [x] 2.1 `handle_smart_query` 的 except block 改為巢狀 try/except，防止 reply 失敗造成 500
- [x] 2.2 加入 `traceback.print_exc()` 以便在 Cloud Run logs 中查看原始例外

## 3. Compact bubble 更新（flex_messages.py）

- [x] 3.1 `get_compact_namecard_bubble` body 加入 phone、mobile、email 條件顯示列（值為空時不顯示）
- [x] 3.2 footer 加入「查看完整名片」postback 按鈕（`action=view_card&card_id={card_id}`）
- [x] 3.3 加入 `_str()` helper，所有欄位值統一 `str(val).strip()` 後使用

## 4. Flex Message 型別安全（flex_messages.py）

- [x] 4.1 `get_namecard_flex_msg` 加入 `_s()` helper（`str(val).strip() or default`）
- [x] 4.2 所有欄位讀取改用 `_s(card_data.get(field))` 確保為字串

## 5. Postback handler 修正（line_handlers.py）

- [x] 5.1 將 `scan_back`、`save_front`、`start_search`、`cancel_search` handler 移至 `if not card_name: return` guard 之前，確保無 card_id 的 action 正常執行

## 6. 驗證

- [x] 6.1 16 tests passed
- [x] 6.2 部署至 Cloud Run revision `linebot-namecard-00033-svk`
- [x] 6.3 LINE 聊天室驗收：搜尋姓名片段回傳正確結果，多筆結果顯示 carousel 含聯絡欄位與查看按鈕
