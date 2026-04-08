## ADDED Requirements

### Requirement: New user sees organization selection prompt
新用戶（無 org）發送任何訊息時，系統 SHALL 攔截該訊息並回覆 onboarding 選擇訊息，不執行後續業務邏輯。

#### Scenario: New user sends text message
- **WHEN** 用戶無 org 且發送文字訊息（非「加入 <code>」格式）
- **THEN** 系統回覆「歡迎使用名片管理機器人 👋\n請先選擇「建立團隊」或是「加入既有團隊」」並附帶兩個 Quick Reply 按鈕

#### Scenario: New user sends image
- **WHEN** 用戶無 org 且上傳圖片
- **THEN** 系統回覆 onboarding 選擇訊息，不進行 OCR

#### Scenario: New user triggers postback
- **WHEN** 用戶無 org 且觸發任何 postback（`action=create_org` 除外）
- **THEN** 系統回覆 onboarding 選擇訊息，不執行 postback 對應邏輯

#### Scenario: New user ignores prompt and sends another message
- **WHEN** 用戶無 org 且在收到 onboarding 提示後繼續發送任何訊息
- **THEN** 系統再次回覆 onboarding 選擇訊息

### Requirement: New user can create a team
新用戶選擇「建立團隊」時，系統 SHALL 建立 org 並設定用戶為 admin。

#### Scenario: User selects create team
- **WHEN** 用戶點擊「🏢 建立團隊」按鈕（postback `action=create_org`）
- **THEN** 系統建立 org，用戶為 admin，推播 trial welcome 訊息，並回覆「您的團隊已建立！現在可以開始掃描名片了。📇」

### Requirement: New user can join an existing team
新用戶選擇「加入既有團隊」時，系統 SHALL 引導用戶輸入邀請碼。

#### Scenario: User selects join team
- **WHEN** 用戶點擊「🔗 加入既有團隊」按鈕（message action，text 為「加入 」）
- **THEN** 用戶的文字輸入框預填「加入 」，引導用戶補上邀請碼後送出

#### Scenario: User submits invite code
- **WHEN** 用戶輸入「加入 <code>」（無 org 狀態）
- **THEN** 走現有 handle_join 流程，驗證邀請碼並加入 org

### Requirement: Existing users are unaffected
已有 org 的用戶 SHALL 不受 onboarding 攔截影響。

#### Scenario: Existing user sends any message
- **WHEN** 用戶已有 org 且發送任何訊息
- **THEN** 系統跳過 onboarding 攔截，正常執行業務邏輯
