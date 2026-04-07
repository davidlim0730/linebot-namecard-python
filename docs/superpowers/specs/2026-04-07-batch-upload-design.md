# 批量名片上傳 — 設計規格

**日期**：2026-04-07
**狀態**：已核准，待實作

---

## 功能概述

讓用戶在 LINE 一次傳送多張名片照片，輸入「完成」後由系統背景批次跑 OCR，最後一次性推播結果摘要。解決辦完活動一次拿到大量名片、逐張掃描太慢的痛點。

---

## 使用者流程

```
1. 用戶輸入「批量上傳」（或「批次上傳」）
   → bot 回：「進入批量上傳模式，請傳送名片照片，完成後輸入『完成』」

2. 用戶傳送圖片（一張或多張，可分批傳）
   → bot 靜默收集，每張圖存入 Firebase Storage
   → 不發任何訊息，不跑 OCR

3. 用戶輸入「完成」
   → bot 立刻回：「已排程 N 張名片，辨識中請稍候...」
   → 啟動 BackgroundTask，循序呼叫 Gemini OCR

4. 全部處理完畢
   → Push API 推送結果摘要：
     「✅ 10 張已完成，成功 9 張，失敗 1 張
      失敗原因：第 3 張 — 圖片不清晰或非名片」

5. 用戶輸入「取消」（在步驟 2-3 之間）
   → 清空 buffer，回：「已取消，共丟棄 N 張圖片」
```

---

## 限制

- 單次批量上限：**30 張**（超過時，bot 提示並拒絕進入「完成」流程）
- 僅在批量模式下的圖片才進批次處理；模式外的圖片維持原本單張即時處理

---

## State Machine

在現有 `user_states[user_id]` 新增 action `batch_uploading`：

```python
user_states[user_id] = {
    'action': 'batch_uploading',
    'pending_images': [
        {'storage_path': 'raw_images/{org_id}/{user_id}/{uuid}.jpg'},
        # ...
    ]
}
```

**State 轉換：**

| 事件 | 從 | 到 |
|------|----|----|
| 輸入「批量上傳」 | 無 state | batch_uploading |
| 收到圖片 | batch_uploading | batch_uploading（append） |
| 輸入「完成」 | batch_uploading | 清除 state，啟動 BackgroundTask |
| 輸入「取消」 | batch_uploading | 清除 state |
| 超過 30 張再傳圖 | batch_uploading | 維持，回提示訊息拒絕 |

---

## Firebase Storage 結構

```
raw_images/{org_id}/{user_id}/{uuid}.jpg   ← 暫存用，OCR 完成後刪除
```

---

## 背景處理邏輯（BackgroundTask）

```
for each image in pending_images:
    1. 從 Firebase Storage 下載圖片
    2. 呼叫現有 gemini_utils OCR（response_mime_type: application/json）
    3. 走現有去重檢查（email 比對）
    4. 成功 → 存入 namecard/{org_id}/{card_id}/，觸發 Google Sheets sync
    5. 失敗 → 記錄失敗原因（圖片不清晰、無法辨識為名片等）
    6. 刪除 Storage 暫存圖片

完成後 → LINE Push API 推播摘要
```

- **循序處理**（非並發），天然避開 Gemini rate limit
- 試用版 scan_count 檢查：若中途達上限，停止處理剩餘圖片並在摘要中說明

---

## 修改範圍

| 檔案 | 修改內容 |
|------|---------|
| `app/line_handlers.py` | 新增 batch_uploading state 處理、「批量上傳」「完成」「取消」指令判斷 |
| `app/firebase_utils.py` | 新增 `upload_raw_image_to_storage()`、`delete_raw_image()` |
| `app/gemini_utils.py` | 無修改（沿用現有 OCR 函式） |
| `app/bot_instance.py` | 無修改（user_states 結構已支援任意 dict） |

---

## 不在此次範圍內

- Cloud Tasks / Pub/Sub（MVP 用 BackgroundTasks 即可）
- 試用版掃描上限整合（待試用版功能設計後再一併實作）
- 批量上傳進度條或中間狀態通知
