## 1. 後端：新增 Contact-centric 端點

- [ ] 1.1 在 `app/api/crm.py` 新增 `GET /contacts/{contact_id}/activities` 端點（呼叫 `activity_repo.list_by_contact_id`，支援 optional `?deal_id=` query param）
- [ ] 1.2 在 `app/api/crm.py` 新增 `GET /contacts/{contact_id}/actions` 端點（呼叫 `action_repo.list_by_contact_id`，支援 optional `?status=` query param）
- [ ] 1.3 確認 `GET /deals/{deal_id}/activities` 回傳格式與新端點一致（目前已存在，確認 response schema 相同即可）
- [ ] 1.4 執行 `flake8 app/api/crm.py` 確認無新增 lint 錯誤
- [ ] 1.5 commit: `feat(api): add contact-centric activities and actions endpoints`

## 2. 後端：測試

- [ ] 2.1 在 `tests/test_crm_api.py`（或新建）新增 `GET /contacts/{id}/activities` 的 unit test（mock `activity_repo.list_by_contact_id`）
- [ ] 2.2 新增 `GET /contacts/{id}/actions` 的 unit test
- [ ] 2.3 新增 `?deal_id=` filter 的 unit test
- [ ] 2.4 執行 `pytest tests/` 確認全部通過
- [ ] 2.5 commit: `test(api): add tests for contact activities and actions endpoints`

## 3. OpenAPI Spec

- [ ] 3.1 建立 `openspec/specs/crm-openapi-spec/openapi.yaml`，包含所有 CRM endpoints 的完整 OpenAPI 3.0 定義（參考 spec.md 的端點清單）
- [ ] 3.2 確保新端點 `/contacts/{contact_id}/activities` 與 `/contacts/{contact_id}/actions` 有完整 schema 定義（含 query params 與 response examples）
- [ ] 3.3 用 `openapi-spec-validator openspec/specs/crm-openapi-spec/openapi.yaml` 驗證無錯誤（需 `pip install openapi-spec-validator`）
- [ ] 3.4 commit: `docs(api): add OpenAPI 3.0 spec for CRM endpoints`

## 4. LIFF 前端：api.js 新增 fetch functions

- [ ] 4.1 在 `app/liff_app/api.js` 新增 `listContactActivities(contactId, dealId = null)` function
- [ ] 4.2 在 `app/liff_app/api.js` 新增 `listContactActions(contactId, status = null)` function
- [ ] 4.3 commit: `feat(liff): add contact activities and actions API functions`

## 5. LIFF 前端：ContactCrm.js 使用新端點

- [ ] 5.1 在 `app/liff_app/views/ContactCrm.js` 將 activities 來源從 `getContactCrm()` inline response 改為獨立呼叫 `listContactActivities(contactId)`
- [ ] 5.2 在 ContactCrm 視圖新增 Actions 區塊（呼叫 `listContactActions(contactId, "pending")`），顯示該聯絡人的待辦清單
- [ ] 5.3 手動測試：開啟 LIFF `#/contacts/{id}/crm`，確認 activities 與 pending actions 正確顯示
- [ ] 5.4 commit: `feat(liff): ContactCrm uses contact-centric endpoints, adds actions section`

## 6. 部署

- [x] 6.1 部署測試機：`gcloud builds submit --tag gcr.io/linebot-namecard-488409/linebot-namecard:latest . && gcloud run deploy linebot-namecard ...`
- [ ] 6.2 在 LINE 開啟 LIFF 測試機確認 ContactCrm 頁面正常
- [ ] 6.3 確認通過後部署正式機：`gcloud run deploy linebot-namecard-prod ...`
