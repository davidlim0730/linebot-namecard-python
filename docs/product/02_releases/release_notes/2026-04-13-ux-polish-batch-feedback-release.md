# Release Notes — v3.7.0 UX 防呆補強 & 批量上傳體驗優化

**發布日期**：2026-04-13  
**版本**：v3.7.0  
**Cloud Run Revision**：linebot-namecard-00062-csv  

---

## 本次更新重點

### 1. Quick Reply 視覺化取消（全面補齊）

所有多步驟操作狀態現在都有明確取消出口，按下按鈕即可離開狀態。

| 狀態 | 觸發入口 | 提示文案 |
|------|---------|---------|
| 編輯欄位 | 名片 → 編輯 | `請輸入「{name}」的新{field}，完成後直接送出。` |
| 加備忘錄 | 名片 → 備忘錄 | `請輸入「{name}」的備忘錄內容，完成後直接送出。` |
| 新增標籤 | 群組管理 → 新增標籤 | `請輸入新標籤名稱，完成後直接送出。` |
| 匯出 CSV | 資料與設定 → 匯出 CSV | `請輸入收件 Email，系統將寄送名片清單至該信箱。` |
| 回報問題 | 輸入「回報問題」 | `請描述您遇到的問題，完成後直接送出。` |

取消按鈕統一標籤：`❌ 取消操作`，點擊後回覆「✓ 已取消操作」並清除狀態。

---

### 2. 批量上傳體驗優化

**5 秒 Idle Detection 自動完成**：
- 用戶傳送最後一張圖片後，系統偵測 5 秒無新圖片，自動觸發批量處理
- 不需手動輸入「完成」（仍支援手動觸發）
- 由 Cloud Scheduler（每分鐘）+ Firebase `last_image_time` 實現

**批量完成摘要升級**（兩條路徑統一格式）：
```
✅ 批次處理完成！

共上傳 N 張，成功 M 張，失敗 K 張。

✅ 成功（M 張）：
・[1] 王小明 / 台灣科技股份有限公司
・[2] 李大華 / 新創有限公司

❌ 失敗（K 張）：
・[1] 辨識失敗（無可讀資料）

可重新傳送失敗的名片照片進行補上傳。
```

---

### 3. 問題回報機制

用戶可在 LINE 內直接輸入「回報問題」啟動回報流程：
1. Bot 引導輸入問題描述
2. 內容寫入 Firebase `feedback/{org_id}/{user_id}/{timestamp}`
3. 若設定 `FEEDBACK_EMAIL`，同時發送 email 通知 PM

---

## Bug Fixes

- **修正重複函數導致批量摘要缺少名單**：`send_batch_summary_push` 存在兩個實作，`main.py` import 的舊版只輸出計數，新版（含姓名/公司清單）未被呼叫。統一為 `line_handlers.py` 版本。
- **修正 Idle Detection 失效**：`firebase_utils.append_batch_image` 未寫入 `last_image_time`，導致 Cloud Scheduler 永遠找不到 timeout。補齊 `last_image_time` 寫入。
- **修正 `batch_processor.append_batch_image` 廢棄版本**：刪除 `batch_processor.py` 中的重複版本（有 race condition），統一使用 `firebase_utils` 的原子性 `push()` 版本。

---

## 技術異動

| 檔案 | 變更類型 | 說明 |
|------|---------|------|
| `app/line_handlers.py` | 功能新增 | `handle_cancel_state_postback`、`handle_reporting_issue_trigger`、`handle_reporting_issue_state`；全面補齊 Quick Reply 取消按鈕與文案 |
| `app/line_handlers.py` | 修正 | `send_batch_summary_push` 升級為含成功/失敗清單格式 |
| `app/firebase_utils.py` | 修正 | `append_batch_image` 補寫 `last_image_time`；`write_feedback` timestamp 安全化（Firebase key 不允許 `:` `.`） |
| `app/batch_processor.py` | 清理 | 移除重複的 `append_batch_image`、`send_batch_summary_push` |
| Cloud Scheduler | 新增 | `check-batch-idle` job，每分鐘觸發 `/internal/check-batch-idle` |
