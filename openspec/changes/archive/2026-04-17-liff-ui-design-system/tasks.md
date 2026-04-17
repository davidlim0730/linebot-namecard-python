## 1. Design Token 基礎建設

- [ ] 1.1 擴充 `app/liff_app/styles/design-tokens.css`：新增完整 CSS custom properties（`--color-primary: #06C755`、`--color-deal: #0084FF`、`--color-activity: #31A24C`、`--color-action: #FF6B00`、`--color-surface: #F8FAFC`、`--color-card: #ffffff`、`--color-text-primary: #1A1A2E`）
- [ ] 1.2 新增字體 token：`--font-headline: 'Plus Jakarta Sans', sans-serif`、`--font-body: 'Inter', sans-serif`；確認 `index.html` 已引入對應 Google Fonts
- [ ] 1.3 新增間距、圓角、陰影 token：`--radius-card: 12px`、`--radius-btn: 8px`、`--shadow-card: 0 2px 8px rgba(0,0,0,0.08)`
- [ ] 1.4 新增 `components.css` 通用 class：`.card`（white + radius + shadow）、`.section-title`（Plus Jakarta Sans 15px bold）、`.left-accent-deal/activity/action`（border-left 3px + 對應顏色）
- [ ] 1.5 commit: `feat(liff): add design token CSS custom properties`

## 2. 全局 Layout 元件

- [ ] 2.1 新增 `app/liff_app/components/Header.js`：props `title`、`showBack`（bool）、`actionLabel`、`onAction`；`showBack=true` 時左側顯示 `← 返回` 按鈕（呼叫 `history.back()`）
- [ ] 2.2 翻新 `app/liff_app/components/BottomNav.js`：使用 `var(--color-primary)` 表示 active tab，height 56px，safe-area padding bottom
- [ ] 2.3 更新 `app/liff_app/app.js`：在 `renderFn` 中依 route 注入 `Header` 元件（detail 頁面 `showBack=true`，list 頁面傳入對應 title），移除各 view 內部自行實作的 header 區塊
- [ ] 2.4 commit: `feat(liff): add Header component and refactor BottomNav with design tokens`

## 3. CRM 頁面 UI 翻新

- [ ] 3.1 翻新 `views/DealList.js`：deals 依 stage 分組，每 stage 顯示 section header；空狀態顯示提示文字 + `+ 新增案件` 按鈕；卡片套用 `.card` + `.left-accent-deal`
- [ ] 3.2 翻新 `views/DealDetail.js`：header 由全局 Header 元件提供（移除內部返回按鈕）；activities timeline 以 `.left-accent-activity` 卡片呈現，newest-first；actions 以 `.left-accent-action` 呈現，逾期日期顯示紅色 badge
- [ ] 3.3 翻新 `views/ContactCrm.js`：移除 hardcoded inline style，改用 `.card` + `.section-title`；三個 section（案件/互動/待辦）均以白卡包裹
- [ ] 3.4 翻新 `views/ActionList.js`：頂部新增 tab filter（今日 / 本週 / 全部），切換 filter 時重新過濾 actions list；inline 完成按鈕呼叫 API 並顯示 success toast
- [ ] 3.5 翻新 `views/CrmInput.js`：輸入框套用設計系統；預覽確認卡片使用 `.card`
- [ ] 3.6 commit: `feat(liff): redesign CRM pages with design system`

## 4. CardEdit LIFF 頁面

- [ ] 4.1 確認 `GET /api/v1/cards/:id` 端點回傳格式（確保 CardEdit 可用於預填欄位）
- [ ] 4.2 確認 `PATCH /api/v1/cards/:id` 端點存在且支援 partial update；如不存在則在 `app/api/` 補上端點
- [ ] 4.3 重寫 `views/CardEdit.js`：`onMounted` 呼叫 API 預填所有欄位（name, title, company, phone, email, address, memo）；儲存按鈕發送 PATCH，成功後跳轉 `#/cards/:id`；取消按鈕呼叫 `history.back()`；name 空值顯示 inline error
- [ ] 4.4 commit: `feat(liff): rewrite CardEdit as full-form LIFF page`

## 5. 名片頁面 UI 翻新

- [ ] 5.1 翻新 `views/CardList.js`：卡片套用 `.card`，移除 inline style
- [ ] 5.2 翻新 `views/CardDetail.js`：header 由全局 Header 提供；欄位資訊以設計系統呈現
- [ ] 5.3 commit: `feat(liff): redesign card pages with design system`

## 6. 設定頁面 UI 翻新

- [ ] 6.1 翻新 `views/TeamPage.js`：成員列表顯示 display name + 角色 badge；admin 看到邀請連結按鈕
- [ ] 6.2 翻新 `views/SettingsPage.js`：顯示 org name（admin 可編輯）；登出按鈕清除 JWT 並重載
- [ ] 6.3 commit: `feat(liff): redesign team and settings pages`

## 7. Cache Busting & 部署

- [ ] 7.1 將所有本次修改的 JS 檔案 import 升至 `?v=3`（`app.js` import chain：`api.js?v=3`、各 view `?v=3`）
- [ ] 7.2 更新 `app/liff_app/index.html` entry point：`app.js?v=3`
- [ ] 7.3 部署測試機：`gcloud builds submit --tag gcr.io/linebot-namecard-488409/linebot-namecard && gcloud run deploy linebot-namecard ...`
- [ ] 7.4 在 LINE 開啟 LIFF 確認：DealList 分組、DealDetail timeline、ContactCrm 卡片、ActionList tab filter、CardEdit 表單
- [ ] 7.5 確認通過後部署正式機：`gcloud run deploy linebot-namecard-prod ...`
- [ ] 7.6 commit & archive: `feat(liff): v3 UI with design system rollout`
