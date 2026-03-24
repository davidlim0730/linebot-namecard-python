## ADDED Requirements

### Requirement: 管理員可從標籤清單進入管理介面
管理員 SHALL 可在標籤清單 Flex Message 底部看到「⚙️ 管理標籤」按鈕。一般成員不可見此按鈕。

#### Scenario: 管理員查看標籤清單
- **WHEN** 管理員點擊「🏷 標籤」或輸入「標籤」
- **THEN** 標籤清單底部 SHALL 出現「⚙️ 管理標籤」按鈕

#### Scenario: 一般成員查看標籤清單
- **WHEN** 一般成員點擊「🏷 標籤」或輸入「標籤」
- **THEN** 標籤清單 SHALL 不顯示「⚙️ 管理標籤」按鈕

### Requirement: 標籤管理介面
管理員點擊「⚙️ 管理標籤」後 SHALL 看到管理介面 Flex Message，列出所有標籤並提供新增和刪除操作。

#### Scenario: 開啟管理介面
- **WHEN** 管理員點擊「⚙️ 管理標籤」
- **THEN** 系統 SHALL 顯示管理介面，每個標籤旁有🗑️刪除按鈕，底部有「➕ 新增標籤」按鈕

#### Scenario: 非管理員嘗試開啟管理介面
- **WHEN** 非管理員觸發 `manage_tags` postback
- **THEN** 系統 SHALL 回覆「此功能僅限管理員使用。」

### Requirement: 透過 UI 新增標籤
管理員 SHALL 可在管理介面點擊「➕ 新增標籤」進入文字輸入模式，輸入標籤名稱完成新增。

#### Scenario: 管理員新增標籤
- **WHEN** 管理員點擊「➕ 新增標籤」，系統提示輸入名稱後，管理員輸入「顧問」
- **THEN** 系統 SHALL 新增標籤並回覆確認訊息，重新顯示管理介面

#### Scenario: 新增重複標籤
- **WHEN** 管理員輸入已存在的標籤名稱
- **THEN** 系統 SHALL 回覆「此標籤已存在。」

### Requirement: 透過 UI 刪除標籤（需確認）
管理員 SHALL 可在管理介面點擊標籤旁的🗑️按鈕刪除標籤。刪除前 SHALL 顯示確認訊息。

#### Scenario: 管理員刪除標籤 — 確認
- **WHEN** 管理員點擊🗑️按鈕，確認 Flex Message 出現後點「確認刪除」
- **THEN** 系統 SHALL 刪除標籤並回覆確認訊息，重新顯示管理介面

#### Scenario: 管理員刪除標籤 — 取消
- **WHEN** 管理員點擊🗑️按鈕，確認 Flex Message 出現後點「取消」
- **THEN** 系統 SHALL 返回管理介面，不刪除標籤
