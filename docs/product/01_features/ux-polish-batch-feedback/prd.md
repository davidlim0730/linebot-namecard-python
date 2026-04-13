# PRD — UX 防呆補強 & 批量上傳體驗優化

**作者**：David Lin  
**日期**：2026-04-10  
**狀態**：已上線  
**版本**：v3.7.0（2026-04-13 上線）  
**範圍**：Phase 1 防呆補強 + Phase 3 批量上傳 UX 改善

---

### 1. Executive Summary

本次迭代包含兩個獨立但同期開發的改善項目：

1. **Quick Reply 視覺化取消**：為所有多步驟操作（編輯欄位、加備註、加標籤、CSV 匯出）補上 `❌ 取消` Quick Reply 按鈕，避免用戶進入狀態後找不到出口。LINE Message API 本身有 1 分鐘超時限制，不另外實作 server-side timeout。
2. **批量上傳 UX 改善**：根據真實用戶回饋調整提示詞、移除逐張通知、改善完成摘要（含成功/失敗清單），並新增用戶問題回報機制。

---

### 2. Background & Context

**Quick Reply 取消**：現有 state machine 進入 `editing_field`、`adding_memo`、`exporting_csv`、`adding_tag` 等等待輸入狀態後，用戶若不知道下一步或誤觸，只能靠輸入任意文字才能跳出，體驗不佳。LINE 本身 Quick Reply 1 分鐘後會消失，算作自然超時，不需 server-side 計時器。

**批量上傳 UX**：功能已上線，但收到用戶反映：
- 不知道「批量模式」啟動後要等待，繼續輸入其他指令造成衝突
- 每張讀完都有通知，節奏不一，用戶誤以為已全部完成
- 最終摘要只顯示「共 X 張」，無法得知哪些失敗，無法重新上傳

**問題回報機制**：目前無內建回報管道，PM 必須主動問用戶，資訊零散。需要一個輕量的 LINE 內回報介面。

---

### 3. Objectives & Success Metrics

**Goals**：
1. 所有進入等待輸入狀態的操作都有明確的視覺化取消出口
2. 批量上傳完成後，用戶能明確知道哪些名片成功、哪些失敗
3. 用戶能在 LINE 內主動提交問題回報，PM 收到結構化紀錄

**Non-Goals**：
- Server-side timeout 計時器（LINE API 自然超時已足夠）
- 失敗名片的自動重試機制（用戶手動重上傳即可）
- 完整的 issue tracking 系統（輕量 LINE 介面即可，不做後台管理 UI）
- 錯誤監控儀表板（留待 Phase 4）

**Success Metrics**：

| 指標 | 現況 | 目標 | 量測方式 |
|------|------|------|--------|
| 批量上傳後用戶清楚哪些失敗 | 0%（無清單） | 100%（清單顯示） | 功能覆蓋 |
| 等待輸入狀態有取消按鈕 | 0 個操作 | 所有 4 個操作 | code review |
| 用戶回報渠道存在 | 無 | LINE 內可回報 | 功能上線 |

---

### 4. Target Users

- **批量上傳用戶**：業務人員，一次上傳多張名片，期望系統靜默完成並在完成後給明確摘要
- **所有 LINE Bot 用戶**：任何進入多步驟操作的用戶，需要明確出口
- **PM（David）**：需要收集用戶回饋，目前依賴人工訪談

---

### 5. User Stories & Requirements

#### P0 — Must Have

| # | User Story | Acceptance Criteria |
|---|-----------|-------------------|
| U1 | 用戶進入編輯欄位狀態後，可以取消操作 | Quick Reply 顯示 `❌ 取消編輯`；點擊後離開狀態，回覆「已取消」 |
| U2 | 用戶進入加備註狀態後，可以取消操作 | Quick Reply 顯示 `❌ 取消`；行為同 U1 |
| U3 | 用戶進入加標籤狀態後，可以取消操作 | Quick Reply 顯示 `❌ 取消`；行為同 U1 |
| U4 | 用戶進入 CSV 匯出輸入 email 狀態後，可以取消 | Quick Reply 顯示 `❌ 取消`；行為同 U1 |
| U5 | 批量上傳啟動時，系統提示用戶等待並勿輸入其他指令 | 啟動訊息改為：「批量上傳模式已開啟！請逐一傳送名片照片。完成後輸入「完成」。⚠️ 請稍等，系統將依序上傳並通知最終結果，完成前請勿輸入其他指令。」 |
| U6 | 批量上傳處理中，不發送逐張通知 | 移除每張 OCR 完成後的 push message；只保留最終摘要 |
| U6.1 | 系統判斷批量上傳完成 | 用戶最後傳圖片後 5 秒內無新圖片，Cloud Tasks 自動觸發完成流程並推播摘要 |
| U7 | 批量上傳完成後，摘要清單列出每張名片的成功/失敗狀況 | 最終訊息包含：總計、成功張數、失敗張數，以及具體的成功/失敗清單（含名字、公司、識別欄位）；失敗卡若 OCR 完全失敗則顯示 `[N] 辨識失敗（無可讀資料）` |

#### P1 — Should Have

| # | User Story | Acceptance Criteria |
|---|-----------|-------------------|
| U8 | 用戶可在 LINE 內主動回報問題 | 輸入「回報問題」文字指令後，進入 `reporting_issue` 狀態；引導式流程：「請描述您遇到的問題，或直接傳送截圖」→ 用戶輸入文字或傳圖 → Bot 確認「感謝回報！我們已收到您的反映，將盡快改善」 |
| U9 | 問題回報送出後，PM 能收到通知 | 回報內容寫入 Firebase（`feedback/{org_id}/{user_id}/{timestamp}` = `{content, type: 'text'\|'image', created_at}`）；若設定 `FEEDBACK_EMAIL` env var，同時發送 email 通知 PM |

#### P2 — Nice to Have

| # | User Story | Acceptance Criteria |
|---|-----------|-------------------|
| U10 | 批量上傳失敗清單提供「重新上傳」引導 | 失敗摘要後附上提示：「可重新傳送上方失敗的名片照片進行補上傳」 |
| U11 | 問題回報支援圖片附件 | 用戶可在回報流程中附上截圖 |

---

### 6. Solution Overview

#### 6.1 Quick Reply 視覺化取消

所有進入 `user_states` 等待輸入的地方，在回覆訊息時附上 Quick Reply，包含取消按鈕（`❌ 取消`）。

接收到取消 Postback 或取消文字時：
- 清除 `user_states[user_id]`
- 回覆「已取消操作」
- 不做其他狀態變更

影響的 action：`editing_field`、`adding_memo`、`exporting_csv`、`adding_tag`

取消的觸發方式：Quick Reply 按鈕 → Postback `action=cancel_state`

#### 6.2 批量上傳 UX 改善

**啟動提示詞**（`batch_start` handler）：
```
批量上傳模式已開啟！請逐一傳送名片照片。
傳完所有照片後，輸入「完成」開始處理。

⚠️ 系統將依序辨識並於全部完成後通知結果，
   完成前請勿輸入其他指令。
```

**移除逐張通知**：`batch_processor.py` 中每張 OCR 後的 `line_bot_api.push_message` 呼叫移除或改為 silent log。

**5 秒 Idle Detection 與自動完成**：
- 用戶傳圖片時，`batch_states[user_id].last_image_time` 記錄時間戳
- Cloud Tasks timer 每秒檢查：若 `current_time - last_image_time >= 5 秒`，自動觸發 `trigger_batch_completion`
- 無需用戶輸入「完成」指令，系統自動判斷並推播最終摘要
- 若用戶在 5 秒內繼續傳圖，計時器重置

**完成摘要格式**（`send_batch_summary_push`）：
```
✅ 批次處理完成！

共上傳 8 張，成功 5 張，失敗 3 張。

✅ 成功（5 張）：
・[1] 王小明 / 台灣科技股份有限公司
・[2] 李大華 / 新創有限公司
・[3] 陳美玲 / 行銷顧問
・[4] 張志偉 / 工程師
・[5] 林雅惠 / 業務經理

❌ 失敗（3 張）：
・[6] 辨識失敗（無可讀資料）
・[7] 影像模糊無法辨識
・[8] 已存在重複名片（email 相符）

可重新傳送失敗的名片照片進行補上傳。
```

識別欄位優先順序：`name`（若有）→ `company` → 順序編號
- 若 OCR 完全失敗（無任何欄位），顯示 `[N] 辨識失敗（無可讀資料）`

#### 6.3 問題回報機制

**觸發**：用戶輸入「回報問題」（文字指令）

**流程**：
1. Bot 回覆：「請描述您遇到的問題，或直接傳送截圖：」（進入 `user_states` `reporting_issue` 狀態）
2. 用戶輸入文字（或傳圖）
3. Bot 確認：「感謝回報！我們已收到您的反映，將盡快改善。」
4. 寫入 Firebase：`feedback/{org_id}/{user_id}/{timestamp}` = `{content, type: 'text'|'image', created_at}`

**PM 通知**（選用）：若設定 `FEEDBACK_EMAIL`，同時發送 email 通知。

---

### 7. Timeline & Phasing

**v3.7.0 範圍（本次）**：

| 任務 | 優先級 | 估計規模 |
|------|--------|---------|
| Quick Reply 取消按鈕（4 個 action） | P0 | S |
| cancel_state Postback handler | P0 | S |
| 批量啟動提示詞更新 | P0 | XS |
| 移除逐張 push notification | P0 | XS |
| **5 秒 Idle Detection 機制（Cloud Tasks timer）** | **P0** | **M** |
| 批量完成摘要改版（含成功/失敗清單） | P0 | M |
| 問題回報流程（`reporting_issue` state） | P1 | M |
| Firebase feedback 寫入 | P1 | S |
| 選用 email 通知（`FEEDBACK_EMAIL`） | P1 | S |

**實作流程**：設計文件 (Design Spec) → 程式實作 → Integration Testing → QA

**後續迭代**：
- U10（重新上傳引導）、U11（圖片附件回報）留 v3.8.0

---

### 8. Roadmap 更新說明

本 PRD 完成後：
- Phase 1「待完成：互動取消防呆機制」→ **已完成**（Timeout 機制確認由 LINE API 自然超時覆蓋，不另實作）
- Phase 1「待完成：用戶回報機制」→ **已完成**（問題回報 LINE 介面）
- Phase 3 批量上傳 → **體驗持續優化中**（Idle Detection + Summary List）
