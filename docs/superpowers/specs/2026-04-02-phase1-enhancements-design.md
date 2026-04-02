# Phase 1 Enhancement Design — 雙面掃描、智慧搜尋重構、新欄位

**Date:** 2026-04-02  
**Status:** Approved

---

## Overview

三項 Phase 1 功能強化，針對真實使用情境中最常見的痛點：

1. **雙面名片掃描**：整合正反面資訊，避免遺漏背面欄位
2. **智慧搜尋重構**：改為按鈕觸發，避免與其他文字指令衝突
3. **新增欄位 + 格式驗證**：新增 `mobile`、`line_id`，並對 `phone`、`email` 加入條件驗證

---

## 1. 雙面名片掃描

### State Machine

新增 `scanning_back` state：

```python
user_states[user_id] = {
    'action': 'scanning_back',
    'front_data': { ...gemini OCR result... }  # 正面暫存
}
```

### 完整流程

```
用戶傳圖片（image event）
  → Gemini OCR 正面
  → 顯示摘要（name + company）
  → Quick Reply 按鈕：「📷 有背面」| 「✅ 直接儲存」

[有背面路徑]
  → 設定 user_states scanning_back，front_data 暫存正面 OCR 結果
  → Bot 回覆：「請傳送名片背面照片」
  → 用戶傳第二張圖（image event）
  → handle_image_event 偵測 scanning_back state
  → Gemini OCR 背面
  → merge_namecard_data(front_data, back_data)
  → validate_namecard_fields(merged)
  → check_if_card_exists → add_namecard
  → 顯示完整名片 Flex Message
  → 清除 state

[直接儲存路徑]
  → postback action=save_front
  → validate_namecard_fields(front_data)
  → check_if_card_exists → add_namecard
  → 顯示完整名片 Flex Message
```

### 合併邏輯 `merge_namecard_data(front, back)`

- 以正面資料為主
- 背面欄位**只補充**正面為 `N/A` 的欄位
- 不用背面覆蓋正面已有的資料，避免背面文字（如廣告語）破壞正面正確值

### 新增 Postback Actions

| Action | 觸發時機 | 行為 |
|--------|---------|------|
| `save_front` | 用戶點「✅ 直接儲存」 | 跳過雙面流程，直接驗證並儲存正面資料 |

---

## 2. 智慧搜尋重構

### 核心改變

**Before：** 任何非指令文字 → fallback LLM 搜尋（與其他功能打架）  
**After：** 必須先點按鈕或進入 searching state 才觸發搜尋

### State 新增

```python
user_states[user_id] = {'action': 'searching'}
```

### Quick Reply 按鈕變更

`get_quick_reply_items()` 加入：
- **「🔍 搜尋名片」** → postback `action=start_search`

### 完整流程

```
用戶點「🔍 搜尋名片」
  → handle_postback_event: action=start_search
  → 設定 user_states searching
  → Bot 回覆：「請輸入姓名、公司或職稱關鍵字：」（帶 quick reply「❌ 取消」）

用戶輸入關鍵字
  → handle_text_event 偵測 searching state
  → 清除 state
  → 呼叫 handle_smart_query(keyword)（現有 LLM 搜尋邏輯不變）
  → 顯示結果

用戶點「❌ 取消」（或 postback action=cancel_search）
  → 清除 state
  → Bot 回覆：「已取消搜尋」+ quick reply

其他文字訊息（無 state）
  → 不再 fallback LLM 搜尋
  → 回覆：「找不到對應指令，請點下方按鈕操作」+ quick reply
```

---

## 3. 新增欄位 + 格式驗證

### 新增欄位

| 欄位 | 類型 | 說明 | 驗證規則 |
|------|------|------|---------|
| `mobile` | string | 行動電話（09 開頭或國際格式） | `^(\+?886\|0)9\d{8}$` 或 `N/A` |
| `line_id` | string | LINE ID（名片上常見 `LINE:` 或 `ID:`） | `^[a-zA-Z0-9._]{4,20}$` 或 `N/A` |

### 現有欄位補驗證

| 欄位 | 驗證規則 |
|------|---------|
| `phone` | `^(\+?886\|0)[2-9]\d{6,8}(#\d+)?$` 或 `N/A` |
| `email` | 標準 email regex：`^[^@\s]+@[^@\s]+\.[^@\s]+$` 或 `N/A` |

### 驗證函式 `validate_namecard_fields(card: dict) -> dict`

- 位置：`app/utils.py`
- 驗證時機：OCR 完成後、merge 完成後，儲存 Firebase 前統一呼叫
- 行為：欄位格式不符時設為 `N/A`（不拋例外，確保流程不中斷）

### Gemini OCR Prompt 更新

新增 `mobile`、`line_id` 欄位說明：

```
這是一張名片，你是一個名片秘書。請將以下資訊整理成 json 給我。
如果看不出來的，幫我填寫 N/A。
只回傳 json 就好：name, title, address, email, phone（市話/辦公室電話）,
mobile（行動電話，09 開頭或 +886 9 開頭）, line_id（LINE ID，名片上常見 LINE: 或 ID:），company。
phone 與 mobile 是不同欄位，請分開填寫。
```

### 受影響的其他模組

| 模組 | 變更 |
|------|------|
| `firebase_utils.py` `ALLOWED_EDIT_FIELDS` | 加入 `mobile`、`line_id` |
| `flex_messages.py` 名片詳細 Flex | 加入 mobile、LINE ID 列，值為 `N/A` 時不顯示該列 |
| `flex_messages.py` 名片摘要（carousel） | 視空間決定是否顯示 mobile |

---

## 受影響檔案總覽

| 檔案 | 變更類型 |
|------|---------|
| `app/line_handlers.py` | 新增 scanning_back / searching state 處理；image event 流程改造；postback 新增 save_front / start_search / cancel_search；text event fallback 移除 |
| `app/utils.py` | 新增 `validate_namecard_fields()`、`merge_namecard_data()` |
| `app/gemini_utils.py` | 更新 OCR prompt（或 config.py IMGAGE_PROMPT） |
| `app/config.py` | 更新 `IMGAGE_PROMPT` |
| `app/firebase_utils.py` | `ALLOWED_EDIT_FIELDS` 加入新欄位 |
| `app/flex_messages.py` | 名片詳細與摘要 Flex 加入新欄位顯示邏輯 |

---

## 不在此範圍內（Out of Scope）

- 現有名片資料的 backfill（舊資料缺少 mobile/line_id 欄位屬於正常，顯示為空白）
- 雙面掃描的 timeout 處理（state 卡住問題屬於已知 Cloud Run 重啟限制，不在此次解決）
- 搜尋結果排序優化
