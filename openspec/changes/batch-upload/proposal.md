## Why

業務團隊辦完一場活動常常一次拿到十幾到幾十張名片，現行單張即時 OCR 流程需要逐張傳送、等待辨識結果，掃完一整疊非常耗時，且 LINE Webhook 同步處理 OCR 容易撞到逾時限制與 Gemini API 併發超載。此變更引入非同步解耦架構（Webhook 收集 → Cloud Tasks 背景排程 → Worker 循序辨識），讓用戶一次傳多張圖、由系統背景處理，完成後推播摘要。屬於 Roadmap Phase 4（效率與體驗增強）。

## What Changes

- 新增「批量名片上傳」模式：用戶輸入「新增」後，bot 透過 Quick Reply 讓用戶選擇「單張即時辨識」或「批量排程上傳」
- 批量模式下，用戶可連續傳送最多 30 張名片，bot 靜默收集並存入 Firebase Storage（`raw_images/{org_id}/{user_id}/{uuid}.jpg`）
- 用戶輸入「完成」後，bot 立刻回覆「已排程 N 張」訊息，並透過 Cloud Tasks 建立背景任務
- 新增 `/internal/process-batch` endpoint 作為 Cloud Tasks Worker，循序執行 OCR、去重、寫入 DB、同步 Google Sheets，並於結束時透過 LINE Push API 推播結果摘要
- 新增 `app/batch_processor.py` 存放 Worker 邏輯
- 批量狀態改存 Firebase Realtime Database `batch_states/{user_id}`，避免 Cloud Run auto-scaling 導致的 in-memory state 遺失
- 新增「取消」指令清空 buffer 與暫存圖
- Worker 端於安全層驗證 `X-CloudTasks-QueueName` header，只接受 Cloud Tasks 呼叫

## Capabilities

### New Capabilities
- `batch-namecard-upload`: 透過 Cloud Tasks 非同步解耦架構，支援一次批次上傳多張名片並由 Worker 背景辨識後推播結果

### Modified Capabilities
<!-- 無 -->

## Impact

**Firebase Schema 變更：**
- 新增 RTDB 節點 `batch_states/{user_id}`（暫存批量收集狀態）
- 新增 Firebase Storage 路徑 `raw_images/{org_id}/{user_id}/{uuid}.jpg`（OCR 完成後刪除）

**程式碼：**
- `app/line_handlers.py`：新增 batch_uploading state 處理、「新增」Quick Reply、「完成」「取消」指令
- `app/firebase_utils.py`：新增 `upload_raw_image_to_storage()`、`delete_raw_image()`、`batch_states` CRUD
- `app/main.py`：新增 `/internal/process-batch` endpoint
- `app/batch_processor.py`：新增（Worker 邏輯）

**新增依賴：**
- `google-cloud-tasks` Python SDK

**基礎設施：**
- GCP 專案需建立 Cloud Tasks queue（region: asia-east1）
- Cloud Run 服務帳號需獲得 Cloud Tasks Enqueuer 權限

**新增環境變數：**
- `CLOUD_TASKS_QUEUE` — queue 名稱
- `CLOUD_TASKS_LOCATION` — GCP region
- `CLOUD_RUN_URL` — Worker callback URL

## Non-goals

- 不實作批量上傳的進度條或中間狀態通知（只在開始與結束各推一次訊息）
- 不整合試用版掃描上限檢查（等試用版功能設計後再一併處理）
- 不細化 Cloud Tasks retry 策略（使用預設）
- 不支援批量編輯或批量刪除（本次僅限上傳）
