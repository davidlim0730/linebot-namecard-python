## Why

新用戶發送任何訊息都會立即被 `ensure_user_org` 建立個人組織，導致之後無法輸入邀請碼加入他人的團隊。此問題阻礙 Phase 2 Pilot 的 onboarding 流程，需在 Pilot 啟動前修復。

## What Changes

- 新增 `check_onboarding` helper：在三個事件 handler 入口攔截無 org 的新用戶，回覆「建立團隊 / 加入既有團隊」Quick Reply 選擇訊息
- `handle_text_event`、`handle_image_event`、`handle_postback_event` 在呼叫 `ensure_user_org` 前先執行 onboarding 攔截
- 新增 `action=create_org` postback handler：用戶選擇「建立團隊」後才建立 org（用戶為 admin）
- `加入 <code>` 文字指令維持原有行為，不受攔截影響

## Capabilities

### New Capabilities

- `onboarding-flow`: 新用戶首次互動時的組織選擇流程，確保用戶在使用任何功能前明確選擇「建立團隊」或「加入既有團隊」

### Modified Capabilities

（無既有 spec 需異動）

## Impact

- **app/line_handlers.py**：新增 `check_onboarding`，修改三個 handler 入口，新增 `create_org` postback handler
- **Firebase RTDB**：無 schema 變更，`user_org_map` 資料結構維持不變
- **既有用戶**：零影響，`get_user_org_id` 回傳有效 org_id 時直接跳過攔截

## Non-goals

- 多 org 支援（一個用戶加入多個團隊）：留給後續獨立設計
- 團隊管理 LIFF：Phase 3
- Welcome Message 設定：LINE Official Account 後台操作，不在程式碼範圍內

## Phase

Phase 2 — 團隊化 Pilot
