# Phase 1 Backlog — 設計文件

**日期**：2026-04-15  
**範圍**：Track A — 三個 Phase 1 待完成項目，合併為一個 PR 交付

---

## 一、狀態超時機制（State TTL）

### 問題

`user_states` 是 in-memory dict，無過期機制。用戶進入等待輸入狀態（如 `editing_field`、`adding_memo`）後若未完成，下次回來仍卡在舊 state，導致非預期行為。

### 設計

**TTL = 30 分鐘**，儲存於 in-memory，每次讀取時檢查。

#### `bot_instance.py`

`user_states` 結構不變，寫入時一律帶 `expires_at`：

```python
user_states[user_id] = {
    'action': 'editing_field',
    'card_id': '...',
    'expires_at': time.time() + 1800  # 30 min
}
```

#### `line_handlers.py`

新增 helper（模組頂層）：

```python
import time

def get_valid_state(user_id: str) -> dict | None:
    state = user_states.get(user_id)
    if state is None:
        return None
    if state.get('expires_at', 0) < time.time():
        del user_states[user_id]
        return None
    return state
```

所有讀取 `user_states.get(user_id)` 的地方改為 `get_valid_state(user_id)`。

過期時的用戶提示（在各 state handler 頂部加 guard）：

```python
state = get_valid_state(user_id)
if state is None:
    await line_bot_api.reply_message(reply_token, TextSendMessage(text='操作已逾時，請重新開始。'))
    return
```

#### 影響範圍

- `app/bot_instance.py`：無結構變更
- `app/line_handlers.py`：新增 `get_valid_state()`；修改 `user_states[user_id] = {...}` 的所有寫入點（約 8 處）加入 `expires_at`；所有讀取點改用 `get_valid_state()`

#### 不做的事

- 不寫入 Firebase（Cloud Run 重啟 state 消失為已知限制，不在本次範圍）
- 不做背景掃描清理（讀取時 lazy 清除即可）

---

## 二、錯誤監控（Structured Cloud Logging）

### 問題

OCR 成功/失敗率與 Firebase 讀寫錯誤率無可觀測性，無法評估系統健康狀態。

### 設計

使用 structured JSON log，輸出至 stdout → Cloud Run 自動匯入 Cloud Logging。不新增模組，直接在各檔案現有 `logger` 加入 log call。

#### Log 事件定義

| event | level | 位置 | 說明 |
|-------|-------|------|------|
| `ocr_success` | INFO | `batch_processor.py` | 批量 OCR 成功一張 |
| `ocr_failure` | ERROR | `batch_processor.py` | 批量 OCR 失敗一張 |
| `ocr_success` | INFO | `line_handlers.py` | 單張名片 OCR 成功 |
| `ocr_failure` | ERROR | `line_handlers.py` | 單張名片 OCR 失敗 |
| `firebase_write_error` | ERROR | `firebase_utils.py` | Firebase 寫入失敗 |
| `firebase_read_error` | ERROR | `firebase_utils.py` | Firebase 讀取失敗 |

#### Log 格式

```python
import json

logger.info(json.dumps({
    "event": "ocr_success",
    "org_id": org_id,
    "user_id": user_id,
    "mode": "batch"   # 或 "single"
}))

logger.error(json.dumps({
    "event": "ocr_failure",
    "org_id": org_id,
    "user_id": user_id,
    "mode": "batch",
    "reason": str(e)
}))

logger.error(json.dumps({
    "event": "firebase_write_error",
    "path": path,
    "reason": str(e)
}))
```

#### 影響範圍

- `app/batch_processor.py`：在現有 `logger.error(...)` 旁補 structured log
- `app/line_handlers.py`：單張 OCR 成功/失敗路徑補 log
- `app/firebase_utils.py`：主要讀寫 except 區塊補 log

#### 日後擴充

GCP Console → Log Router → BigQuery sink（一次性設定），即可用 SQL 做成功率分析，不需改 code。

---

## 三、一鍵加入通訊錄（.vcf Endpoint）

### 問題

現有「加入通訊錄」功能產生 QR Code 圖片，用戶需用另一支手機掃描，操作反直覺。

### 設計

新增 `GET /vcf/{card_id}` endpoint，直接回傳 `.vcf` 文字內容；LINE 傳連結給用戶，點擊即下載，iOS/Android 原生一鍵匯入通訊錄。

#### 新增：`app/api/vcf.py`

```python
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from ..firebase_utils import get_namecard_by_id, get_org_id_for_user
from ..qrcode_utils import generate_vcard_string

router = APIRouter()

@router.get("/vcf/{card_id}")
async def download_vcf(card_id: str, user_id: str):
    # 驗證：card 所屬 org 必須與 user 的 org 一致
    # Firebase 結構為 namecard/{org_id}/{card_id}/，card 本身不存 org_id 欄位
    # get_namecard_by_id 掃描 user_org 下找到 card_id，實作時對齊現有 firebase_utils 函式名稱
    user_org = get_org_id_for_user(user_id)
    card = get_namecard_by_id(user_org, card_id)  # 只查 user 所屬 org，不跨 org 掃描
    if not card or not user_org:
        raise HTTPException(status_code=404)

    vcard_str = generate_vcard_string(card)
    name = card.get('name', 'contact')
    return Response(
        content=vcard_str,
        media_type="text/vcard",
        headers={"Content-Disposition": f'attachment; filename="{name}.vcf"'}
    )
```

#### `app/main.py`

```python
from app.api import vcf
app.include_router(vcf.router)
```

#### `app/line_handlers.py`

`handle_download_qrcode` 改為回傳文字連結：

```python
vcf_url = f"{config.CLOUD_RUN_URL}/vcf/{card_id}?user_id={user_id}"
reply = TextSendMessage(text=f"點擊連結一鍵加入通訊錄：\n{vcf_url}")
```

移除：`generate_vcard_qrcode`、`upload_qrcode_to_storage` 的呼叫。

#### 影響範圍

- 新增 `app/api/vcf.py`
- `app/main.py`：新增 router 註冊
- `app/line_handlers.py`：修改 `handle_download_qrcode`
- `app/qrcode_utils.py`：不動（`generate_vcard_string` 直接複用）

#### 不做的事

- 不用 JWT 驗證（機器人內部連結，`user_id` org 歸屬驗證已足夠）
- 不刪除 `generate_vcard_qrcode` 函式（保留，暫不移除）

---

## 四、交付範圍總覽

| 項目 | 新增檔案 | 修改檔案 |
|------|---------|---------|
| 狀態超時 | — | `bot_instance.py`、`line_handlers.py` |
| 錯誤監控 | — | `batch_processor.py`、`line_handlers.py`、`firebase_utils.py` |
| .vcf endpoint | `app/api/vcf.py` | `main.py`、`line_handlers.py` |

## 五、驗收標準

- [ ] 進入任何 state 後等待 30 分鐘，下一則訊息觸發「操作已逾時」提示並清除 state
- [ ] 單張 OCR 成功後，Cloud Logging 出現 `ocr_success` structured log
- [ ] 批量 OCR 失敗時，Cloud Logging 出現 `ocr_failure` + `reason`
- [ ] Firebase 讀寫失敗時，Cloud Logging 出現 `firebase_write_error` / `firebase_read_error`
- [ ] `GET /vcf/{card_id}?user_id={user_id}` 回傳正確 `.vcf` 內容，`Content-Type: text/vcard`
- [ ] 跨 org 的 user_id 請求回傳 403
- [ ] LINE 聊天室點擊連結，iOS/Android 彈出「加入聯絡人」提示
- [ ] 現有 OCR、邀請碼、CSV 匯出功能迴歸測試通過
