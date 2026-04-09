## Context

Bot 目前只有文字指令介面。用戶需要記憶指令（如「新增」、「匯出」、「成員」），對新用戶不友善。LINE Rich Menu 是 LINE 官方提供的持久性底部選單機制，可提升功能可見度，適合做為主要 UI 入口。

本次實作採用「主選單 → Quick Reply 次級選單」的兩層導覽結構，並完全保留文字指令作為快速操作路徑。

## Goals / Non-Goals

**Goals:**
- 建立 3 按鈕 Rich Menu（名片操作 / 團隊功能 / 資料與設定）
- 每個按鈕觸發 Quick Reply 次級選單，對應現有功能指令或 Postback action
- Bot 啟動時自動初始化 Rich Menu（idempotent）
- 不破壞現有文字指令流程

**Non-Goals:**
- 依用戶角色動態切換 Rich Menu（管理員 vs 一般成員）
- Help 選單（第一版省略）
- Rich Menu 圖片的自動化生成（圖片由設計師提供，手動上傳）
- 多語言 Rich Menu

## Decisions

### 1. 初始化時機：啟動時 vs 手動指令

**決定**：在 `app/main.py` 的 FastAPI lifespan 事件中初始化 Rich Menu（`startup` hook）。

**理由**：Cloud Run 每次冷啟動都會執行，確保 Rich Menu 始終存在。實作 idempotent 檢查（先查詢現有 Rich Menu，若已存在同名則跳過建立），避免重複建立。

**替代方案**：管理員文字指令手動觸發 → 需要額外入口，運維複雜度高。

### 2. Rich Menu 圖片管理

**決定**：Rich Menu 圖片（2500×1686px）由設計師產製後，以 base64 或本地檔案方式在 `rich_menu_utils.py` 初始化時上傳。圖片 ID 快取在 memory（不存 Firebase）。

**理由**：Rich Menu 圖片極少變動，無需持久化儲存圖片 ID。冷啟動時重新上傳即可（LINE API 支援）。

**替代方案**：存圖片 ID 到 Firebase → 增加 RTDB 複雜度，非必要。

### 3. Quick Reply 觸發機制

**決定**：Rich Menu 按鈕使用 `PostbackAction`（`action=menu_card` / `action=menu_team` / `action=menu_data`），postback handler 回覆帶有 Quick Reply 的文字訊息。

**理由**：Postback action 與現有 `handle_postback_event` 架構一致，不需新增 handler 類型。Quick Reply 按鈕再次使用 PostbackAction 或 MessageAction 觸發現有流程。

### 4. 模組化：獨立 `rich_menu_utils.py`

**決定**：所有 Rich Menu API 呼叫（create、upload image、link、get）封裝在 `app/rich_menu_utils.py`，不放在 `line_handlers.py`。

**理由**：符合現有 utils 分離慣例（`firebase_utils`、`gemini_utils`），保持 handlers 專注於事件路由。

## Risks / Trade-offs

- **LINE API 配額限制** → Rich Menu 每個 Bot 最多 20 個，初始化前先清理舊有選單。
- **冷啟動延遲** → Rich Menu 上傳圖片可能增加 1-2 秒冷啟動時間 → 以 idempotent 檢查減少重複上傳。
- **圖片資產管理** → 圖片需隨 Docker image 打包或以 URL 形式提供 → 第一版將圖片放入 `assets/` 資料夾隨 image 部署。

## Migration Plan

1. 設計師提供 Rich Menu 圖片（2500×1686px，3 格版型）
2. 實作 `rich_menu_utils.py` 與 `main.py` startup hook
3. 本地以 `uvicorn` 啟動驗證 Rich Menu 出現在 LINE 聊天畫面
4. 部署 Cloud Run（現有 `gcloud run deploy` 流程）
5. **Rollback**：LINE Console 手動刪除 Rich Menu，或刪除 `startup` hook 重新部署
