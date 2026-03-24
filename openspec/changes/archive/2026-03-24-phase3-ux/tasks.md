## 1. LINE 顯示名稱快取

- [x] 1.1 在 `firebase_utils.py` 新增 `get_cached_display_name(user_id)` — 讀取 `user_profiles/{user_id}/display_name`，有值回傳，無值回傳 `None`
- [x] 1.2 在 `firebase_utils.py` 新增 `cache_display_name(user_id, display_name)` — 寫入 `user_profiles/{user_id}/display_name`

## 2. Handler 整合顯示名稱

- [x] 2.1 修改 `line_handlers.py` 的 `handle_member_list`：對每個 member uid，先呼叫 `firebase_utils.get_cached_display_name(uid)`；若無快取則 `await line_bot_api.get_profile(uid)` 取得暱稱，再呼叫 `firebase_utils.cache_display_name`；若 API 失敗則 fallback `uid[-8:]`
- [x] 2.2 確認 `member_list_flex` 的 `display_name` 欄位能正確顯示中文暱稱（Flex Message preview：每列顯示「暱稱 + 角色標籤」）

## 3. Quick Reply 重新設計

- [x] 3.1 修改 `line_handlers.py` 的 `get_quick_reply_items()`，加入 `👥 團隊`（postback `action=show_team`）、`👤 成員`（postback `action=show_members`）、`📨 邀請`（postback `action=show_invite`）、`➕ 加入`（message action 發送「加入 」）四顆按鈕，移除原有只有四顆的版本，總計 8 顆
- [x] 3.2 在 `handle_postback_event` 新增三個 action 分支：`show_team` → 呼叫 `handle_team_info`；`show_members` → 呼叫 `handle_member_list`；`show_invite` → 呼叫 `handle_invite`
- [x] 3.3 確認文字指令「團隊」、「成員」、「邀請」仍可正常觸發（相容性不破壞）
