# Phase 1 Backlog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完成 Phase 1 三項待完成：30 分鐘 state 超時機制、OCR / Firebase structured 錯誤監控、以 .vcf endpoint 取代 QR Code 讓用戶一鍵加入通訊錄。

**Architecture:** `user_states` dict 寫入時帶 `expires_at`，讀取時 lazy 清除；structured log 以 JSON 寫入 stdout（Cloud Run 自動匯 Cloud Logging）；新增 `GET /vcf/{card_id}` FastAPI endpoint，複用現有 `generate_vcard_string()`，以 `user_id` + `org_id` 驗證存取權。

**Tech Stack:** Python 3.11, FastAPI, firebase-admin SDK, pytest, linebot SDK

---

## File Map

| 角色 | 路徑 | 動作 |
|------|------|------|
| state TTL helper | `app/line_handlers.py` | 修改：新增 `get_valid_state()`，所有 state 寫入加 `expires_at` |
| vcf API router | `app/api/vcf.py` | 新增 |
| app router 註冊 | `app/main.py` | 修改：include vcf router |
| download handler | `app/line_handlers.py` | 修改：`handle_download_contact` |
| OCR monitoring | `app/line_handlers.py`, `app/batch_processor.py` | 修改：加 structured log |
| Firebase monitoring | `app/firebase_utils.py` | 修改：主要 except 區塊加 structured log |
| tests: TTL | `tests/test_line_handlers.py` | 修改：新增 TTL 測試 |
| tests: vcf | `tests/test_vcf_api.py` | 新增 |
| tests: monitoring | `tests/test_monitoring_logs.py` | 新增 |

---

## Task 1: State TTL — `get_valid_state()` helper

**Files:**
- Modify: `app/line_handlers.py`（頂層新增 helper，約 line 17 import 區之後）
- Test: `tests/test_line_handlers.py`

- [ ] **Step 1: 寫失敗測試**

在 `tests/test_line_handlers.py` 末尾新增：

```python
import time
from unittest.mock import patch


def test_get_valid_state_returns_none_when_no_state():
    from app.line_handlers import get_valid_state
    from app.bot_instance import user_states
    user_states.clear()
    assert get_valid_state("nonexistent_user") is None


def test_get_valid_state_returns_state_when_fresh():
    from app.line_handlers import get_valid_state
    from app.bot_instance import user_states
    user_states["u1"] = {"action": "adding_memo", "expires_at": time.time() + 1800}
    result = get_valid_state("u1")
    assert result is not None
    assert result["action"] == "adding_memo"
    user_states.clear()


def test_get_valid_state_clears_and_returns_none_when_expired():
    from app.line_handlers import get_valid_state
    from app.bot_instance import user_states
    user_states["u2"] = {"action": "editing_field", "expires_at": time.time() - 1}
    result = get_valid_state("u2")
    assert result is None
    assert "u2" not in user_states
```

- [ ] **Step 2: 確認測試失敗**

```bash
pytest tests/test_line_handlers.py::test_get_valid_state_returns_none_when_no_state -v
```

Expected: `ImportError` 或 `AttributeError`（`get_valid_state` 不存在）

- [ ] **Step 3: 實作 `get_valid_state()`**

在 `app/line_handlers.py` 的 import 區塊之後（約 line 20，`user_states` import 之後）新增：

```python
import time


def get_valid_state(user_id: str) -> dict | None:
    """讀取 user_states，若 state 過期（>30 min）則自動清除並回傳 None。"""
    state = user_states.get(user_id)
    if state is None:
        return None
    if state.get('expires_at', 0) < time.time():
        del user_states[user_id]
        return None
    return state
```

- [ ] **Step 4: 確認測試通過**

```bash
pytest tests/test_line_handlers.py::test_get_valid_state_returns_none_when_no_state \
       tests/test_line_handlers.py::test_get_valid_state_returns_state_when_fresh \
       tests/test_line_handlers.py::test_get_valid_state_clears_and_returns_none_when_expired -v
```

Expected: 3 PASSED

- [ ] **Step 5: Commit**

```bash
git add app/line_handlers.py tests/test_line_handlers.py
git commit -m "feat: add get_valid_state() with 30-min TTL"
```

---

## Task 2: State TTL — 所有 state 寫入點加 `expires_at`

**Files:**
- Modify: `app/line_handlers.py`

找到所有 `user_states[user_id] = {` 的寫入點（共 8 處），每處加入 `'expires_at': time.time() + 1800`。

- [ ] **Step 1: 更新所有 state 寫入點**

搜尋命令確認位置：
```bash
grep -n "user_states\[user_id\] = {" app/line_handlers.py
```

逐一修改，範例（`adding_memo` state，約 line 373）：

```python
# 修改前
user_states[user_id] = {'action': 'adding_memo', 'card_id': card_id}

# 修改後
user_states[user_id] = {
    'action': 'adding_memo',
    'card_id': card_id,
    'expires_at': time.time() + 1800
}
```

其他需修改的 state（同樣加 `'expires_at': time.time() + 1800`）：
- `'action': 'searching'`（約 line 223、335）
- `'action': 'editing_field'`（約 line 390）
- `'action': 'adding_tag'`（約 line 798）
- `'action': 'exporting_csv'`（約 line 1006）
- `'action': 'reporting_issue'`（約 line 1111）
- `'action': 'scanning_back'`（約 line 1390）

- [ ] **Step 2: 將所有 `user_states.get(user_id)` 讀取點改為 `get_valid_state()`**

搜尋確認：
```bash
grep -n "user_states\.get(user_id" app/line_handlers.py
```

逐一替換：
```python
# 修改前
user_action = user_states.get(user_id, {}).get('action')

# 修改後
_state = get_valid_state(user_id)
user_action = _state.get('action') if _state else None
```

針對 `user_states.get(user_id, {}).get('action') == 'scanning_back'` 的模式（約 line 270、1379）：
```python
# 修改前
if user_states.get(user_id, {}).get('action') == 'scanning_back':

# 修改後
if get_valid_state(user_id) and get_valid_state(user_id).get('action') == 'scanning_back':
```

- [ ] **Step 3: 加入過期提示回覆**

在 `handle_text_event` 中，讀取 `user_action` 後加入過期判斷（約 line 553 的 if/elif 鏈之前）：

```python
_state = get_valid_state(user_id)
user_action = _state.get('action') if _state else None

# 原本有 state 但現在 get_valid_state 回 None，代表已過期
if user_action is None and user_states.get(user_id) is None:
    # state 不存在或已清除，正常走後續邏輯
    pass
```

**注意**：`scanning_back` state 過期時靜默清除即可（現有行為），不需要提示。對話互動 state（`adding_memo`、`editing_field`、`adding_tag`、`exporting_csv`、`reporting_issue`）過期時，各 handler 頂部加 guard：

```python
async def handle_add_memo_state(event, user_id, org_id, msg):
    state = get_valid_state(user_id)
    if state is None:
        await line_bot_api.reply_message(
            event.reply_token,
            TextSendMessage(text='操作已逾時，請重新開始。')
        )
        return
    # ... 原有邏輯
```

對 `handle_edit_field_state`、`handle_adding_tag_state`、`handle_export_email_state`、`handle_reporting_issue_state` 同樣加此 guard。

- [ ] **Step 4: 執行完整測試套件**

```bash
pytest tests/ -v --tb=short
```

Expected: 所有測試 PASS（新舊）

- [ ] **Step 5: Commit**

```bash
git add app/line_handlers.py
git commit -m "feat: apply 30-min TTL to all user_states write points and state handlers"
```

---

## Task 3: Structured Cloud Logging — OCR 監控

**Files:**
- Modify: `app/line_handlers.py`（單張 OCR 路徑）
- Modify: `app/batch_processor.py`（批量 OCR 路徑）
- Test: `tests/test_monitoring_logs.py`（新增）

- [ ] **Step 1: 寫失敗測試**

新增 `tests/test_monitoring_logs.py`：

```python
import json
import logging
from unittest.mock import patch, MagicMock


def test_single_ocr_success_logs_structured_event(caplog):
    """單張 OCR 成功時應記錄 ocr_success structured log"""
    import app.line_handlers as lh

    with caplog.at_level(logging.INFO, logger="app.line_handlers"):
        lh._log_ocr_event("ocr_success", "org1", "user1", "single")

    assert any(
        "ocr_success" in r.message and "org1" in r.message
        for r in caplog.records
    )


def test_single_ocr_failure_logs_structured_event(caplog):
    """單張 OCR 失敗時應記錄 ocr_failure structured log"""
    import app.line_handlers as lh

    with caplog.at_level(logging.ERROR, logger="app.line_handlers"):
        lh._log_ocr_event("ocr_failure", "org1", "user1", "single", reason="parse error")

    assert any(
        "ocr_failure" in r.message and "parse error" in r.message
        for r in caplog.records
    )


def test_batch_ocr_success_logs_structured_event(caplog):
    """批量 OCR 成功時應記錄 ocr_success structured log"""
    import app.batch_processor as bp

    with caplog.at_level(logging.INFO, logger="app.batch_processor"):
        bp._log_ocr_event("ocr_success", "org1", "user1", "batch")

    assert any("ocr_success" in r.message for r in caplog.records)
```

- [ ] **Step 2: 確認測試失敗**

```bash
pytest tests/test_monitoring_logs.py -v
```

Expected: `AttributeError`（`_log_ocr_event` 不存在）

- [ ] **Step 3: 在 `app/line_handlers.py` 加入 `_log_ocr_event` helper 和呼叫點**

在 import 區塊加入：
```python
import json
import logging
logger = logging.getLogger(__name__)
```

新增 helper（`get_valid_state` 之後）：
```python
def _log_ocr_event(event: str, org_id: str, user_id: str, mode: str, reason: str = None):
    """寫入 structured OCR log，供 Cloud Logging 收集。"""
    payload = {"event": event, "org_id": org_id, "user_id": user_id, "mode": mode}
    if reason:
        payload["reason"] = reason
    if event.endswith("_failure") or event.endswith("_error"):
        logger.error(json.dumps(payload))
    else:
        logger.info(json.dumps(payload))
```

在單張 OCR 成功路徑（`handle_image_event`，約 line 1358 之後，`card_obj` 解析成功處）加入：
```python
_log_ocr_event("ocr_success", org_id, user_id, "single")
```

在單張 OCR 失敗路徑（約 line 1360，`if not card_obj:` 區塊內）加入：
```python
_log_ocr_event("ocr_failure", org_id, user_id, "single", reason=result.text[:200])
```

- [ ] **Step 4: 在 `app/batch_processor.py` 加入相同 helper 和呼叫點**

在 import 區塊（`logger` 已存在，加 `json`）：
```python
import json
```

新增 helper（`logger = logging.getLogger(__name__)` 之後）：
```python
def _log_ocr_event(event: str, org_id: str, user_id: str, mode: str, reason: str = None):
    payload = {"event": event, "org_id": org_id, "user_id": user_id, "mode": mode}
    if reason:
        payload["reason"] = reason
    if event.endswith("_failure") or event.endswith("_error"):
        logger.error(json.dumps(payload))
    else:
        logger.info(json.dumps(payload))
```

在批量 OCR 成功路徑（`process_batch` 函式內，`card_id` 寫入成功之後，約 line 68 附近）加入：
```python
_log_ocr_event("ocr_success", batch_state.get("org_id", ""), user_id, "batch")
```

在批量 OCR 失敗路徑（`except Exception as e:` 區塊，約 line 79）加入：
```python
_log_ocr_event("ocr_failure", batch_state.get("org_id", ""), user_id, "batch", reason=str(e))
```

- [ ] **Step 5: 確認測試通過**

```bash
pytest tests/test_monitoring_logs.py -v
```

Expected: 3 PASSED

- [ ] **Step 6: Commit**

```bash
git add app/line_handlers.py app/batch_processor.py tests/test_monitoring_logs.py
git commit -m "feat: add structured OCR monitoring logs (ocr_success/ocr_failure)"
```

---

## Task 4: Structured Cloud Logging — Firebase 讀寫監控

**Files:**
- Modify: `app/firebase_utils.py`
- Test: `tests/test_monitoring_logs.py`（新增測試）

- [ ] **Step 1: 確認目標 except 區塊**

```bash
grep -n "except Exception\|except.*Error" app/firebase_utils.py | head -20
```

主要監控點：
- `save_namecard`（寫入名片）
- `update_namecard_field`（更新名片欄位）
- `get_card_by_id`（讀取名片）
- `get_user_org_id`（讀取 user org）

- [ ] **Step 2: 在測試檔案新增 Firebase 監控測試**

在 `tests/test_monitoring_logs.py` 末尾新增：

```python
def test_firebase_write_error_logs_structured_event(caplog):
    """Firebase 寫入失敗時應記錄 firebase_write_error structured log"""
    import app.firebase_utils as fu

    with caplog.at_level(logging.ERROR, logger="app.firebase_utils"):
        fu._log_firebase_event("firebase_write_error", path="namecard/org1/card1", reason="timeout")

    assert any(
        "firebase_write_error" in r.message and "namecard/org1/card1" in r.message
        for r in caplog.records
    )


def test_firebase_read_error_logs_structured_event(caplog):
    """Firebase 讀取失敗時應記錄 firebase_read_error structured log"""
    import app.firebase_utils as fu

    with caplog.at_level(logging.ERROR, logger="app.firebase_utils"):
        fu._log_firebase_event("firebase_read_error", path="user_org_map/user1", reason="not found")

    assert any("firebase_read_error" in r.message for r in caplog.records)
```

- [ ] **Step 3: 確認測試失敗**

```bash
pytest tests/test_monitoring_logs.py::test_firebase_write_error_logs_structured_event -v
```

Expected: `AttributeError`

- [ ] **Step 4: 在 `app/firebase_utils.py` 加入 helper 和呼叫點**

在 `firebase_utils.py` 的 import 區塊加入（若無 `json` 和 `logging`）：
```python
import json
import logging
_fb_logger = logging.getLogger(__name__)
```

新增 helper（靠近頂部，`db` 初始化後）：
```python
def _log_firebase_event(event: str, path: str = "", reason: str = ""):
    """寫入 structured Firebase monitoring log。"""
    _fb_logger.error(json.dumps({
        "event": event,
        "path": path,
        "reason": reason
    }))
```

在 `save_namecard` 的 except 區塊加入：
```python
except Exception as e:
    _log_firebase_event("firebase_write_error", path=f"{config.NAMECARD_PATH}/{org_id}", reason=str(e))
    return None
```

在 `update_namecard_field` 的 except 區塊加入：
```python
except Exception as e:
    _log_firebase_event("firebase_write_error", path=f"{config.NAMECARD_PATH}/{org_id}/{card_id}", reason=str(e))
    return False
```

在 `get_card_by_id` 的 except 區塊加入：
```python
except Exception as e:
    _log_firebase_event("firebase_read_error", path=f"{config.NAMECARD_PATH}/{org_id}/{card_id}", reason=str(e))
    return None
```

在 `get_user_org_id` 的 except 區塊加入：
```python
except Exception as e:
    _log_firebase_event("firebase_read_error", path=f"user_org_map/{user_id}", reason=str(e))
    return None
```

- [ ] **Step 5: 確認測試通過**

```bash
pytest tests/test_monitoring_logs.py -v
```

Expected: 5 PASSED

- [ ] **Step 6: Commit**

```bash
git add app/firebase_utils.py tests/test_monitoring_logs.py
git commit -m "feat: add structured Firebase read/write error monitoring logs"
```

---

## Task 5: .vcf Endpoint — `GET /vcf/{card_id}`

**Files:**
- Create: `app/api/vcf.py`
- Modify: `app/main.py`
- Test: `tests/test_vcf_api.py`（新增）

- [ ] **Step 1: 寫失敗測試**

新增 `tests/test_vcf_api.py`：

```python
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch


@pytest.fixture
def client():
    from app.main import app
    return TestClient(app)


def test_vcf_returns_vcard_content(client):
    """同 org user 應可取得 .vcf 內容"""
    card_data = {
        "name": "王小明",
        "company": "測試公司",
        "email": "wang@test.com",
        "phone": "0912345678",
        "title": "業務",
        "address": "",
        "memo": ""
    }
    with patch("app.api.vcf.firebase_utils.get_user_org_id", return_value="org1"), \
         patch("app.api.vcf.firebase_utils.get_card_by_id", return_value=card_data):
        response = client.get("/vcf/card123?user_id=user1")

    assert response.status_code == 200
    assert "text/vcard" in response.headers["content-type"]
    assert "王小明" in response.text
    assert "wang@test.com" in response.text


def test_vcf_returns_404_when_card_not_found(client):
    """找不到名片時回傳 404"""
    with patch("app.api.vcf.firebase_utils.get_user_org_id", return_value="org1"), \
         patch("app.api.vcf.firebase_utils.get_card_by_id", return_value=None):
        response = client.get("/vcf/nonexistent?user_id=user1")

    assert response.status_code == 404


def test_vcf_returns_403_when_user_has_no_org(client):
    """user 無 org 時回傳 403"""
    with patch("app.api.vcf.firebase_utils.get_user_org_id", return_value=None):
        response = client.get("/vcf/card123?user_id=unknown_user")

    assert response.status_code == 403


def test_vcf_filename_uses_contact_name(client):
    """Content-Disposition 應使用聯絡人姓名"""
    card_data = {"name": "李大華", "company": "", "email": "", "phone": "", "title": "", "address": "", "memo": ""}
    with patch("app.api.vcf.firebase_utils.get_user_org_id", return_value="org1"), \
         patch("app.api.vcf.firebase_utils.get_card_by_id", return_value=card_data):
        response = client.get("/vcf/card456?user_id=user1")

    assert "李大華.vcf" in response.headers.get("content-disposition", "")
```

- [ ] **Step 2: 確認測試失敗**

```bash
pytest tests/test_vcf_api.py -v
```

Expected: `ImportError`（`app.api.vcf` 不存在）

- [ ] **Step 3: 新增 `app/api/vcf.py`**

```python
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import Response
from .. import firebase_utils
from ..qrcode_utils import generate_vcard_string

router = APIRouter()


@router.get("/vcf/{card_id}")
async def download_vcf(card_id: str, user_id: str = Query(...)):
    """
    回傳 .vcf 聯絡人檔案。
    驗證：user_id 必須與 card 屬於同一 org。
    """
    user_org = firebase_utils.get_user_org_id(user_id)
    if not user_org:
        raise HTTPException(status_code=403, detail="User has no organization")

    card = firebase_utils.get_card_by_id(user_org, card_id)
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")

    vcard_str = generate_vcard_string(card)
    name = card.get("name", "contact")
    filename = f"{name}.vcf"

    return Response(
        content=vcard_str,
        media_type="text/vcard",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )
```

- [ ] **Step 4: 在 `app/main.py` 註冊 router**

找到現有 router include 區塊（約 `app.include_router(...)` 處），新增：

```python
from app.api import vcf
app.include_router(vcf.router)
```

- [ ] **Step 5: 確認測試通過**

```bash
pytest tests/test_vcf_api.py -v
```

Expected: 4 PASSED

- [ ] **Step 6: Commit**

```bash
git add app/api/vcf.py app/main.py tests/test_vcf_api.py
git commit -m "feat: add GET /vcf/{card_id} endpoint for one-tap contact import"
```

---

## Task 6: 更新 LINE Handler — 改用 .vcf 連結

**Files:**
- Modify: `app/line_handlers.py`（`handle_download_contact`，約 line 444）

- [ ] **Step 1: 寫失敗測試**

在 `tests/test_line_handlers.py` 末尾新增：

```python
import pytest
from unittest.mock import patch, AsyncMock, MagicMock


@pytest.mark.asyncio
async def test_handle_download_contact_sends_vcf_url():
    """handle_download_contact 應回傳 .vcf URL，不再產生 QR Code 圖片"""
    from app.line_handlers import handle_download_contact
    from linebot.models import TextSendMessage

    mock_event = MagicMock()
    mock_event.reply_token = "token123"

    card_data = {"name": "陳大明", "company": "ABC", "email": "chen@abc.com",
                 "phone": "", "title": "", "address": "", "memo": ""}

    with patch("app.line_handlers.firebase_utils.get_card_by_id", return_value=card_data), \
         patch("app.line_handlers.config.CLOUD_RUN_URL", "https://bot.example.com"), \
         patch("app.line_handlers.line_bot_api.reply_message", new_callable=AsyncMock) as mock_reply:
        await handle_download_contact(mock_event, "user1", "org1", "card123", "陳大明")

    mock_reply.assert_called_once()
    sent_msg = mock_reply.call_args[0][1]
    assert isinstance(sent_msg, TextSendMessage)
    assert "/vcf/card123" in sent_msg.text
    assert "user1" in sent_msg.text
```

- [ ] **Step 2: 確認測試失敗**

```bash
pytest tests/test_line_handlers.py::test_handle_download_contact_sends_vcf_url -v
```

Expected: FAIL（目前回傳 ImageSendMessage）

- [ ] **Step 3: 修改 `handle_download_contact`**

將 `app/line_handlers.py` 約 line 444 的 `handle_download_contact` 函式替換為：

```python
async def handle_download_contact(
        event: PostbackEvent, user_id: str, org_id: str,
        card_id: str, card_name: str):
    """處理下載聯絡人的請求，回傳 .vcf 下載連結供一鍵加入通訊錄。"""
    card_data = firebase_utils.get_card_by_id(org_id, card_id)
    if not card_data:
        await line_bot_api.reply_message(
            event.reply_token,
            TextSendMessage(text='找不到該名片資料。'))
        return

    base_url = config.CLOUD_RUN_URL or ""
    vcf_url = f"{base_url}/vcf/{card_id}?user_id={user_id}"

    await line_bot_api.reply_message(
        event.reply_token,
        TextSendMessage(text=f"點擊連結一鍵加入通訊錄：\n{vcf_url}")
    )
```

- [ ] **Step 4: 確認測試通過**

```bash
pytest tests/test_line_handlers.py::test_handle_download_contact_sends_vcf_url -v
```

Expected: PASS

- [ ] **Step 5: 執行完整測試套件**

```bash
pytest tests/ -v --tb=short
```

Expected: 所有測試 PASS

- [ ] **Step 6: Commit**

```bash
git add app/line_handlers.py
git commit -m "feat: replace QR code with vcf URL in handle_download_contact"
```

---

## Self-Review

**Spec coverage check:**

| Spec 項目 | 對應 Task |
|-----------|----------|
| 狀態超時 30 分鐘，lazy 清除 | Task 1, 2 ✅ |
| 過期提示「操作已逾時」 | Task 2 ✅ |
| OCR structured log（single + batch） | Task 3 ✅ |
| Firebase 讀寫 structured log | Task 4 ✅ |
| `GET /vcf/{card_id}` endpoint | Task 5 ✅ |
| org 驗證（403 / 404） | Task 5 ✅ |
| LINE handler 改用 .vcf 連結 | Task 6 ✅ |
| `generate_vcard_string()` 不動 | Task 5 複用，未修改 ✅ |

**Type consistency check:**

- `get_valid_state(user_id: str) -> dict | None` — Task 1 定義，Task 2 使用 ✅
- `_log_ocr_event(event, org_id, user_id, mode, reason=None)` — Task 3 定義，同檔案使用 ✅
- `_log_firebase_event(event, path, reason)` — Task 4 定義，同檔案使用 ✅
- `firebase_utils.get_user_org_id(user_id)` — 現有函式（line 61），Task 5 使用 ✅
- `firebase_utils.get_card_by_id(org_id, card_id)` — 現有函式（line 710），Task 5, 6 使用 ✅
- `config.CLOUD_RUN_URL` — 現有 config（line 30），Task 6 使用 ✅

**Placeholder scan:** 無 TBD / TODO / "similar to Task N" ✅
