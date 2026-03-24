## MODIFIED Requirements

### Requirement: 成員清單顯示 LINE 真實暱稱
成員清單 SHALL 顯示每位成員的 LINE 顯示名稱（`display_name`），而非 user_id 後 8 碼。名稱來源為 `line-display-name` 能力提供的快取機制。

#### Scenario: 顯示成員清單
- **WHEN** 使用者查看成員清單（輸入「成員」或點擊 Quick Reply「👤 成員」）
- **THEN** 每位成員列 SHALL 顯示其 LINE 暱稱（如「David Lin」），而非「...abc12345」格式的 uid 截斷

#### Scenario: 某成員名稱無法取得
- **WHEN** 成員清單中某 user_id 無法從 LINE API 取得暱稱（如封鎖 Bot）
- **THEN** 該成員 SHALL fallback 顯示 `user_id[-8:]`，其他成員不受影響
