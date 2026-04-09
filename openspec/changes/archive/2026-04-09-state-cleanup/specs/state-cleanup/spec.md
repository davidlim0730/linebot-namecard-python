# Spec: State Cleanup & Universal Cancel

## Overview

解決 `user_states` 與 `batch_state` 殘留問題，提供通用取消逃生門。

---

## Behavior

### 1. 頂層指令清除 `user_states`

當 `handle_text_event` 收到以下任何指令時，**先清除 `user_states[user_id]`**，再執行對應邏輯：

```
新增、搜尋、查詢、匯出、export、管理、取消、cancel、
團隊、team、成員、members、邀請、invite、群組、標籤、tags
```

`batch_state` 不在此清除範圍（避免誤刪批量暫存）。

### 2. 通用取消指令

輸入 `取消` 或 `cancel`：
- 清除 `user_states[user_id]`
- 呼叫 `handle_batch_cancel`（清除 batch_state 並刪暫存圖）
- 若兩者皆無 state，回覆：「目前沒有進行中的操作。」
- 若有清除，回覆：「已取消目前操作。」

### 3. State 訊息加「取消」Quick Reply 按鈕

所有設定 `user_states` 的 reply 訊息，加上 Quick Reply 按鈕「❌ 取消」，觸發 postback `action=cancel_state`。

| State | 原本有 Quick Reply？ | 修改 |
|-------|---------------------|------|
| `scanning_back` | ✅ 有（有背面 / 直接儲存） | 新增「❌ 取消」按鈕 |
| `adding_memo` | ❌ 純文字 | 改為帶 Quick Reply 的 TextSendMessage |
| `editing_field` | ❌ 純文字 | 改為帶 Quick Reply 的 TextSendMessage |
| `exporting_csv` | ❌ 純文字 | 改為帶 Quick Reply 的 TextSendMessage |
| `adding_tag` | ❌ 純文字 | 改為帶 Quick Reply 的 TextSendMessage |
| `searching` | ✅ 有（❌ 取消，已有） | 不需修改 |

`cancel_state` postback handler：
- 清除 `user_states[user_id]`
- 回覆：「已取消目前操作。」
- 不清除 `batch_state`（批量上傳狀態獨立，不受此取消影響）

### 4. `scanning_back` 收到文字時清除

在 `handle_text_event` 的 state 分支中，新增：

```python
if user_action == 'scanning_back':
    user_states.pop(user_id, None)
    user_action = None  # 靜默清除，讓指令繼續正常執行，不額外回覆
```

正面掃描後的提示訊息改為：

```
已辨識：{name}（{company}）

⚠️ 名片建檔尚未完成，請選擇以下動作：
```

（Quick Reply 按鈕不變）

---

## Files Changed

- `app/line_handlers.py`
  - `handle_text_event`：加頂層清除、通用取消分支、`scanning_back` 文字偵測
  - `handle_image_event`（`scanning_back` reply 訊息）：加「❌ 取消」Quick Reply 按鈕
  - 各 state handler 的 reply 訊息：改為帶「❌ 取消」Quick Reply 的 TextSendMessage
  - `handle_postback_event`：新增 `cancel_state` handler

---

## Edge Cases

| 情境 | 預期行為 |
|------|----------|
| `scanning_back` 中輸入文字 | 靜默清除 state，繼續執行用戶輸入的指令 |
| 任何 state 中點「❌ 取消」Quick Reply | 清除 `user_states`，回覆「已取消目前操作。」 |
| 點「❌ 取消」時無 state（例如重複點） | 仍回覆「已取消目前操作。」，不報錯 |
