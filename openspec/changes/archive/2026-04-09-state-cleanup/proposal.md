## Why

測試中發現兩類 state 殘留問題，導致用戶行為被誤判：

1. **`batch_state` 殘留** → 選「單張上傳」後，若之前批量上傳未正常結束，傳圖會進入批量流程（顯示「繼續傳送或輸入完成」），導致正反面選擇永遠不出現
2. **`user_states` 殘留** → 掃名片正面後，若用戶忽略按鈕去做其他事，下次傳任何圖片都會被當成背面，合併舊資料後直接儲存錯誤名片；`adding_memo` / `editing_field` 等等狀態也有類似問題

目前系統沒有「任何明確意圖都應清除舊 state」的保護，也沒有讓用戶主動跳出的統一機制。

## What Changes

- **明確意圖清除舊 state**：用戶輸入「新增」、「搜尋」、「匯出」、「管理」、「取消」、「cancel」等指令時，在處理前先清除 `user_states[user_id]` 與 `batch_state`
- **通用取消指令**：`取消` / `cancel` 文字指令清除所有 state 並回覆確認訊息
- **State 訊息加入取消提示**：每次設定 `user_states` 並回覆訊息時，在文字末尾加上「（輸入『取消』可跳出）」
- **`scanning_back` 收到文字時清除**：在 `handle_text_event` 中，若 `user_action == 'scanning_back'` 且用戶輸入的是一般文字（非取消指令），主動清除並提示用戶重新掃描（而非靜默留存）

## Capabilities

### Modified Capabilities
- `handle_text_event`：新增明確意圖清除邏輯、通用取消指令、`scanning_back` 文字偵測
- 所有設定 `user_states` 的 reply 訊息：加入取消提示文字

## Impact

- **`app/line_handlers.py`**：
  - `handle_text_event`：入口加「明確指令清除 state」，新增 `取消`/`cancel` 分支，加 `scanning_back` 文字偵測
  - `handle_add_memo_state`、`handle_edit_field_state`、`handle_export_email_state`、`handle_adding_tag_state` 等 state reply 訊息末尾加取消提示
- **不影響資料模型**：純邏輯修改，無 Firebase schema 異動
- **不影響 Flex Messages**：只改文字訊息，不改 Flex

## Non-goals

- 加入「全域 timeout 自動清除 state」（Cloud Run 重啟本來就會清，目前不需要）
- 改變批量上傳核心流程
- 持久化 `user_states` 至 Firebase（屬於另一個議題）
