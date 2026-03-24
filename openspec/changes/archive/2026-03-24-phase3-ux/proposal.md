## Why

Phase 2 新增了團隊功能（團隊、成員、邀請等指令），但這些指令完全不在 Quick Reply 按鈕裡，使用者不知道這些功能存在。同時，成員顯示名稱目前用 user_id 後 8 碼，可讀性差，團隊管理員無法識別成員是誰。

## What Changes

- 重新設計 Quick Reply 按鈕，分為「名片」與「團隊」兩個情境，讓使用者能探索所有功能
- 成員顯示名稱改為呼叫 LINE Profile API 取得真實暱稱，並快取於 Firebase
- 管理員設定團隊名稱的 UX 已在 Phase 2 實作（`設定團隊名稱 <name>`），此 Phase 改善為可從選單操作

## Capabilities

### New Capabilities

- `quick-reply-navigation`: 重新設計 Quick Reply 按鈕群組，涵蓋名片與團隊兩大功能區
- `line-display-name`: 透過 LINE Profile API 取得使用者顯示名稱，快取於 `user_profiles/{user_id}/display_name`

### Modified Capabilities

- `team-namecard-access`: 成員清單的 `display_name` 改為 LINE 真實暱稱（原為 uid 後 8 碼）

## Non-goals

- 不實作 LINE LIFF（維持純 Bot 介面）
- 不做成員頭像顯示（LINE API 限制）
- 不實作分頁（成員超過 10 人的極端情境留 Phase 4）

## Impact

- `app/line_handlers.py`：`get_quick_reply_items()` 改為多情境版本
- `app/firebase_utils.py`：新增 `get_display_name(user_id)` 與快取寫入
- `app/flex_messages.py`：`member_list_flex` 成員列使用真實名稱
- `app/bot_instance.py`：新增 LINE Profile API 呼叫
- Firebase RTDB：新增 `user_profiles/{user_id}/display_name` 快取節點

**Roadmap Phase**: Phase 3
