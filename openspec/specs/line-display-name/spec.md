## Requirements

### Requirement: 取得並快取 LINE 顯示名稱
系統 SHALL 透過 LINE Profile API 取得使用者的真實暱稱，並快取於 Firebase `user_profiles/{user_id}/display_name`，避免重複呼叫 API。

#### Scenario: 首次取得名稱（無快取）
- **WHEN** 系統需要顯示某 user_id 的名稱，且 `user_profiles/{user_id}/display_name` 不存在
- **THEN** 系統 SHALL 呼叫 LINE Profile API 取得 `display_name`，寫入 Firebase 快取，並回傳該名稱

#### Scenario: 有快取時直接使用
- **WHEN** 系統需要顯示某 user_id 的名稱，且 `user_profiles/{user_id}/display_name` 已存在
- **THEN** 系統 SHALL 直接回傳快取名稱，不呼叫 LINE API

#### Scenario: LINE API 呼叫失敗
- **WHEN** LINE Profile API 回傳錯誤（使用者封鎖 Bot、網路異常等）
- **THEN** 系統 SHALL 捕捉例外並 fallback 回傳 `user_id[-8:]`，不中斷主流程
