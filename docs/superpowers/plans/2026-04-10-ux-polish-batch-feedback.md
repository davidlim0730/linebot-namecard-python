# UX 防呆補強 & 批量上傳體驗優化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Quick Reply cancel buttons for multi-step operations, batch upload idle detection with 5-second auto-completion, improved summary with success/failure lists, and user problem reporting mechanism.

**Architecture:** Distributed state management using Firebase Realtime DB with Cloud Scheduler for periodic batch idle checks. Quick Reply buttons provide immediate escape from multi-step states. Batch processing decouples image submission from processing, automatically triggering completion after 5 seconds of inactivity. Problem reporting creates a lightweight feedback collection system with optional PM email notification.

**Tech Stack:** FastAPI webhook, LINE Message API (Quick Reply + Postback), Firebase Realtime DB, Cloud Scheduler (2-second polling), Cloud Tasks (async batch processing), Gemini Vision API (OCR)

---

## File Structure

**Files to create:**
- None (all modifications to existing files)

**Files to modify:**
- `app/line_handlers.py` — Quick Reply attachment, cancel handler, reporting issue trigger/state
- `app/batch_processor.py` — Idle detection, auto-completion, improved summary format
- `app/firebase_utils.py` — New `write_feedback()` function
- `app/main.py` — New `/internal/check-batch-idle` endpoint
- `tests/test_line_handlers.py` — New tests for cancel + reporting
- `tests/test_batch_processor.py` — New tests for idle detection + summary
- `tests/test_firebase_utils.py` — New tests for feedback writing
- `tests/test_main.py` — New tests for idle check endpoint

**GCP Infrastructure:**
- Cloud Scheduler job: `check-batch-idle` (every 2 seconds)

---

## Phase 1: Quick Reply Cancel Mechanism (Days 1-2)

### Task 1: Create `attach_cancel_quick_reply()` helper function

**Files:**
- Modify: `app/line_handlers.py`
- Test: `tests/test_line_handlers.py`

- [ ] **Step 1: Write failing test for attach_cancel_quick_reply**

Test file: `tests/test_line_handlers.py`

```python
from linebot.models import TextSendMessage, QuickReply, QuickReplyButton, PostbackAction
from app.line_handlers import attach_cancel_quick_reply

def test_attach_cancel_quick_reply_adds_quick_reply_button():
    """Verify attach_cancel_quick_reply adds ❌ 取消 button"""
    message = TextSendMessage(text="Please input...")
    result = attach_cancel_quick_reply(message)
    
    assert result.quick_reply is not None
    assert len(result.quick_reply.items) == 1
    assert result.quick_reply.items[0].action.label == "❌ 取消"
    assert result.quick_reply.items[0].action.data == "action=cancel_state"
    assert result.text == "Please input..."  # Original text unchanged
```

- [ ] **Step 2: Run test to verify failure**

```bash
cd /Users/davidlin/Claude-Code-Project/linebot-namecard-python
python -m pytest tests/test_line_handlers.py::test_attach_cancel_quick_reply_adds_quick_reply_button -v
```

Expected: `FAILED ... AttributeError: module 'app.line_handlers' has no attribute 'attach_cancel_quick_reply'`

- [ ] **Step 3: Implement attach_cancel_quick_reply function**

Add to `app/line_handlers.py`:

```python
from linebot.models import QuickReply, QuickReplyButton, PostbackAction
from typing import Union

def attach_cancel_quick_reply(reply_message: Union[TextSendMessage, FlexMessage]) -> Union[TextSendMessage, FlexMessage]:
    """為訊息附加取消 Quick Reply
    
    Args:
        reply_message: LINE MessageObject (TextSendMessage or FlexMessage)
        
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

- [ ] **Step 4: Run test to verify pass**

```bash
python -m pytest tests/test_line_handlers.py::test_attach_cancel_quick_reply_adds_quick_reply_button -v
```

Expected: `PASSED`

- [ ] **Step 5: Commit**

```bash
git add app/line_handlers.py tests/test_line_handlers.py
git commit -m "feat: add attach_cancel_quick_reply helper function"
```

---

### Task 2: Implement handle_cancel_state_postback handler

**Files:**
- Modify: `app/line_handlers.py`
- Test: `tests/test_line_handlers.py`

- [ ] **Step 1: Write failing test**

Add to `tests/test_line_handlers.py`:

```python
from app.line_handlers import handle_cancel_state_postback, user_states

def test_handle_cancel_state_postback_clears_state():
    """Verify cancel postback clears user_states and replies with confirmation"""
    user_id = "test_user_123"
    user_states[user_id] = {'action': 'editing_field', 'card_id': 'card_456'}
    
    mock_line_bot_api = MagicMock()
    reply_token = "token_789"
    
    handle_cancel_state_postback(user_id, mock_line_bot_api, reply_token)
    
    # Verify state was cleared
    assert user_id not in user_states
    
    # Verify reply was sent
    mock_line_bot_api.reply_message.assert_called_once()
    call_args = mock_line_bot_api.reply_message.call_args
    assert call_args[0][0] == reply_token
    assert "✓ 已取消操作" in call_args[0][1].text
```

- [ ] **Step 2: Run test to verify failure**

```bash
python -m pytest tests/test_line_handlers.py::test_handle_cancel_state_postback_clears_state -v
```

Expected: `FAILED ... NameError: name 'handle_cancel_state_postback' is not defined`

- [ ] **Step 3: Implement handle_cancel_state_postback**

Add to `app/line_handlers.py`:

```python
def handle_cancel_state_postback(user_id: str, line_bot_api, reply_token: str):
    """處理 cancel_state postback
    
    Flow:
    1. 清除 user_states[user_id]
    2. 回覆「已取消」訊息
    """
    if user_id in user_states:
        del user_states[user_id]
    
    reply = TextSendMessage(text="✓ 已取消操作")
    line_bot_api.reply_message(reply_token, reply)
```

- [ ] **Step 4: Run test to verify pass**

```bash
python -m pytest tests/test_line_handlers.py::test_handle_cancel_state_postback_clears_state -v
```

Expected: `PASSED`

- [ ] **Step 5: Commit**

```bash
git add app/line_handlers.py tests/test_line_handlers.py
git commit -m "feat: implement handle_cancel_state_postback handler"
```

---

### Task 3: Integrate cancel_state into handle_postback_event

**Files:**
- Modify: `app/line_handlers.py`
- Test: `tests/test_line_handlers.py`

- [ ] **Step 1: Write failing test**

Add to `tests/test_line_handlers.py`:

```python
import urllib.parse

def test_handle_postback_event_routes_cancel_state_action():
    """Verify handle_postback_event routes action=cancel_state correctly"""
    user_id = "test_user"
    reply_token = "token"
    user_states[user_id] = {'action': 'editing_field'}
    
    # Create mock event with cancel_state postback
    mock_event = MagicMock()
    mock_event.source.user_id = user_id
    mock_event.reply_token = reply_token
    mock_event.postback.data = "action=cancel_state"
    
    mock_line_bot_api = MagicMock()
    
    handle_postback_event(mock_event, mock_line_bot_api)
    
    # Verify cancel handler was executed
    assert user_id not in user_states
    mock_line_bot_api.reply_message.assert_called_once()
```

- [ ] **Step 2: Run test to verify failure**

```bash
python -m pytest tests/test_line_handlers.py::test_handle_postback_event_routes_cancel_state_action -v
```

Expected: `FAILED` (handle_postback_event doesn't route to cancel handler yet)

- [ ] **Step 3: Modify handle_postback_event to route cancel_state**

In `app/line_handlers.py`, find `handle_postback_event` and add at the beginning:

```python
def handle_postback_event(event, line_bot_api):
    postback_data = event.postback.data
    user_id = event.source.user_id
    reply_token = event.reply_token
    
    # Parse postback data: action=xxx&...
    params = dict(urllib.parse.parse_qsl(postback_data))
    action = params.get('action')
    
    # Route cancel_state first
    if action == 'cancel_state':
        handle_cancel_state_postback(user_id, line_bot_api, reply_token)
        return
    
    # ... rest of existing postback handlers ...
```

- [ ] **Step 4: Run test to verify pass**

```bash
python -m pytest tests/test_line_handlers.py::test_handle_postback_event_routes_cancel_state_action -v
```

Expected: `PASSED`

- [ ] **Step 5: Commit**

```bash
git add app/line_handlers.py tests/test_line_handlers.py
git commit -m "feat: integrate cancel_state action into postback handler"
```

---

### Task 4: Add cancel quick reply to handle_editing_field_state

**Files:**
- Modify: `app/line_handlers.py`
- Test: `tests/test_line_handlers.py`

- [ ] **Step 1: Write failing test**

Add to `tests/test_line_handlers.py`:

```python
def test_handle_editing_field_state_includes_cancel_quick_reply():
    """Verify editing field state reply includes cancel quick reply"""
    user_id = "test_user"
    org_id = "test_org"
    reply_token = "token"
    
    user_states[user_id] = {
        'action': 'editing_field',
        'card_id': 'card_123',
        'field': 'name'
    }
    
    mock_line_bot_api = MagicMock()
    
    handle_editing_field_state(user_id, org_id, "New Name", reply_token, mock_line_bot_api)
    
    # Verify reply includes quick_reply
    call_args = mock_line_bot_api.reply_message.call_args
    message = call_args[0][1]
    assert message.quick_reply is not None
    assert message.quick_reply.items[0].action.label == "❌ 取消"
```

- [ ] **Step 2: Run test to verify failure**

```bash
python -m pytest tests/test_line_handlers.py::test_handle_editing_field_state_includes_cancel_quick_reply -v
```

Expected: `FAILED` (no quick_reply attached yet)

- [ ] **Step 3: Modify handle_editing_field_state to attach cancel quick reply**

Find `handle_editing_field_state` in `app/line_handlers.py` and modify the reply to include cancel button:

```python
def handle_editing_field_state(user_id, org_id, text, reply_token, line_bot_api):
    # ... existing validation logic ...
    
    # Create reply message
    reply = TextSendMessage(text="✓ 欄位已更新。")
    
    # Attach cancel quick reply
    reply = attach_cancel_quick_reply(reply)
    
    line_bot_api.reply_message(reply_token, reply)
```

- [ ] **Step 4: Run test to verify pass**

```bash
python -m pytest tests/test_line_handlers.py::test_handle_editing_field_state_includes_cancel_quick_reply -v
```

Expected: `PASSED`

- [ ] **Step 5: Commit**

```bash
git add app/line_handlers.py tests/test_line_handlers.py
git commit -m "feat: add cancel quick reply to editing field state"
```

---

### Task 5: Add cancel quick reply to handle_adding_memo_state

**Files:**
- Modify: `app/line_handlers.py`
- Test: `tests/test_line_handlers.py`

- [ ] **Step 1: Write failing test**

```python
def test_handle_adding_memo_state_includes_cancel_quick_reply():
    """Verify memo state reply includes cancel quick reply"""
    user_id = "test_user"
    org_id = "test_org"
    reply_token = "token"
    
    user_states[user_id] = {
        'action': 'adding_memo',
        'card_id': 'card_123'
    }
    
    mock_line_bot_api = MagicMock()
    
    handle_adding_memo_state(user_id, org_id, "New memo", reply_token, mock_line_bot_api)
    
    call_args = mock_line_bot_api.reply_message.call_args
    message = call_args[0][1]
    assert message.quick_reply is not None
```

- [ ] **Step 2: Run test**

```bash
python -m pytest tests/test_line_handlers.py::test_handle_adding_memo_state_includes_cancel_quick_reply -v
```

Expected: `FAILED`

- [ ] **Step 3: Modify handle_adding_memo_state**

```python
def handle_adding_memo_state(user_id, org_id, text, reply_token, line_bot_api):
    # ... existing logic ...
    
    reply = TextSendMessage(text="✓ 備註已新增。")
    reply = attach_cancel_quick_reply(reply)
    line_bot_api.reply_message(reply_token, reply)
```

- [ ] **Step 4: Run test**

```bash
python -m pytest tests/test_line_handlers.py::test_handle_adding_memo_state_includes_cancel_quick_reply -v
```

Expected: `PASSED`

- [ ] **Step 5: Commit**

```bash
git add app/line_handlers.py tests/test_line_handlers.py
git commit -m "feat: add cancel quick reply to memo state"
```

---

### Task 6: Add cancel quick reply to handle_adding_tag_state

**Files:**
- Modify: `app/line_handlers.py`
- Test: `tests/test_line_handlers.py`

- [ ] **Step 1: Write failing test**

```python
def test_handle_adding_tag_state_includes_cancel_quick_reply():
    """Verify tag state reply includes cancel quick reply"""
    user_id = "test_user"
    org_id = "test_org"
    reply_token = "token"
    
    user_states[user_id] = {
        'action': 'adding_tag',
        'card_id': 'card_123'
    }
    
    mock_line_bot_api = MagicMock()
    
    handle_adding_tag_state(user_id, org_id, "tag_name", reply_token, mock_line_bot_api)
    
    call_args = mock_line_bot_api.reply_message.call_args
    message = call_args[0][1]
    assert message.quick_reply is not None
```

- [ ] **Step 2: Run test**

```bash
python -m pytest tests/test_line_handlers.py::test_handle_adding_tag_state_includes_cancel_quick_reply -v
```

Expected: `FAILED`

- [ ] **Step 3: Modify handle_adding_tag_state**

```python
def handle_adding_tag_state(user_id, org_id, text, reply_token, line_bot_api):
    # ... existing logic ...
    
    reply = TextSendMessage(text="✓ 標籤已新增。")
    reply = attach_cancel_quick_reply(reply)
    line_bot_api.reply_message(reply_token, reply)
```

- [ ] **Step 4: Run test**

```bash
python -m pytest tests/test_line_handlers.py::test_handle_adding_tag_state_includes_cancel_quick_reply -v
```

Expected: `PASSED`

- [ ] **Step 5: Commit**

```bash
git add app/line_handlers.py tests/test_line_handlers.py
git commit -m "feat: add cancel quick reply to tag state"
```

---

### Task 7: Add cancel quick reply to handle_exporting_csv_state

**Files:**
- Modify: `app/line_handlers.py`
- Test: `tests/test_line_handlers.py`

- [ ] **Step 1: Write failing test**

```python
def test_handle_exporting_csv_state_includes_cancel_quick_reply():
    """Verify CSV export state reply includes cancel quick reply"""
    user_id = "test_user"
    org_id = "test_org"
    reply_token = "token"
    
    user_states[user_id] = {
        'action': 'exporting_csv'
    }
    
    mock_line_bot_api = MagicMock()
    
    handle_exporting_csv_state(user_id, org_id, "user@example.com", reply_token, mock_line_bot_api)
    
    call_args = mock_line_bot_api.reply_message.call_args
    message = call_args[0][1]
    assert message.quick_reply is not None
```

- [ ] **Step 2: Run test**

```bash
python -m pytest tests/test_line_handlers.py::test_handle_exporting_csv_state_includes_cancel_quick_reply -v
```

Expected: `FAILED`

- [ ] **Step 3: Modify handle_exporting_csv_state**

```python
def handle_exporting_csv_state(user_id, org_id, text, reply_token, line_bot_api):
    # ... existing logic ...
    
    reply = TextSendMessage(text="✓ CSV 正在準備...")
    reply = attach_cancel_quick_reply(reply)
    line_bot_api.reply_message(reply_token, reply)
```

- [ ] **Step 4: Run test**

```bash
python -m pytest tests/test_line_handlers.py::test_handle_exporting_csv_state_includes_cancel_quick_reply -v
```

Expected: `PASSED`

- [ ] **Step 5: Commit**

```bash
git add app/line_handlers.py tests/test_line_handlers.py
git commit -m "feat: add cancel quick reply to CSV export state"
```

---

## Phase 2: Batch Upload UX Improvements (Days 2-3)

### Task 8: Update batch_start message with warning text

**Files:**
- Modify: `app/line_handlers.py`
- Test: `tests/test_line_handlers.py`

- [ ] **Step 1: Write failing test**

```python
def test_batch_start_message_includes_warning():
    """Verify batch start message includes warning about waiting"""
    user_id = "test_user"
    org_id = "test_org"
    reply_token = "token"
    
    mock_line_bot_api = MagicMock()
    
    handle_batch_start_postback(user_id, org_id, reply_token, mock_line_bot_api)
    
    call_args = mock_line_bot_api.reply_message.call_args
    message = call_args[0][1]
    
    assert "批量上傳模式已開啟" in message.text
    assert "請勿輸入其他指令" in message.text or "系統將依序" in message.text
```

- [ ] **Step 2: Run test**

```bash
python -m pytest tests/test_line_handlers.py::test_batch_start_message_includes_warning -v
```

Expected: `FAILED`

- [ ] **Step 3: Modify batch_start handler**

Find `handle_batch_start_postback` and update the message:

```python
def handle_batch_start_postback(user_id, org_id, reply_token, line_bot_api):
    # ... existing init_batch_state logic ...
    
    message_text = """批量上傳模式已開啟！請逐一傳送名片照片。
傳完所有照片後，輸入「完成」開始處理。

⚠️ 系統將依序辨識並於全部完成後通知結果，
   完成前請勿輸入其他指令。"""
    
    reply = TextSendMessage(text=message_text)
    line_bot_api.reply_message(reply_token, reply)
```

- [ ] **Step 4: Run test**

```bash
python -m pytest tests/test_line_handlers.py::test_batch_start_message_includes_warning -v
```

Expected: `PASSED`

- [ ] **Step 5: Commit**

```bash
git add app/line_handlers.py tests/test_line_handlers.py
git commit -m "feat: update batch start message with warning text"
```

---

### Task 9: Remove per-image push notifications from batch processing

**Files:**
- Modify: `app/batch_processor.py`
- Test: `tests/test_batch_processor.py`

- [ ] **Step 1: Write failing test**

```python
def test_process_batch_does_not_send_per_image_notifications():
    """Verify process_batch doesn't send push message for each image"""
    user_id = "test_user"
    org_id = "test_org"
    
    mock_line_bot_api = MagicMock()
    
    # Create batch with 3 images
    batch_data = {
        'pending_images': ['img1.jpg', 'img2.jpg', 'img3.jpg'],
        'org_id': org_id
    }
    
    # Mock process_batch to return successful results
    results = [
        {'status': 'success', 'name': 'John', 'company': 'ABC'},
        {'status': 'success', 'name': 'Jane', 'company': 'XYZ'},
        {'status': 'success', 'name': 'Bob', 'company': 'DEF'}
    ]
    
    process_batch(user_id, batch_data, results, mock_line_bot_api)
    
    # Verify push_message was called only ONCE (for summary), not 3 times
    push_count = len([call for call in mock_line_bot_api.push_message.call_args_list 
                      if call[0][0] == user_id])
    assert push_count == 1, f"Expected 1 push (summary), got {push_count}"
```

- [ ] **Step 2: Run test**

```bash
python -m pytest tests/test_batch_processor.py::test_process_batch_does_not_send_per_image_notifications -v
```

Expected: `FAILED` (per-image notifications still being sent)

- [ ] **Step 3: Remove per-image notifications**

In `app/batch_processor.py`, find the loop in `process_batch` that sends per-image notifications:

```python
# REMOVE OR COMMENT OUT this code:
# for idx, card_data in enumerate(ocr_results):
#     line_bot_api.push_message(user_id, TextSendMessage(f"✓ 第 {idx+1} 張已掃描完成"))

# REPLACE WITH this:
for idx, card_data in enumerate(ocr_results):
    logger.info(f"Processed card {idx+1}/{len(ocr_results)} for user {user_id}")
```

- [ ] **Step 4: Run test**

```bash
python -m pytest tests/test_batch_processor.py::test_process_batch_does_not_send_per_image_notifications -v
```

Expected: `PASSED`

- [ ] **Step 5: Commit**

```bash
git add app/batch_processor.py tests/test_batch_processor.py
git commit -m "feat: remove per-image push notifications from batch processing"
```

---

### Task 10: Modify append_batch_image to track last_image_time

**Files:**
- Modify: `app/batch_processor.py`
- Test: `tests/test_batch_processor.py`

- [ ] **Step 1: Write failing test**

```python
from datetime import datetime
from app.batch_processor import append_batch_image

def test_append_batch_image_updates_last_image_time():
    """Verify append_batch_image records the timestamp"""
    user_id = "test_user"
    org_id = "test_org"
    storage_path = "raw_images/test_org/test_user/uuid.jpg"
    
    mock_db = MagicMock()
    mock_ref = MagicMock()
    mock_db.reference.return_value = mock_ref
    mock_ref.get.return_value = {'pending_images': []}
    
    before = datetime.utcnow()
    append_batch_image(user_id, org_id, storage_path, mock_db)
    after = datetime.utcnow()
    
    # Get the batch_data that was updated
    call_args = mock_ref.update.call_args[0][0]
    
    assert 'last_image_time' in call_args
    recorded_time = datetime.fromisoformat(call_args['last_image_time'])
    assert before <= recorded_time <= after
```

- [ ] **Step 2: Run test**

```bash
python -m pytest tests/test_batch_processor.py::test_append_batch_image_updates_last_image_time -v
```

Expected: `FAILED` (last_image_time not in batch_data yet)

- [ ] **Step 3: Modify append_batch_image**

```python
from datetime import datetime

def append_batch_image(user_id: str, org_id: str, storage_path: str, db):
    """新增圖片到批量上傳隊列並記錄時間戳"""
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

- [ ] **Step 4: Run test**

```bash
python -m pytest tests/test_batch_processor.py::test_append_batch_image_updates_last_image_time -v
```

Expected: `PASSED`

- [ ] **Step 5: Commit**

```bash
git add app/batch_processor.py tests/test_batch_processor.py
git commit -m "feat: track last_image_time in batch state for idle detection"
```

---

### Task 11: Implement check_batch_idle_and_trigger function

**Files:**
- Modify: `app/batch_processor.py`
- Test: `tests/test_batch_processor.py`

- [ ] **Step 1: Write failing test**

```python
from datetime import datetime, timedelta
from app.batch_processor import check_batch_idle_and_trigger

def test_check_batch_idle_triggers_completion_after_5_seconds():
    """Verify idle detection triggers completion after 5 seconds"""
    user_id = "test_user"
    org_id = "test_org"
    
    # Set last_image_time to 6 seconds ago
    last_image_time = (datetime.utcnow() - timedelta(seconds=6)).isoformat()
    batch_data = {
        'org_id': org_id,
        'pending_images': ['img1.jpg'],
        'last_image_time': last_image_time,
        'status': 'active'
    }
    
    mock_db = MagicMock()
    mock_ref = MagicMock()
    mock_db.reference.return_value = mock_ref
    mock_ref.get.return_value = batch_data
    
    mock_tasks_client = MagicMock()
    
    check_batch_idle_and_trigger(user_id, org_id, mock_db, mock_tasks_client)
    
    # Verify Cloud Task was created
    mock_tasks_client.create_task.assert_called_once()
```

- [ ] **Step 2: Run test**

```bash
python -m pytest tests/test_batch_processor.py::test_check_batch_idle_triggers_completion_after_5_seconds -v
```

Expected: `FAILED` (function doesn't exist)

- [ ] **Step 3: Implement check_batch_idle_and_trigger**

```python
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

def check_batch_idle_and_trigger(user_id: str, org_id: str, db, cloud_tasks_client):
    """檢查批量上傳是否 idle（5 秒無新圖片）
    
    由 Cloud Scheduler 每 2 秒呼叫一次
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
        logger.info(f"Batch idle detected for {user_id} ({elapsed:.1f}s), triggering completion")
        trigger_batch_completion(user_id, org_id, db, cloud_tasks_client)
    else:
        logger.info(f"Batch still active for {user_id} ({elapsed:.1f}s), waiting...")
```

- [ ] **Step 4: Run test**

```bash
python -m pytest tests/test_batch_processor.py::test_check_batch_idle_triggers_completion_after_5_seconds -v
```

Expected: `PASSED` (assuming trigger_batch_completion exists or is mocked)

- [ ] **Step 5: Commit**

```bash
git add app/batch_processor.py tests/test_batch_processor.py
git commit -m "feat: implement batch idle detection (5-second timeout)"
```

---

### Task 12: Implement trigger_batch_completion function

**Files:**
- Modify: `app/batch_processor.py`
- Test: `tests/test_batch_processor.py`

- [ ] **Step 1: Write failing test**

```python
import json
import os
from app.batch_processor import trigger_batch_completion

def test_trigger_batch_completion_creates_cloud_task():
    """Verify trigger_batch_completion creates a Cloud Task"""
    user_id = "test_user"
    org_id = "test_org"
    
    batch_data = {
        'org_id': org_id,
        'pending_images': ['img1.jpg'],
        'last_image_time': datetime.utcnow().isoformat(),
        'status': 'active'
    }
    
    mock_db = MagicMock()
    mock_ref = MagicMock()
    mock_db.reference.return_value = mock_ref
    mock_ref.get.return_value = batch_data
    
    mock_tasks_client = MagicMock()
    mock_tasks_client.queue_path.return_value = "projects/test/locations/asia-east1/queues/test"
    
    # Set env vars
    os.environ['CLOUD_RUN_URL'] = 'https://test.run.app'
    os.environ['GOOGLE_CLOUD_PROJECT'] = 'test-project'
    os.environ['CLOUD_TASKS_LOCATION'] = 'asia-east1'
    os.environ['CLOUD_TASKS_QUEUE'] = 'test-queue'
    
    trigger_batch_completion(user_id, org_id, mock_db, mock_tasks_client)
    
    # Verify create_task was called
    mock_tasks_client.create_task.assert_called_once()
    
    # Verify status was updated to 'queued'
    mock_ref.update.assert_called_once()
    assert mock_ref.update.call_args[0][0]['status'] == 'queued'
```

- [ ] **Step 2: Run test**

```bash
python -m pytest tests/test_batch_processor.py::test_trigger_batch_completion_creates_cloud_task -v
```

Expected: `FAILED` (function doesn't exist)

- [ ] **Step 3: Implement trigger_batch_completion**

```python
import os
import json
from google.cloud import tasks_v2

def trigger_batch_completion(user_id: str, org_id: str, db, cloud_tasks_client):
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

- [ ] **Step 4: Run test**

```bash
python -m pytest tests/test_batch_processor.py::test_trigger_batch_completion_creates_cloud_task -v
```

Expected: `PASSED`

- [ ] **Step 5: Commit**

```bash
git add app/batch_processor.py tests/test_batch_processor.py
git commit -m "feat: implement trigger_batch_completion with Cloud Tasks integration"
```

---

### Task 13: Create /internal/check-batch-idle endpoint

**Files:**
- Modify: `app/main.py`
- Test: `tests/test_main.py`

- [ ] **Step 1: Write failing test**

```python
def test_check_batch_idle_endpoint_processes_all_batches():
    """Verify /internal/check-batch-idle processes active batches"""
    from app.main import app
    from fastapi.testclient import TestClient
    
    client = TestClient(app)
    
    # Mock batch_states in Firebase
    mock_db = MagicMock()
    mock_ref = MagicMock()
    mock_db.reference.return_value = mock_ref
    
    # Two batches: one idle, one active
    all_batches = {
        'user_1': {
            'org_id': 'org_1',
            'pending_images': ['img1.jpg'],
            'last_image_time': (datetime.utcnow() - timedelta(seconds=6)).isoformat(),
            'status': 'active'
        },
        'user_2': {
            'org_id': 'org_2',
            'pending_images': ['img2.jpg'],
            'last_image_time': datetime.utcnow().isoformat(),
            'status': 'active'
        }
    }
    
    mock_ref.get.return_value = all_batches
    
    # Mock Cloud Tasks client
    mock_tasks_client = MagicMock()
    
    response = client.post('/internal/check-batch-idle')
    
    assert response.status_code == 200
    assert response.json()['status'] == 'ok'
```

- [ ] **Step 2: Run test**

```bash
python -m pytest tests/test_main.py::test_check_batch_idle_endpoint_processes_all_batches -v
```

Expected: `FAILED` (endpoint doesn't exist)

- [ ] **Step 3: Add /internal/check-batch-idle endpoint to main.py**

```python
from app.batch_processor import check_batch_idle_and_trigger
from google.cloud import tasks_v2
from flask import request

@app.post('/internal/check-batch-idle')
def check_batch_idle():
    """由 Cloud Scheduler 定期呼叫，檢查是否有 batch 進入 idle 狀態"""
    try:
        db = firebase_admin.db.reference().get_parent()  # Get DB instance
        
        # Initialize Cloud Tasks client
        tasks_client = tasks_v2.CloudTasksClient()
        
        batch_states_ref = db.reference('batch_states')
        all_batches = batch_states_ref.get() or {}
        
        for user_id, batch_data in all_batches.items():
            org_id = batch_data.get('org_id')
            status = batch_data.get('status', 'active')
            
            # 若已排隊，跳過（避免重複）
            if status == 'queued':
                logger.info(f"Batch for {user_id} already queued, skipping")
                continue
            
            check_batch_idle_and_trigger(user_id, org_id, db, tasks_client)
        
        return {'status': 'ok'}, 200
    except Exception as e:
        logger.error(f"Error in check_batch_idle: {str(e)}")
        return {'status': 'error', 'message': str(e)}, 500
```

- [ ] **Step 4: Run test**

```bash
python -m pytest tests/test_main.py::test_check_batch_idle_endpoint_processes_all_batches -v
```

Expected: `PASSED`

- [ ] **Step 5: Commit**

```bash
git add app/main.py tests/test_main.py
git commit -m "feat: add /internal/check-batch-idle endpoint for Cloud Scheduler"
```

---

## Phase 3: Improved Batch Summary with Success/Failure Lists (Day 3)

### Task 14: Refactor send_batch_summary_push with new format

**Files:**
- Modify: `app/batch_processor.py`
- Test: `tests/test_batch_processor.py`

- [ ] **Step 1: Write failing test**

```python
def test_send_batch_summary_push_includes_success_failure_lists():
    """Verify summary includes detailed success/failure lists"""
    user_id = "test_user"
    org_id = "test_org"
    
    results = [
        {'status': 'success', 'name': '王小明', 'company': '台灣科技'},
        {'status': 'success', 'name': '李大華', 'company': '新創'},
        {'status': 'failed', 'status_reason': 'no_readable_data'},
        {'status': 'failed', 'reason': '已存在重複名片'}
    ]
    
    mock_line_bot_api = MagicMock()
    mock_db = MagicMock()
    mock_ref = MagicMock()
    mock_db.reference.return_value = mock_ref
    
    send_batch_summary_push(user_id, org_id, results, mock_line_bot_api, mock_db)
    
    # Verify push_message was called
    mock_line_bot_api.push_message.assert_called_once()
    
    # Get the message
    call_args = mock_line_bot_api.push_message.call_args
    message_text = call_args[0][1].text
    
    # Verify format includes:
    # - Total, success, and failure counts
    assert '共上傳 4 張' in message_text
    assert '成功 2 張' in message_text
    assert '失敗 2 張' in message_text
    
    # - Success list
    assert '✅ 成功' in message_text
    assert '王小明' in message_text
    assert '台灣科技' in message_text
    
    # - Failure list
    assert '❌ 失敗' in message_text
    assert '無可讀資料' in message_text or 'no_readable_data' in message_text
```

- [ ] **Step 2: Run test**

```bash
python -m pytest tests/test_batch_processor.py::test_send_batch_summary_push_includes_success_failure_lists -v
```

Expected: `FAILED` (old format)

- [ ] **Step 3: Refactor send_batch_summary_push**

Replace the entire `send_batch_summary_push` function:

```python
def send_batch_summary_push(user_id: str, org_id: str, results: list, 
                           line_bot_api, db):
    """推播批量上傳結果摘要（含成功/失敗清單）"""
    success_cards = [r for r in results if r.get('status') == 'success']
    failed_cards = [r for r in results if r.get('status') == 'failed']
    
    total = len(results)
    success_count = len(success_cards)
    failed_count = len(failed_cards)
    
    # 構建成功清單
    success_list = ""
    for idx, card in enumerate(success_cards, 1):
        display_name = card.get('name') or card.get('company') or f"卡片 {idx}"
        company = card.get('company', '')
        if company:
            success_list += f"・[{idx}] {display_name} / {company}\n"
        else:
            success_list += f"・[{idx}] {display_name}\n"
    
    # 構建失敗清單
    failed_list = ""
    for idx, card in enumerate(failed_cards, 1):
        reason = card.get('reason', '辨識失敗')
        if card.get('status_reason') == 'no_readable_data':
            reason = "辨識失敗（無可讀資料）"
        elif card.get('status_reason') == 'duplicate':
            reason = "已存在重複名片（email 相符）"
        
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

- [ ] **Step 4: Run test**

```bash
python -m pytest tests/test_batch_processor.py::test_send_batch_summary_push_includes_success_failure_lists -v
```

Expected: `PASSED`

- [ ] **Step 5: Commit**

```bash
git add app/batch_processor.py tests/test_batch_processor.py
git commit -m "feat: refactor batch summary with success/failure lists"
```

---

## Phase 4: Problem Reporting Mechanism (Days 3-4)

### Task 15: Implement handle_reporting_issue_trigger

**Files:**
- Modify: `app/line_handlers.py`
- Test: `tests/test_line_handlers.py`

- [ ] **Step 1: Write failing test**

```python
def test_handle_reporting_issue_trigger_enters_state():
    """Verify 'reporting_issue' trigger enters correct state"""
    user_id = "test_user"
    org_id = "test_org"
    reply_token = "token"
    
    mock_line_bot_api = MagicMock()
    
    handle_reporting_issue_trigger(user_id, org_id, mock_line_bot_api, reply_token)
    
    # Verify state was set
    assert user_id in user_states
    assert user_states[user_id]['action'] == 'reporting_issue'
    assert user_states[user_id]['org_id'] == org_id
    
    # Verify reply was sent
    mock_line_bot_api.reply_message.assert_called_once()
    call_args = mock_line_bot_api.reply_message.call_args
    assert '請描述您遇到的問題' in call_args[0][1].text
```

- [ ] **Step 2: Run test**

```bash
python -m pytest tests/test_line_handlers.py::test_handle_reporting_issue_trigger_enters_state -v
```

Expected: `FAILED` (function doesn't exist)

- [ ] **Step 3: Implement handle_reporting_issue_trigger**

```python
from datetime import datetime

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

- [ ] **Step 4: Run test**

```bash
python -m pytest tests/test_line_handlers.py::test_handle_reporting_issue_trigger_enters_state -v
```

Expected: `PASSED`

- [ ] **Step 5: Commit**

```bash
git add app/line_handlers.py tests/test_line_handlers.py
git commit -m "feat: implement reporting_issue trigger"
```

---

### Task 16: Implement handle_reporting_issue_state

**Files:**
- Modify: `app/line_handlers.py`
- Test: `tests/test_line_handlers.py`

- [ ] **Step 1: Write failing test**

```python
def test_handle_reporting_issue_state_processes_input():
    """Verify reporting_issue state processes user input"""
    user_id = "test_user"
    org_id = "test_org"
    reply_token = "token"
    feedback_text = "系統無法掃描名片"
    
    user_states[user_id] = {
        'action': 'reporting_issue',
        'org_id': org_id
    }
    
    mock_line_bot_api = MagicMock()
    
    # Mock firebase_utils.write_feedback
    with patch('app.line_handlers.firebase_utils.write_feedback') as mock_write:
        handle_reporting_issue_state(user_id, org_id, feedback_text, 
                                     mock_line_bot_api, reply_token)
    
    # Verify write_feedback was called
    mock_write.assert_called_once()
    call_args = mock_write.call_args
    assert call_args[0][0] == org_id
    assert call_args[0][1] == user_id
    
    # Verify state was cleared
    assert user_id not in user_states
    
    # Verify confirmation reply was sent
    mock_line_bot_api.reply_message.assert_called_once()
    assert '感謝回報' in mock_line_bot_api.reply_message.call_args[0][1].text
```

- [ ] **Step 2: Run test**

```bash
python -m pytest tests/test_line_handlers.py::test_handle_reporting_issue_state_processes_input -v
```

Expected: `FAILED` (function doesn't exist)

- [ ] **Step 3: Implement handle_reporting_issue_state**

```python
import os
from app import firebase_utils

def handle_reporting_issue_state(user_id: str, org_id: str, content: str,
                                 line_bot_api, reply_token: str):
    """用戶在 reporting_issue 狀態下輸入內容或傳圖"""
    state_info = user_states[user_id]
    timestamp = datetime.utcnow().isoformat()
    
    # 寫入 Firebase
    feedback_data = {
        'content': content,
        'type': 'text',
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
    
    # 若設定 FEEDBACK_EMAIL，發送 PM 通知（非同步）
    if os.getenv('FEEDBACK_EMAIL'):
        send_feedback_notification_async(org_id, user_id, feedback_data)
```

- [ ] **Step 4: Run test**

```bash
python -m pytest tests/test_line_handlers.py::test_handle_reporting_issue_state_processes_input -v
```

Expected: `PASSED`

- [ ] **Step 5: Commit**

```bash
git add app/line_handlers.py tests/test_line_handlers.py
git commit -m "feat: implement reporting_issue state handler"
```

---

### Task 17: Integrate reporting_issue into text event handler

**Files:**
- Modify: `app/line_handlers.py`
- Test: `tests/test_line_handlers.py`

- [ ] **Step 1: Write failing test**

```python
def test_handle_text_event_triggers_reporting_issue_on_keyword():
    """Verify '回報問題' text triggers reporting issue flow"""
    user_id = "test_user"
    reply_token = "token"
    
    mock_event = MagicMock()
    mock_event.source.user_id = user_id
    mock_event.reply_token = reply_token
    mock_event.message.text = "回報問題"
    
    # Mock ensure_user_org to set org_id
    with patch('app.line_handlers.ensure_user_org') as mock_ensure:
        mock_ensure.return_value = "test_org"
        
        mock_line_bot_api = MagicMock()
        
        handle_text_event(mock_event, mock_line_bot_api)
    
    # Verify reporting_issue state was entered
    assert user_id in user_states
    assert user_states[user_id]['action'] == 'reporting_issue'
```

- [ ] **Step 2: Run test**

```bash
python -m pytest tests/test_line_handlers.py::test_handle_text_event_triggers_reporting_issue_on_keyword -v
```

Expected: `FAILED` (no routing for reporting_issue trigger in text handler)

- [ ] **Step 3: Modify handle_text_event**

Find `handle_text_event` and add before other command checks:

```python
def handle_text_event(event, line_bot_api):
    user_id = event.source.user_id
    text = event.message.text.strip()
    reply_token = event.reply_token
    
    org_id = ensure_user_org(user_id)
    
    # 檢查是否在多步驟操作中
    if user_id in user_states:
        current_state = user_states[user_id]['action']
        if current_state == 'reporting_issue':
            return handle_reporting_issue_state(user_id, org_id, text, 
                                               line_bot_api, reply_token)
        # ... other state handlers ...
    
    # 檢查觸發詞
    if text == "回報問題":
        return handle_reporting_issue_trigger(user_id, org_id, 
                                             line_bot_api, reply_token)
    
    # ... rest of text handler ...
```

- [ ] **Step 4: Run test**

```bash
python -m pytest tests/test_line_handlers.py::test_handle_text_event_triggers_reporting_issue_on_keyword -v
```

Expected: `PASSED`

- [ ] **Step 5: Commit**

```bash
git add app/line_handlers.py tests/test_line_handlers.py
git commit -m "feat: integrate reporting_issue trigger into text event handler"
```

---

### Task 18: Implement write_feedback in firebase_utils

**Files:**
- Modify: `app/firebase_utils.py`
- Test: `tests/test_firebase_utils.py`

- [ ] **Step 1: Write failing test**

```python
from app.firebase_utils import write_feedback

def test_write_feedback_writes_to_correct_path():
    """Verify write_feedback writes to feedback/{org_id}/{user_id}/{timestamp}"""
    org_id = "test_org"
    user_id = "test_user"
    timestamp = "2026-04-10T12:00:00.000000"
    
    feedback_data = {
        'content': 'Test feedback',
        'type': 'text',
        'created_at': timestamp,
        'user_id': user_id
    }
    
    mock_db = MagicMock()
    mock_ref = MagicMock()
    mock_db.reference.return_value = mock_ref
    
    write_feedback(org_id, user_id, timestamp, feedback_data, mock_db)
    
    # Verify correct path was referenced
    expected_path = f'feedback/{org_id}/{user_id}/{timestamp}'
    mock_db.reference.assert_called_once_with(expected_path)
    
    # Verify data was set
    mock_ref.set.assert_called_once_with(feedback_data)
```

- [ ] **Step 2: Run test**

```bash
python -m pytest tests/test_firebase_utils.py::test_write_feedback_writes_to_correct_path -v
```

Expected: `FAILED` (function doesn't exist)

- [ ] **Step 3: Implement write_feedback**

Add to `app/firebase_utils.py`:

```python
import logging

logger = logging.getLogger(__name__)

def write_feedback(org_id: str, user_id: str, timestamp: str, 
                   feedback_data: dict, db=None):
    """寫入用戶回報到 Firebase
    
    Path: feedback/{org_id}/{user_id}/{timestamp}
    """
    if db is None:
        db = get_firebase_db()  # Use default DB instance
    
    feedback_path = f'feedback/{org_id}/{user_id}/{timestamp}'
    db.reference(feedback_path).set(feedback_data)
    logger.info(f"Feedback written: {feedback_path}")
```

- [ ] **Step 4: Run test**

```bash
python -m pytest tests/test_firebase_utils.py::test_write_feedback_writes_to_correct_path -v
```

Expected: `PASSED`

- [ ] **Step 5: Commit**

```bash
git add app/firebase_utils.py tests/test_firebase_utils.py
git commit -m "feat: implement write_feedback function for Firebase"
```

---

### Task 19: Implement send_feedback_notification_async (optional email)

**Files:**
- Modify: `app/line_handlers.py`
- Test: `tests/test_line_handlers.py`

- [ ] **Step 1: Write failing test**

```python
import os
from app.line_handlers import send_feedback_notification_async

def test_send_feedback_notification_sends_email_when_configured():
    """Verify email is sent when FEEDBACK_EMAIL is configured"""
    org_id = "test_org"
    user_id = "test_user"
    feedback_data = {
        'content': 'Test issue',
        'type': 'text',
        'created_at': '2026-04-10T12:00:00'
    }
    
    with patch.dict(os.environ, {'FEEDBACK_EMAIL': 'pm@example.com'}):
        with patch('app.line_handlers.send_email_async') as mock_send:
            send_feedback_notification_async(org_id, user_id, feedback_data)
            
            # Verify send_email_async was called
            mock_send.assert_called_once()
            call_args = mock_send.call_args
            assert 'pm@example.com' in str(call_args)
            assert feedback_data['content'] in str(call_args)

def test_send_feedback_notification_skips_email_when_not_configured():
    """Verify no email sent when FEEDBACK_EMAIL not set"""
    org_id = "test_org"
    user_id = "test_user"
    feedback_data = {'content': 'Test', 'type': 'text'}
    
    with patch.dict(os.environ, {}, clear=True):
        with patch('app.line_handlers.send_email_async') as mock_send:
            send_feedback_notification_async(org_id, user_id, feedback_data)
            
            # Verify email was NOT sent
            mock_send.assert_not_called()
```

- [ ] **Step 2: Run test**

```bash
python -m pytest tests/test_line_handlers.py::test_send_feedback_notification_sends_email_when_configured -v
python -m pytest tests/test_line_handlers.py::test_send_feedback_notification_skips_email_when_not_configured -v
```

Expected: Both `FAILED` (function doesn't exist)

- [ ] **Step 3: Implement send_feedback_notification_async**

Add to `app/line_handlers.py`:

```python
import os
import threading
import smtplib
from email.mime.text import MIMEText

def send_feedback_notification_async(org_id: str, user_id: str, feedback_data: dict):
    """異步發送 PM email 通知（若 FEEDBACK_EMAIL 已設定）"""
    feedback_email = os.getenv('FEEDBACK_EMAIL')
    if not feedback_email:
        return
    
    def send_email():
        try:
            smtp_user = os.getenv('SMTP_USER')
            smtp_password = os.getenv('SMTP_PASSWORD')
            
            if not smtp_user or not smtp_password:
                logger.warning("SMTP credentials not configured, skipping email")
                return
            
            content = feedback_data.get('content', '（無內容）')
            timestamp = feedback_data.get('created_at', '')
            
            subject = f"[反映回報] {org_id} - {user_id}"
            body = f"""用戶回報：

組織：{org_id}
用戶ID：{user_id}
時間：{timestamp}

內容：
{content}
"""
            
            msg = MIMEText(body)
            msg['Subject'] = subject
            msg['From'] = smtp_user
            msg['To'] = feedback_email
            
            with smtplib.SMTP('smtp.gmail.com', 587) as server:
                server.starttls()
                server.login(smtp_user, smtp_password)
                server.send_message(msg)
            
            logger.info(f"Feedback email sent to {feedback_email}")
        except Exception as e:
            logger.error(f"Failed to send feedback email: {str(e)}")
    
    # 在背景執行緒中發送
    thread = threading.Thread(target=send_email, daemon=True)
    thread.start()
```

- [ ] **Step 4: Run test**

```bash
python -m pytest tests/test_line_handlers.py::test_send_feedback_notification_sends_email_when_configured -v
python -m pytest tests/test_line_handlers.py::test_send_feedback_notification_skips_email_when_not_configured -v
```

Expected: Both `PASSED`

- [ ] **Step 5: Commit**

```bash
git add app/line_handlers.py tests/test_line_handlers.py
git commit -m "feat: implement optional email notification for problem reports"
```

---

## Phase 5: Integration & Deployment (Day 4)

### Task 20: Run all unit tests and fix any failures

**Files:**
- Test: All test files

- [ ] **Step 1: Run all tests**

```bash
cd /Users/davidlin/Claude-Code-Project/linebot-namecard-python
python -m pytest tests/ -v
```

Expected output: All tests should pass

- [ ] **Step 2: Fix any failing tests**

If tests fail, debug and fix the implementation code

- [ ] **Step 3: Run flake8 linter**

```bash
flake8 app/ tests/
```

Expected: No errors

- [ ] **Step 4: Commit any test fixes**

```bash
git add -A
git commit -m "test: fix failing tests and lint issues"
```

---

### Task 21: Create Cloud Scheduler job

**Files:**
- GCP Infrastructure

- [ ] **Step 1: Create Cloud Scheduler job**

```bash
gcloud scheduler jobs create http check-batch-idle \
  --schedule="*/2 * * * * *" \
  --uri="https://{YOUR_CLOUD_RUN_URL}/internal/check-batch-idle" \
  --http-method=POST \
  --message-body='{}' \
  --location=asia-east1
```

Replace `{YOUR_CLOUD_RUN_URL}` with your actual Cloud Run service URL

- [ ] **Step 2: Verify job creation**

```bash
gcloud scheduler jobs describe check-batch-idle --location=asia-east1
```

Expected: Job details displayed

- [ ] **Step 3: Test job with dry-run**

```bash
gcloud scheduler jobs run check-batch-idle --location=asia-east1
```

Expected: Job executes successfully (check Cloud Run logs)

---

### Task 22: Deploy to Cloud Run with environment variables

**Files:**
- `gcloud run deploy`

- [ ] **Step 1: Ensure all env vars are set**

```bash
export CLOUD_TASKS_QUEUE=namecard-batch
export CLOUD_TASKS_LOCATION=asia-east1
export CLOUD_RUN_URL=https://{SERVICE}-{HASH}.{REGION}.run.app
export GOOGLE_CLOUD_PROJECT={PROJECT_ID}
export FEEDBACK_EMAIL=pm@yourcompany.com  # Optional
```

- [ ] **Step 2: Build Docker image**

```bash
gcloud builds submit --tag gcr.io/{PROJECT_ID}/linebot-namecard
```

- [ ] **Step 3: Deploy to Cloud Run**

```bash
gcloud run deploy linebot-namecard \
  --image gcr.io/{PROJECT_ID}/linebot-namecard \
  --platform managed \
  --region asia-east1 \
  --allow-unauthenticated \
  --set-env-vars "ChannelSecret=...,ChannelAccessToken=...,GEMINI_API_KEY=...,FIREBASE_URL=...,FIREBASE_STORAGE_BUCKET=...,GOOGLE_APPLICATION_CREDENTIALS_JSON=...,CLOUD_TASKS_QUEUE=$CLOUD_TASKS_QUEUE,CLOUD_TASKS_LOCATION=$CLOUD_TASKS_LOCATION,CLOUD_RUN_URL=$CLOUD_RUN_URL,GOOGLE_CLOUD_PROJECT=$GOOGLE_CLOUD_PROJECT,FEEDBACK_EMAIL=$FEEDBACK_EMAIL"
```

- [ ] **Step 4: Verify deployment**

```bash
gcloud run services describe linebot-namecard --region asia-east1
```

Expected: Service details displayed with new URL

---

### Task 23: Manual integration testing

**Files:**
- LINE test account

- [ ] **Test 1: Quick Reply Cancel - Editing Field**

1. Open LINE test account chat
2. Send "編輯"
3. Verify ❌ 取消 button appears
4. Click ❌ 取消
5. Verify message says "✓ 已取消操作"
6. Verify editing_field state cleared

- [ ] **Test 2: Batch Idle Detection**

1. Send "新增"
2. Select "批量排程上傳"
3. Send 3 images
4. Do NOT send "完成" command
5. Wait 6 seconds
6. Verify summary is automatically pushed (no user action needed)

- [ ] **Test 3: Batch Summary with Lists**

1. Repeat Test 2
2. Verify summary includes:
   - Total count: "共上傳 X 張"
   - Success count
   - Failure count (if any)
   - Detailed lists of successful names/companies
   - Failure reasons

- [ ] **Test 4: Problem Reporting**

1. Send "回報問題"
2. Verify prompt: "請描述您遇到的問題"
3. Send "系統無法掃描名片"
4. Verify confirmation: "感謝回報"
5. Check Firebase: verify data written to `feedback/{org_id}/{user_id}/{timestamp}`

- [ ] **Test 5: Email Notification (if FEEDBACK_EMAIL set)**

1. Set `FEEDBACK_EMAIL` env var
2. Repeat Test 4
3. Check email inbox
4. Verify email contains feedback content

- [ ] **Commit any final tweaks**

```bash
git add -A
git commit -m "test: complete integration testing and manual validation"
```

---

### Task 24: Create deployment checklist and documentation

**Files:**
- Create: `DEPLOYMENT-CHECKLIST-v3.7.0.md` (optional)

- [ ] **Create deployment checklist document**

Save to `docs/superpowers/checklists/DEPLOYMENT-CHECKLIST-v3.7.0.md`:

```markdown
# v3.7.0 Deployment Checklist

## Pre-Deployment

- [ ] All unit tests passing: `pytest tests/ -v`
- [ ] Linter clean: `flake8 app/ tests/`
- [ ] Code reviewed
- [ ] All tasks completed and committed

## GCP Infrastructure

- [ ] Cloud Scheduler job created: `check-batch-idle`
- [ ] Cloud Tasks queue exists: `namecard-batch`
- [ ] Cloud Tasks enqueuer permission granted to Cloud Run SA
- [ ] All required env vars documented

## Deployment

- [ ] Docker image built: `gcr.io/{PROJECT_ID}/linebot-namecard`
- [ ] Cloud Run service updated with new image
- [ ] All env vars set correctly
- [ ] Cloud Run service online and healthy

## Post-Deployment Testing (Production)

- [ ] Test Quick Reply cancel button (LINE test account)
- [ ] Test batch upload idle detection (send 3 images, wait 6s)
- [ ] Verify batch summary format (success/failure lists)
- [ ] Test problem reporting (Firebase write + optional email)
- [ ] Monitor logs for errors (Cloud Run logs)
- [ ] Monitor metrics: batch_idle_count, feedback_count

## Rollback Plan

If critical issues found:
1. Revert to previous Cloud Run image version
2. Disable Cloud Scheduler job: `gcloud scheduler jobs pause check-batch-idle`
3. Users can still upload batches (manual "完成" command)
4. Problem reporting not lost (Firebase data intact)

## Post-Launch Monitoring (First 24h)

- [ ] Check Cloud Run logs for errors
- [ ] Monitor batch completion success rate
- [ ] Verify problem reports coming in via Firebase
- [ ] If email enabled: check PM email inbox

---

Done!
```

- [ ] **Step 2: Final commit**

```bash
git add docs/superpowers/checklists/DEPLOYMENT-CHECKLIST-v3.7.0.md
git commit -m "docs: add v3.7.0 deployment checklist"
```

---

## Summary

This plan covers all v3.7.0 requirements:

1. **Quick Reply Cancel (Tasks 1-7)** — 4 multi-step operations now have visible escape routes
2. **Batch Idle Detection (Tasks 8-13)** — 5-second auto-completion via Cloud Scheduler + Cloud Tasks
3. **Improved Batch Summary (Task 14)** — Success/failure lists with card names/companies
4. **Problem Reporting (Tasks 15-19)** — Lightweight feedback collection with optional PM email
5. **Integration & Deploy (Tasks 20-24)** — Full testing, Cloud infrastructure setup, deployment checklist

**Total effort:** ~5-6 days of development

---

