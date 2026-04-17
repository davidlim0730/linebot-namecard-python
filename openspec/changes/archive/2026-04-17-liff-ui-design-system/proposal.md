## Why

Phase 4 CRM LIFF 前端已完成功能實作，但各頁面 UI 風格不一致（硬編碼 inline style、無設計系統約束）。Phase 3 仍有三個 LIFF 頁面（CardEdit、標籤管理、團隊管理）未完成。建立統一設計系統並全面翻新 LIFF UI，讓產品視覺達到可對外展示的水準。

## What Changes

- **新增全局 Layout 元件**：統一 Header（含返回按鈕）與 BottomNav（4 tabs），取代各頁面自行渲染的 header
- **建立 CSS Design Token 系統**：將 The Fluid Professional 設計系統（`#06C755` primary、Plus Jakarta Sans/Inter 字體、tonal layering、glassmorphism）落地為 CSS custom properties
- **翻新 Phase 4 CRM 頁面 UI**：DealList、DealDetail、ContactCrm、ActionList、CrmInput、ManagerPipeline 套用設計系統
- **完成 Phase 3 待做 LIFF 頁面**：CardEdit（欄位編輯表單）、TagManagement、TeamPage 全面 LIFF 化
- **統一 left-accent 語義色**：`#0084FF` deal / `#31A24C` activity / `#FF6B00` action / `#06C755` success

## Capabilities

### New Capabilities
- `liff-design-tokens`: CSS custom properties 定義全局 design token（色彩、字體、間距、陰影、圓角）
- `liff-layout-components`: 全局 Header + BottomNav Vue 元件，統一各頁面 layout shell
- `liff-crm-pages-ui`: DealList、DealDetail、ContactCrm、ActionList、CrmInput 頁面 UI 翻新
- `liff-card-edit-liff`: CardEdit 完整 LIFF 表單頁面（取代 LINE chat 逐欄編輯）
- `liff-team-settings-ui`: TeamPage、SettingsPage UI 翻新

### Modified Capabilities
- `liff-bottom-nav`: BottomNav 元件重構，支援 active state 視覺與 4-tab 佈局

## Impact

- **修改檔案**：`app/liff_app/styles/design-tokens.css`（擴充）、`app/liff_app/components/BottomNav.js`、`app/liff_app/app.js`（Header 注入）
- **翻新頁面**：`views/DealList.js`、`views/DealDetail.js`、`views/ContactCrm.js`、`views/ActionList.js`、`views/CrmInput.js`、`views/CardEdit.js`、`views/TeamPage.js`、`views/SettingsPage.js`
- **Roadmap 對應**：Phase 3（LIFF 化）+ Phase 4（CRM LIFF 前端）UI 完成里程碑
- **無 Firebase schema 變更**：純前端 UI 層變動，不影響資料模型
- **非目標**：Web 管理介面（Phase 3 待完成項）、ManagerPipeline admin 頁面（低優先）、CSV 匯出進階版
