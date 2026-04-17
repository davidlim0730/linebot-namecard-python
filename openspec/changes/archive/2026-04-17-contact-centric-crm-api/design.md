## Context

**現有後端狀態（`app/api/crm.py`）：**

| Endpoint | 狀態 | 說明 |
|---|---|---|
| `GET /api/v1/deals/{id}/activities` | ✅ 存在 | 直接回傳 activity list，但無獨立 contact filter |
| `GET /api/v1/contacts/{id}/crm` | ✅ 存在 | 回傳 contact + deals + activities（批次查詢） |
| `GET /api/v1/contacts/{id}/activities` | ❌ 缺 | 需新增 |
| `GET /api/v1/contacts/{id}/actions` | ❌ 缺 | 需新增 |

**Repo 層已就緒：**
- `activity_repo.list_by_contact_id(org_id, contact_id)` ✅
- `action_repo.list_by_contact_id(org_id, contact_id)` ✅

新增端點只需加路由，無需改 repo 或 service。

## Goals / Non-Goals

**Goals:**
- 新增 `GET /contacts/{id}/activities` 與 `GET /contacts/{id}/actions` 兩個端點
- 確保 `GET /deals/{id}/activities` 的 response schema 與前者一致
- 輸出完整 OpenAPI 3.0 spec（YAML），供 Mock Server 使用
- LIFF `api.js` 新增對應 fetch function

**Non-Goals:**
- 不修改 Activity/Action Pydantic model 欄位
- 不做 pagination（MVP 規模，每個 org 資料量小）
- 不改動 LINE Chat 指令邏輯
- 不遷移現有 `/contacts/{id}/crm` 端點（保持向後相容）

## Decisions

### 決策 1：`/deals/{id}/activities` 保留但語意調整

**選擇**：保留現有端點，後端實作改為 `activity_repo.list_by_deal_id`（現已存在），response schema 對齊 `/contacts/{id}/activities`。

**理由**：LIFF `DealDetail.js` 目前透過 `getDeal()` response inline activities，但獨立端點對未來需求更彈性（lazy loading、重新整理）。現在補上不破壞現有行為。

**替代方案**：移除此端點，全靠 `getDeal()` inline。→ 拒絕，因為 LIFF 需要獨立 refresh。

### 決策 2：`/contacts/{id}/activities` 為主要端點

**選擇**：`contact_id` 是 primary key，`deal_id` 可作 query param filter。

```
GET /api/v1/contacts/{id}/activities?deal_id=xxx  # optional filter
```

**理由**：Schema 中 `activity.contact_id` 必填，`deal_id` 選填。主從關係明確。

### 決策 3：OpenAPI spec 格式

**選擇**：OpenAPI 3.0 YAML，存放於 `openspec/specs/crm-openapi-spec/spec.md`（Markdown code block 包裹）。

**理由**：與現有 openspec 結構一致；YAML 比 JSON 易讀易維護。

## Risks / Trade-offs

- **[Risk] Firebase 全表掃描**：`list_by_contact_id` 需掃整個 org 的 activities。→ Mitigation：MVP 規模可接受，未來可加 Firebase index。
- **[Risk] `contact_id` 可能為 null（舊資料）**：migration script 已補填，但仍有邊緣案例。→ Mitigation：端點回傳空陣列，不報錯。
- **[Trade-off] `/contacts/{id}/crm` 與新端點重疊**：`/contacts/{id}/crm` 已回傳 activities，新端點是子集。→ 可接受，兩者用途不同（CRM 視角 vs. 獨立 activities stream）。

## Migration Plan

1. 新增後端路由（`app/api/crm.py`）— 不影響現有端點
2. 更新 `app/liff_app/api.js` 新增 fetch functions
3. 更新 `ContactCrm.js` 使用新端點（原 `getContactCrm` 保留作 fallback）
4. 輸出 OpenAPI YAML → 交設計師/前端做 Mock Server

Rollback：新端點純新增，回滾只需移除路由，無資料風險。

## Open Questions

- Mock Server 工具確認（Prism / Mockoon / 其他）？→ 由前端同事決定，OpenAPI spec 輸出後交接。
