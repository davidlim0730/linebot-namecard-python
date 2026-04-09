# Tasks: State Cleanup & Universal Cancel

## Implementation Tasks

- [ ] `handle_text_event` 入口：定義頂層指令集合，清除 `user_states[user_id]`
- [x] `handle_postback_event`：新增 `cancel_state` handler
- [x] `handle_text_event` state 分支：`scanning_back` 靜默清除，繼續執行指令
- [x] `scanning_back` reply 訊息：加「❌ 取消」Quick Reply 按鈕
- [x] `add_memo` postback reply 訊息：加「❌ 取消」Quick Reply 按鈕
- [x] `edit_field` postback reply 訊息：加「❌ 取消」Quick Reply 按鈕
- [x] `handle_export` reply 訊息：加「❌ 取消」Quick Reply 按鈕
- [x] `handle_adding_tag` reply 訊息：加「❌ 取消」Quick Reply 按鈕

## Already Done

- [x] `單張上傳` 清除 `batch_state`（已修復）
- [x] `scanning_back` 狀態下收到文字：清除 state，回覆「前次掃描未成功建檔，請重新掃描。」
