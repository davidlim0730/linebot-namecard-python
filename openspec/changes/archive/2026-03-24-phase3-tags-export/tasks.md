## 1. Firebase 標籤資料層

- [x] 1.1 在 `firebase_utils.py` 新增 `ensure_default_role_tags(org_id)` — 檢查 `organizations/{org_id}/tags/roles/` 是否為空，若空則寫入 5 個預設角色標籤（合作夥伴、供應商、客戶、同業、媒體/KOL）
- [x] 1.2 在 `firebase_utils.py` 新增 `add_role_tag(org_id, tag_name)` — 檢查重複後寫入 `organizations/{org_id}/tags/roles/{push_id}`，回傳 True/False
- [x] 1.3 在 `firebase_utils.py` 新增 `delete_role_tag(org_id, tag_name)` — 搜尋 roles 路徑找到後刪除，回傳 True/False
- [x] 1.4 在 `firebase_utils.py` 新增 `get_all_role_tags(org_id)` — 回傳角色標籤名稱 list
- [x] 1.5 在 `firebase_utils.py` 新增 `add_card_role_tag(org_id, card_id, tag_name)` — 讀取現有 `role_tags` 陣列，append 後寫回
- [x] 1.6 在 `firebase_utils.py` 新增 `remove_card_role_tag(org_id, card_id, tag_name)` — 從 `role_tags` 陣列移除指定值
- [x] 1.7 在 `firebase_utils.py` 新增 `get_cards_by_role_tag(org_id, tag_name)` — 讀取所有名片，篩選 `role_tags` 包含 tag_name 的名片，回傳 `{card_id: card_data}` dict

## 2. 標籤管理文字指令 Handler

- [x] 2.1 在 `line_handlers.py` 新增「標籤」/「tags」文字指令 handler（`handle_show_tags`）：呼叫 `ensure_default_role_tags`，再呼叫 `get_all_role_tags`，統計每個標籤的名片數量，回覆標籤清單 Flex Message
- [x] 2.2 在 `line_handlers.py` 新增「新增角色 <名稱>」指令 handler：管理員限定，呼叫 `add_role_tag`，回覆成功/重複/錯誤訊息
- [x] 2.3 在 `line_handlers.py` 新增「刪除標籤 <名稱>」指令 handler：管理員限定，呼叫 `delete_role_tag`，回覆成功/找不到訊息

## 3. 名片標籤指派流程

- [x] 3.1 在名片詳情 Flex Message（`flex_messages.py` 的 `get_namecard_flex_msg`）footer 新增「🏷 標籤」按鈕，postback data 為 `action=tag_card&card_id={card_id}`
- [x] 3.2 在 `handle_postback_event` 新增 `tag_card` action 分支：讀取組織角色標籤清單和名片現有 `role_tags`，回覆角色標籤選項 Flex Message（已選標示 ✓，點擊可 toggle）（Flex Message preview：bubble 列出所有角色標籤，每列可點擊，已選的前方標示 ✓）
- [x] 3.3 在 `handle_postback_event` 新增 `toggle_role` action 分支：若名片已有此 role tag 則呼叫 `remove_card_role_tag`，否則呼叫 `add_card_role_tag`，完成後重新顯示角色標籤選單

## 4. 標籤名片列表查詢

- [x] 4.1 在 `handle_postback_event` 新增 `list_by_tag` action 分支：呼叫 `get_cards_by_role_tag`，若無結果回覆「此標籤下尚無名片。」；若有結果回覆前 5 張名片 Flex Message，超過 5 張時附文字提示「共 N 張名片，顯示前 5 張」

## 5. Flex Message 模板

- [x] 5.1 在 `flex_messages.py` 新增 `tag_list_flex(role_tags, tag_counts)` — 標籤清單 Flex Message，每列顯示標籤名稱 + 名片數量，點擊觸發 postback `action=list_by_tag&tag_name={name}`（Flex Message preview：bubble，header「🏷 角色標籤」，body 每列「客戶 (5)」可點擊）
- [x] 5.2 在 `flex_messages.py` 新增 `role_tag_select_flex(card_id, tags, current_tags)` — 角色標籤 toggle 選項列表，已選標示 ✓，每項 postback `action=toggle_role&card_id={card_id}&tag_name={name}`（Flex Message preview：bubble 列出所有角色標籤，已選的顯示「✓ 客戶」，未選的顯示「○ 供應商」）
- [x] 5.3 修改 `get_namecard_flex_msg` 在 body 中顯示名片角色標籤：role_tags 以逗號分隔文字顯示在 memo 下方（Flex Message preview：名片資訊下方新增一列「🏷 客戶, 合作夥伴」，無標籤時不顯示此列）

## 6. CSV 匯出

- [x] 6.1 新增 `app/csv_export.py`：`generate_csv(cards_dict, org_name)` 函式，接收名片 dict，回傳 UTF-8 BOM 編碼的 CSV bytes。欄位順序：name, title, company, address, phone, email, memo, role_tags, added_by, created_at
- [x] 6.2 在 `app/csv_export.py` 新增 `send_csv_email(csv_bytes, to_email, org_name)` 函式：用 `smtplib` + `SMTP_USER` / `SMTP_PASSWORD` 環境變數寄送 CSV 附件，主旨「名片匯出 - {org_name}」，附件名 `namecards_{YYYY-MM-DD}.csv`
- [x] 6.3 在 `app/config.py` 新增 `SMTP_USER` 和 `SMTP_PASSWORD` 可選環境變數（不設定不中斷啟動）
- [x] 6.4 在 `line_handlers.py` 新增「匯出」/「export」文字指令 handler（`handle_export`）：檢查 SMTP 設定，若未設定回覆提示；否則進入 `user_states` 的 `exporting_csv` 狀態，回覆要求輸入 email
- [x] 6.5 在 `line_handlers.py` 新增 `handle_export_email_state`：驗證 email 格式（含 @ 和 domain），無效則回覆提示維持狀態；有效則呼叫 `generate_csv` + `send_csv_email`，成功回覆確認，失敗回覆錯誤

## 7. Quick Reply 擴充

- [x] 7.1 修改 `get_quick_reply_items()` 新增「🏷 標籤」（postback `action=show_tags`）和「📤 匯出」（postback `action=show_export`）按鈕，調整順序為：📊 統計、📋 列表、🏷 標籤、📤 匯出、👥 團隊、👤 成員、📨 邀請、🧪 測試、ℹ️ 說明、➕ 加入（共 10 顆）
- [x] 7.2 在 `handle_postback_event` 新增 `show_tags` action → 呼叫 `handle_show_tags`；`show_export` action → 呼叫 `handle_export`
- [x] 7.3 確認文字指令「標籤」「匯出」仍可正常觸發（相容性不破壞）

## 8. Google Sheets 同步更新

- [x] 8.1 更新 `gsheets_utils.py` 的同步邏輯，新增 `role_tags` 欄位到 Google Sheets 輸出
