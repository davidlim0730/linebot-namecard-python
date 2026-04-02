## REMOVED Requirements

### Requirement: 新增角色標籤（文字指令）
**Reason**: 文字指令「新增角色 X」與 Gemini 智慧搜尋的 catch-all handler 衝突，改由 tag-admin-ui 的 Postback 介面取代。
**Migration**: 管理員透過標籤清單 → ⚙️ 管理標籤 → ➕ 新增標籤操作。

### Requirement: 刪除標籤（文字指令）
**Reason**: 文字指令「刪除標籤 X」與 Gemini 智慧搜尋衝突，改由 tag-admin-ui 的 Postback 介面取代。
**Migration**: 管理員透過標籤清單 → ⚙️ 管理標籤 → 🗑️ 刪除操作。
