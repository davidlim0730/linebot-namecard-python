## 1. 資產準備

- [x] 1.1 設計並產製 Rich Menu 圖片（2500×843px，3 格橫向版型，標示「名片操作」/「團隊功能」/「資料與設定」）
- [x] 1.2 將圖片放入 `assets/rich_menu_main.png`，並加入 `.dockerignore` 白名單（確保打包進 Docker image）

## 2. Rich Menu 初始化模組

- [x] 2.1 建立 `app/rich_menu_utils.py`，實作 `init_rich_menu()` 函式
- [x] 2.2 在 `init_rich_menu()` 中實作冪等檢查：先呼叫 LINE API 查詢現有 Rich Menu list，若 alias `rich-menu-main` 已存在則直接 return
- [x] 2.3 實作 Rich Menu 建立邏輯：定義 3 個 tap area（各對應 PostbackAction `action=menu_card/menu_team/menu_data`）
- [x] 2.4 實作圖片上傳：讀取 `assets/rich_menu_main.png` 並呼叫 LINE Upload Rich Menu Image API
- [x] 2.5 將建立的 Rich Menu 設為 Bot 預設選單（link to bot）

## 3. FastAPI 啟動 Hook

- [x] 3.1 在 `app/main.py` 的 lifespan startup 事件中呼叫 `rich_menu_utils.init_rich_menu()`
- [x] 3.2 加入 try/except：Rich Menu 初始化失敗時只記錄 warning log，不影響 Bot 主要功能啟動

## 4. Postback Handler 路由

- [x] 4.1 在 `app/line_handlers.py` 的 `handle_postback_event` 中新增 `menu_card`、`menu_team`、`menu_data` 的 action 路由
- [x] 4.2 實作 `handle_menu_card(reply_token)`：回覆文字訊息 + Quick Reply（按鈕：「新增名片」MessageAction→`新增`、「批量上傳」MessageAction→`批量`、「智慧搜尋」PostbackAction→`action=menu_search_prompt`、「管理名片」MessageAction→`管理`）；預期訊息：「請選擇名片操作 👇」+ 4 個 Quick Reply 按鈕
- [x] 4.3 實作 `handle_menu_team(reply_token)`：回覆文字訊息 + Quick Reply（按鈕：「查看團隊資訊」MessageAction→`team`、「查看成員」MessageAction→`members`、「邀請成員」MessageAction→`invite`、「加入團隊」PostbackAction→`action=menu_join_prompt`）；預期訊息：「請選擇團隊功能 👇」+ 4 個 Quick Reply 按鈕
- [x] 4.4 實作 `handle_menu_data(reply_token)`：回覆文字訊息 + Quick Reply（按鈕：「匯出 CSV」MessageAction→`匯出`、「Sheets 同步狀態」PostbackAction→`action=menu_sheets_status`）；預期訊息：「請選擇資料功能 👇」+ 2 個 Quick Reply 按鈕
- [x] 4.5 實作 `action=menu_search_prompt` handler：回覆提示訊息「請輸入關鍵字搜尋名片，例如：王小明、ABC 公司」
- [x] 4.6 實作 `action=menu_join_prompt` handler：回覆提示訊息「請輸入邀請碼，格式：加入 <邀請碼>」
- [x] 4.7 實作 `action=menu_sheets_status` handler：回覆目前 Google Sheets 同步是否啟用（依 `GOOGLE_SHEET_ID` env var 是否設定）

## 5. Quick Reply 樣板

- [x] 5.1 在 `app/flex_messages.py` 新增 `build_quick_reply(items)` 輔助函式，接受 `[{label, action_type, data/text}]` list 回傳 LINE QuickReply 物件

## 6. 驗證與部署

- [x] 6.1 本地啟動 `uvicorn`，透過 LINE 手機確認 Rich Menu 出現在聊天畫面（手動）
- [x] 6.2 測試三個主選單按鈕各自觸發正確的 Quick Reply（手動）
- [x] 6.3 測試 Quick Reply 中各按鈕是否正確對應既有功能（新增、team、匯出等）（手動）
- [x] 6.4 確認既有 postback action（edit、delete、batch_start）不受影響（手動）
- [x] 6.5 執行 `gcloud builds submit` + `gcloud run deploy` 部署至 Cloud Run（手動）
