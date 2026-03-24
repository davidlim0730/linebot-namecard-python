## Context

Phase 2 完成後，Bot 有兩大功能區：名片管理（掃描、搜尋、編輯）與團隊管理（查看團隊、成員、邀請）。目前 Quick Reply 只顯示名片相關的四顆按鈕（統計、列表、測試、說明），團隊功能完全沒有入口。另外成員清單顯示 `uid[-8:]` 作為名稱，管理員無法識別成員身份。

## Goals / Non-Goals

**Goals:**
- Quick Reply 按鈕涵蓋所有主要功能，讓使用者可探索
- 成員清單顯示 LINE 真實暱稱
- 暱稱快取在 Firebase，避免每次重複呼叫 LINE API

**Non-Goals:**
- 不做情境感知的動態 Quick Reply（根據 user state 切換），保持實作簡單
- 不顯示大頭貼（LINE Flex Message 圖片限制 HTTPS URL，且需 LIFF）

## Decisions

### Decision 1：Quick Reply 按鈕設計

**選擇：固定 8 顆按鈕，涵蓋名片與團隊兩區**

LINE Quick Reply 上限為 13 顆，設計 8 顆保留彈性：

| 按鈕 | 動作 |
|------|------|
| 📊 統計 | postback `action=show_stats` |
| 📋 列表 | postback `action=show_list` |
| 👥 團隊 | postback `action=show_team` |
| 👤 成員 | postback `action=show_members` |
| 📨 邀請 | postback `action=show_invite` |
| 🧪 測試 | postback `action=show_test` |
| ℹ️ 說明 | postback `action=show_help` |
| ➕ 加入 | message action，發送「加入 」提示 |

把原本的文字指令（`團隊`、`成員`、`邀請`）改為 postback，統一由 `handle_postback_event` 處理，文字指令仍保留相容。

**替代方案考量**：情境感知（名片模式 vs 團隊模式）實作複雜，且 user state 已用於 memo/edit 流程，不宜再疊加模式切換。

---

### Decision 2：LINE 顯示名稱取得方式

**選擇：呼叫 `line_bot_api.get_profile(user_id)` + Firebase 快取**

流程：
1. `get_display_name(user_id)` 先查 `user_profiles/{user_id}/display_name`
2. 若快取存在，直接回傳
3. 若無快取，呼叫 `await line_bot_api.get_profile(user_id)` 取得 `display_name`
4. 寫入 `user_profiles/{user_id}/display_name` 快取
5. 回傳名稱

**快取策略**：不設 TTL，名稱只在使用者主動更改 LINE 暱稱時才過期，實務上變動極少，不快取更新是可接受的 trade-off。

**替代方案考量**：每次呼叫 LINE API 會增加延遲（~200ms），且 Cloud Run 無狀態，無法用記憶體快取。Firebase 快取是最低成本的持久化方案。

---

### Decision 3：`get_display_name` 放在哪裡

**選擇：放在 `firebase_utils.py`，LINE API 呼叫透過參數注入**

`firebase_utils.py` 負責所有 Firebase 讀寫，快取邏輯自然放這裡。但 LINE API 呼叫（async）不應在同步的 firebase utils 裡直接執行。

做法：`handle_member_list` handler 負責呼叫 LINE API 取得名稱，firebase_utils 只負責快取讀寫：

```
handler:
  1. 呼叫 firebase_utils.get_cached_display_name(user_id) → 有快取直接用
  2. 若無，呼叫 line_bot_api.get_profile(user_id)
  3. 呼叫 firebase_utils.cache_display_name(user_id, name) 寫快取
  4. 組成 members list 傳給 flex_messages.member_list_flex
```

這樣 firebase_utils 不依賴 LINE SDK，維持平台解耦原則。

## Risks / Trade-offs

- **LINE API 失敗** → `get_profile` 可能拋例外（user 封鎖 Bot、API 限流）。Mitigation：catch exception，fallback 顯示 `uid[-8:]`
- **快取過時** → 使用者更改 LINE 暱稱後快取不更新。Mitigation：可接受，業務影響低；Phase 4 若需要可加定期刷新
- **Quick Reply 按鈕數量** → 8 顆在小螢幕需要橫向捲動。Mitigation：常用功能（統計、列表）放前面

## Open Questions

- `➕ 加入` 按鈕目前發送「加入 」文字讓使用者補填邀請碼；若未來有 LIFF，可改為輸入框。目前方案可接受。
