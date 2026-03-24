## Requirements

### Requirement: Quick Reply 涵蓋名片與團隊功能
每次 Bot 回覆訊息時，SHALL 附上包含 8 顆按鈕的 Quick Reply，讓使用者探索所有主要功能。按鈕順序為：📊 統計、📋 列表、👥 團隊、👤 成員、📨 邀請、🧪 測試、ℹ️ 說明、➕ 加入。

#### Scenario: 所有回覆都附 Quick Reply
- **WHEN** Bot 回覆任何文字或 Flex Message
- **THEN** 訊息下方 SHALL 出現 8 顆 Quick Reply 按鈕

### Requirement: 團隊功能按鈕透過 postback 觸發
👥 團隊、👤 成員、📨 邀請 三顆按鈕 SHALL 使用 postback action（而非 message action），由 `handle_postback_event` 統一處理，保持文字指令相容。

#### Scenario: 點擊「👥 團隊」按鈕
- **WHEN** 使用者點擊 Quick Reply 的「👥 團隊」按鈕
- **THEN** 系統 SHALL 回覆與輸入「團隊」文字相同的 team_info Flex Message

#### Scenario: 點擊「👤 成員」按鈕
- **WHEN** 使用者點擊 Quick Reply 的「👤 成員」按鈕
- **THEN** 系統 SHALL 回覆與輸入「成員」文字相同的 member_list Flex Message

#### Scenario: 點擊「📨 邀請」按鈕
- **WHEN** 管理員點擊 Quick Reply 的「📨 邀請」按鈕
- **THEN** 系統 SHALL 回覆邀請碼 Flex Message（同文字指令「邀請」）

#### Scenario: 非管理員點擊「📨 邀請」
- **WHEN** 一般成員點擊「📨 邀請」按鈕
- **THEN** 系統 SHALL 回覆「此功能僅限管理員使用。」

### Requirement: 「➕ 加入」按鈕引導使用者輸入邀請碼
「➕ 加入」按鈕 SHALL 使用 message action 發送「加入 」（含尾部空格），引導使用者在後面補填邀請碼。

#### Scenario: 點擊「➕ 加入」按鈕
- **WHEN** 使用者點擊「➕ 加入」按鈕
- **THEN** LINE 輸入框 SHALL 自動填入「加入 」，使用者只需補填邀請碼後送出
