# LIFF 化架構設計

**日期**：2026-04-13  
**狀態**：已核准，待實作

---

## Context

現有系統是純 LINE Bot 對話介面，所有操作透過文字指令和 Postback 完成。Phase 3 目標是加入 LIFF Web 介面，讓用戶可以透過表單式 UI 操作名片編輯、標籤管理、團隊管理，同時保留原有對話介面（**雙介面並行，不是取代**）。

驅動力：
- 體驗改善：多欄位編輯、多選標籤等操作在純對話介面摩擦太高
- 功能需求：進階篩選、CSV 匯出、團隊管理等需要 Web UI
- SaaS 基礎：統一 API layer 為未來計費、方案限制、CRM 串接打基礎

專案狀態分類（依 AI-Assisted Architect Methodology）：**Brownfield**。現有系統在生產環境運行，LIFF 是在既有系統上加功能，遵循 map before modify 原則。

---

## 架構方向：Modular Monolith

```
app/
├── api/
│   ├── webhook.py          ← LINE webhook（現在的 main.py 路由部分）
│   ├── liff.py             ← LIFF API endpoints（/api/v1/...）
│   └── internal.py         ← Cloud Tasks callback（/internal/）
│
├── services/
│   ├── card_service.py     ← 名片 CRUD、OCR、去重
│   ├── org_service.py      ← 組織、成員、邀請碼
│   ├── tag_service.py      ← 標籤管理
│   └── auth_service.py     ← LINE token 驗證、JWT 發行
│
├── repositories/
│   ├── card_repo.py        ← Firebase 名片讀寫
│   ├── org_repo.py         ← Firebase 組織讀寫
│   └── state_repo.py       ← user_states（未來可換 Redis）
│
├── handlers/               ← LINE 事件 handler（薄層）
│   ├── text_handler.py
│   ├── image_handler.py
│   └── postback_handler.py
│
├── liff_app/               ← LIFF 前端（Vue 3 SPA）
│
├── models/
│   ├── card.py             ← Pydantic Card model
│   └── org.py              ← Pydantic Org model
│
└── main.py                 ← FastAPI 初始化 + router 掛載
```

**依賴方向（單向）：**
```
handlers / liff API → services → repositories → Firebase SDK
```

外層可依賴內層，內層不知道外層存在。`services/` 不 import 任何 LINE SDK。

---

## 關鍵設計決定

### 1. 雙介面並行，獨立 State

LINE 對話和 LIFF 並行，`user_states`（state machine）維持現狀，LIFF 是無狀態 REST。兩個介面共用同一個 service layer。

| 功能 | LINE 對話 | LIFF |
|------|-----------|------|
| 名片掃描 OCR | ✓ 主入口 | — |
| 批量上傳 | ✓ 保留 | — |
| 快速搜尋 | ✓ 保留 | ✓ 進階篩選 |
| 名片編輯 | ✓ 保留（單欄） | ✓ 全欄表單 |
| 標籤管理 | ✓ 基本 | ✓ 多選介面 |
| 團隊管理 | ✓ 邀請碼流程 | ✓ 完整管理介面 |
| CSV 匯出 | ✓ 觸發 | ✓ 進階篩選匯出 |

### 2. Firebase RTDB 維持不動

不遷移 Firestore。Repository Pattern 隔離 Firebase 細節，未來遷移只改 `repositories/` 層，不影響 services 和 API。

標籤存於 `namecard_cache/{card_id}/roles`，card_repo 負責合併，不外漏到 API 層。

### 3. LIFF 認證：LINE id_token → JWT

```
LIFF App
  → liff.getIDToken()
  → POST /api/auth/token { id_token }
  → 後端呼叫 LINE API 驗證
  → 查 user_org_map 取得 org_id + role
  → 簽發 JWT { user_id, org_id, role, exp: +1hr }
  → 後續 API 帶 Bearer JWT
```

FastAPI Dependency：
```python
async def get_current_user(token: str = Depends(oauth2_scheme)) -> UserContext:
    payload = verify_jwt(token)
    return UserContext(user_id=..., org_id=..., role=...)
```

### 4. 現階段 LIFF，未來 LINE Login

現在從 LINE Bot 按鈕開啟 LIFF，用 `liff.getIDToken()` 無感登入。未來 SaaS Web 版加 LINE Login OAuth flow，後端驗證邏輯相同，只差前端取 token 的方式。

---

## API Contract

### 認證
```
POST /api/auth/token
Body:  { "id_token": "eyJ..." }
200:   { "access_token": "eyJ...", "expires_in": 3600 }
401:   { "error": "invalid_token" }
```

### 名片
```
GET    /api/v1/cards                    ← 列表（?search=&tag=&page=&limit=）
GET    /api/v1/cards/{card_id}          ← 詳情
PUT    /api/v1/cards/{card_id}          ← 編輯
DELETE /api/v1/cards/{card_id}          ← 刪除
```

### 標籤
```
GET    /api/v1/tags                     ← 組織所有標籤
POST   /api/v1/tags                     ← 新增標籤
POST   /api/v1/cards/{card_id}/tags     ← 替換名片標籤組（body: { tag_ids: [] }）
```

### 組織（Admin only）
```
GET    /api/v1/org                      ← 組織資訊
GET    /api/v1/org/members              ← 成員列表
PATCH  /api/v1/org/members/{user_id}    ← 更新角色
POST   /api/v1/org/invite               ← 產生邀請碼
```

### CSV 匯出
```
POST   /api/v1/export/csv               ← 觸發匯出（body: filters + format）
GET    /api/v1/export/csv/{job_id}      ← 查詢狀態 / 取下載連結
```

**錯誤格式統一：** `{ "error": "error_code", "message": "說明" }`

**70% Primary Flow（優先驗證）：**
```
開啟 LIFF → 認證 → 名片列表 → 名片詳情 → 編輯 → 儲存
```

---

## 遷移策略（分階段，不中斷服務）

| Phase | 內容 | 完成標準 |
|-------|------|----------|
| A | 補核心 flow 整合測試 | CI 綠燈，重構有安全網 |
| B | 抽 Repository layer | `firebase_utils` 所有讀寫透過 repo，行為不變 |
| C | 抽 Service layer | LINE Bot 所有功能正常，handler 不直接碰 Firebase |
| D | 精簡 Handler（拆檔） | 每個 handler < 200 行 |
| E | 加 LIFF API endpoints | 所有 endpoint 有測試，認證正常 |
| F | LIFF 前端（Vue 3） | Primary flow 可用 |

---

## 環境策略

LIFF URL 必須在 LINE Developers Console 事先登錄，每個環境 LIFF ID 不同，無法用 env var 解決。

| | 測試環境 | 正式環境 |
|---|---|---|
| LINE Channel | 新開一個 | 現有 |
| Firebase Project | 新開一個 | 現有 |
| LIFF ID | 各自登錄 | 各自登錄 |
| Cloud Run | 另一個 service | 現有 |
| JWT Secret | 不同 env var | 不同 env var |

**一次性設定待辦：**
- [ ] LINE Developers Console 新開測試 Channel
- [ ] Firebase Console 新開測試 project
- [ ] Cloud Run 新增測試 service
- [ ] `.env.test` / `.env.prod` 環境變數分離

---

## 關鍵檔案

**需修改：**
- `app/main.py` — router 掛載重構
- `app/line_handlers.py` — 拆分為 handlers/ + services/
- `app/firebase_utils.py` — 包裝為 repositories/
- `app/bot_instance.py` — user_states 移至 state_repo
- `tests/` — 補整合測試

**新增：**
- `app/api/liff.py`, `app/api/webhook.py`, `app/api/internal.py`
- `app/services/card_service.py`, `org_service.py`, `tag_service.py`, `auth_service.py`
- `app/repositories/card_repo.py`, `org_repo.py`, `state_repo.py`
- `app/models/card.py`, `org.py`
- `app/liff_app/`（Vue 3 SPA）

---

## 驗證方式

1. **Phase A–D**：現有 LINE Bot 所有功能正常，`pytest` 全過
2. **Phase E**：curl 打 `/api/auth/token` 取 JWT，再打 `/api/v1/cards` 驗證資料正確
3. **Phase F**：在 LINE App 開啟 LIFF URL，完成 primary flow（列表→詳情→編輯→儲存），LINE 對話介面功能不受影響
