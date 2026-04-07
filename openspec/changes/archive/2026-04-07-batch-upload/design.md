## Context

目前名片上傳採單張同步流程：LINE Webhook 收到圖片 → 下載 → Gemini OCR → 存 Firebase → 回傳 Flex Message。業務團隊辦完活動常常一次拿到幾十張名片，逐張掃描效率低。若直接把同步流程放大成多張並發處理，會同時撞上兩個限制：

1. **LINE Webhook 必須在數秒內回應 200**，否則會 retry。多張圖同時跑 Gemini OCR 極易逾時。
2. **Gemini API 有併發上限**，多張圖並發呼叫會被 rate limit。

此外，部署環境 Cloud Run 採預設「CPU allocated only during request processing」模式 — 當 HTTP Response 送出後 CPU 會立即被 throttle，使得 FastAPI `BackgroundTasks` 無法可靠執行背景工作（背景任務會凍結直到下一次請求喚醒 CPU）。若改為 `CPU always allocated` 模式，每月會產生額外待機成本。

因此需要一套「收集階段極快回應」+「處理階段穩定執行」的非同步解耦架構。

## Goals / Non-Goals

**Goals:**
- 用戶可在 LINE 一次傳送最多 30 張名片，由系統背景循序辨識，完成後統一推播結果
- Webhook 端快速回應（< 1 秒），避免 LINE 逾時
- Worker 端穩定執行（不被 CPU throttle、不撞 Gemini rate limit）
- Cloud Run 維持預設模式（不開啟 CPU always allocated），成本維持最低
- 批量狀態支援 Cloud Run 多實例 auto-scaling
- 對現有單張即時辨識流程零影響

**Non-Goals:**
- 不實作批量上傳的中間進度通知（僅開始與結束各一次訊息）
- 不整合試用版掃描上限
- 不細化 Cloud Tasks retry 策略（使用預設）
- 不支援批量編輯或批量刪除
- 不支援跨多個 Cloud Tasks 分片（單批上限 30 張，一個 Task 處理完畢）

## Decisions

### 決策 1：採用 Google Cloud Tasks 作為背景任務引擎

**選擇：** 引入 Google Cloud Tasks，Webhook 收到「完成」指令後建立一個 Task 指向自己的 `/internal/process-batch` endpoint，Cloud Tasks 會以全新 HTTP 請求呼叫此 endpoint，讓 Cloud Run 正常分配 CPU 並允許最長 60 分鐘的 timeout。

**替代方案：**
- **FastAPI BackgroundTasks**：在 Cloud Run 預設模式下不可靠（CPU throttle 會凍結背景任務），除非切換到 `CPU always allocated`，每月增加約 200 TWD 待機成本。
- **Cloud Run Jobs**：可行但運維成本高（另外一個部署目標），對於 MVP 規模過度複雜。
- **Pub/Sub + Cloud Run**：類似 Cloud Tasks，但需額外 push subscription 設定，複雜度略高且沒有 per-task dispatch 的簡潔性。

**理由：** Cloud Tasks 每月前 100 萬次呼叫免費，MVP 階段成本為零；部署模型是「同一個 Cloud Run 服務的另一個 endpoint」，不需額外基礎設施；支援 60 分鐘超時與 retry，滿足批次 30 張循序處理的需求。

### 決策 2：批量狀態存 Firebase RTDB，不存 in-memory

**選擇：** 將批量收集狀態從 in-memory `user_states` dict 移至 Firebase RTDB `batch_states/{user_id}` 節點。

**替代方案：**
- **in-memory user_states**（現行做法）：最簡單，但 Cloud Run auto-scaling 多實例時無法跨 instance 共享狀態，且實例重啟會遺失 state。
- **Cloud Memorystore (Redis)**：性能最好但引入額外基礎設施，MVP 過度設計。

**理由：** 專案已有 Firebase 依賴，RTDB 讀寫延遲對用戶互動流程完全可接受，且免除實例狀態問題。現行 `user_states` dict 可繼續用於單張即時辨識等無狀態跨實例需求較低的場景。

### 決策 3：Worker 循序處理，不平行呼叫 Gemini

**選擇：** Worker 在單個 HTTP 請求內循序迴圈處理所有圖片，一張完成再呼叫下一張。

**替代方案：**
- **asyncio.gather 並發 OCR**：速度快但會撞 Gemini rate limit，且錯誤恢復複雜。
- **每張圖一個 Cloud Task**：最大並發度，但需要額外機制聚合結果、觸發最終摘要推播。

**理由：** 30 張圖循序處理在 Gemini OCR 平均 3-5 秒/張的情況下約 1.5-2.5 分鐘，完全在 Cloud Tasks 60 分鐘上限內；循序處理天然避開 rate limit，錯誤處理簡單；結果聚合邏輯內聚於單一 handler。

### 決策 4：統一入口 Quick Reply 分流，採 PostbackAction

**選擇：** 用戶輸入「新增」（或點選圖文選單）時，bot 回傳 Quick Reply 選單；按鈕採 **PostbackAction**（非 MessageAction），點擊後送出 `data="action=batch_start"` 由 `handle_postback_event` 攔截，不在對話框顯示文字。

**替代方案：**
- **MessageAction**：點擊後自動發出文字（如「批量上傳」），再由 `handle_text_event` 比對字串處理。缺點是字串比對邏輯分散、容易與其他指令衝突，且用戶看到自動發出的文字體驗不自然。
- **自動偵測**：根據短時間內傳送圖片數量自動判斷 — 不可靠且對用戶不透明。
- **獨立指令**：用戶需記憶「批量上傳」文字指令 — 發現性差。

**理由：** Quick Reply 讓功能自我發現，用戶顯式選擇模式避免歧義，也符合 LINE Bot 最佳實踐。

### 決策 5：Worker endpoint 安全驗證

**選擇：** `/internal/process-batch` 檢查請求 header 中的 `X-CloudTasks-QueueName`，僅接受由指定 Cloud Tasks queue 發出的請求。

**替代方案：**
- **OIDC Token 驗證**：更安全但需額外設定 service account 與 audience 驗證，MVP 階段複雜度偏高。
- **Shared secret header**：可行但需管理額外 secret。

**理由：** Cloud Tasks 會自動注入 `X-CloudTasks-*` headers，外部攻擊者無法偽造（這些 headers 在到達 Cloud Run 前由 Google 設置）。MVP 階段此驗證已足夠，未來可升級為 OIDC Token。

## Risks / Trade-offs

- **[Gemini OCR 平均耗時估計可能偏樂觀]** → 若單張超過 10 秒，30 張需 5 分鐘以上，用戶體驗變差。緩解：在「已排程」訊息中明確告知「預計 X 分鐘內完成」。
- **[Cloud Tasks Task 執行失敗會 retry]** → 若 Worker 中途失敗，Cloud Tasks 預設會重試，可能造成重複寫入。緩解：Worker 開頭先檢查 `batch_states/{user_id}` 是否已被清除（已處理過）；去重邏輯以 email 為 key，重複寫入會命中現有 dedup 機制。
- **[Firebase Storage 暫存圖片殘留]** → 若 Worker 崩潰前未刪除暫存圖，會殘留浪費空間。緩解：Cloud Scheduler 定期（每日）清理 `raw_images/` 中超過 24 小時的檔案（本次 Not in Scope，列為後續任務）。
- **[超過 30 張限制的用戶體驗]** → 用戶不知道達到上限會被拒絕收集。緩解：每收到 1 張圖後檢查上限，若達 30 張則 bot 主動推送「已達批次上限，請輸入『完成』送出辨識」。
- **[Cloud Tasks queue 未建立或權限未配好]** → 部署後完成指令會失敗。緩解：將 queue 建立與權限配置步驟納入 tasks.md，並在 config.py 加入環境變數驗證。

## Migration Plan

1. **基礎設施準備（部署前）：**
   - 在 GCP 專案建立 Cloud Tasks queue：`gcloud tasks queues create namecard-batch --location=asia-east1`
   - 為 Cloud Run 服務帳號授予 `roles/cloudtasks.enqueuer`
   - 在 Cloud Run 環境變數新增 `CLOUD_TASKS_QUEUE`、`CLOUD_TASKS_LOCATION`、`CLOUD_RUN_URL`

2. **部署順序：**
   - 先部署程式（功能預設關閉 — 若 env var 未設定則「批量上傳」選項不顯示）
   - 設定 env var 後重新部署，啟用功能

3. **回滾：**
   - 移除 `CLOUD_TASKS_QUEUE` env var 即可隱藏功能
   - 資料面無破壞性變更，Firebase `batch_states/` 節點可保留或手動清除
   - Cloud Tasks queue 可保留不用（無成本）

## Open Questions

- Cloud Tasks retry 預設次數是否需要調整？（目前採用預設，Worker 端需具備 idempotency）
- 是否需要為「失敗的圖片」提供重試機制？（本次 MVP 僅在摘要中列出失敗原因，不支援重試）
- `CLOUD_RUN_URL` 是否要改由 metadata server 動態取得？（MVP 直接設 env var 即可）
