## ADDED Requirements

### Requirement: 搜尋模式由按鈕觸發
系統 SHALL 提供「🔍 搜尋名片」Quick Reply 按鈕（postback `action=start_search`），點擊後進入 `searching` state，提示用戶輸入關鍵字。

#### Scenario: 點擊搜尋按鈕
- **WHEN** 用戶點擊「🔍 搜尋名片」（postback `action=start_search`）
- **THEN** 系統設定 `user_states[user_id] = {'action': 'searching'}`
- **THEN** 系統回覆「🔍 請輸入姓名、公司或職稱關鍵字：」並附上「❌ 取消」Quick Reply 按鈕

### Requirement: 搜尋模式下輸入關鍵字執行搜尋
用戶在 `searching` state 下輸入任何文字，系統 SHALL 清除 state 後執行 LLM 智慧搜尋。

#### Scenario: 搜尋模式下輸入關鍵字
- **WHEN** `user_states[user_id]['action'] == 'searching'` 且用戶傳送文字訊息
- **THEN** 系統清除 `user_states[user_id]`
- **THEN** 系統以該文字作為查詢呼叫 `handle_smart_query`，顯示搜尋結果

### Requirement: 取消搜尋模式
用戶可隨時點擊「❌ 取消」離開搜尋模式。

#### Scenario: 點擊取消
- **WHEN** 用戶點擊「❌ 取消」（postback `action=cancel_search`）
- **THEN** 系統清除 `user_states[user_id]`（若存在）
- **THEN** 系統回覆「已取消搜尋。」並恢復標準 Quick Reply 按鈕

### Requirement: 非 searching state 下的文字訊息不觸發搜尋
系統 SHALL 移除「任何文字 fallback 到 LLM 搜尋」的行為。

#### Scenario: 一般文字訊息無法匹配指令
- **WHEN** 用戶在非任何 state 下傳送任意文字（非已知指令）
- **THEN** 系統回覆「找不到對應指令，請點下方按鈕操作。」並顯示 Quick Reply 按鈕
- **THEN** 系統 MUST NOT 呼叫 Gemini LLM 進行搜尋

### Requirement: Quick Reply 包含搜尋按鈕
系統 SHALL 在標準 Quick Reply 中以「🔍 搜尋名片」取代原「🧪 測試」按鈕。

#### Scenario: Quick Reply 顯示搜尋按鈕
- **WHEN** 任何操作完成後顯示標準 Quick Reply
- **THEN** Quick Reply MUST 包含「🔍 搜尋名片」按鈕（postback `action=start_search`）
- **THEN** Quick Reply MUST NOT 包含「🧪 測試」按鈕
