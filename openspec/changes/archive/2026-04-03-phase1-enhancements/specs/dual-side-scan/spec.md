## ADDED Requirements

### Requirement: 正面掃描後詢問背面
用戶傳送名片圖片後，系統 SHALL 執行正面 OCR，將結果暫存於 `user_states`，並詢問用戶是否有背面，提供「📷 有背面」與「✅ 直接儲存」兩個 Quick Reply 按鈕。

#### Scenario: 正面掃描成功後詢問背面
- **WHEN** 用戶傳送一張名片圖片，且當前無 `scanning_back` state
- **THEN** 系統顯示「已辨識：{name}（{company}）\n\n這張名片還有背面嗎？」並附上兩個 Quick Reply 按鈕：「📷 有背面」與「✅ 直接儲存」
- **THEN** `user_states[user_id]` 設為 `{'action': 'scanning_back', 'front_data': <ocr_result>}`

#### Scenario: 正面 OCR 失敗
- **WHEN** 用戶傳送一張圖片但 Gemini 回傳空結果或無法解析
- **THEN** 系統顯示錯誤訊息「無法解析這張名片，請再試一次。」
- **THEN** `user_states` 不設定任何 state

### Requirement: 背面掃描與合併
選擇「有背面」後，系統 SHALL 等待第二張圖片並與正面資料合併，合併策略為正面優先（背面僅補充正面為 N/A 或空字串的欄位）。

#### Scenario: 用戶點擊「有背面」
- **WHEN** 用戶點擊「📷 有背面」（postback `action=scan_back`），且 `user_states` 含有 `scanning_back` state
- **THEN** 系統回覆「請傳送名片背面照片 📷」

#### Scenario: 用戶傳送背面圖片
- **WHEN** `user_states[user_id]['action'] == 'scanning_back'` 且用戶傳送圖片
- **THEN** 系統執行背面 OCR
- **THEN** 以 `merge_namecard_data(front_data, back_data)` 合併：背面欄位只補充正面 N/A 或空字串欄位
- **THEN** 執行欄位格式驗證
- **THEN** 去重檢查後儲存至 Firebase
- **THEN** 清除 `user_states[user_id]`
- **THEN** 顯示完整名片 Flex Message 與成功訊息

#### Scenario: 正面欄位優先於背面
- **WHEN** 正面的 `name` 為「John」，背面的 `name` 為「Wrong Name」
- **THEN** 合併結果的 `name` MUST 為「John」

#### Scenario: 背面補充正面 N/A 欄位
- **WHEN** 正面的 `email` 為 N/A，背面的 `email` 為「john@example.com」
- **THEN** 合併結果的 `email` MUST 為「john@example.com」

### Requirement: 直接儲存正面資料
用戶選擇不掃描背面時，系統 SHALL 驗證正面資料後直接儲存。

#### Scenario: 用戶點擊「直接儲存」
- **WHEN** 用戶點擊「✅ 直接儲存」（postback `action=save_front`），且 `user_states` 含有 `scanning_back` state
- **THEN** 系統取出 `front_data`，執行欄位格式驗證
- **THEN** 清除 `user_states[user_id]`
- **THEN** 去重檢查後儲存，顯示名片 Flex Message

#### Scenario: save_front 無對應 state
- **WHEN** postback `action=save_front` 觸發，但 `user_states` 無 `scanning_back` state
- **THEN** 系統回覆「找不到待儲存的名片資料，請重新掃描。」
