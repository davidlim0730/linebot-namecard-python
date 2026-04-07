# 批量名片上傳 (非同步解耦架構) — 設計規格

**日期**：2026-04-07
**狀態**：已核准，待實作

---

## 功能概述

讓用戶在 LINE 一次傳送多張名片照片，透過非同步解耦架構（Webhook 負責收集、Cloud Tasks 背景排程、Worker 循序辨識），解決辦完活動一次拿到大量名片、逐張掃描太慢的痛點。此設計天然避開了 LINE Webhook 逾時限制與 Gemini API 併發超載問題。

---

## 使用者流程

1. **統一入口（防呆與分流）**
   - 用戶輸入「新增」或點擊圖文選單的「📷 新增名片」
   - bot 回傳 Quick Reply 選單：「📷 單張即時辨識」或「🗂️ 批量排程上傳 (最多30張)」
   - Quick Reply 採 **PostbackAction**（非 MessageAction），點擊後送出 `data="action=start_batch_upload"` 由 `handle_postback_event` 乾淨攔截，不污染 `handle_text_event` 的字串比對邏輯

2. **進入批量模式**
   - 用戶點擊「🗂️ 批量排程上傳」
   - bot 回：「已進入批量上傳模式，請開始傳送名片照片，全部傳送完畢後請輸入『完成』」

3. **收集階段（Phase 1：Webhook 快速回應）**
   - 用戶傳送圖片（可多張連發）
   - bot 靜默收集，每張圖存入 Firebase Storage
   - 在 Firebase RTDB 紀錄暫存路徑，並立刻回傳 `200 OK`，不發任何訊息，不跑 OCR

4. **觸發處理（交接點）**
   - 用戶輸入「完成」
   - bot 立刻回：「已排程 N 張名片，辨識中請稍候...」
   - 透過 Cloud Tasks API 建立背景任務，並清除用戶收集狀態

5. **背景執行（Phase 2：Worker 非同步處理）**
   - Cloud Tasks 獨立發出 POST 請求到 `/internal/process-batch`，Cloud Run 正常分配 CPU 資源
   - Worker 將暫存圖片循序丟給 Gemini 辨識、比對去重並儲存
   - 全部處理完畢後，透過 LINE Push API 推送結果摘要：
     「✅ 批次處理完成！共 N 張，成功 X 張，失敗 Y 張。
      失敗原因：第 3 張 — 圖片不清晰」

6. **中途取消（在步驟 3 之間）**
   - 用戶輸入「取消」，清空 Firebase RTDB 狀態與 Storage 暫存圖，回：「已取消，共丟棄 N 張圖片」

---

## 限制

- 單次批量上限：**30 張**（超過時，bot 提示並拒絕收集）
- 僅在批量模式下的圖片才進批次處理；模式外的圖片維持原本單張即時處理

---

## 狀態管理 (State Machine)

為避免 Cloud Run 自動擴展 (Auto-scaling) 導致記憶體狀態遺失，批量狀態需改存於 **Firebase Realtime Database**：

**路徑：** `batch_states/{user_id}`

```json
{
    "action": "batch_uploading",
    "org_id": "org_xxx",
    "pending_images": [
        "raw_images/org_xxx/user_yyy/uuid_1.jpg",
        "raw_images/org_xxx/user_yyy/uuid_2.jpg"
    ],
    "updated_at": "2026-04-07T12:00:00Z"
}
```

**State 轉換：**

| 事件 | 從 | 到 |
|------|----|----|
| 點擊 Quick Reply「🗂️ 批量排程上傳」（PostbackAction） | 無 state | batch_uploading |
| 收到圖片 | batch_uploading | batch_uploading（append） |
| 輸入「完成」 | batch_uploading | 清除 state，建立 Cloud Task |
| 輸入「取消」 | batch_uploading | 清除 state |
| 超過 30 張再傳圖 | batch_uploading | 維持，回提示訊息拒絕 |

---

## Firebase Storage 結構

```
raw_images/{org_id}/{user_id}/{uuid}.jpg   ← 暫存用，OCR 完成後刪除
```

---

## 背景處理架構：Google Cloud Tasks

**為何不用 FastAPI BackgroundTasks：**
Cloud Run 預設模式（CPU allocated only during request processing）在 HTTP response 送出後立即 throttle CPU。BackgroundTask 會凍結，行為不可靠。

**Cloud Tasks 流程：**

```
用戶輸入「完成」
  → 程式呼叫 Cloud Tasks API，建立一個 Task：
      POST /internal/process-batch
      body: { user_id, org_id, image_paths: [...] }
  → 立刻回覆 LINE「已排程 N 張名片，辨識中請稍候...」+ 200 OK
  → 清除 Firebase RTDB batch_states/{user_id}

Cloud Tasks 在背景發送 HTTP POST 到 /internal/process-batch
  → 這是全新的 HTTP 請求，Cloud Run 正常分配 CPU
  → timeout 最長可設 60 分鐘，足夠處理 30 張圖
```

**Worker endpoint `/internal/process-batch`：**

```
for each image_path in image_paths:
    1. 從 Firebase Storage 下載圖片
    2. 呼叫現有 gemini_utils OCR（response_mime_type: application/json）
    3. 走現有去重檢查（email 比對）
    4. 成功 → 存入 namecard/{org_id}/{card_id}/，觸發 Google Sheets sync
    5. 失敗 → 記錄失敗原因（圖片不清晰、無法辨識為名片等）
    6. 刪除 Storage 暫存圖片

完成後 → LINE Push API 推播摘要
```

- **循序處理**（非並發），天然避開 Gemini rate limit
- Cloud Tasks 每月前 100 萬次免費，成本為零
- 安全：`/internal/process-batch` 只接受來自 Cloud Tasks 的請求（驗證 `X-CloudTasks-QueueName` header）

---

## 修改範圍

| 檔案 | 修改內容 |
|------|---------|
| `app/line_handlers.py` | 新增 batch_uploading state 處理（從 Firebase RTDB 讀取）、PostbackAction `start_batch_upload` handler、「完成」「取消」文字指令判斷、呼叫 Cloud Tasks API |
| `app/firebase_utils.py` | 新增 `upload_raw_image_to_storage()`、`delete_raw_image()`、`batch_states` CRUD（`init_batch_state`、`get_batch_state`、`append_batch_image`、`clear_batch_state`） |
| `app/main.py` | 新增 `/internal/process-batch` endpoint |
| `app/batch_processor.py` | 新增（Worker 邏輯：循序 OCR、Push API 推播） |
| `app/gemini_utils.py` | 無修改（沿用現有 OCR 函式） |
| `app/bot_instance.py` | 無修改（不使用 `user_states`，狀態統一存 Firebase RTDB） |

**新增環境變數：**
- `CLOUD_TASKS_QUEUE` — Cloud Tasks queue 名稱
- `CLOUD_RUN_URL` — 自己的 Cloud Run 服務 URL（給 Cloud Tasks 回呼用）
- `CLOUD_TASKS_LOCATION` — GCP region（e.g. `asia-east1`）

---

## 不在此次範圍內

- 試用版掃描上限整合（待試用版功能設計後再一併實作）
- 批量上傳進度條或中間狀態通知
- Cloud Tasks retry 策略細化（使用預設即可）
