# Onboarding Flow 修復設計

**日期**：2026-04-09
**狀態**：已核准，待實作

---

## 問題描述

現有架構中，`ensure_user_org(user_id)` 被所有事件 handler 無條件呼叫。新用戶只要發出任何訊息（非 `加入 xxx`），就會被立即建立個人組織，之後無法加入別人的團隊。

---

## 解決方案

在三個事件 handler 的入口加入 `check_onboarding` 攔截，若用戶無 org 則回覆 onboarding 選擇訊息，不繼續執行後續邏輯。

---

## 使用者流程

### 全新用戶（無 org）

```
用戶發任何訊息（文字 / 圖片 / postback）
    ↓
get_user_org_id → None → 攔截
    ↓
Bot 回覆 onboarding 訊息 + Quick Reply
    ↓
選「🏢 建立團隊」（postback action=create_org）
  → 呼叫 ensure_user_org → 建立 org，用戶為 admin
  → 推播 trial welcome 訊息
  → 下次訊息正常使用

選「🔗 加入既有團隊」（message text「加入 」）
  → Bot 回覆：「請輸入邀請碼，格式：加入 <邀請碼>」
  → 用戶輸入「加入 XXXXXX」→ 走現有 handle_join 流程

用戶忽略 Quick Reply 直接傳訊息 / 圖片
  → 再次顯示同一個 onboarding 訊息（持續攔截）
```

### 既有用戶（已有 org）

```
用戶發任何訊息 → get_user_org_id → 有 org → 不攔截，正常流程
```

---

## Onboarding 訊息文案

```
歡迎使用名片管理機器人 👋
請先選擇「建立團隊」或是「加入既有團隊」
```

Quick Reply 按鈕：
- `🏢 建立團隊` — postback `action=create_org`
- `🔗 加入既有團隊` — message text `加入 `（引導用戶輸入邀請碼）

---

## 技術設計

### 新增 helper：`check_onboarding`

```python
async def check_onboarding(user_id: str, reply_token: str) -> bool:
    """
    若用戶無 org，回覆 onboarding 選擇訊息並回傳 True（表示已攔截）。
    回傳 False 表示用戶已有 org，不攔截。
    """
    if firebase_utils.get_user_org_id(user_id):
        return False
    # 回覆 onboarding Quick Reply
    ...
    return True
```

### 攔截點

| Handler | 攔截位置 |
|---|---|
| `handle_text_event` | `加入 ` 攔截之後、`ensure_user_org` 之前 |
| `handle_image_event` | batch state 檢查之後、`ensure_user_org` 之前 |
| `handle_postback_event` | `ensure_user_org` 之前；`action=create_org` 本身不攔截 |

### `action=create_org` handler

新增 postback handler：
```python
elif action == 'create_org':
    org_id, is_new_org = firebase_utils.ensure_user_org(user_id)
    if is_new_org:
        await line_bot_api.push_message(user_id, flex_messages.get_trial_welcome_message())
    await line_bot_api.reply_message(event.reply_token, TextSendMessage(text='您的團隊已建立！現在可以開始掃描名片了。'))
```

### `ensure_user_org` 不改動

現有函式保持不變，仍負責「建立 org 並設定 admin」的邏輯。改動的只是呼叫時機。

---

## 不在本次範圍內

- 團隊管理 LIFF（留給 Phase 3）
- Welcome Message 輔助（LINE Official Account 設定，非程式碼）
