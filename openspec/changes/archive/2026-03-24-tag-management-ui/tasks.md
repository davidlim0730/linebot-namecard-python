## 1. 移除文字指令

- [x] 1.1 在 `line_handlers.py` 的 `handle_text_event` 移除 `msg.replace("　", " ").startswith("新增角色")` 和 `msg.replace("　", " ").startswith("刪除標籤")` 兩個 elif 分支
- [x] 1.2 刪除 `handle_add_role_tag` 和 `handle_delete_role_tag` 兩個函式

## 2. 修改 tag_list_flex 增加管理按鈕

- [x] 2.1 修改 `flex_messages.py` 的 `tag_list_flex` 簽名，新增 `is_admin: bool = False` 參數
- [x] 2.2 當 `is_admin=True` 時，在 Flex Message 底部新增 footer 區塊，包含「⚙️ 管理標籤」按鈕（postback `action=manage_tags`）
- [x] 2.3 修改 `line_handlers.py` 的 `handle_show_tags` 簽名，新增 `user_id` 參數；查詢使用者角色後傳入 `is_admin` 給 `tag_list_flex`
- [x] 2.4 更新所有呼叫 `handle_show_tags` 的地方（文字指令路由 + `show_tags` postback），傳入 `user_id`

## 3. 新增標籤管理 Flex Message

- [x] 3.1 在 `flex_messages.py` 新增 `tag_management_flex(tags)` — 管理介面 Flex Message：mega size，每個標籤一列，右方有🗑️按鈕（postback `action=confirm_delete_tag&tag_name={name}`），底部有「➕ 新增標籤」按鈕（postback `action=add_tag_input`）和「↩️ 返回標籤清單」按鈕（postback `action=show_tags`）（Flex Message preview：mega bubble，header「⚙️ 標籤管理」，每列「合作夥伴 [🗑️]」，footer 兩顆按鈕）
- [x] 3.2 在 `flex_messages.py` 新增 `confirm_delete_tag_flex(tag_name)` — 刪除確認 Flex Message：顯示「確定要刪除標籤「X」嗎？已貼上此標籤的名片不受影響。」+ 「確認刪除」按鈕（postback `action=exec_delete_tag&tag_name={name}`）和「取消」按鈕（postback `action=manage_tags`）

## 4. 新增 Postback Handlers

- [x] 4.1 在 `handle_postback_event` 新增 `manage_tags` action：管理員檢查 → 呼叫 `ensure_default_role_tags` + `get_all_role_tags`，回覆 `tag_management_flex`；非管理員回覆「此功能僅限管理員使用。」
- [x] 4.2 在 `handle_postback_event` 新增 `add_tag_input` action：管理員檢查 → 設定 `user_states[user_id] = {'action': 'adding_tag', 'org_id': org_id}`，回覆「請輸入新標籤名稱：」
- [x] 4.3 在 `handle_postback_event` 新增 `confirm_delete_tag` action：管理員檢查 → 回覆 `confirm_delete_tag_flex(tag_name)`
- [x] 4.4 在 `handle_postback_event` 新增 `exec_delete_tag` action：管理員檢查 → 呼叫 `delete_role_tag` → 回覆確認 + 重新顯示管理介面

## 5. 新增 adding_tag 文字狀態處理

- [x] 5.1 在 `handle_text_event` 的 user_action 檢查中新增 `elif user_action == 'adding_tag'` 分支，呼叫 `handle_adding_tag_state`
- [x] 5.2 新增 `handle_adding_tag_state` 函式：取得 `org_id` 從 state，呼叫 `add_role_tag`，成功則回覆確認並重新顯示管理介面；重複則回覆「此標籤已存在。」；最後 `del user_states[user_id]`
