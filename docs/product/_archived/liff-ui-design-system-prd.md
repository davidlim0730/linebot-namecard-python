> ⚠️ **已封存（Archived）**  封存日期：2026-04-21 ／ 取代文件：`01_features/liff-app/designer-brief.md`

# PRD — LIFF UI 設計系統 & 頁面翻新

**作者**：David Lin  
**日期**：2026-04-17  
**狀態**：規劃中  
**Roadmap**：Phase 3（LIFF 化）+ Phase 4（CRM LIFF 前端）UI 完成里程碑  
**實作計畫**：[openspec/changes/liff-ui-design-system/](../../../../openspec/changes/liff-ui-design-system/)

---

## 1. Executive Summary

Phase 4 CRM LIFF 已完成功能實作，但各頁面 UI 風格不一致（hardcoded inline style、無設計系統約束）。Phase 3 仍有 CardEdit LIFF 頁面未完成。

本次迭代目標：
1. **建立 CSS Design Token 系統**，落地「The Fluid Professional」設計語言
2. **統一全局 Layout**（Header + BottomNav）
3. **翻新所有 LIFF 頁面 UI**，達到可對外展示的視覺水準
4. **完成 CardEdit LIFF 頁面**（取代 LINE chat 逐欄編輯）

---

## 2. Design System — The Fluid Professional

### 色彩

| Token | 值 | 用途 |
|---|---|---|
| `--color-primary` | `#06C755` | LINE Green，CTA、active tab |
| `--color-deal` | `#0084FF` | 案件 left-accent |
| `--color-activity` | `#31A24C` | 互動紀錄 left-accent |
| `--color-action` | `#FF6B00` | 待辦事項 left-accent |
| `--color-surface` | `#F8FAFC` | 頁面背景 |
| `--color-card` | `#ffffff` | 卡片背景 |
| `--color-text-primary` | `#1A1A2E` | 主文字 |
| `--color-text-secondary` | `#666666` | 次要文字 |

### 字體

| Token | 值 | 用途 |
|---|---|---|
| `--font-headline` | `'Plus Jakarta Sans', sans-serif` | 頁面標題、section title |
| `--font-body` | `'Inter', sans-serif` | 內文、標籤、badge |

### 間距 & 形狀

| Token | 值 |
|---|---|
| `--radius-card` | `12px` |
| `--radius-btn` | `8px` |
| `--shadow-card` | `0 2px 8px rgba(0,0,0,0.08)` |

### 設計規則

- **No hard borders**：用 tonal layering（白卡 on `#F8FAFC`）區分層次，不用 `border: 1px solid`
- **Glassmorphism**：overlay / modal 使用 `backdrop-filter: blur(12px)`
- **Left-accent 語義**：卡片以 3px 左邊框表達資料類型（色彩同上表）

---

## 3. Global Layout

### Header（全局，56px）

```
┌──────────────────────────────┐
│ ← 返回   頁面標題    [+ 新增] │  ← detail 頁
│ 頁面標題             [+ 新增] │  ← list 頁
└──────────────────────────────┘
```

- `showBack=true`：左側 `← 返回` 按鈕，呼叫 `history.back()`
- `showBack=false`：左側顯示頁面標題
- 右側 `actionLabel` + `onAction` 可選

### Bottom Navigation（4 tabs，56px + safe-area）

```
┌───────┬───────┬───────┬───────┐
│ 🪪名片 │ 📊CRM │ 👥團隊 │ ⚙️設定 │
└───────┴───────┴───────┴───────┘
```

| Tab | Route | Active Color |
|---|---|---|
| 名片 | `CardList` | `#06C755` |
| CRM | `DealList` | `#06C755` |
| 團隊 | `TeamPage` | `#06C755` |
| 設定 | `SettingsPage` | `#06C755` |

Detail 頁面（CardDetail、DealDetail、ContactCrm、CardEdit）不顯示 BottomNav。

---

## 4. 頁面規格

### 4.1 核心路徑

```
名片路徑：CardList → CardDetail → CardEdit
CRM 路徑：DealList → DealDetail
聯絡人 CRM：CardDetail → ContactCrm → DealDetail
待辦路徑：ActionList → DealDetail
```

### 4.2 DealList（`#/deals`）

**功能**：按 pipeline stage 分組顯示所有案件

```
┌─────────────────────────────┐
│ 📊 案件                + 新增 │  ← Header
├─────────────────────────────┤
│ 初接觸 (3)                   │  ← stage header
│ ┌──────────────────────────┐ │
│ │ ■ 台積電 王總              │ │  ← .card + .left-accent-deal
│ │   報價中 · NT$500,000     │ │
│ └──────────────────────────┘ │
│ ┌──────────────────────────┐ │
│ │ ■ 聯發科 李總              │ │
│ └──────────────────────────┘ │
│ 需求確認 (1)                  │
│ ...                          │
├─────────────────────────────┤
│ 🪪名片  📊CRM  👥團隊  ⚙️設定 │  ← BottomNav
└─────────────────────────────┘
```

空狀態：`尚無案件，開始記錄第一筆！` + `+ 新增案件` CTA

### 4.3 DealDetail（`#/deals/:id`）

**功能**：案件全貌 — 基本資訊 + Stakeholders + 活動 timeline + 待辦

```
┌─────────────────────────────┐
│ ← 返回  台積電 王總           │  ← Header
├─────────────────────────────┤
│ 💼 案件資訊                  │  ← .card
│   stage: 報價中              │
│   est_value: NT$500,000      │
├─────────────────────────────┤
│ 👥 Stakeholders (2)          │
│   ┌─────────────────────┐   │
│   │ 王總 / 採購長         │   │
│   └─────────────────────┘   │
├─────────────────────────────┤
│ 💬 互動紀錄 (5)              │  ← newest-first timeline
│   2026-04-15                 │
│   ┌─────────────────────┐   │
│   │ ■ 見面拜訪           │   │  ← .left-accent-activity
│   │   • 對方對 Pro 方案... │   │
│   └─────────────────────┘   │
├─────────────────────────────┤
│ 📌 待辦 (2)                  │
│   ┌─────────────────────┐   │
│   │ ■ 寄送報價單          │   │  ← .left-accent-action
│   │   到期：2026-04-23    │   │
│   └─────────────────────┘   │
└─────────────────────────────┘
```

### 4.4 ContactCrm（`#/contacts/:id/crm`）

**功能**：聯絡人維度的 CRM 總覽（跨案件）

```
┌─────────────────────────────┐
│ ← 返回  王大明               │  ← Header
│          採購長 · 台積電      │
├─────────────────────────────┤
│ 📊 案件 (2)          + 新增案件│
│   ┌──────────────────────┐  │
│   │ ■ 2024 採購案         │  │  ← .left-accent-deal
│   └──────────────────────┘  │
├─────────────────────────────┤
│ 💬 互動紀錄 (3)              │
│   ┌──────────────────────┐  │
│   │ ■ • key insight 1     │  │  ← .left-accent-activity
│   └──────────────────────┘  │
├─────────────────────────────┤
│ 📌 待辦事項 (1)              │
│   ┌──────────────────────┐  │
│   │ ■ 寄報價單            │  │  ← .left-accent-action
│   └──────────────────────┘  │
└─────────────────────────────┘
```

### 4.5 ActionList（`#/actions`）

**功能**：跨案件待辦清單，支援 tab filter

```
┌─────────────────────────────┐
│ 📌 待辦                      │  ← Header
├─────────────────────────────┤
│ [今日] [本週] [全部]          │  ← tab filter
├─────────────────────────────┤
│ ┌─────────────────────────┐ │
│ │ ■ 寄送報價單    台積電案  │ │
│ │   到期：今日    [✓ 完成]  │ │  ← 逾期：紅色 badge
│ └─────────────────────────┘ │
├─────────────────────────────┤
│ 🪪名片  📊CRM  👥團隊  ⚙️設定 │
└─────────────────────────────┘
```

### 4.6 CardEdit（`#/cards/:id/edit`）— Phase 3 補完

**功能**：取代 LINE chat 逐欄編輯，一次修改所有欄位

```
┌─────────────────────────────┐
│ ← 返回  編輯名片     [儲存]  │  ← Header
├─────────────────────────────┤
│ 姓名 *                       │
│ ┌─────────────────────────┐ │
│ │ 王大明                   │ │
│ └─────────────────────────┘ │
│ 職稱                         │
│ ┌─────────────────────────┐ │
│ │ 採購長                   │ │
│ └─────────────────────────┘ │
│ 公司   電話   Email   地址   │
│ 備註                         │
│ ┌─────────────────────────┐ │
│ │ （多行文字）              │ │
│ └─────────────────────────┘ │
│         [取消]  [儲存變更]    │
└─────────────────────────────┘
```

驗證：name 空值 → `姓名不能為空` inline error，阻止送出

---

## 5. User Stories & Acceptance Criteria

| # | Story | AC |
|---|---|---|
| U1 | 業務開啟 DealList，案件依 stage 分組顯示 | deals 按 stage group，空狀態有 CTA |
| U2 | 點擊案件進入 DealDetail，看到活動 timeline | newest-first，有 left-accent 顏色區分 |
| U3 | 點擊聯絡人名片查看其所有 CRM 資料 | ContactCrm 三個 section 均有資料 |
| U4 | 在 ActionList 切換「今日」filter | 只顯示今日到期 actions |
| U5 | 一鍵完成待辦 | API 呼叫成功，action 消失，toast 顯示 |
| U6 | 進入 CardEdit 看到預填表單 | 所有欄位預填，儲存後跳回 CardDetail |
| U7 | 所有頁面使用一致的字體和顏色 | 無 hardcoded `#0084FF`/`#31A24C` 等舊值在非對應元件 |

---

## 6. Non-Goals

- ManagerPipeline admin 頁面 UI 翻新（低使用頻率）
- TagManagement LIFF 獨立頁面（留後續 change）
- Web 管理介面（Phase 3 roadmap 項，獨立規劃）
- CSS-in-JS 或 Tailwind（維持無 build tool 架構）
- 動畫過場效果

---

## 7. Technical Constraints

- LIFF App：Vue 3 ESM，無 build tool，無 TypeScript
- 樣式：CSS custom properties + class，動態值保留 inline style
- Cache busting：所有修改 JS 升版至 `?v=3`，`index.html` 由 FastAPI 動態回應
- `CardEdit` 需確認 `PATCH /api/v1/cards/:id` 端點存在

---

## 8. 實作分組 & 優先順序

| 組別 | 內容 | 優先 |
|---|---|---|
| G1 | Design Token CSS + Header/BottomNav 元件 | P0 |
| G2 | CRM 頁面翻新（DealList/Detail/ContactCrm/ActionList/CrmInput）| P0 |
| G3 | CardEdit LIFF 完成（Phase 3 補完）| P0 |
| G4 | 名片頁面翻新（CardList/Detail）| P1 |
| G5 | 設定頁面翻新（TeamPage/Settings）| P1 |
| G6 | Cache busting `?v=3` + 部署 | P0（最後執行）|
