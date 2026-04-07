## ADDED Requirements

### Requirement: 統一入口與模式分流
系統 SHALL 在用戶輸入「新增」或點擊圖文選單的「新增名片」時，透過 LINE Quick Reply 回傳兩個選項：「單張即時辨識」與「批量排程上傳」，讓用戶顯式選擇上傳模式。

#### Scenario: 用戶輸入「新增」取得模式選單
- **WHEN** 用戶在 LINE 聊天室輸入「新增」
- **THEN** bot 回傳包含 Quick Reply buttons 的訊息，其中至少有「📷 單張即時辨識」與「🗂️ 批量排程上傳 (最多30張)」兩個選項

#### Scenario: 用戶選擇批量排程上傳
- **WHEN** 用戶點擊 Quick Reply 中的「🗂️ 批量排程上傳」
- **THEN** bot 回傳：「已進入批量上傳模式，請開始傳送名片照片，全部傳送完畢後請輸入『完成』」，並於 Firebase RTDB `batch_states/{user_id}` 建立初始狀態，`pending_images` 為空陣列

### Requirement: 批量模式下收集圖片
系統 SHALL 在用戶進入批量模式後，接收的每張圖片下載並存入 Firebase Storage 路徑 `raw_images/{org_id}/{user_id}/{uuid}.jpg`，並將該路徑 append 到 `batch_states/{user_id}/pending_images`，不觸發 OCR 且不發送任何回應訊息。

#### Scenario: 用戶在批量模式下傳送一張圖片
- **WHEN** `batch_states/{user_id}` 存在且 `pending_images` 長度 < 30，用戶傳送一張圖片
- **THEN** 系統下載圖片內容、以 UUID 命名存入 Firebase Storage `raw_images/{org_id}/{user_id}/{uuid}.jpg`，並將路徑 append 到 `pending_images`；不發送任何訊息；Webhook 回傳 200 OK

#### Scenario: 用戶傳送達到上限的圖片
- **WHEN** `pending_images` 長度達 30，用戶再傳送圖片
- **THEN** 系統拒絕收集該圖片，回傳：「已達批次上限 30 張，請輸入『完成』送出辨識，或輸入『取消』放棄」

#### Scenario: 用戶不在批量模式下傳送圖片
- **WHEN** `batch_states/{user_id}` 不存在，用戶傳送一張圖片
- **THEN** 系統走原本單張即時辨識流程，與批量功能互不影響

### Requirement: 「完成」指令觸發 Cloud Tasks 背景處理
系統 SHALL 在用戶輸入「完成」時，建立一個 Google Cloud Tasks 任務，該任務指向自身的 `/internal/process-batch` endpoint 並帶上 `user_id`、`org_id`、`image_paths`；系統 SHALL 於建立 Task 後立即清除 `batch_states/{user_id}`，並回覆用戶「已排程 N 張名片，辨識中請稍候...」，Webhook 回覆時間 MUST 小於 1 秒。

#### Scenario: 用戶輸入「完成」且 pending_images 非空
- **WHEN** 用戶在批量模式下輸入「完成」，`pending_images` 長度 N >= 1
- **THEN** 系統透過 google-cloud-tasks SDK 建立 Task，Task payload 包含 `user_id`、`org_id`、`image_paths`；清除 `batch_states/{user_id}`；回覆「已排程 N 張名片，辨識中請稍候...」

#### Scenario: 用戶輸入「完成」但 pending_images 為空
- **WHEN** 用戶在批量模式下輸入「完成」，`pending_images` 長度為 0
- **THEN** 系統回覆：「尚未收到任何圖片，請先傳送名片照片後再輸入『完成』」；不建立 Cloud Task；不清除 state

### Requirement: 「取消」指令清空批量狀態
系統 SHALL 在用戶輸入「取消」時刪除 `batch_states/{user_id}` 及其引用的所有 Firebase Storage 暫存圖片，並回覆「已取消，共丟棄 N 張圖片」。

#### Scenario: 用戶在批量模式下取消
- **WHEN** 用戶在批量模式下輸入「取消」
- **THEN** 系統從 `batch_states/{user_id}/pending_images` 讀取所有 storage path，逐一從 Firebase Storage 刪除；刪除 `batch_states/{user_id}` 節點；回覆「已取消，共丟棄 N 張圖片」

### Requirement: Worker endpoint 處理批次辨識
系統 SHALL 提供 `/internal/process-batch` HTTP POST endpoint 作為 Cloud Tasks Worker；此 endpoint MUST 驗證請求 header `X-CloudTasks-QueueName` 與設定的 queue 名稱相符，否則回傳 403。Worker SHALL 循序處理 `image_paths` 中的每一張圖片，對每張圖片執行下載、Gemini OCR、去重檢查、寫入 `namecard/{org_id}/{card_id}`、觸發 Google Sheets sync、刪除暫存圖片，並在全部完成後透過 LINE Push API 向 `user_id` 推送結果摘要。

#### Scenario: Worker 接收合法請求並成功處理所有圖片
- **WHEN** `/internal/process-batch` 收到 POST 請求，header 中 `X-CloudTasks-QueueName` 符合，body 包含 3 個有效的 image_paths，三張圖 OCR 皆成功
- **THEN** 系統循序呼叫 Gemini OCR、將三張名片寫入 `namecard/{org_id}/{card_id}`、觸發 Google Sheets sync、刪除三張 Storage 暫存圖；最後透過 LINE Push API 推送「✅ 批次處理完成！共 3 張，成功 3 張，失敗 0 張」；HTTP 回應 200

#### Scenario: Worker 處理部分失敗
- **WHEN** `/internal/process-batch` 處理 5 張圖片，其中 2 張 Gemini OCR 回傳無效 JSON 或無法辨識
- **THEN** 成功的 3 張寫入 DB，失敗的 2 張記錄錯誤原因；所有 5 張 Storage 暫存圖皆刪除；Push API 推送「✅ 批次處理完成！共 5 張，成功 3 張，失敗 2 張。失敗原因：第 2 張 — 圖片不清晰或非名片；第 4 張 — 圖片不清晰或非名片」

#### Scenario: Worker 收到偽造請求
- **WHEN** `/internal/process-batch` 收到 POST 請求但 header 中 `X-CloudTasks-QueueName` 缺失或不符
- **THEN** 系統回傳 HTTP 403，不執行任何處理邏輯

### Requirement: Firebase 狀態結構
系統 SHALL 在 Firebase RTDB 建立 `batch_states/{user_id}` 節點作為批量收集狀態儲存，欄位包含 `action`（固定為 `"batch_uploading"`）、`org_id`、`pending_images`（storage path 字串陣列）、`updated_at`（ISO 8601 時間字串）。

#### Scenario: 初始化批量狀態
- **WHEN** 用戶首次進入批量模式
- **THEN** `batch_states/{user_id}` 被建立，內容為 `{action: "batch_uploading", org_id: "<user's org>", pending_images: [], updated_at: "<now>"}`

### Requirement: 批次上限與環境變數驗證
系統 SHALL 限制單次批量收集的圖片上限為 30 張；系統 SHALL 在啟動時驗證 `CLOUD_TASKS_QUEUE`、`CLOUD_TASKS_LOCATION`、`CLOUD_RUN_URL` 三個環境變數；若缺少任一變數，批量模式 SHALL NOT 對用戶可見（Quick Reply 不顯示批量選項）。

#### Scenario: 環境變數完整時批量功能可用
- **WHEN** 應用啟動且三個 env var 皆已設定，用戶輸入「新增」
- **THEN** Quick Reply 顯示「單張即時辨識」與「批量排程上傳」兩個選項

#### Scenario: 環境變數缺失時批量功能隱藏
- **WHEN** 應用啟動但 `CLOUD_TASKS_QUEUE` 未設定，用戶輸入「新增」
- **THEN** Quick Reply 僅顯示「單張即時辨識」選項；日誌記錄警告訊息指出批量功能因缺少環境變數而停用
