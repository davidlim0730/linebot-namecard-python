## 1. Flex Messages 重構

- [x] 1.1 在 `app/flex_messages.py` 中建立 `get_onboarding_welcome_message()` 函式
  - 提取現有 onboarding Quick Reply 邏輯（目前在 `check_onboarding` 中），改為獨立的 message builder
  - 回傳 LINE Quick Reply 物件，包含文字「歡迎使用名片管理機器人 👋 請先選擇「建立團隊」或是「加入既有團隊」」+ 2 個按鈕

## 2. 更新現有 Onboarding 攔截邏輯

- [x] 2.1 在 `app/line_handlers.py` 的 `check_onboarding` 函式中，將訊息內容改為呼叫 `flex_messages.get_onboarding_welcome_message()`
  - 確保現有的 text / image / postback 事件的攔截仍正常運作（功能不變，只是改用共用的 message builder）

## 3. Follow Event Handler 實作

- [x] 3.1 在 `app/main.py` 的 webhook 路由中新增 Follow event 類型判斷
  - 新增 `elif isinstance(event, FollowEvent):` 分支
  - 呼叫 `await handle_follow_event(event)`

- [x] 3.2 在 `app/line_handlers.py` 中實作 `handle_follow_event` 函式
  - 提取 `event.source.user_id` 和 `event.reply_token`
  - 呼叫 `line_bot_api.push_message(user_id, flex_messages.get_onboarding_welcome_message())`
  - 加入 try/except：失敗時記錄 error log，但不讓 webhook 返回 error

- [x] 3.3 確保 LINE Bot SDK 的 import 包含 `FollowEvent`（應已在現有 import 中）

## 4. 測試與驗證（手動）

- [x] 4.1 本地啟動 Bot (`uvicorn app.main:app --host=0.0.0.0 --port=8080`)

- [x] 4.2 在 LINE 手機端 Follow 官方帳號，確認立即收到歡迎訊息（不需要傳任何訊息）

- [x] 4.3 點選歡迎訊息中的「🏢 建立團隊」，確認進入建立 org 流程

- [x] 4.4 Follow 新帳號後不點 Quick Reply，直接傳文字訊息，確認 `check_onboarding` 攔截仍正常運作（再次顯示 onboarding 訊息）

- [x] 4.5 確認既有用戶（已有 org）的正常使用流程不受影響（掃描、搜尋等）

## 5. 部署

- [x] 5.1 執行 `gcloud builds submit --tag gcr.io/linebot-namecard-488409/linebot-namecard`

- [x] 5.2 執行 `gcloud run deploy linebot-namecard --image gcr.io/linebot-namecard-488409/linebot-namecard --platform managed --region asia-east1 --allow-unauthenticated --env-vars-file env.yaml`

- [x] 5.3 部署完成後，在手機上 Follow Bot 新帳號，驗證生產環境的 Follow event 流程正常
