# Phase 1 Enhancement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 實作雙面名片掃描、智慧搜尋重構（按鈕觸發）、新增 mobile/line_id 欄位並加入格式驗證。

**Architecture:** 三個功能皆在現有 FastAPI + LINE Bot 架構上擴展。新增兩個 utility 函式（`validate_namecard_fields`、`merge_namecard_data`）放在 `utils.py`；`user_states` state machine 新增 `scanning_back` 和 `searching` 兩個 action；`handle_image_event` 和 `handle_postback_event` 擴展以支援雙面流程；Flex Message 更新以顯示新欄位。

**Tech Stack:** Python 3, FastAPI, LINE Messaging API SDK, Firebase Realtime DB, Gemini 2.5 Flash, pytest

---

## File Map

| 檔案 | 變更類型 | 說明 |
|------|---------|------|
| `app/utils.py` | Modify | 新增 `validate_namecard_fields()`、`merge_namecard_data()` |
| `app/config.py` | Modify | 更新 `IMGAGE_PROMPT` 加入 mobile/line_id |
| `app/firebase_utils.py` | Modify | `ALLOWED_EDIT_FIELDS` 加入 mobile/line_id |
| `app/line_handlers.py` | Modify | FIELD_LABELS、quick reply、handle_image_event、handle_postback_event、handle_text_event |
| `app/flex_messages.py` | Modify | 名片詳細 Flex 加入 mobile/line_id 欄位 |
| `tests/test_utils.py` | Create | validate_namecard_fields 和 merge_namecard_data 的單元測試 |

---

## Task 1: 新增 validate_namecard_fields() 和 merge_namecard_data() — utils.py

**Files:**
- Modify: `app/utils.py`
- Create: `tests/test_utils.py`

- [ ] **Step 1: 建立測試檔，寫失敗測試**

```python
# tests/test_utils.py
import pytest
from app.utils import validate_namecard_fields, merge_namecard_data


class TestValidateNamecardFields:
    def test_valid_phone_passes(self):
        card = {"phone": "02-12345678", "email": "a@b.com", "mobile": "0912345678", "line_id": "mylineid"}
        result = validate_namecard_fields(card)
        assert result["phone"] == "02-12345678"

    def test_invalid_phone_becomes_na(self):
        card = {"phone": "not-a-phone", "email": "a@b.com", "mobile": "N/A", "line_id": "N/A"}
        result = validate_namecard_fields(card)
        assert result["phone"] == "N/A"

    def test_valid_mobile_passes(self):
        card = {"phone": "N/A", "email": "a@b.com", "mobile": "0912345678", "line_id": "N/A"}
        result = validate_namecard_fields(card)
        assert result["mobile"] == "0912345678"

    def test_invalid_mobile_becomes_na(self):
        card = {"phone": "N/A", "email": "a@b.com", "mobile": "12345", "line_id": "N/A"}
        result = validate_namecard_fields(card)
        assert result["mobile"] == "N/A"

    def test_valid_email_passes(self):
        card = {"phone": "N/A", "email": "user@example.com", "mobile": "N/A", "line_id": "N/A"}
        result = validate_namecard_fields(card)
        assert result["email"] == "user@example.com"

    def test_invalid_email_becomes_na(self):
        card = {"phone": "N/A", "email": "not-an-email", "mobile": "N/A", "line_id": "N/A"}
        result = validate_namecard_fields(card)
        assert result["email"] == "N/A"

    def test_valid_line_id_passes(self):
        card = {"phone": "N/A", "email": "N/A", "mobile": "N/A", "line_id": "my_line_id123"}
        result = validate_namecard_fields(card)
        assert result["line_id"] == "my_line_id123"

    def test_invalid_line_id_becomes_na(self):
        card = {"phone": "N/A", "email": "N/A", "mobile": "N/A", "line_id": "ab"}  # too short
        result = validate_namecard_fields(card)
        assert result["line_id"] == "N/A"

    def test_missing_fields_not_added(self):
        card = {"name": "John"}
        result = validate_namecard_fields(card)
        assert "phone" not in result
        assert "email" not in result

    def test_na_string_preserved(self):
        card = {"phone": "N/A", "email": "N/A", "mobile": "N/A", "line_id": "N/A"}
        result = validate_namecard_fields(card)
        assert result["phone"] == "N/A"
        assert result["email"] == "N/A"

    def test_international_mobile_passes(self):
        card = {"phone": "N/A", "email": "N/A", "mobile": "+886912345678", "line_id": "N/A"}
        result = validate_namecard_fields(card)
        assert result["mobile"] == "+886912345678"


class TestMergeNamecardData:
    def test_back_fills_na_fields(self):
        front = {"name": "John", "email": "N/A", "mobile": "N/A", "line_id": "N/A"}
        back = {"name": "N/A", "email": "john@example.com", "mobile": "0912345678", "line_id": "N/A"}
        result = merge_namecard_data(front, back)
        assert result["name"] == "John"
        assert result["email"] == "john@example.com"
        assert result["mobile"] == "0912345678"

    def test_back_does_not_overwrite_front(self):
        front = {"name": "John", "email": "john@front.com"}
        back = {"name": "Wrong Name", "email": "wrong@back.com"}
        result = merge_namecard_data(front, back)
        assert result["name"] == "John"
        assert result["email"] == "john@front.com"

    def test_back_adds_new_fields(self):
        front = {"name": "John"}
        back = {"line_id": "john_line"}
        result = merge_namecard_data(front, back)
        assert result["line_id"] == "john_line"

    def test_empty_string_treated_as_na(self):
        front = {"name": "John", "email": ""}
        back = {"email": "john@back.com"}
        result = merge_namecard_data(front, back)
        assert result["email"] == "john@back.com"
```

- [ ] **Step 2: 執行測試，確認失敗**

```bash
cd /Users/davidlin/Claude-Code-Project/linebot-namecard-python
python -m pytest tests/test_utils.py -v 2>&1 | head -20
```

預期：`ImportError` 或 `FAILED`，函式尚未存在。

- [ ] **Step 3: 實作函式，加到 app/utils.py 末尾**

先在 `app/utils.py` 頂部的 `import json` 之後加入 `import re`，再於檔案末尾加入：

```python
def validate_namecard_fields(card: dict) -> dict:
    """驗證名片欄位格式，不符格式的欄位設為 N/A。只驗證存在的欄位，不新增缺失欄位。"""
    result = card.copy()

    phone_val = result.get("phone")
    if phone_val and phone_val != "N/A":
        if not re.match(r'^(\+?886|0)[2-9]\d{6,8}(#\d+)?$', re.sub(r'[\s\-]', '', phone_val)):
            result["phone"] = "N/A"

    mobile_val = result.get("mobile")
    if mobile_val and mobile_val != "N/A":
        if not re.match(r'^(\+?886|0)9\d{8}$', re.sub(r'[\s\-]', '', mobile_val)):
            result["mobile"] = "N/A"

    email_val = result.get("email")
    if email_val and email_val != "N/A":
        if not re.match(r'^[^@\s]+@[^@\s]+\.[^@\s]+$', email_val.strip()):
            result["email"] = "N/A"

    line_id_val = result.get("line_id")
    if line_id_val and line_id_val != "N/A":
        if not re.match(r'^[a-zA-Z0-9._]{4,20}$', line_id_val.strip()):
            result["line_id"] = "N/A"

    return result


def merge_namecard_data(front: dict, back: dict) -> dict:
    """合併正反面名片資料。以正面為主，背面只補充正面為 N/A 或空字串的欄位。"""
    result = front.copy()
    for key, value in back.items():
        front_val = result.get(key)
        if front_val is None or front_val == "N/A" or front_val == "":
            result[key] = value
    return result
```

- [ ] **Step 4: 執行測試，確認全部通過**

```bash
python -m pytest tests/test_utils.py -v
```

預期：所有測試 PASS。

- [ ] **Step 5: Commit**

```bash
git add app/utils.py tests/test_utils.py
git commit -m "feat: add validate_namecard_fields and merge_namecard_data"
```

---

## Task 2: 更新 Gemini OCR Prompt — config.py

**Files:**
- Modify: `app/config.py:33-39`

- [ ] **Step 1: 更新 IMGAGE_PROMPT**

將 `app/config.py` lines 33-39 的 `IMGAGE_PROMPT` 替換為：

```python
IMGAGE_PROMPT = """
這是一張名片，你是一個名片秘書。請將以下資訊整理成 json 給我。
如果看不出來的，幫我填寫 N/A。
只回傳 json 就好：name, title, address, email, phone, mobile, line_id, company。
其中：
- phone 是辦公室電話或市話（02、03、04 等開頭，或 +886 2/3/4 等），格式保持原樣
- mobile 是行動電話（09 開頭，或 +886 9 開頭），格式保持原樣
- phone 與 mobile 是不同欄位，請分開填寫，不要混用
- line_id 是 LINE ID（名片上常見 LINE: 或 ID: 標示的英數字帳號）
"""
```

- [ ] **Step 2: 確認語法正確**

```bash
python -c "from app import config; print(config.IMGAGE_PROMPT)"
```

預期：印出新 prompt，無錯誤。

- [ ] **Step 3: Commit**

```bash
git add app/config.py
git commit -m "feat: update OCR prompt to extract mobile and line_id fields"
```

---

## Task 3: 更新 ALLOWED_EDIT_FIELDS 和 FIELD_LABELS

**Files:**
- Modify: `app/firebase_utils.py:426`
- Modify: `app/line_handlers.py:13-16`

- [ ] **Step 1: 更新 firebase_utils.py ALLOWED_EDIT_FIELDS（line 426）**

```python
ALLOWED_EDIT_FIELDS = {"name", "title", "company", "address", "phone", "email", "mobile", "line_id"}
```

- [ ] **Step 2: 更新 line_handlers.py FIELD_LABELS（lines 13-16）**

```python
FIELD_LABELS = {
    "name": "姓名", "title": "職稱", "company": "公司",
    "address": "地址", "phone": "電話", "email": "Email",
    "mobile": "手機", "line_id": "LINE ID"
}
```

- [ ] **Step 3: 確認語法正確**

```bash
python -c "from app import firebase_utils, line_handlers; print(firebase_utils.ALLOWED_EDIT_FIELDS)"
```

預期：集合中包含 `mobile` 和 `line_id`。

- [ ] **Step 4: Commit**

```bash
git add app/firebase_utils.py app/line_handlers.py
git commit -m "feat: add mobile and line_id to editable fields and labels"
```

---

## Task 4: 更新 Quick Reply 按鈕加入「🔍 搜尋名片」

**Files:**
- Modify: `app/line_handlers.py:44-45`

LINE Quick Reply 上限 10 個。現有 10 個，將「🧪 測試」（lines 44-45）替換為「🔍 搜尋名片」。

- [ ] **Step 1: 替換按鈕**

將 `app/line_handlers.py` 中：
```python
        QuickReplyButton(
            action=PostbackAction(label="🧪 測試", data="action=show_test")
        ),
```
替換為：
```python
        QuickReplyButton(
            action=PostbackAction(label="🔍 搜尋名片", data="action=start_search")
        ),
```

- [ ] **Step 2: 確認按鈕數量正確**

```bash
python -c "from app.line_handlers import get_quick_reply_items; r = get_quick_reply_items(); print(len(r.items), 'buttons')"
```

預期：`10 buttons`

- [ ] **Step 3: Commit**

```bash
git add app/line_handlers.py
git commit -m "feat: replace test button with search button in quick reply"
```

---

## Task 5: 更新 Flex Message 加入 mobile/line_id 欄位顯示

**Files:**
- Modify: `app/flex_messages.py`

- [ ] **Step 1: 在 get_namecard_flex_msg() 加入新欄位讀取**

在 `app/flex_messages.py` line 99（`email = card_data.get("email", "N/A")` 之後）插入：

```python
    mobile = card_data.get("mobile", "N/A")
    line_id = card_data.get("line_id", "N/A")
```

- [ ] **Step 2: 更新 body contents 加入條件顯示列**

將 `app/flex_messages.py` body contents（lines 132-187）替換為以下（Mobile 接在 Phone 後、LINE ID 接在 Email 後，值為 N/A 時不顯示）：

```python
        "body": {
            "type": "box",
            "layout": "vertical",
            "contents": [
                {"type": "box", "layout": "horizontal", "margin": "md",
                 "contents": [
                    {"type": "text", "text": "Phone", "size": "sm",
                     "color": "#555555", "flex": 1},
                    {"type": "text", "text": phone, "size": "sm",
                     "color": "#111111", "align": "end", "flex": 3}
                ]},
            ] + ([{
                "type": "box", "layout": "horizontal", "margin": "md",
                "contents": [
                    {"type": "text", "text": "Mobile", "size": "sm",
                     "color": "#555555", "flex": 1},
                    {"type": "text", "text": mobile, "size": "sm",
                     "color": "#111111", "align": "end", "flex": 3}
                ]
            }] if mobile and mobile != "N/A" else []) + [
                {"type": "box", "layout": "horizontal", "margin": "md",
                 "contents": [
                    {"type": "text", "text": "Email", "size": "sm",
                     "color": "#555555", "flex": 1},
                    {"type": "text", "text": email, "size": "sm",
                     "color": "#111111", "align": "end", "flex": 3}
                ]},
            ] + ([{
                "type": "box", "layout": "horizontal", "margin": "md",
                "contents": [
                    {"type": "text", "text": "LINE ID", "size": "sm",
                     "color": "#555555", "flex": 1},
                    {"type": "text", "text": line_id, "size": "sm",
                     "color": "#111111", "align": "end", "flex": 3}
                ]
            }] if line_id and line_id != "N/A" else []) + [
                {"type": "box", "layout": "horizontal", "margin": "md",
                 "contents": [
                    {"type": "text", "text": "Address",
                     "size": "sm", "color": "#555555", "flex": 1},
                    {"type": "text", "text": address, "size": "sm",
                     "color": "#111111", "align": "end", "wrap": True, "flex": 3}
                ]},
                {"type": "box", "layout": "horizontal", "margin": "md",
                 "contents": [
                    {"type": "text", "text": "新增者", "size": "sm",
                     "color": "#555555", "flex": 1},
                    {"type": "text", "text": added_by_label, "size": "sm",
                     "color": "#111111", "align": "end", "flex": 3}
                ]},
                {"type": "separator", "margin": "xxl"},
                {"type": "box", "layout": "vertical", "margin": "md",
                 "contents": [
                    {"type": "text", "text": "備忘錄",
                     "size": "md", "color": "#555555"},
                    {"type": "text", "text": memo or "尚無備忘錄",
                     "color": "#111111", "size": "sm", "wrap": True, "margin": "md"}
                ]}
            ] + ([{
                "type": "box", "layout": "horizontal", "margin": "md",
                "contents": [
                    {"type": "text", "text": "🏷", "size": "sm",
                     "color": "#555555", "flex": 0},
                    {"type": "text", "text": role_tags_text,
                     "size": "sm", "color": "#0367D3",
                     "wrap": True, "margin": "sm", "flex": 1}
                ]
            }] if role_tags_text else [])
        },
```

- [ ] **Step 3: 確認語法正確**

```bash
python -c "
from app.utils import generate_sample_namecard
from app import flex_messages
card = generate_sample_namecard()
card['mobile'] = '0912345678'
card['line_id'] = 'testlineid'
msg = flex_messages.get_namecard_flex_msg(card, 'test_id')
print('OK:', msg.alt_text)
"
```

預期：`OK: Kevin Dai 的名片`

- [ ] **Step 4: Commit**

```bash
git add app/flex_messages.py
git commit -m "feat: display mobile and line_id in namecard detail flex message"
```

---

## Task 6: 重構 handle_image_event 支援雙面掃描

**Files:**
- Modify: `app/line_handlers.py`（`handle_image_event` 函式 + 新增 `_save_and_reply_namecard`）

- [ ] **Step 1: 完整替換 handle_image_event（lines 843-904）並新增 _save_and_reply_namecard**

```python
async def handle_image_event(event: MessageEvent, user_id: str) -> None:
    org_id = firebase_utils.ensure_user_org(user_id)
    user_action = user_states.get(user_id, {}).get('action')

    # 下載圖片
    message_content = await line_bot_api.get_message_content(event.message.id)
    image_content = b""
    async for s in message_content.iter_content():
        image_content += s
    img = PIL.Image.open(BytesIO(image_content))

    # 背面掃描模式
    if user_action == 'scanning_back':
        front_data = user_states[user_id].get('front_data', {})
        del user_states[user_id]

        back_result = gemini_utils.generate_json_from_image(img, config.IMGAGE_PROMPT)
        back_obj = utils.parse_gemini_result_to_json(back_result.text)
        if isinstance(back_obj, list):
            back_obj = back_obj[0] if back_obj else {}
        back_obj = {k.lower(): v for k, v in back_obj.items()} if back_obj else {}

        card_obj = utils.merge_namecard_data(front_data, back_obj)
        card_obj = utils.validate_namecard_fields(card_obj)
        await _save_and_reply_namecard(event, user_id, org_id, card_obj)
        return

    # 正面掃描（一般流程）
    result = gemini_utils.generate_json_from_image(img, config.IMGAGE_PROMPT)
    card_obj = utils.parse_gemini_result_to_json(result.text)
    if not card_obj:
        await line_bot_api.reply_message(
            event.reply_token,
            [TextSendMessage(text=f"無法解析這張名片，請再試一次。 錯誤資訊: {result.text}")]
        )
        return

    if isinstance(card_obj, list):
        if not card_obj:
            await line_bot_api.reply_message(
                event.reply_token,
                [TextSendMessage(text="無法解析這張名片，Gemini 回傳了空的資料。")]
            )
            return
        card_obj = card_obj[0]

    card_obj = {k.lower(): v for k, v in card_obj.items()}

    # 暫存正面資料，詢問是否有背面
    user_states[user_id] = {'action': 'scanning_back', 'front_data': card_obj}

    name = card_obj.get('name', 'N/A')
    company = card_obj.get('company', 'N/A')
    await line_bot_api.reply_message(
        event.reply_token,
        [TextSendMessage(
            text=f"✅ 已辨識：{name}（{company}）\n\n這張名片還有背面嗎？",
            quick_reply=QuickReply(items=[
                QuickReplyButton(
                    action=PostbackAction(label="📷 有背面", data="action=scan_back")
                ),
                QuickReplyButton(
                    action=PostbackAction(label="✅ 直接儲存", data="action=save_front")
                ),
            ])
        )]
    )


async def _save_and_reply_namecard(
        event: MessageEvent, user_id: str, org_id: str, card_obj: dict) -> None:
    """驗證、去重、儲存名片並回覆。"""
    existing_card_id = firebase_utils.check_if_card_exists(card_obj, org_id)
    if existing_card_id:
        existing_card_data = firebase_utils.get_card_by_id(org_id, existing_card_id)
        reply_msg = flex_messages.get_namecard_flex_msg(existing_card_data, existing_card_id)
        await line_bot_api.reply_message(
            event.reply_token,
            [TextSendMessage(
                text="這個名片已經存在資料庫中。",
                quick_reply=get_quick_reply_items()
            ), reply_msg],
        )
        return

    card_id = firebase_utils.add_namecard(card_obj, org_id, user_id)
    if card_id:
        reply_msg = flex_messages.get_namecard_flex_msg(card_obj, card_id)
        await line_bot_api.reply_message(
            event.reply_token,
            [reply_msg, TextSendMessage(
                text="名片資料已經成功加入資料庫。",
                quick_reply=get_quick_reply_items()
            )]
        )
    else:
        await line_bot_api.reply_message(
            event.reply_token,
            [TextSendMessage(
                text="儲存名片時發生錯誤。",
                quick_reply=get_quick_reply_items()
            )]
        )
```

- [ ] **Step 2: 確認語法正確**

```bash
python -c "from app import line_handlers; print('handle_image_event OK')"
```

預期：`handle_image_event OK`

- [ ] **Step 3: Commit**

```bash
git add app/line_handlers.py
git commit -m "feat: refactor handle_image_event for dual-side scanning"
```

---

## Task 7: 新增 save_front / scan_back postback 處理

**Files:**
- Modify: `app/line_handlers.py`（`handle_postback_event`）

- [ ] **Step 1: 在 handle_postback_event 的 action 鏈中加入 save_front 和 scan_back**

在 `elif action == 'show_list':` 之前加入：

```python
    elif action == 'save_front':
        state = user_states.get(user_id, {})
        if state.get('action') == 'scanning_back':
            card_obj = state.get('front_data', {})
            del user_states[user_id]
            card_obj = utils.validate_namecard_fields(card_obj)
            await _save_and_reply_namecard(event, user_id, org_id, card_obj)
        else:
            await line_bot_api.reply_message(
                event.reply_token,
                TextSendMessage(
                    text="找不到待儲存的名片資料，請重新掃描。",
                    quick_reply=get_quick_reply_items()
                )
            )
        return

    elif action == 'scan_back':
        if user_states.get(user_id, {}).get('action') == 'scanning_back':
            await line_bot_api.reply_message(
                event.reply_token,
                TextSendMessage(text="請傳送名片背面照片 📷")
            )
        else:
            await line_bot_api.reply_message(
                event.reply_token,
                TextSendMessage(
                    text="找不到待合併的正面資料，請重新掃描。",
                    quick_reply=get_quick_reply_items()
                )
            )
        return
```

- [ ] **Step 2: 確認語法正確**

```bash
python -c "from app import line_handlers; print('postback handlers OK')"
```

預期：`postback handlers OK`

- [ ] **Step 3: Commit**

```bash
git add app/line_handlers.py
git commit -m "feat: add save_front and scan_back postback handlers"
```

---

## Task 8: 重構智慧搜尋為按鈕觸發

**Files:**
- Modify: `app/line_handlers.py`（`handle_postback_event`、`handle_text_event`）

- [ ] **Step 1: 在 handle_postback_event 加入 start_search 和 cancel_search**

在 `save_front` / `scan_back` 之後加入：

```python
    elif action == 'start_search':
        user_states[user_id] = {'action': 'searching'}
        await line_bot_api.reply_message(
            event.reply_token,
            TextSendMessage(
                text="🔍 請輸入姓名、公司或職稱關鍵字：",
                quick_reply=QuickReply(items=[
                    QuickReplyButton(
                        action=PostbackAction(label="❌ 取消", data="action=cancel_search")
                    )
                ])
            )
        )
        return

    elif action == 'cancel_search':
        user_states.pop(user_id, None)
        await line_bot_api.reply_message(
            event.reply_token,
            TextSendMessage(
                text="已取消搜尋。",
                quick_reply=get_quick_reply_items()
            )
        )
        return
```

- [ ] **Step 2: 更新 handle_text_event — 加入 searching state，移除 LLM fallback**

將 `handle_text_event`（lines 291-332）完整替換為：

```python
async def handle_text_event(event: MessageEvent, user_id: str) -> None:
    msg = event.message.text

    # 加入流程優先處理（加入前 user 可能沒有 org）
    if msg.upper().startswith("加入 "):
        await handle_join(event, user_id, msg)
        return

    org_id = firebase_utils.ensure_user_org(user_id)
    user_action = user_states.get(user_id, {}).get('action')

    if user_action == 'adding_memo':
        await handle_add_memo_state(event, user_id, org_id, msg)
    elif user_action == 'editing_field':
        await handle_edit_field_state(event, user_id, org_id, msg)
    elif user_action == 'exporting_csv':
        await handle_export_email_state(event, user_id, org_id, msg)
    elif user_action == 'adding_tag':
        await handle_adding_tag_state(event, user_id, org_id, msg)
    elif user_action == 'searching':
        user_states.pop(user_id, None)
        await handle_smart_query(event, org_id, msg)
    elif msg == "remove":
        firebase_utils.remove_redundant_data(org_id)
        await line_bot_api.reply_message(
            event.reply_token,
            TextSendMessage(
                text="重複名片清理完成。",
                quick_reply=get_quick_reply_items()
            ),
        )
    elif msg in ("團隊", "team"):
        await handle_team_info(event, user_id, org_id)
    elif msg in ("成員", "members"):
        await handle_member_list(event, org_id)
    elif msg in ("邀請", "invite"):
        await handle_invite(event, user_id, org_id)
    elif msg.startswith("設定團隊名稱 "):
        await handle_set_team_name(event, user_id, org_id, msg)
    elif msg in ("標籤", "tags"):
        await handle_show_tags(event, user_id, org_id)
    elif msg in ("匯出", "export"):
        await handle_export(event, user_id, org_id)
    else:
        await line_bot_api.reply_message(
            event.reply_token,
            TextSendMessage(
                text="找不到對應指令，請點下方按鈕操作。",
                quick_reply=get_quick_reply_items()
            )
        )
```

- [ ] **Step 3: 確認語法正確**

```bash
python -c "from app import line_handlers; print('text event refactor OK')"
```

預期：`text event refactor OK`

- [ ] **Step 4: 執行完整測試**

```bash
python -m pytest tests/ -v
```

預期：所有測試 PASS。

- [ ] **Step 5: Commit**

```bash
git add app/line_handlers.py
git commit -m "feat: refactor smart search to button-triggered flow with searching state"
```

---

## 驗收清單（Spec Coverage Check）

| Spec 需求 | 實作 Task |
|----------|---------|
| 雙面掃描 scanning_back state | Task 6 |
| 正面 OCR 後詢問背面 | Task 6 |
| 背面 merge_namecard_data | Task 1, 6 |
| save_front postback | Task 7 |
| scan_back postback | Task 7 |
| searching state | Task 8 |
| start_search / cancel_search postback | Task 8 |
| 移除 smart query fallback | Task 8 |
| 🔍 搜尋名片 quick reply 按鈕 | Task 4 |
| 新增 mobile / line_id OCR | Task 2 |
| ALLOWED_EDIT_FIELDS 更新 | Task 3 |
| FIELD_LABELS 更新 | Task 3 |
| validate_namecard_fields() | Task 1 |
| merge_namecard_data() | Task 1 |
| Flex Message 顯示新欄位 | Task 5 |
