## Context

系統使用兩種平行的 state 機制：

| 機制 | 儲存位置 | 生命週期 |
|------|----------|----------|
| `user_states[user_id]` | Cloud Run in-memory dict | 重啟清除 |
| `batch_state` | Firebase RTDB `batch_states/{user_id}` | 永久，直到 `clear_batch_state` |

兩者都沒有「被其他指令覆寫時自動清除舊 state」的保護，導致用戶在多步驟操作中途切換行為時，舊 state 會污染後續操作。

---

## Goals / Non-Goals

**Goals:**
- 任何「明確的頂層指令」（新增、搜尋、匯出、管理、取消）都重置所有 state
- 提供通用的 `取消` 逃生門，讓用戶可以隨時跳出任何多步驟流程
- State 訊息包含取消提示，讓用戶知道逃生門存在
- `scanning_back` 狀態下收到文字，主動提示用戶重新掃描

**Non-Goals:**
- 自動 timeout（不增加複雜度）
- 持久化 `user_states`（另一個 ADR 議題）
- 修改批量上傳的核心流程

---

## Decisions

### Decision 1：在頂層指令前清除所有 state

**What**: `handle_text_event` 中，在進入各分支之前，先定義「頂層指令集合」。若用戶輸入屬於此集合，則先清除 `user_states[user_id]` 和 `batch_state`，再繼續處理。

**頂層指令集合**：`新增`、`搜尋`、`查詢`、`匯出`、`export`、`管理`、`取消`、`cancel`、`團隊`、`team`、`成員`、`members`、`邀請`、`invite`、`群組`、`標籤`、`tags`

**Why**:
- 用戶輸入這些詞代表明確切換意圖，之前的 state 必然已廢棄
- 集中處理邏輯，不需要在每個分支重複 `user_states.pop`
- 對批量的 `batch_state` 不清除（批量上傳中途切換其他指令，批量圖片保留）——只有 `取消` / `cancel` 才清除 `batch_state`

**Alternatives considered**:
- 每個分支各自清除：重複程式碼，容易漏掉
- 全部都清除 `batch_state`：批量中途不小心輸入「搜尋」會遺失所有暫存圖片

---

### Decision 2：`取消` / `cancel` 為通用逃生門

**What**: 新增分支處理 `取消` / `cancel`：
1. 清除 `user_states[user_id]`
2. 清除 `batch_state`（包含刪除暫存圖片）
3. 回覆：「已取消目前操作。」

**Why**:
- 用戶隨時可以明確跳出，不需要等系統 timeout
- `取消` 清除 `batch_state` 是正確行為（用戶主動放棄）
- 與現有的 `handle_batch_cancel` 邏輯一致

**注意**：`完成` 不在頂層指令集合中，因為它是批量上傳的終止指令，不應隨意清除 state。

---

### Decision 3：State 訊息加「❌ 取消」Quick Reply 按鈕

**What**: 所有設定 `user_states` 後回覆的訊息，加上 Quick Reply 按鈕「❌ 取消」，觸發 postback `action=cancel_state`。`cancel_state` handler 清除 `user_states[user_id]` 並回覆「已取消目前操作。」

**Why**:
- Quick Reply 比打字更直覺，符合 LINE 操作習慣
- 打字「取消」需要用戶記住關鍵字，Quick Reply 一眼可見
- `searching` 已有取消 Quick Reply（`action=cancel_search`），改為統一使用 `cancel_state`

**Alternatives considered**:
- 讓用戶打「取消」：需記憶關鍵字，體驗差
- 不加取消功能：用戶卡住只能等 Cloud Run 重啟才清除 state

---

### Decision 4：`scanning_back` 狀態下收到文字主動提示

**What**: 在 `handle_text_event` 的 state 判斷中，新增 `scanning_back` 分支：
```python
elif user_action == 'scanning_back':
    # 用戶在正面等待中輸入文字，清除並提示
    user_states.pop(user_id, None)
    await line_bot_api.reply_message(
        event.reply_token,
        TextSendMessage(text="前次掃描未成功建檔，請重新掃描。")
    )
```

**Why**:
- 現在的行為：`scanning_back` 狀態下收到文字 → 走 `else` 分支去做智慧查詢，state 繼續殘留
- 改後：明確告知用戶，清除舊 state，避免下次傳圖被誤判為背面

---

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| **誤清除 batch_state**：用戶批量上傳中途輸入「搜尋」等指令 | 頂層指令不清除 `batch_state`，只有 `取消`/`cancel` 才清除 |
| **`scanning_back` 清除後用戶不知原因** | 回覆明確訊息說明已放棄正面資料 |
| **取消提示文字讓訊息變長** | 僅加一行，整體訊息仍簡潔 |

---

## Migration Plan

### Deployment
1. 純邏輯修改，無 schema 異動
2. 標準 `gcloud run deploy` 部署

### Rollback
- 移除頂層清除邏輯即可還原，無資料影響
