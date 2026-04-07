## Why

智慧名片管家已完成 Phase 1-3 功能（OCR、搜尋、標籤、CSV 匯出），所有用戶皆免費使用，無營收模式。需建立免費試用機制實現 PLG 轉換：新組織自動開通 7 天 / 50 張 / 3 人試用，觸頂時引導升級為付費方案。此為商業化第一步（Phase 4 前置）。

## Non-goals

- 不實作自動付款流程（升級導向 LINE OA 人工處理）
- 不做多方案分層（僅 `trial` / `pro`）
- 不做試用期延長後台
- 不做用量警告推播

## What Changes

- **新增試用期自動開通**：`create_org` 時寫入 `plan_type=trial`、`trial_ends_at=now+7d`、`usage.scan_count=0`
- **新增集中式權限檢查**：`check_org_permission(org_id, action_type)` 統一判斷掃描/邀請是否允許
- **新增精準計數**：`increment_scan_count` 使用 Firebase Transaction 防止 race condition
- **新增付費牆 UI**：兩種 Flex Message（超量 / 過期），含升級按鈕（URIAction → LINE OA）
- **新增歡迎試用推播**：新組織建立時推送 onboarding 訊息
- **修改批量上傳防護**：`batch_processor` 迴圈中每張前檢查額度，超量立即中斷
- **祖父條款**：舊組織無 `plan_type` 預設為 `pro`，不受限制

## Capabilities

### New Capabilities

- `trial-lifecycle`: 試用期自動開通、到期判定、祖父條款（plan_type 狀態管理）
- `usage-quota`: 掃描計數（Transaction）、額度檢查、批量防超刷
- `paywall-ui`: 付費牆 Flex Message（超量/過期兩種）、升級按鈕、歡迎試用推播

### Modified Capabilities

_(無既有 spec 需修改)_

## Impact

**Firebase RTDB schema 變更**：
- `organizations/{org_id}/` 新增欄位：`plan_type`、`trial_ends_at`、`usage.scan_count`

**受影響程式碼**：
- `app/firebase_utils.py` — `create_org`、`ensure_user_org`、新增 `check_org_permission`、`increment_scan_count`
- `app/batch_processor.py` — 迴圈內額度檢查
- `app/line_handlers.py` — 圖片/邀請入口權限檢查、onboarding 推播
- `app/flex_messages.py` — 新增付費牆與歡迎訊息
- `app/config.py` — 新增 `LINE_OA_ID` env var

**新增 env var**：`LINE_OA_ID`（選用，付費牆升級按鈕用）
