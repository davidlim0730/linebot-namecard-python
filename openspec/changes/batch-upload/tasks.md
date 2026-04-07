## 1. 基礎設施與依賴

- [ ] 1.1 在 GCP 專案執行 `gcloud tasks queues create namecard-batch --location=asia-east1`，建立 Cloud Tasks queue
- [ ] 1.2 為 Cloud Run service account 授予 `roles/cloudtasks.enqueuer` 權限
- [ ] 1.3 在 `requirements.txt` 新增 `google-cloud-tasks` 依賴並執行 `pip install`
- [ ] 1.4 在 `app/config.py` 新增並驗證 `CLOUD_TASKS_QUEUE`、`CLOUD_TASKS_LOCATION`、`CLOUD_RUN_URL` 三個環境變數，三者任一缺失時記錄警告並設定 `BATCH_UPLOAD_ENABLED = False` 全域旗標

## 2. Firebase 層：Storage 與 State CRUD

- [ ] 2.1 在 `app/firebase_utils.py` 新增 `upload_raw_image_to_storage(org_id, user_id, image_bytes) -> str`，以 UUID 命名存入 `raw_images/{org_id}/{user_id}/{uuid}.jpg` 並回傳 storage path
- [ ] 2.2 在 `app/firebase_utils.py` 新增 `delete_raw_image(storage_path)`，可容錯（檔案不存在時不 raise）
- [ ] 2.3 在 `app/firebase_utils.py` 新增 `download_raw_image(storage_path) -> bytes` 供 Worker 使用
- [ ] 2.4 在 `app/firebase_utils.py` 新增 `get_batch_state(user_id)`、`init_batch_state(user_id, org_id)`、`append_batch_image(user_id, storage_path)`、`clear_batch_state(user_id)` 四個函式操作 RTDB `batch_states/{user_id}` 節點（注意：需更新 `updated_at` 欄位）
- [ ] 2.5 標註為需要 Firebase Realtime Database rules 更新：`batch_states/{user_id}` 節點僅允許 admin SDK 寫入

## 3. Cloud Tasks 封裝

- [ ] 3.1 新增 `app/cloud_tasks_utils.py`，實作 `create_process_batch_task(user_id, org_id, image_paths)` — 使用 `google.cloud.tasks_v2` client 建立 Task，目標為 `{CLOUD_RUN_URL}/internal/process-batch`，method POST，Content-Type `application/json`，body 為 JSON payload
- [ ] 3.2 Task 建立時設定 `dispatch_deadline` 為 30 分鐘（上限為批次處理所需時間）

## 4. LINE Handler 改動

- [ ] 4.1 在 `app/flex_messages.py` 新增 `build_add_namecard_quick_reply()` 函式，產生包含「📷 單張即時辨識」與「🗂️ 批量排程上傳 (最多30張)」兩個 Quick Reply buttons 的 TextSendMessage
  - **按鈕型態**：兩個按鈕均使用 **PostbackAction**（非 MessageAction），點擊後不在對話框顯示文字，直接送出 postback data：`action=single_add` 和 `action=batch_start`，由 `handle_postback_event` 攔截處理
  - **預期訊息預覽**：文字「請選擇新增名片的方式：」+ 兩個 Quick Reply buttons
  - 若 `BATCH_UPLOAD_ENABLED` 為 False 則僅顯示「單張即時辨識」
- [ ] 4.2 在 `app/line_handlers.py` 的 `handle_text_event` 中新增判斷：若用戶輸入「新增」，呼叫 `build_add_namecard_quick_reply()` 回傳
- [ ] 4.3 在 `app/line_handlers.py` 的 postback handler 新增 `action=batch_start` 處理：呼叫 `init_batch_state(user_id, org_id)` 並回覆「已進入批量上傳模式，請開始傳送名片照片，全部傳送完畢後請輸入『完成』」
- [ ] 4.4 在 `app/line_handlers.py` 的 `handle_image_event` 最前面新增批量模式分支：若 `get_batch_state(user_id)` 存在，檢查 `pending_images` 長度
  - 若 < 30：下載圖片 bytes → `upload_raw_image_to_storage` → `append_batch_image`，不回訊息
  - 若 == 30：回覆「已達批次上限 30 張，請輸入『完成』送出辨識，或輸入『取消』放棄」
- [ ] 4.5 在 `app/line_handlers.py` 的 `handle_text_event` 中新增「完成」指令處理：若 `get_batch_state(user_id)` 存在且 `pending_images` 非空，呼叫 `create_process_batch_task()` → `clear_batch_state()` → 回覆「已排程 N 張名片，辨識中請稍候...」；若 pending_images 為空則回覆提示
- [ ] 4.6 在 `app/line_handlers.py` 的 `handle_text_event` 中新增「取消」指令處理：讀取 `pending_images`，逐一呼叫 `delete_raw_image`，然後 `clear_batch_state`，回覆「已取消，共丟棄 N 張圖片」

## 5. Worker Endpoint 與處理邏輯

- [ ] 5.1 新增 `app/batch_processor.py`，實作 `process_batch(user_id, org_id, image_paths) -> dict`：循序對每張圖呼叫 `download_raw_image` → `gemini_utils.ocr_namecard` → 去重檢查（email 比對）→ 寫入 `namecard/{org_id}/{card_id}` → `gsheets_utils.trigger_sync` → `delete_raw_image`；回傳摘要 `{success: N, failed: M, failures: [{index, reason}]}`
- [ ] 5.2 在 `app/batch_processor.py` 新增 `send_batch_summary_push(user_id, summary)`，使用 LINE Push API 推送摘要訊息
  - **預期訊息預覽**：「✅ 批次處理完成！共 N 張，成功 X 張，失敗 Y 張。」若有失敗則附加「失敗原因：第 3 張 — 圖片不清晰或非名片」
- [ ] 5.3 在 `app/main.py` 新增 POST endpoint `/internal/process-batch`，流程：驗證 `X-CloudTasks-QueueName` header 是否與 `CLOUD_TASKS_QUEUE` 相符（不符回 403）→ 解析 JSON body → 呼叫 `process_batch()` → 呼叫 `send_batch_summary_push()` → 回 200
- [ ] 5.4 Worker 需實作 idempotency：每張圖處理前檢查 storage 檔案是否存在，若不存在（代表已被處理過）則跳過不算失敗

## 6. 文件與部署

- [ ] 6.1 更新 `CLAUDE.md` 的環境變數清單與 Architecture 章節，說明批量上傳流程與 Cloud Tasks 架構
- [ ] 6.2 更新 `README.md`（若存在）描述新功能
- [ ] 6.3 更新 deployment 文件或 `gcloud run deploy` 範例指令，加入新環境變數 `CLOUD_TASKS_QUEUE`、`CLOUD_TASKS_LOCATION`、`CLOUD_RUN_URL`
- [ ] 6.4 提供 rollback 說明：移除 `CLOUD_TASKS_QUEUE` env var 即可隱藏批量功能

## 7. 驗證

- [ ] 7.1 本地啟動 `uvicorn app.main:app` 執行 `flake8 .` 通過
- [ ] 7.2 手動測試流程：輸入「新增」→ 選擇批量 → 傳 3 張名片 → 輸入「完成」→ 確認收到「已排程」訊息 → 等待 Push 摘要 → 驗證 Firebase 有正確寫入 3 張名片且 `raw_images/` 暫存圖已清除
- [ ] 7.3 測試邊界情境：傳第 31 張圖應被拒絕；輸入「取消」應清空 state 並刪除所有暫存圖；偽造 POST `/internal/process-batch` 應回 403
- [ ] 7.4 確認未設定 env var 的部署中 Quick Reply 不顯示批量選項
