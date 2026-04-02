## Context

Phase 3 的標籤管理目前用文字指令實作（「新增角色 X」「刪除標籤 X」），會跟 Gemini 智慧搜尋的 catch-all handler 打架。Codebase 已有成熟的 Postback + Flex Message 互動模式（備註、編輯、標籤 toggle），可直接複用。

## Goals / Non-Goals

**Goals:**
- 管理員透過 Flex Message UI 完成標籤新增與刪除
- 完全移除文字指令，消除搜尋衝突
- 刪除操作需有確認步驟
- 新增標籤使用 `user_states` 輸入模式（與備註相同 pattern）

**Non-Goals:**
- 不做標籤重新命名
- 不做 LIFF 表單

## Decisions

### Decision 1：標籤管理入口

**選擇：在 tag_list_flex 加入「⚙️ 管理標籤」按鈕（僅管理員）**

流程：
1. 使用者點「🏷 標籤」→ 看到標籤清單（所有人）
2. 管理員在底部額外看到「⚙️ 管理標籤」按鈕 → postback `action=manage_tags`
3. 顯示 `tag_management_flex`：每個標籤旁有🗑️按鈕 + 底部「➕ 新增標籤」按鈕

需要修改 `tag_list_flex` 接受 `is_admin` 參數，條件式顯示管理按鈕。`handle_show_tags` 也需要傳入 `user_id` 以判斷角色。

---

### Decision 2：新增標籤流程

**選擇：點「➕ 新增標籤」→ 進入 user_states 文字輸入模式**

流程：
1. 管理員點「➕ 新增標籤」→ postback `action=add_tag_input`
2. Bot 回覆「請輸入新標籤名稱：」
3. 設定 `user_states[user_id] = {'action': 'adding_tag', 'org_id': org_id}`
4. 使用者輸入文字 → `handle_adding_tag_state` 處理
5. 呼叫 `firebase_utils.add_role_tag(org_id, tag_name)`
6. 成功回覆確認 + 重新顯示管理介面；重複回覆提示

**理由**：複用現有 `user_states` 模式，與 memo/edit 一致。使用者只需要輸入一次文字（標籤名稱），不是指令格式。

---

### Decision 3：刪除標籤流程

**選擇：兩步確認——點🗑️ → 確認 Flex Message → 確認刪除**

流程：
1. 管理員在管理介面點標籤旁🗑️ → postback `action=confirm_delete_tag&tag_name=X`
2. Bot 回覆確認 Flex Message：「確定要刪除標籤「X」嗎？已貼上此標籤的名片不受影響。」+ 「確認刪除」「取消」按鈕
3. 確認 → postback `action=exec_delete_tag&tag_name=X` → 刪除 + 重新顯示管理介面
4. 取消 → postback `action=manage_tags` → 返回管理介面

---

### Decision 4：handle_show_tags 需要 user_id

目前 `handle_show_tags` 只接收 `event` 和 `org_id`，但要判斷是否為管理員需要 `user_id`。修改簽名增加 `user_id` 參數。

## Risks / Trade-offs

- **user_states 衝突**：使用者在 `adding_tag` 狀態下收到的任何文字都會被當作標籤名稱。Mitigation：與 memo/edit 一致行為，使用者習慣。
- **刪除兩步確認增加操作步驟**：Mitigation：防止誤刪比操作效率更重要。
