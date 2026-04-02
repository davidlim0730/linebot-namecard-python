## Why

Phase 3 新增了角色標籤管理功能，但使用文字指令（「新增角色 X」「刪除標籤 X」）實作。這些指令會跟 Gemini 智慧搜尋打架——使用者輸入的文字可能被錯誤路由到指令處理，或反過來指令被送進 Gemini 搜尋回覆「查無相關名片」。需要將標籤管理改為 Postback + Flex Message UI 操作，徹底消除文字指令衝突。

## What Changes

- **BREAKING**：移除「新增角色 X」和「刪除標籤 X」兩個文字指令
- 標籤清單 Flex Message 增加「⚙️ 管理標籤」按鈕（僅管理員可見）
- 新增「標籤管理」Flex Message：列出所有標籤，每個標籤旁有刪除按鈕
- 新增標籤：管理員點「➕ 新增標籤」按鈕後，進入 `user_states` 輸入模式（與備註功能相同的 pattern），輸入標籤名稱完成新增
- 刪除標籤：點擊刪除按鈕後顯示確認訊息，避免誤刪

## Capabilities

### New Capabilities

- `tag-admin-ui`: 管理員透過 Flex Message UI（而非文字指令）新增與刪除角色標籤

### Modified Capabilities

- `tag-management`: 移除文字指令「新增角色」「刪除標籤」，改由 postback 介面取代

## Non-goals

- 不做標籤重新命名功能
- 不做標籤排序自訂
- 不做 LIFF 或 Rich Menu（維持純 Bot 介面）
- Firebase schema 無變更

## Impact

- `app/line_handlers.py`：移除 `handle_add_role_tag`、`handle_delete_role_tag` 文字指令路由；新增 `manage_tags`、`add_tag_input`、`confirm_delete_tag`、`exec_delete_tag` postback handlers；新增 `adding_tag` user_state 處理
- `app/flex_messages.py`：修改 `tag_list_flex` 增加管理按鈕；新增 `tag_management_flex`、`confirm_delete_tag_flex`

**Roadmap Phase**: Phase 3（標籤系統 UX 改善）
