## ADDED Requirements

### Requirement: 組織角色標籤定義管理
系統 SHALL 支援組織層級的角色標籤定義管理。標籤儲存於 `organizations/{org_id}/tags/roles/` 下。

#### Scenario: 組織首次使用標籤功能自動初始化預設角色標籤
- **WHEN** 組織中任何成員首次觸發標籤相關功能（查看標籤、為名片加標籤）
- **THEN** 系統 SHALL 檢查該組織是否已有角色標籤定義，若無則自動建立 5 個預設角色標籤：「合作夥伴」「供應商」「客戶」「同業」「媒體/KOL」

### Requirement: 新增角色標籤
管理員 SHALL 可透過文字指令 `新增角色 <名稱>` 新增一個角色標籤到組織的標籤定義中。

#### Scenario: 管理員成功新增角色標籤
- **WHEN** 管理員輸入「新增角色 顧問」
- **THEN** 系統 SHALL 在 `organizations/{org_id}/tags/roles/` 新增該標籤，並回覆確認訊息

#### Scenario: 非管理員嘗試新增角色標籤
- **WHEN** 一般成員輸入「新增角色 顧問」
- **THEN** 系統 SHALL 回覆「此功能僅限管理員使用。」

#### Scenario: 標籤名稱重複
- **WHEN** 管理員新增一個已存在的角色標籤名稱（含預設標籤）
- **THEN** 系統 SHALL 回覆「此標籤已存在。」，不重複建立

### Requirement: 刪除角色標籤
管理員 SHALL 可透過文字指令 `刪除標籤 <名稱>` 刪除組織中的角色標籤定義。

#### Scenario: 管理員成功刪除標籤
- **WHEN** 管理員輸入「刪除標籤 顧問」且該標籤存在
- **THEN** 系統 SHALL 從標籤定義中移除該標籤，並回覆確認訊息。已貼上此標籤的名片不受影響（保留歷史字串）。

#### Scenario: 刪除不存在的標籤
- **WHEN** 管理員輸入「刪除標籤 不存在的標籤」
- **THEN** 系統 SHALL 回覆「找不到此標籤。」

### Requirement: 查看標籤清單
使用者 SHALL 可透過 Quick Reply「🏷 標籤」按鈕或文字指令「標籤」查看組織的所有角色標籤。

#### Scenario: 查看標籤清單
- **WHEN** 使用者點擊「🏷 標籤」或輸入「標籤」
- **THEN** 系統 SHALL 回覆標籤清單，顯示每個角色標籤及其名片數量，點擊標籤可查看名片列表

### Requirement: 為名片指派角色標籤
使用者 SHALL 可從名片詳情頁面為名片指派一或多個角色標籤（多選 toggle）。

#### Scenario: 為名片新增角色標籤
- **WHEN** 使用者在名片詳情點擊「🏷 標籤」，選擇「客戶」
- **THEN** 系統 SHALL 將「客戶」加入 `namecard/{org_id}/{card_id}/role_tags` 陣列

#### Scenario: 移除名片的角色標籤
- **WHEN** 使用者點擊已選取的角色標籤（標示 ✓ 的項目）
- **THEN** 系統 SHALL 從 `role_tags` 陣列中移除該標籤

### Requirement: 名片詳情顯示標籤
名片詳情 Flex Message SHALL 顯示該名片的角色標籤。

#### Scenario: 名片有角色標籤時的顯示
- **WHEN** 顯示一張有 `role_tags: ["客戶", "合作夥伴"]` 的名片
- **THEN** Flex Message SHALL 在名片資訊中顯示角色標籤

#### Scenario: 名片無標籤時的顯示
- **WHEN** 顯示一張沒有任何角色標籤的名片
- **THEN** Flex Message SHALL 不顯示標籤區塊
