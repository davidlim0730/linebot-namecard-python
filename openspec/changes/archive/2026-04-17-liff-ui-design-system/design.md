## Context

LIFF App 目前使用 Vue 3 ESM（無 build tool、無 TypeScript），所有樣式以 inline style 字串直接寫在 `h()` 呼叫中。現有 `styles/` 資料夾已有 `design-tokens.css`、`layout.css`、`animations.css`、`components.css`，但各 view 幾乎未使用這些 class，仍以 hardcoded 顏色與間距為主。

設計系統「The Fluid Professional」已在 Stitch 中定義（`#06C755` primary、Plus Jakarta Sans + Inter、no-border tonal layering、glassmorphism），需落地為可被 LIFF 使用的 CSS token + Vue 元件。

## Goals / Non-Goals

**Goals:**
- 建立完整 CSS custom properties token 系統，覆蓋色彩、字體、間距、陰影
- 統一 Header（含返回邏輯）與 BottomNav 為共用元件
- 翻新 8 個 view 的 UI，改用 CSS class 取代 inline style
- 完成 CardEdit LIFF 頁面（Phase 3 未完成項）

**Non-Goals:**
- 引入 build tool（Vite/Webpack）或 TypeScript
- ManagerPipeline admin 頁面 UI 翻新（低使用頻率）
- Web 管理介面（Phase 3 待完成，本次不做）
- 動畫過場效果（`animations.css` 存在但不強制套用）

## Decisions

### D1：CSS Class 優先，保留必要 inline style
**決策**：view 改用 CSS class，動態值（e.g. `border-left-color` 依資料而定）保留 inline style。  
**原因**：無 build tool 情況下，CSS-in-JS 或 scoped style 無法使用；CSS class 可複用且便於維護。  
**替代方案**：全 inline style（現狀）→ 無法主題化；引入 Tailwind CDN → 增加外部依賴，離線無效。

### D2：Header 作為 App-level 元件注入，不在各 view 自行渲染
**決策**：`app.js` 根據 route 決定是否顯示 Header，並傳入 `title` 與 `showBack` prop。  
**原因**：避免各 view 重複實作返回按鈕邏輯；統一返回行為（`history.back()` vs hash 跳轉）。  
**替代方案**：各 view 自行渲染 header → 現狀，難以統一。

### D3：Cache busting 使用 `?v=N` query string，每次 UI 大改版 +1
**決策**：本次所有改動的 JS 檔案升至 `?v=3`，`index.html` entry point 同步更新。  
**原因**：LINE webview 積極快取 ES module，只改內容不改 URL 無法觸發重新載入。

### D4：CardEdit 頁面使用表單 pattern，每個欄位一個 `<input>`，一次儲存全部
**決策**：`CardEdit` 渲染所有可編輯欄位（name, title, company, phone, email, address, memo），單一「儲存」按鈕呼叫 `PATCH /api/v1/cards/:id`。  
**原因**：取代 LINE chat 逐欄編輯（user_states state machine），體驗大幅提升。

## Risks / Trade-offs

- **[快取]** LINE webview 快取行為難以預測 → 所有修改檔案統一升版號 `?v=3`，`index.html` 由 FastAPI 動態回應（不快取）
- **[CSS 衝突]** 全局 CSS class 與現有 inline style 並存可能產生優先級衝突 → 移除 view 中舊有 inline style，以 CSS class 為主，僅保留必要動態值
- **[CardEdit API]** 目前 `PATCH /api/v1/cards/:id` 端點需確認存在且支援部分更新 → 實作前先確認 API，必要時補上端點
- **[頁面多]** 8 個 view 同時翻新，工作量大 → 按核心路徑優先順序分批：CRM 頁面 → 名片頁面 → 設定頁面

## Migration Plan

1. 擴充 `design-tokens.css` → CSS custom properties 完整定義
2. 翻新 `BottomNav.js` + 新增 `Header.js` 元件
3. 翻新 CRM 頁面（DealList → DealDetail → ContactCrm → ActionList → CrmInput）
4. 翻新名片頁面（CardList → CardDetail → CardEdit）
5. 翻新設定頁面（TeamPage → SettingsPage）
6. 升版號 `?v=3`，更新 `app.js` import chain
7. 部署測試機 → 確認 → 部署正式機

**Rollback**：直接回退 git commit，版號降回 `?v=2`，LINE webview 快取失效前用戶可能看到舊版。

## Open Questions

- CardEdit 頁面的 `PATCH /api/v1/cards/:id` 端點是否已存在且支援部分更新？（需確認 `app/api/` 路由）
- TagManagement LIFF 是否在本次範圍內，或延後至獨立 change？（建議本次跳過，聚焦 CRM + CardEdit）
