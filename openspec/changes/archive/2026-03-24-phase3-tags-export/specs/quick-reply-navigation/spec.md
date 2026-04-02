## MODIFIED Requirements

### Requirement: Quick Reply 涵蓋名片與團隊功能
每次 Bot 回覆訊息時，SHALL 附上包含 10 顆按鈕的 Quick Reply，讓使用者探索所有主要功能。按鈕順序為：📊 統計、📋 列表、🏷 標籤、📤 匯出、👥 團隊、👤 成員、📨 邀請、🧪 測試、ℹ️ 說明、➕ 加入。

#### Scenario: 所有回覆都附 Quick Reply
- **WHEN** Bot 回覆任何文字或 Flex Message
- **THEN** 訊息下方 SHALL 出現 10 顆 Quick Reply 按鈕

### Requirement: 標籤與匯出按鈕透過 postback 觸發
🏷 標籤 和 📤 匯出 兩顆按鈕 SHALL 使用 postback action，由 `handle_postback_event` 統一處理。

#### Scenario: 點擊「🏷 標籤」按鈕
- **WHEN** 使用者點擊 Quick Reply 的「🏷 標籤」按鈕
- **THEN** 系統 SHALL 回覆與輸入「標籤」文字相同的標籤管理 Flex Message

#### Scenario: 點擊「📤 匯出」按鈕
- **WHEN** 使用者點擊 Quick Reply 的「📤 匯出」按鈕
- **THEN** 系統 SHALL 觸發匯出流程，回覆要求輸入 email
