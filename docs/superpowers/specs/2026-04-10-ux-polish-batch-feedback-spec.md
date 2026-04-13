# Design Specification — UX 防呆補強 & 批量上傳體驗優化

**日期**：2026-04-10  
**版本**：v1.0  
**對應 PRD**：`docs/gtm/prd/2026-04-10-ux-polish-batch-feedback-prd.md`  
**涵蓋範圍**：Phase 1 Quick Reply 取消、Phase 3 批量上傳 Idle Detection、問題回報機制

---

## 1. Overview

本規格書詳細定義三項功能的實現方式，分別對應 PRD 的 P0 與 P1 requirement。

### 功能清單

| 功能 | 優先級 | 影響組件 | 複雜度 |
|------|--------|----------|--------|
| Quick Reply 視覺化取消 | P0 | `line_handlers.py` | 低 |
| 5 秒 Idle Detection + Auto-Complete | P0 | Cloud Tasks, `batch_processor.py` | 高 |
| 批量上傳完成摘要（成功/失敗清單） | P0 | `batch_processor.py`, Firebase | 中 |
| 問題回報流程 | P1 | `line_handlers.py`, `firebase_utils.py` | 中 |

---

## 2. Component Changes

### 2.1 line_handlers.py

#### Quick Reply 取消機制

**新增函數**：
```python
def attach_cancel_quick_reply(reply_message: Union[TextSendMessage, ...]) -> Union[TextSendMessage, ...]:
    """為訊息附加取消 Quick Reply
    
    Args:
        reply_message: LINE MessageObject
        
    Returns:
        相同訊息，但新增 quick_reply 按鈕：❌ 取消
    """
    quick_reply = QuickReply(
        items=[
            QuickReplyButton(
                action=PostbackAction(
                    label="❌ 取消",
                    data="action=cancel_state"
                )
            )
        ]
    )
    reply_message.quick_reply = quick_reply
    return reply_message
```

**修改位置**（4 個 action）：
1. `handle_editing_field_state` (line handlers) — 編輯欄位時回覆訊息
2. `handle_adding_memo_state` — 加備註時回覆訊息  
3. `handle_adding_tag_state` — 加標籤時回覆訊息
4. `handle_exporting_csv_state` — 輸入 email 時回覆訊息

```python
# 範例（編輯欄位）
def handle_editing_field_state(user_id, org_id, text):
    # ... 原有邏輯 ...
    reply = TextSendMessage(text="請輸入新的值...")
    reply = attach_cancel_quick_reply(reply)  # ← 新增這行
    line_bot_api.reply_message(reply_token, reply)
```

#### 取消操作 Postback Handler

**新增函數**：
```python
def handle_cancel_state_postback(user_id: str, line_bot_api, reply_token: str):
    """處理 cancel_state postback
    
    Flow:
    1. 清除 user_states[user_id]
    2. 回覆「已取消」訊息
    3. 清空快速回覆
    """
    if user_id in user_states:
        del user_states[user_id]
    
    reply = TextSendMessage(text="✓ 已取消操作")
    line_bot_api.reply_message(reply_token, reply)
```

**在 `handle_postback_event` 中整合**：
```python
def handle_postback_event(event, line_bot_api):
    postback_data = event.postback.data
    user_id = event.source.user_id
    reply_token = event.reply_token
    
    # Parse postback data: action=xxx&...
    params = dict(urllib.parse.parse_qsl(postback_data))
    action = params.get('action')
    
    if action == 'cancel_state':
        handle_cancel_state_postback(user_id, line_bot_api, reply_token)
        return
    
    # ... 其他 postback handlers ...
```

#### 問題回報文字觸發

**新增函數**：
```python
def handle_reporting_issue_trigger(user_id: str, org_id: str, 
                                   line_bot_api, reply_token: str):
    """用戶輸入「回報問題」時觸發"""
    user_states[user_id] = {
        'action': 'reporting_issue',
        'org_id': org_id,
        'created_at': datetime.utcnow().isoformat()
    }
    
    reply = TextSendMessage(
        text="請描述您遇到的問題，或直接傳送截圖："
    )
    line_bot_api.reply_message(reply_token, reply)
```

**在 text event handler 中整合**：
```python
def handle_text_event(event, line_bot_api):
    user_id = event.source.user_id
    text = event.message.text
    reply_token = event.reply_token
    
    # ... 確保用戶有組織 ...
    org_id = user_org_map.get(user_id)
    
    # 檢查是否在多步驟操作中
    if user_id in user_states:
        current_state = user_states[user_id]['action']
        if current_state == 'reporting_issue':
            return handle_reporting_issue_state(user_id, org_id, text, line_bot_api, reply_token)
        # ... 其他 state handlers ...
    
    # 檢查觸發詞
    if text.strip() == "回報問題":
        return handle_reporting_issue_trigger(user_id, org_id, line_bot_api, reply_token)
    
    # ... 其他文字指令 ...
```

#### 報告問題狀態處理

**新增函數**：
```python
def handle_reporting_issue_state(user_id: str, org_id: str, 
                                 content: str, line_bot_api, reply_token: str):
    """用戶在 reporting_issue 狀態下輸入內容或傳圖"""
    state_info = user_states[user_id]
    timestamp = datetime.utcnow().isoformat()
    
    # 寫入 Firebase: feedback/{org_id}/{user_id}/{timestamp}
    feedback_data = {
        'content': content,
        'type': 'text',  # 或 'image'（若是圖片）
        'created_at': timestamp,
        'user_id': user_id
    }
    firebase_utils.write_feedback(org_id, user_id, timestamp, feedback_data)
    
    # 清除 state
    del user_states[user_id]
    
    # 回覆確認訊息
    reply = TextSendMessage(
        text="感謝回報！我們已收到您的反映，將盡快改善。"
    )
    line_bot_api.reply_message(reply_token, reply)
    
    # 若設定 FEEDBACK_EMAIL，發送 PM 通知（異步）
    if os.getenv('FEEDBACK_EMAIL'):
        send_feedback_notification_async(org_id, user_id, feedback_data)
```

### 2.2 batch_processor.py

#### 移除逐張通知

**改動**：在 `process_batch` 函數中，移除或註解掉每張 OCR 完成後的 `push_message` 呼叫：

```python
# 原有邏輯（要移除）
# for idx, card_data in enumerate(ocr_results):
#     line_bot_api.push_message(
#         user_id, 
#         TextSendMessage(f"✓ 第 {idx+1} 張已掃描完成")
#     )

# 新邏輯：改為 silent log
for idx, card_data in enumerate(ocr_results):
    logger.info(f"Processed card {idx+1}/{total} for user {user_id}")
```

#### 5 秒 Idle Detection 與自動完成

**修改 `append_batch_image` 函數**（在 `main.py` image event handler 中呼叫）：

```python
def append_batch_image(user_id: str, org_id: str, 
                       storage_path: str, db: database.Database):
    """新增圖片到批量上傳隊列
    
    Args:
        storage_path: Firebase Storage 中的圖片路徑
        
    Side effect:
        更新 batch_states[user_id].last_image_time
        若已有 Cloud Tasks timer 在執行，會在新圖片時重置
    """
    batch_ref = db.reference(f'batch_states/{user_id}')
    batch_data = batch_ref.get() or {}
    
    # 新增圖片
    pending_images = batch_data.get('pending_images', [])
    pending_images.append(storage_path)
    
    # 更新 last_image_time（用於 idle detection）
    batch_data['pending_images'] = pending_images
    batch_data['last_image_time'] = datetime.utcnow().isoformat()
    batch_data['updated_at'] = datetime.utcnow().isoformat()
    
    batch_ref.update(batch_data)
    
    logger.info(f"Appended image to batch for {user_id}, total: {len(pending_images)}")
```

#### Cloud Tasks Timer 邏輯

**新增函數**（在 `batch_processor.py` 或新建 `batch_timer.py`）：

```python
def check_batch_idle_and_trigger(user_id: str, org_id: str, 
                                 db: database.Database,
                                 cloud_tasks_client):
    """檢查批量上傳是否 idle（5 秒無新圖片）
    
    Background task，由 Cloud Scheduler 每 2 秒呼叫一次
    
    Logic:
    1. 查詢 batch_states[user_id]
    2. 若無 pending_images，跳過
    3. 若 now - last_image_time >= 5 秒，觸發 trigger_batch_completion
    4. 否則，重新排程 check（下次仍在 1 秒內）
    """
    batch_ref = db.reference(f'batch_states/{user_id}')
    batch_data = batch_ref.get()
    
    if not batch_data or not batch_data.get('pending_images'):
        return  # No active batch
    
    last_image_time_str = batch_data.get('last_image_time')
    if not last_image_time_str:
        return
    
    last_image_time = datetime.fromisoformat(last_image_time_str)
    elapsed = (datetime.utcnow() - last_image_time).total_seconds()
    
    if elapsed >= 5:
        # 觸發自動完成
        logger.info(f"Batch idle detected for {user_id} ({elapsed:.1f}s), triggering completion")
        trigger_batch_completion(user_id, org_id, db, cloud_tasks_client)
    else:
        # 若尚未達 5 秒，重新排程檢查（Cloud Tasks 會自動重試）
        logger.info(f"Batch still active for {user_id} ({elapsed:.1f}s), waiting...")
```

**新增函數**：
```python
def trigger_batch_completion(user_id: str, org_id: str,
                            db: database.Database,
                            cloud_tasks_client):
    """觸發批量上傳完成流程
    
    相當於用戶輸入「完成」，建立 Cloud Task 呼叫 /internal/process-batch
    """
    batch_ref = db.reference(f'batch_states/{user_id}')
    batch_data = batch_ref.get() or {}
    
    if not batch_data.get('pending_images'):
        logger.warning(f"No images to process for {user_id}")
        return
    
    # 建立 Cloud Task
    task = {
        'http_request': {
            'http_method': 'POST',
            'url': f"{os.getenv('CLOUD_RUN_URL')}/internal/process-batch",
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({
                'user_id': user_id,
                'org_id': org_id
            }).encode()
        }
    }
    
    request = {
        'parent': cloud_tasks_client.queue_path(
            os.getenv('GOOGLE_CLOUD_PROJECT'),
            os.getenv('CLOUD_TASKS_LOCATION'),
            os.getenv('CLOUD_TASKS_QUEUE')
        ),
        'task': task
    }
    
    cloud_tasks_client.create_task(request)
    
    # 標記為「已排隊」，避免重複觸發
    batch_data['status'] = 'queued'
    batch_ref.update(batch_data)
    
    logger.info(f"Created Cloud Task for batch completion: {user_id}")
```

**Cloud Scheduler 觸發**（GCP 一次性配置）：
```bash
# 建立 Cloud Scheduler job，每 2 秒呼叫一次檢查 endpoint
gcloud scheduler jobs create http check-batch-idle \
  --schedule="*/2 * * * * *" \
  --uri="https://{SERVICE}.run.app/internal/check-batch-idle" \
  --http-method=POST \
  --message-body='{}'
```

#### 改進的完成摘要

**改動 `send_batch_summary_push` 函數**：

```python
def send_batch_summary_push(user_id: str, org_id: str, 
                            results: List[Dict], line_bot_api):
    """推播批量上傳結果摘要（含成功/失敗清單）
    
    Args:
        results: 本次 batch 的 OCR 結果列表
                 格式: [
                     {'card_id': '...', 'status': 'success', 'name': '...', 'company': '...'},
                     {'index': 6, 'status': 'failed', 'reason': '無可讀資料'},
                     ...
                 ]
    """
    success_cards = [r for r in results if r.get('status') == 'success']
    failed_cards = [r for r in results if r.get('status') == 'failed']
    
    total = len(results)
    success_count = len(success_cards)
    failed_count = len(failed_cards)
    
    # 構建成功清單（優先順序：name → company → index）
    success_list = ""
    for idx, card in enumerate(success_cards, 1):
        display_name = card.get('name') or card.get('company') or f"卡片 {idx}"
        company = card.get('company', '')
        if company:
            success_list += f"・[{idx}] {display_name} / {company}\n"
        else:
            success_list += f"・[{idx}] {display_name}\n"
    
    # 構建失敗清單（含原因）
    failed_list = ""
    for idx, card in enumerate(failed_cards, 1):
        reason = card.get('reason', '辨識失敗')
        if card.get('status_reason') == 'no_readable_data':
            reason = "辨識失敗（無可讀資料）"
        elif card.get('status_reason') == 'duplicate':
            reason = f"已存在重複名片（email 相符）"
        
        failed_list += f"・[{idx}] {reason}\n"
    
    # 完整訊息
    message_text = f"""✅ 批次處理完成！

共上傳 {total} 張，成功 {success_count} 張，失敗 {failed_count} 張。

✅ 成功（{success_count} 張）：
{success_list if success_list else "無"}

❌ 失敗（{failed_count} 張）：
{failed_list if failed_list else "無"}

可重新傳送失敗的名片照片進行補上傳。"""
    
    reply = TextSendMessage(text=message_text)
    line_bot_api.push_message(user_id, reply)
    
    # 清除 batch state
    batch_ref = db.reference(f'batch_states/{user_id}')
    batch_ref.delete()
```

### 2.3 firebase_utils.py

#### 新增 Feedback 寫入函數

```python
def write_feedback(org_id: str, user_id: str, timestamp: str, 
                   feedback_data: Dict, db: database.Database):
    """寫入用戶回報到 Firebase
    
    Path: feedback/{org_id}/{user_id}/{timestamp}
    Schema: {
        content: string,
        type: 'text' | 'image',
        created_at: ISO8601,
        user_id: string
    }
    """
    feedback_path = f'feedback/{org_id}/{user_id}/{timestamp}'
    db.reference(feedback_path).set(feedback_data)
    logger.info(f"Feedback written: {feedback_path}")
```

---

## 3. State Machine 更新

### 新增 State

```python
# user_states[user_id] 新增支援的 action
SUPPORTED_STATES = [
    'editing_field',      # 編輯名片欄位
    'adding_memo',        # 加備註
    'exporting_csv',      # 輸入 email 進行 CSV 匯出
    'adding_tag',         # 新增標籤
    'reporting_issue'     # ← 新增：回報問題
]

# 範例狀態結構
user_states[user_id] = {
    'action': 'reporting_issue',
    'org_id': '...',
    'created_at': '2026-04-10T...'
}
```

---

## 4. Data Model 變更

### batch_states

```
batch_states/{user_id}/
  org_id: string
  pending_images: [storage_path, ...]
  last_image_time: ISO8601        ← 新增：用於 idle detection
  status: 'active' | 'queued'     ← 新增：防止重複觸發
  created_at: ISO8601
  updated_at: ISO8601
```

### feedback（新增）

```
feedback/{org_id}/{user_id}/{timestamp}/
  content: string                 # 用戶回報內容（文字或截圖描述）
  type: 'text' | 'image'          # 回報類型
  created_at: ISO8601
  user_id: string
```

---

## 5. API Endpoints

### GET /internal/check-batch-idle

**目的**：Cloud Scheduler 定期呼叫，檢查是否有 batch 進入 idle 狀態

**觸發來源**：Cloud Scheduler（每 2 秒）

**邏輯**：
1. 掃描所有 `batch_states/{user_id}`
2. 檢查 `last_image_time` 距今是否 >= 5 秒
3. 若是，呼叫 `trigger_batch_completion`

```python
@app.post('/internal/check-batch-idle')
def check_batch_idle():
    """由 Cloud Scheduler 定期呼叫"""
    db = get_db_instance()
    
    batch_states_ref = db.reference('batch_states')
    all_batches = batch_states_ref.get() or {}
    
    for user_id, batch_data in all_batches.items():
        org_id = batch_data.get('org_id')
        status = batch_data.get('status', 'active')
        
        # 若已排隊，跳過（避免重複）
        if status == 'queued':
            continue
        
        check_batch_idle_and_trigger(user_id, org_id, db, cloud_tasks_client)
    
    return {'status': 'ok'}
```

---

## 6. Error Handling & Edge Cases

### Quick Reply 取消

- **邊界情況**：user_states 已被清除 → 仍正常回覆「已取消」
- **Edge case**：用戶同時按多個取消按鈕 → 幂等設計，多次清除 state 無影響

### Batch Idle Detection

- **邊界**：若 user 傳完圖片後立即關閉 LINE，idle detection 仍會觸發並推播摘要
  - **預期行為**：✓ 符合設計（async 完成是目的）
- **重複觸發**：使用 `status='queued'` 標記，確保 idle check 不會重複建立 task
- **時間邊界**：elapsed >= 5 秒時精確觸發，不支援亞秒級精度（OK，1 秒誤差可接受）

### 問題回報

- **圖片附件**：暫不支援（U11 留 v3.8.0），若用戶傳圖，目前當作文字「[圖片]」處理
- **FEEDBACK_EMAIL 缺失**：若 env var 未設定，仍正常寫入 Firebase，只是不發 email
- **用戶重複回報**：無限制，PM 需自行去重（下版本考慮新增「待審核」佇列）

---

## 7. Testing Plan

### 單元測試

```python
# test_line_handlers.py
def test_cancel_state_postback():
    """驗證 cancel_state postback 清除 state"""
    user_states['user_1'] = {'action': 'editing_field', 'card_id': '...'}
    handle_cancel_state_postback('user_1', mock_line_bot_api, 'reply_token_1')
    assert 'user_1' not in user_states
    
def test_reporting_issue_trigger():
    """驗證「回報問題」觸發進入 reporting_issue state"""
    org_id = 'org_test'
    handle_reporting_issue_trigger('user_1', org_id, mock_line_bot_api, 'reply_token_1')
    assert user_states['user_1']['action'] == 'reporting_issue'

# test_batch_processor.py
def test_check_batch_idle_triggers_completion():
    """驗證 5 秒後自動觸發完成"""
    last_image_time = (datetime.utcnow() - timedelta(seconds=6)).isoformat()
    batch_data = {'pending_images': ['img1.jpg'], 'last_image_time': last_image_time}
    # mock db.reference return batch_data
    
    check_batch_idle_and_trigger('user_1', 'org_1', mock_db, mock_tasks_client)
    # 驗證 trigger_batch_completion 被呼叫
    mock_tasks_client.create_task.assert_called_once()

def test_improved_batch_summary_format():
    """驗證摘要清單格式（成功/失敗分列）"""
    results = [
        {'status': 'success', 'name': '王小明', 'company': '台灣科技'},
        {'status': 'success', 'name': '李大華', 'company': '新創'},
        {'status': 'failed', 'reason': '無可讀資料'},
        {'status': 'failed', 'reason': '已存在重複名片'}
    ]
    
    # 驗證 send_batch_summary_push 產生的訊息格式
    # ✓ 包含成功數和失敗數
    # ✓ 逐行列出成功卡片名字 + 公司
    # ✓ 逐行列出失敗原因
```

### 整合測試（手工）

| 案例 | 步驟 | 預期結果 |
|------|------|--------|
| Quick Reply 取消 - 編輯欄位 | 1. 選「編輯」2. 點「❌ 取消」 | state 清除，回覆「已取消」 |
| Quick Reply 取消 - 加標籤 | 1. 選「加標籤」2. 點「❌ 取消」 | state 清除，回覆「已取消」 |
| Batch Idle Detection | 1. 進入批量模式 2. 傳 3 張圖 3. 等 6 秒 | 自動推播摘要（無需輸入「完成」） |
| Batch 中途中斷 | 1. 進入批量 2. 傳圖 3. 3 秒後輸入「新增」 | 優雅降級：取消批量，開始新增單張 |
| 問題回報 | 1. 輸入「回報問題」2. 輸入問題描述 3. 確認送出 | Firebase 寫入 + 確認訊息 |
| 問題回報 + Email 通知 | 如上，並設定 FEEDBACK_EMAIL | Email 送給 PM（檢查 Gmail） |

---

## 8. Deployment Checklist

- [ ] 確認 Cloud Scheduler job 已建立（check-batch-idle，每 2 秒）
- [ ] 確認 Cloud Tasks queue 有正確權限（enqueuer）
- [ ] 設定 env var：
  - `CLOUD_RUN_URL` = Cloud Run service URL
  - `GOOGLE_CLOUD_PROJECT` = GCP project ID
  - `CLOUD_TASKS_QUEUE` = 'namecard-batch'
  - `CLOUD_TASKS_LOCATION` = 'asia-east1'
  - `FEEDBACK_EMAIL` (optional) = PM 的 email
- [ ] 測試 `/internal/check-batch-idle` endpoint（manual curl 或 Cloud Scheduler dry-run）
- [ ] 測試 Quick Reply 取消按鈕（LINE test account）
- [ ] 測試批量上傳 idle detection（傳圖 → 等待 → 自動推播）
- [ ] 測試問題回報流程（Firebase 驗證已寫入）
- [ ] 檢查 logs 中是否有異常（flake8, pytest）
- [ ] 部署到 production：`gcloud run deploy ...`
- [ ] 監控首日 metrics：
  - 批量上傳完成率（摘要推播成功次數）
  - idle detection trigger 次數
  - 問題回報數量

---

## 9. Rollback & Fallback

### Quick Reply 取消

- **Rollback**：移除 `attach_cancel_quick_reply` 呼叫
- **Fallback**：無需 fallback，該機制自動降級（缺少 quick_reply 時不影響訊息送達）

### Idle Detection

- **Rollback**：移除 Cloud Scheduler job，恢復原來「用戶輸入完成」的流程
- **Fallback**：若 Cloud Scheduler 故障，用戶仍可手動輸入「完成」（`handle_batch_complete` 保持可用）

### 問題回報

- **Rollback**：移除 `reporting_issue` state handler，discard 所有已寫入 Firebase 的回報
- **Fallback**：若 Firebase 不可用，log warning 但不中斷用戶 flow，回覆「系統暫時無法接收回報」

---

## 10. Performance & Monitoring

### 預期開銷

| 組件 | 月度成本影響 | 備註 |
|------|----------|------|
| Cloud Scheduler | +$0.10 | 每秒 2 次 check-batch-idle endpoint |
| Cloud Tasks | +$0.01 | 批量上傳時才建立 task |
| Firebase RTDB | +$0.05 | feedback 回報存儲（小) |
| Logs | +$0.02 | batch idle detection log |

### 監控指標

```python
# 建議新增的 metrics

# 批量上傳
- "batch_idle_detected_count" (Counter) — idle detection 觸發次數
- "batch_completion_latency_seconds" (Histogram) — 最後一張圖到摘要推播的延遲
- "batch_summary_card_count" (Histogram) — 單次批量的名片數

# 問題回報
- "feedback_submitted_count" (Counter) — 回報次數
- "feedback_email_sent_count" (Counter) — email 成功寄出次數
```

---

## 11. 實作順序（建議）

1. **Phase 1a**（1-2 天）：
   - Quick Reply 取消機制
   - cancel_state postback handler
   - 所有 4 個 action 的 quick_reply 附加

2. **Phase 1b**（1 天）：
   - 批量啟動訊息更新（DONE in PRD, just copy text）
   - 移除逐張 push notification

3. **Phase 2**（2-3 天）：
   - 5 秒 idle detection（最複雜）
   - Cloud Scheduler 配置
   - 改進的摘要格式

4. **Phase 3**（1-2 天）：
   - 問題回報流程
   - Firebase feedback 寫入
   - Email 通知（選用）

5. **Phase 4**（1 天）：
   - 單元測試 + 整合測試
   - Flake8 lint
   - 部署前 checklist

**總估計**：5-9 個工作天
