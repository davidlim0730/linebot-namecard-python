## ADDED Requirements

### Requirement: 點選標籤查看名片列表
使用者 SHALL 可從標籤清單中點選任一標籤，查看該標籤下的所有名片。

#### Scenario: 點擊標籤查看名片列表
- **WHEN** 使用者在標籤清單中點擊「客戶」標籤
- **THEN** 系統 SHALL 讀取組織所有名片，篩選 `role_tags` 包含「客戶」的名片，以 Flex Message 列表回覆（最多 5 張）

#### Scenario: 標籤下無名片
- **WHEN** 使用者點擊一個沒有任何名片的標籤
- **THEN** 系統 SHALL 回覆「此標籤下尚無名片。」

#### Scenario: 標籤下超過 5 張名片
- **WHEN** 標籤下有超過 5 張名片
- **THEN** 系統 SHALL 回覆前 5 張名片 Flex Message，並附文字提示「共 N 張名片，顯示前 5 張」

### Requirement: 標籤查詢不經過 Gemini
標籤名片列表 SHALL 使用結構化比對（字串匹配），不呼叫 Gemini API。原有純文字搜尋行為不受影響。

#### Scenario: 標籤查詢使用本地篩選
- **WHEN** 使用者透過標籤查看名片列表
- **THEN** 系統 SHALL 使用結構化字串匹配篩選，不呼叫 Gemini API
