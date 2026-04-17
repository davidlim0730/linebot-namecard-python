## Why

Activities 的 contact_id 欄位已設為必填 FK，代表 Contact 才是 Activity 的主要歸屬。現有 API 路徑以 Deal 為中心（`/deals/{id}/activities`），語意與 Schema 衝突，且缺少 Contact-centric 查詢端點，導致 LIFF 前端無法正確依 Contact 拉取互動歷程。Phase 4 LIFF CRM 上線前需要對齊契約。

## What Changes

- **新增** `GET /api/v1/contacts/{id}/activities` — Contact 主要查詢端點
- **新增** `GET /api/v1/deals/{id}/activities` — Deal convenience 端點（filter by deal_id，response 結構相同）
- **新增** `GET /api/v1/contacts/{id}/actions` — Contact 維度的待辦查詢端點
- **調整** `GET /api/v1/contacts/{id}/crm` response schema — 明確標注 `contact` 欄位（現有 `card` fallback 保留但標為 deprecated）
- **補全 OpenAPI spec** — 所有 CRM endpoints 加入完整 request/response schema，供 Mock Server 與 LIFF 前端使用

## Capabilities

### New Capabilities
- `contact-activities-api`: Contact 為中心的 Activities CRUD 端點（list by contact_id，可選 filter by deal_id）
- `contact-actions-api`: Contact 為中心的 Actions 查詢端點（list pending/all by contact_id）
- `crm-openapi-spec`: 完整 CRM API OpenAPI 3.0 contract（含所有現有端點補齊 schema）

### Modified Capabilities
- `card-actions`: card-centric 查詢行為改為 contact-centric（`/contacts/{id}/crm` response 欄位語意調整）

## Impact

- **後端**: `app/api/crm.py` 新增兩個路由；`app/repositories/activity_repo.py`、`app/repositories/action_repo.py` 已有 `list_by_contact_id`，直接可用
- **LIFF 前端**: `ContactCrm.js` activities 來源改用新端點；`api.js` 新增對應 fetch function
- **Mock Server**: 根據 OpenAPI spec 生成，供前端開發離線使用
- **Non-goals**: 不修改 Activity/Action 資料模型、不做分頁（MVP 規模）、不改動 LINE Chat 指令邏輯
- **Roadmap**: Phase 4 Conversational CRM — API 契約補完
