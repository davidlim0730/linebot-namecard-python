# Web App CRM — 設計師完整交付規格書

**版本**：2026-04-22  
**適用對象**：UI 設計師  
**範疇**：Desktop Web App（非 LINE LIFF，非 LINE Bot）  
**設計工具**：Claude Design  
**API 契約**：`docs/references/api-contract/v1.0-openapi.yaml`

---

## 0. 給設計師的注意事項（必讀）

本文件是唯一需要閱讀的規格書，涵蓋產品定位、Design System、頁面規格、技術規格與交付標準。

### 現有 MVP 狀態

專案已有一個可運作的 MVP（React 18 + Vite），部分頁面邏輯完整，**只需要替換視覺層，不需要從零開始**。

| 頁面 | 現有狀態 | 設計師任務 |
|------|---------|---------|
| AppShell（Sidebar + Header） | ✅ 邏輯完整，視覺粗糙 | 重做視覺 |
| Deal Kanban（拖放看板） | ✅ 拖放邏輯完整，視覺粗糙 | 重做視覺 |
| Deal Detail（案件詳情） | ✅ 資料結構完整，視覺粗糙 | 重做視覺 |
| Contact Table（聯絡人列表） | ✅ 排序/搜尋完整，視覺粗糙 | 重做視覺 |
| Contact Drawer（聯絡人詳情） | ✅ 有基礎，需改為 Split-pane | 依規格重設計 |
| NLU Input Modal | ✅ 流程完整，視覺粗糙 | 改為 AI 確認卡片風格 |
| Action List（待辦清單） | ❌ 不存在 | 全新設計 + 交付 TSX |
| Pipeline Dashboard（admin） | ❌ 不存在 | 全新設計 + 交付 TSX |

### 設計師負責交付

- 元件的 JSX 結構 + Tailwind CSS 樣式
- 所有 Loading / Empty / Error 狀態的視覺
- 動畫與互動效果（hover、transition、toast）
- Mock 資料寫死（`const mockDeals = [...]`）

### 設計師**不需要**處理（工程師已有）

- API fetch 層（`src/api/*.ts` 已完整）
- 資料 hooks（`useQuery`, `useMutation` 已綁定）
- Auth token 與路由設定
- Null 欄位 fallback 邏輯
- 環境變數切換

---

## 1. 技術規格

### 1-A. 框架與工具

```
框架：React 18 + Vite + TypeScript
樣式：TailwindCSS 3（不需另外寫 .css 檔案）
圖示：Lucide React（已安裝，直接 import）
表格：TanStack Table v8（已安裝）
日期：dayjs（已安裝）
```

### 1-B. 交付格式

```
格式：.tsx 元件檔（TypeScript JSX）
命名：PascalCase（ContactTable.tsx、DealKanban.tsx）
位置：設計師自行命名，工程師接手後整理
資料：Mock 資料寫死在元件內，不需呼叫 API
```

### 1-C. 元件結構範例

```tsx
// 範例：ContactTable.tsx
const mockContacts = [
  { id: '1', display_name: '王大明', title: '業務協理', company_name: '台積電', tags: ['VIP'] },
  { id: '2', display_name: '李小花', title: '採購主管', company_name: '鴻海', tags: ['供應商'] },
]

export function ContactTable() {
  return (
    <div className="bg-[#F9F9FE] min-h-screen p-6">
      {/* 搜尋列 */}
      <div className="...">...</div>
      {/* 聯絡人列表 */}
      {mockContacts.map(contact => (
        <div key={contact.id} className="...">...</div>
      ))}
    </div>
  )
}
```

### 1-D. Tailwind 顏色設定（已配置，直接用 class）

```js
// tailwind.config.js 已設定以下自訂顏色：
// 使用方式：bg-primary、text-primary-dark、bg-bg-section 等

colors: {
  primary:         '#06C755',
  'primary-dark':  '#006E2B',
  'primary-light': '#E8F9EE',
  'bg-base':       '#F9F9FE',
  'bg-section':    '#F3F3F8',
  'bg-card':       '#FFFFFF',
  'bg-input':      '#E2E2E7',
  danger:          '#C0000A',
  warning:         '#F59E0B',
  success:         '#06C755',
}
```

---

## 2. 產品定位

**「業務員的隨身 AI 助理」**——以語音紀錄、自動建檔、Next-Step 驅動為核心的對話式 CRM。

Web App 是**桌面主戰場**：業務員與主管在辦公室時使用，強調全局 Pipeline 概覽、深度資料探索、複雜聯絡人與案件的詳細編輯。

**三個使用平台的分工**：

| 平台 | 核心用途 | 設計重點 |
|------|---------|---------|
| LINE Bot | 名片掃描、快速查詢、推播通知 | 不在本文件範圍 |
| LINE LIFF (Mobile) | 語音 Recap、快速查閱 Next Steps | 不在本文件範圍 |
| **Web App (Desktop)** | Pipeline 看板、聯絡人管理、深度編輯 | **本文件範圍** |

---

## 3. 目標用戶

| 角色 | 使用情境 | 主要訴求 |
|------|---------|---------|
| **業務員**（一般成員） | 辦公室整理客戶資料、查看今日 Next Steps | 快速找到聯絡人、確認待辦清單 |
| **業務主管**（管理員） | 掌握團隊 Pipeline、預估業績 | 看板概覽、案件進度、數據儀表板 |

---

## 4. Design System

### 4-A. 色彩系統（Design Tokens）

```css
/* 主品牌色 */
--color-primary:          #06C755   /* LINE Green，主要 CTA */
--color-primary-dark:     #006E2B   /* 深綠，文字/icon，確保 AAA 對比 */
--color-primary-light:    #E8F9EE   /* 淡綠，hover / selected 背景 */

/* 背景層次（用色階取代分隔線）*/
--color-bg-base:          #F9F9FE   /* 頁面底色 */
--color-bg-section:       #F3F3F8   /* Section / sidebar 底色 */
--color-bg-card:          #FFFFFF   /* 卡片底色 */
--color-bg-input-empty:   #E2E2E7   /* 空白 input 背景 */

/* 文字 */
--color-text-primary:     #1A1A1A
--color-text-secondary:   #3C4A3C
--color-text-disabled:    rgba(60,74,60,0.5)

/* 邊框（No-Line Rule：優先用背景色階）*/
--color-outline:          rgba(60,74,60,0.2)
--color-focus-ring:       #06C755

/* 狀態色 */
--color-danger:           #C0000A
--color-warning:          #F59E0B
--color-success:          #06C755

/* AI 內容標示 */
--color-ai-gradient:      linear-gradient(90deg, #06C755, #0A84FF)
--color-ai-surface:       rgba(10,132,255,0.06)
```

### 4-B. 字體

```
標題、數字、大標：Plus Jakarta Sans
內文、標籤、密集資訊：Inter + Noto Sans TC（繁體中文補字）

所有 UI 文字使用繁體中文；Email / URL 等資料內容保持原文
```

### 4-C. 元件規格

```
/* 圓角 */
--radius-card:    16px
--radius-button:  8px
--radius-input:   8px
--radius-chip:    20px
--radius-modal:   16px

/* 間距系統（4px base）*/
--space-1: 4px   --space-2: 8px   --space-3: 12px
--space-4: 16px  --space-6: 24px  --space-8: 32px

/* 陰影 */
--shadow-card:    0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)
--shadow-popover: 0 10px 38px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.08)
```

### 4-D. No-Line Rule

**不使用 1px 實線分隔 section**，改用背景色階區分層次：

```
頁面底色 #F9F9FE
  └── Sidebar / Section #F3F3F8
        └── 卡片 #FFFFFF
              └── Input focus: 2px #06C755
```

---

## 5. Layout 架構（Desktop）

### 5-A. 整體佈局

```
┌─────────────────────────────────────────────────────┐
│  Top Navigation Bar（高 56px，白底，shadow-sm）        │
│  [Logo] [搜尋] .......................... [頭像]      │
├──────────┬──────────────────────────────────────────┤
│          │                                          │
│ Sidebar  │          Main Content Area               │
│ (220px)  │          (flex-grow)                     │
│          │                                          │
│ 聯絡人   │                                          │
│ 案件     │                                          │
│ 待辦     │                                          │
│ ──────── │                                          │
│ Pipeline │                                          │
│ 產品線   │                                          │
│ ──────── │                                          │
│ 設定     │                                          │
└──────────┴─────────────────────────────────────────┘
```

- **Sidebar**：固定左側 220px，`#F3F3F8` 底色，active item `#E8F9EE`，文字 `#006E2B`
- **Main Content**：`#F9F9FE` 底，padding 24px，max-width 1200px（置中）
- **Top Bar**：白底，`box-shadow: 0 1px 0 rgba(60,74,60,0.2)`

### 5-B. 桌面規格

```
設計基準寬度：1440px
最小支援寬度：1024px
欄格系統：12 欄，gutter 24px

1440px+：完整 Split-pane
1024px-1440px：Sidebar 收縮為 icon only（64px）
< 1024px：不支援（顯示「請使用桌面瀏覽器」）
```

---

## 6. 頁面清單與優先順序

| 優先 | 頁面 | 路由 | 對應現有元件 | 任務 |
|------|------|------|------------|------|
| **P0** | 聯絡人列表 | `/contacts` | `ContactTable.tsx` | 重做視覺 |
| **P0** | 聯絡人詳情 + CRM 視角 | `/contacts/:id` | `ContactDrawer.tsx` | 改為 Split-pane |
| **P0** | 案件 Pipeline 看板 | `/deals` | `DealKanban.tsx` | 重做視覺 |
| **P0** | 待辦清單 | `/actions` | ❌ 不存在 | 全新設計 |
| **P1** | 案件詳情 | `/deals/:id` | `DealDetail.tsx` | 重做視覺 |
| **P1** | Pipeline 儀表板 | `/pipeline` | ❌ 不存在 | 全新設計（admin only）|
| **P2** | 產品線管理 | `/products` | 部分存在 | 輕量設計（admin only）|

---

## 7. 各頁面規格

---

### 7-A. 聯絡人列表 `/contacts`

**API**：`GET /api/v1/contacts`  
**佈局**：Split-pane（左側列表 + 右側詳情）

#### 左側列表區（寬 360px，固定）

```
┌─────────────────────────────────┐
│ 搜尋列（高 44px）                 │
│ [🔍 搜尋姓名、公司、職稱...]        │
├─────────────────────────────────┤
│ 篩選列（可橫向捲動）                │
│ [全部] [公司] [人員] [VIP] [供應商] │
├─────────────────────────────────┤
│ 筆數提示（12px #3C4A3C）          │
│ 共 N 筆聯絡人                     │
├─────────────────────────────────┤
│ 聯絡人列表（可垂直捲動）             │
│  ┌────────────────────────────┐ │
│  │ [頭像 40px] 姓名 16px Bold  │ │
│  │              公司 · 職稱   │ │
│  │              [tag] [tag]   │ │
│  └────────────────────────────┘ │
│  （每筆高 72px，hover #F3F3F8）   │
└─────────────────────────────────┘
```

**頭像邏輯**：
- 有名片照片 → 顯示縮圖（圓角 8px）
- 無照片 → 顯示姓名首字，背景 `#F3F3F8`

**互動狀態**：
- 載入中：3 張 Skeleton card（`#E2E2E7` 灰色動畫）
- 空狀態：中央圖示 + 「還沒有任何聯絡人」+ 「＋ 新增聯絡人」綠色按鈕
- 搜尋無結果：「找不到符合「○○」的聯絡人」+ 「清除搜尋」連結

#### 右側詳情區（flex-grow）

預設顯示「選取聯絡人以查看詳情」空狀態。點擊左側列表後，右側更新（不換頁）。詳見 7-B。

---

### 7-B. 聯絡人詳情 + CRM 視角 `/contacts/:id`

**API**：
- `GET /api/v1/contacts/:id`
- `GET /api/v1/contacts/:id/crm`（deals + activities + actions）

#### 詳情頁佈局（右側區）

```
┌────────────────────────────────────────────┐
│ 頂部操作列                                   │
│ [← 返回] 姓名（20px Bold）    [✏️ 編輯] [⋮] │
├────────────────────────────────────────────┤
│ 主要資訊卡（#FFFFFF，padding 24px）           │
│                                            │
│  [頭像 80px]  姓名（24px Bold）             │
│               職稱（16px #3C4A3C）          │
│               公司（16px，可點擊→公司詳情）   │
│                                            │
│  ─── 聯絡資訊 ──────────────────────────   │
│  📞 電話       ✉️ Email                    │
│  📱 手機       💬 LINE ID                  │
│  📍 地址（滿版）                             │
│                                            │
│  ─── 備忘錄 ───────────────────────────── │
│  備忘錄文字；無備忘錄時顯示「＋ 新增備忘錄」     │
│                                            │
│  ─── 標籤 ─────────────────────────────── │
│  [VIP] [供應商]  [＋ 管理標籤]              │
└────────────────────────────────────────────┘
│                                            │
│ ── CRM 視角 Tab ──────────────────────────  │
│ [案件 (N)] [互動記錄 (N)] [待辦 (N)]        │
└────────────────────────────────────────────┘
```

**Null 欄位處理**（需設計兩種狀態）：
- 有值：黑字顯示
- 無值：「未填寫」（`#3C4A3C` 50% 透明），不隱藏整行

#### CRM 視角 Tab — 案件

```
┌────────────────────────────────────┐
│ 公司名（16px Bold）    [Stage Badge]│
│ 預估金額 TWD $XXX,XXX              │
│ 狀態摘要（14px #3C4A3C）            │
│ 下次行動日期：2026-05-01           │
└────────────────────────────────────┘
```

Stage Badge 顏色：
- `"0"~"2"` 初期：`#E8F9EE` 底 `#006E2B` 字
- `"3"~"5"` 中期：`#FEF9C3` 底 `#854D0E` 字
- `"6"` 等待簽約：`#DBEAFE` 底 `#1E40AF` 字
- `"成交"`：`#06C755` 底白字
- `"失敗"`：`#FEE2E2` 底 `#C0000A` 字

#### CRM 視角 Tab — 互動記錄（時間軸）

```
  ●  2026-04-18  [Positive 🟢]
  │  AI 摘要 1
  │  AI 摘要 2
  │  原始輸入（14px #3C4A3C，可展開）
  │
  ●  2026-04-10  [Neutral 🟡]
```

Sentiment：Positive `#06C755`・Neutral `#F59E0B`・Negative `#C0000A`  
AI 生成欄位加 `--color-ai-gradient` 左側 3px border 標示。

#### CRM 視角 Tab — 待辦

```
┌─────────────────────────────────┐
│ ○ 任務描述（14px）    到期 04/28 │
│   [完成] 按鈕（hover 才顯示）     │
└─────────────────────────────────┘
```

---

### 7-C. 案件 Pipeline 看板 `/deals`

**API**：`GET /api/v1/deals`  
**佈局**：Kanban（橫向可捲動）

#### Kanban 結構

```
[初步接觸] [需求確認] [提案中] [報價送出] [議價協商] [合約審查] [等待簽約] | [成交] [失敗]
   (N)        (N)      (N)      (N)        (N)         (N)       (N)          (N)    (N)
  ┌───┐      ┌───┐
  │卡片│      │卡片│
  └───┘      └───┘
```

每欄：寬 240px，欄底色 `#F3F3F8`，圓角 12px

每張 Deal Card：
```
┌────────────────────────────┐
│ 公司名（14px Bold）          │
│ 預估金額 $XXX,XXX            │
│ 狀態摘要（12px #3C4A3C）      │
│ ─────────────────────────  │
│ 下次行動 2026-05-01  [頭像]  │
└────────────────────────────┘
```

- hover：`shadow-card` 加深 + `translateY -2px`
- 擱置中（`is_pending`）：`#F59E0B` 左側 4px border

#### 頂部操作列

```
[篩選：全部 / 我的案件]  [搜尋案件...]  ........  [＋ 新增案件]
```

---

### 7-D. 待辦清單 `/actions`（全新頁面）

**API**：`GET /api/v1/actions`  
**佈局**：單欄清單

```
┌────────────────────────────────────────────┐
│ 頁面標題：待辦事項                            │
│ [今日到期] [本週] [全部] [已完成]             │
├────────────────────────────────────────────┤
│ ── 今日到期 (N) ─────────────────────────   │
│  ○  報價給王總                    ⚠️ 今天   │
│     台積電 · 案件：Q3 採購案                  │
│                                            │
│  ○  寄型錄給小李                  📅 明天   │
│     統一企業 · 案件：年度合約                  │
│                                            │
│ ── 本週 (N) ─────────────────────────────  │
└────────────────────────────────────────────┘
```

每筆 Action（高 64px，`#FFFFFF` 卡片，圓角 8px，間距 8px）：
- 左：○ checkbox（點擊 → 完成動畫，移至「已完成」tab）
- 中：任務描述（14px Bold）+ 聯絡人/案件（12px #3C4A3C）
- 右：到期日

**到期日視覺規則**：
- 今日：`#C0000A` + ⚠️
- 過期：`#C0000A` + ‼️
- 未來：`#3C4A3C` + 📅

---

### 7-E. 案件詳情 `/deals/:id`

**API**：`GET /api/v1/deals/:id`、`GET /api/v1/deals/:id/activities`、`GET /api/v1/deals/:id/stakeholders`  
**佈局**：Split-pane

```
┌──────────────────────────┬───────────────────────┐
│ 左側：案件資訊             │ 右側：互動時間軸         │
│ （寬 400px）              │ (flex-grow)            │
│                          │                        │
│ 公司名（24px Bold）        │ ── 互動記錄 ───────────  │
│ [Stage Badge]            │                        │
│                          │   ● 2026-04-18         │
│ ─── 主要資訊 ──────────   │     AI 摘要...          │
│ 預估金額                  │                        │
│ 下次行動日期               │ ── 利害關係人 ─────────  │
│ 狀態摘要                  │                        │
│                          │   [人員 1] Champion 🏆  │
│ ─── 關聯聯絡人 ──────────  │   [人員 2] Gatekeeper   │
│ 主要聯絡人                 │                        │
│ 簽約實體                  │   [＋ 新增利害關係人]     │
│                          │                        │
│ ─── 更新案件 ────────────  │                        │
│ Stage 下拉                │                        │
│ 狀態摘要 Textarea         │                        │
│ [儲存]                   │                        │
└──────────────────────────┴───────────────────────┘
```

---

### 7-F. Pipeline 儀表板 `/pipeline`（全新頁面，admin only）

**API**：`GET /api/v1/pipeline/summary`

```
┌────────────────────────────────────────────────────┐
│ 數據卡片列（4 欄）                                    │
│  [總案件數]  [進行中總金額]  [本月成交]  [待辦到期]    │
├──────────────────────────────┬─────────────────────┤
│ Stage 分布長條圖               │ AI 助理側邊欄          │
│                              │ （常駐，寬 320px）     │
│ 初步接觸 ████████ 8           │                     │
│ 需求確認 ██████   6           │  [輸入框]             │
│ 提案中  ████     4           │  自然語言查詢數據       │
│ ...                          │                     │
├──────────────────────────────│  範例：              │
│ 近期案件列表（最近更新 10 筆）  │  「本月哪個業務成交最多」│
│                              │  「台積電的案件進度」  │
└──────────────────────────────┴─────────────────────┘
```

**AI 助理側邊欄**：
- 常駐右側，寬 320px，`#F3F3F8` 底
- 輸入框在底部（高 44px）
- AI 生成內容用 `--color-ai-gradient` 左側 border 標示
- 查詢中顯示「正在分析...」動態文字

---

## 8. 共用元件規格

### 搜尋列

```
高度：44px
背景：#E2E2E7（空）/ #FFFFFF（focus）
圓角：8px
左側：🔍 icon（16px，#3C4A3C）
Focus：2px border #06C755
```

### Tag Chip

```
高度：24px，Padding：0 8px，圓角：20px
已套用：#E8F9EE 底，#006E2B 文字
未套用：#F3F3F8 底，#3C4A3C 文字
```

### 主要按鈕（CTA）

```
高度：40px（一般）/ 52px（全寬）
圓角：8px
背景：linear-gradient(135deg, #06C755, #006E2B)
文字：白色，14px Bold
hover：opacity 0.92 + translateY -1px
loading：spinner + 禁用
```

### Ghost Button（次要）

```
背景：透明
邊框：1px solid rgba(60,74,60,0.2)
文字：#3C4A3C，14px
hover：#F3F3F8 背景
```

### Toast 通知

```
位置：右下角 fixed，寬 320px
高度：44px，圓角：8px
成功：#06C755 底，白字
失敗：#C0000A 底，白字
動畫：slide-up 200ms；fade-out 300ms；2 秒後自動消失
```

### Skeleton Loading

```
背景：#E2E2E7
動畫：shimmer（從左到右漸層掃過，1.5s loop）
形狀：對應實際元件（文字行、頭像圓形、卡片矩形）
```

### Modal

```
遮罩：rgba(0,0,0,0.4)
卡片：#FFFFFF，圓角 16px，padding 24px，shadow-popover
動畫：fade-in + scale(0.96→1) 200ms
```

---

## 9. 互動原則

### Hover 狀態

```
列表項目：背景 #F3F3F8，transition 150ms
卡片：shadow 加深，translateY -2px，transition 200ms
按鈕：CTA opacity 0.92；Ghost #F3F3F8 背景
連結：#006E2B 文字，底線
```

### Loading 狀態

- 全頁載入：Skeleton（不用 Spinner）
- 按鈕操作中：按鈕內 spinner + 文字「處理中...」，禁用整個表單

### 空狀態（每個列表頁必須設計）

```
中央：插圖 + 說明文字（14px #3C4A3C）+ CTA 按鈕
```

---

## 10. 資料對應表（API → UI）

| UI 顯示 | API 欄位 | Null 處理 |
|--------|---------|---------|
| 聯絡人姓名 | `contact.display_name` | 不會 null |
| 公司名稱 | `contact.company_name` | 顯示「未填寫」|
| 職稱 | `contact.title` | 顯示「未填寫」|
| 案件公司名 | `deal.entity_name` | 不會 null |
| 案件公司連結 | `deal.company_contact_id` | null → 純文字；有值 → 連結 |
| Stage | `deal.stage` | 對照 Stage Badge 色表 |
| 互動情緒 | `activity.sentiment` | 對照三色圓點 |
| AI 摘要 | `activity.ai_key_insights[]` | 最多 3 條，各 ≤30 字 |

---

## 11. 交付物清單

### P0（第一波，優先交付）

| 頁面 | 需交付的狀態 |
|------|------------|
| AppShell（Sidebar + Header） | 正常、Sidebar 收縮（1024px）|
| 聯絡人列表 `/contacts` | 正常、搜尋中、空狀態、載入中 |
| 聯絡人詳情 `/contacts/:id` | 正常（含完整欄位）、欄位 null 狀態 |
| 聯絡人 CRM 視角 Tab | 案件列表、互動時間軸、待辦清單 |
| Pipeline 看板 `/deals` | 正常、hover 卡片、is_pending 卡片 |
| 待辦清單 `/actions` | 今日/本週、完成動畫、過期狀態、空狀態 |

### P1（第二波）

| 頁面 | 需交付的狀態 |
|------|------------|
| 案件詳情 `/deals/:id` | Split-pane 正常、時間軸、利害關係人 |
| Pipeline 儀表板 `/pipeline` | 管理員視角、AI 助理側邊欄 |

### 每個頁面都需要包含

- 正常狀態（有 mock 資料）
- 載入中（Skeleton）
- 空狀態（Empty State）
- 錯誤狀態（Error State，簡單的「載入失敗，請重試」即可）

---

## 12. Mock Server 使用說明

```bash
# 安裝
npm install -g @stoplight/prism-cli

# 啟動（需在專案根目錄）
prism mock docs/references/api-contract/v1.0-openapi.yaml --port 3001

# 常用端點
http://localhost:3001/api/v1/contacts
http://localhost:3001/api/v1/deals
http://localhost:3001/api/v1/actions
http://localhost:3001/api/v1/pipeline/summary
```

---

*本文件更新日期：2026-04-22*  
*API 契約：`docs/references/api-contract/v1.0-openapi.yaml`*  
*LIFF App 規格：`docs/product/01_features/liff-app/designer-brief.md`*
