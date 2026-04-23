# LIFF App — UI 設計規格書（Designer Brief）

**版本**：2026-04-21  
**適用對象**：UI 設計師 + 前端工程師  
**範疇**：LINE LIFF App（Mobile，在 LINE 內嵌開啟）  
**Claude Design 現有初稿**：已完成初版，本文件包含 2026-04-15 review 後的修改指示  
**API 契約**：`docs/references/api-contract/v1.0-openapi.yaml`

---

## 0. 給設計師的注意事項

本文件整合兩份設計規格（UI Designer Brief + UX 設計規範），**設計師只需讀這一份**，即可完成 LIFF App 的設計稿、切版、前端程式並交付。

**Claude Design 初稿已存在，本次任務是「修改 + 完善」，不是從零開始。**  
修改清單見第 9 節（Claude Design Review 行動清單）。

---

## 1. 產品定位與設計哲學

### 核心定位

**「業務員的隨身 AI 助理」**——以語音紀錄、自動建檔、Next-Step 驅動為核心的對話式 CRM。

LIFF App 是**手機主戰場**：業務員在外移動時使用，強調極速輸入與快速查閱。  
操作路徑必須極短，按鈕要大（單手戶外操作），盡量用語音取代鍵盤。

### 設計哲學：Agentic UI

**捨棄繁瑣表單，讓 AI 成為協作者。**

傳統 CRM：使用者填表 → 資料進系統  
我們的方向：使用者說話/拍照 → AI 解析 → 使用者確認 → 自動歸檔

每個 UI 決策都應問：「這個步驟能讓 AI 替使用者做嗎？」

### 競品參考重點

**Popl（學習視覺語言）**：
- Card-based UI：聯絡人資訊封裝為虛擬名片，符合用戶心智模型
- 高階專業感：資訊密度高但不雜亂

**Covve（學習 AI 等待體驗）**：
- 等待 ≠ 無聊：AI 處理時顯示動態進度文字，將等待轉化為期待
- 敘事驅動：AI 結果呈現為「人物誌摘要卡片」，不是生硬欄位列表
- 破冰話題優先：社交切入點比電話號碼更搶眼

---

## 2. 使用情境與用戶

| 角色 | LIFF 使用情境 | 核心需求 |
|------|-------------|---------|
| **業務員** | 剛走出客戶辦公室、展場攤位旁、通勤中 | 30 秒完成紀錄；快速找到某人的聯絡方式 |
| **業務主管** | 開會前確認今日待辦；查看特定客戶進度 | 一鍵看 Next Steps；不需打開電腦 |

**使用環境限制**：
- 單手操作、戶外強光、移動中
- 網路可能不穩（需有 loading state 防止重複點擊）
- LINE 內嵌（tall 模式，無瀏覽器 back button）

---

## 3. Design System

### 3-A. 主題

**Light Mode**（與現有 Claude Design 初稿一致，延續 LINE 品牌視覺）  
Dark Mode 列為未來選項，本期不實作。

### 3-B. 色彩 Tokens

```
/* 主品牌色 */
--color-primary:          #06C755   /* LINE Green，主要 CTA、active 狀態 */
--color-primary-dark:     #006E2B   /* 深綠，文字/icon（AAA 無障礙對比） */
--color-primary-light:    #E8F9EE   /* 淡綠，hover / selected 背景 */

/* 背景層次（用色階取代分隔線）*/
--color-bg-base:          #F9F9FE   /* 頁面底色 */
--color-bg-section:       #F3F3F8   /* Section 底色 */
--color-bg-card:          #FFFFFF   /* 卡片底色 */
--color-bg-input-empty:   #E2E2E7   /* 空白 input 背景 */

/* 文字 */
--color-text-primary:     #1A1A1A
--color-text-secondary:   #3C4A3C
--color-text-disabled:    rgba(60,74,60,0.5)

/* 邊框 */
--color-outline:          rgba(60,74,60,0.2)
--color-focus-ring:       #06C755

/* 狀態色 */
--color-danger:           #C0000A
--color-warning:          #F59E0B
--color-success:          #06C755

/* AI 內容專屬（漸層，標示 AI 生成欄位）*/
--color-ai-gradient:      linear-gradient(90deg, #06C755 0%, #0A84FF 100%)
--color-ai-surface:       rgba(10,132,255,0.06)  /* AI 區塊淡藍底色 */
```

### 3-C. 字體

```
標題、數字、大標：Plus Jakarta Sans
內文、標籤、密集資訊：Inter
繁體中文補字：Noto Sans TC（Inter 不含的字）

所有 UI 文字使用繁體中文；Email / URL 等資料內容保持原文
```

### 3-D. 元件規格

```
/* 圓角 */
--radius-card:    16px
--radius-button:  8px
--radius-input:   8px
--radius-chip:    20px
--radius-modal:   16px   /* Bottom Sheet 上方圓角 */

/* 間距 */
--space-1: 4px  --space-2: 8px  --space-3: 12px
--space-4: 16px --space-6: 24px

/* LIFF 頁面 padding */
水平 padding：16px
Bottom Nav 高度：56px（所有可捲動內容需加底部 padding 56px）
Top Bar 高度：48px
```

### 3-E. No-Line Rule

不使用 1px 實線分隔 section，改用背景色階：

```
頁面底色 #F9F9FE
  └── Section #F3F3F8
        └── 卡片 #FFFFFF
              └── Input focus：2px border #06C755
```

唯一例外：Bottom Nav 頂部使用 1px `rgba(60,74,60,0.2)` 幽靈線。

---

## 4. LIFF 技術限制（設計前必讀）

| 限制 | 說明 |
|------|------|
| 畫面尺寸 | tall 模式（約 90% 螢幕高度），設計以 **375px 寬**為主（2× 輸出 780px） |
| 沒有瀏覽器 Back | 離開 LIFF = 回到 LINE，**最多兩層導覽**（例：總表 → 詳情，不再往下） |
| 身份已確認 | 開啟時已有 LINE 登入，**不需設計登入頁** |
| Loading 必須存在 | 所有表單送出、資料載入都需要 loading 狀態，防止重複點擊 |
| Bottom Nav 固定 | 所有可捲動內容計算 56px 底部偏移 |
| Top Bar 捲動行為 | 使用 glassmorphism（80% 不透明 + 20px backdrop-blur），內容可從下方通過 |

---

## 5. 整體導覽架構

### Bottom Navigation Bar（全 LIFF 頁面共用）

```
高度：56px，白底
頂部：1px rgba(60,74,60,0.2) 幽靈線
位置：固定在底部

┌────────────────────────────┐
│  [名片]    [CRM]    [設定]  │
│   icon     icon     icon   │
│   文字     文字     文字   │
└────────────────────────────┘
```

| Tab | Icon | 標籤 | 路由 |
|-----|------|------|------|
| 名片 | 名片 icon | 名片 | `#/cards` |
| CRM | 圖表 icon | CRM | `#/crm` |
| 設定 | 齒輪 icon | 設定 | `#/settings` |

- Active：icon + 文字 `#006E2B`，下方 3px 圓點指示器
- Inactive：icon + 文字 `#3C4A3C` 50% 透明

### 頁面層級

```
LIFF App
├── 名片 Tab
│   ├── 名片總表（首頁）
│   └── 名片詳情（第二層，← 可返回總表）
│       ├── 名片編輯（第二層 Modal/Sheet，不算額外層）
│       └── 標籤套用（第二層 Modal/Sheet）
│
├── CRM Tab
│   ├── 待辦清單（首頁）
│   └── 聯絡人 CRM 視角（第二層）
│
└── 設定 Tab
    └── 團隊管理（含管理員功能）
```

---

## 6. 頁面規格

---

### 6-A. 名片總表（名片 Tab 首頁）

**API**：`GET /api/v1/contacts`

#### 元件由上到下

**① Top Bar**（高 48px，白底，glassmorphism，sticky）
```
左：✕ 關閉 LIFF
中：「名片總表」（Plus Jakarta Sans, 16px Bold）
右：⋮ 更多選項
```

**② 搜尋列**（高 44px）
```
背景：#E2E2E7（focus 時 #FFFFFF）
圓角：8px
左側：🔍 icon（16px）
Placeholder：「搜尋姓名、公司、職稱…」（14px，#3C4A3C 50%）
Focus：2px border #06C755
即時搜尋（不需按送出，300ms debounce）
```

**③ 篩選 Tab 列**（高 40px，橫向捲動）
```
預設 tab：全部名片 · 最近新增
動態 tab：各組織標籤名稱
間距：8px

Active：#06C755 底色白字，圓角 20px
Inactive：#F3F3F8 底色 #3C4A3C 文字，圓角 20px

注意：「我的最愛」功能本期不實作
```

**④ 筆數提示**（12px，#3C4A3C，padding-top 8px）
```
預設：「共 N 張名片」
搜尋中：「找到 N 筆」        ← 【Claude Design 待修改】補上此狀態
搜尋無結果：「找不到符合『○○』的名片」
```

**⑤ 名片列表**（每筆高 72px）
```
卡片：#FFFFFF，圓角 16px，垂直間距 8px

左：頭像縮圖 48×48px，圓角 8px
    有照片 → 名片縮圖
    無照片 → 姓名首字，#F3F3F8 底

中：姓名（16px Bold，#1A1A1A）
    公司 · 職稱（14px，#3C4A3C）
    標籤 chips（12px，#06C755 邊框，#E8F9EE 底）

右：建立日期（12px，#3C4A3C 50%）
```

**⑥ FAB 新增按鈕**（固定在 Bottom Nav 上方）
```
高：52px，全寬
背景：linear-gradient(135deg, #06C755, #006E2B)
文字：「＋ 新增名片」（白色，16px Bold）
圓角：8px
```

#### 互動狀態

| 狀態 | 顯示 |
|------|------|
| 載入中 | 3 張 Skeleton card（#E2E2E7，shimmer 動畫） |
| 空狀態 | 中央插圖 + 「還沒有任何名片」(14px 灰) + 「📷 新增第一張名片」全寬綠色按鈕 |
| 搜尋無結果 | 插圖 + 「找不到符合『○○』的名片」+ 「清除搜尋」連結（#006E2B） |

---

### 6-B. 名片詳情頁（第二層）

**API**：`GET /api/v1/contacts/:id`

#### 元件由上到下

**① Top Bar**
```
左：← 返回（回到總表）
中：「名片詳情」
右：✕ 關閉 LIFF
```

**② 名片照片預覽區**（高 140px，#F3F3F8 底）

> **設計原則（Human-in-the-loop）**：台灣商務人士習慣核對資訊，名片原圖必須保留可見，是信任感的來源。

```
有照片：名片縮圖，點擊全螢幕放大（加 ✕ 關閉）
無照片：「尚無名片照片」灰字（置中）
```

**③ 主要資訊區**（#FFFFFF 卡片，padding 16px）
```
姓名（20px Bold）
職稱（14px，#3C4A3C）
公司（14px，#3C4A3C）
```

**④ 聯絡資訊列表**（每行高 48px）
```
格式：[icon] 資料內容 ............. [複製 icon]

📞 電話    ✉️ Email
📱 手機    💬 LINE ID
📍 地址（佔滿寬度）
🌐 網站（company 專屬）

未填寫：顯示「未填寫」（#3C4A3C 50%），不隱藏整行
```

**⑤ 備忘錄區塊**（#F3F3F8 底，padding 12px，圓角 8px）
```
標題：「📝 備忘錄」（12px label，#3C4A3C）
內容：備忘錄文字（14px）
空值：「尚未新增備忘錄」（灰字）+ 「＋ 快速新增」連結  ← 【Claude Design 待新增】
點擊「快速新增」→ inline 展開 textarea（不跳頁）
```

**⑥ 群組標籤區塊**
```
標題：「🏷 群組標籤」（12px label）
標籤 chips 橫排
無標籤：「尚未分類」（灰字）
```

**⑦ 底部操作列**（固定，高 56px，白底，3 等寬按鈕）
```
✏️ 編輯   →  開啟編輯 Bottom Sheet
🏷 群組   →  開啟標籤 Bottom Sheet
📲 QR Code →  展開 QR Modal
```

---

### 6-C. 名片編輯頁（Bottom Sheet，非跳頁）

**API**：`PATCH /api/v1/contacts/:id`

Bottom Sheet 從底部滑入（不是獨立頁面，不佔導覽層級）。

#### 結構

**Top Bar（Sheet 頂部）**
```
左：「取消」（ghost 按鈕，#3C4A3C）
中：「編輯名片」（16px Bold）
右：「儲存」（#006E2B 文字；載入中變灰禁用）
```

**名片照片縮圖**（72×72px，圓角 8px，左對齊）
```
右側說明：「對照原始照片修正」（14px，#3C4A3C 50%）
點擊可全螢幕預覽
```

**表單欄位**（每欄：label 12px 灰 + input 44px）

```
必填標記：label 右側 * (#C0000A)

欄位順序：
  姓名 *（display_name）
  職稱
  公司（company_name，denormalized）
  電話
  手機
  Email
  地址
  備忘錄（多行，88px）

有值狀態：#FFFFFF 底，黑字，右側 ✕ 清空 icon
空欄位：#E2E2E7 底，灰色 placeholder
Focus：#FFFFFF 底 + 2px #06C755 border
```

**底部主要按鈕**（全寬，52px）
```
背景：linear-gradient(135deg, #06C755, #006E2B)
文字：「更新名片」（白色，16px Bold）
```

#### 互動狀態

| 狀態 | 顯示 |
|------|------|
| 儲存中 | 按鈕顯示 spinner + 「更新中…」；表單全部禁用 |
| 儲存成功 | 頂部 Toast 綠色「✅ 名片已更新」→ 1.5 秒後 Sheet 自動關閉 |
| 儲存失敗 | 頂部 Toast 紅色「⚠️ 儲存失敗，請重試」；Sheet 不關閉，表單恢復可互動 |

---

### 6-D. 標籤套用 / 管理頁（Bottom Sheet）

**API**：`GET /api/v1/contacts`（tags 欄位）

兩個 Tab 共用同一個 Sheet。

#### Tab 1：此名片標籤（預設）

**Top Bar**
```
左：✕ 取消
中：「選擇群組標籤」
右：「確認」（#006E2B）
```

**Tab 切換**（高 40px，全寬，active tab 底部 2px #06C755 線）
```
此名片標籤  |  所有標籤
```

**說明文字**（12px，#3C4A3C）
```
「為這張名片選擇群組標籤（可多選）」
姓名（16px Bold）← 【Claude Design 待修改】字體調大
```

**標籤 chips 區域**（流式排列，間距 8px）
```
已套用：#06C755 底白字 + ✓ icon
未套用：#F3F3F8 底 #3C4A3C 文字
```

**建立新標籤**（chip 樣式）
```
「+ 新標籤」虛線邊框
點擊 → inline 展開輸入框 + Enter 確認
```

**管理員入口**（Tab 1 底部，管理員限定）  ← 【Claude Design 待新增】
```
「管理所有標籤 →」（14px，#006E2B 文字連結）
點擊 → 切換至 Tab 2
```

#### Tab 2：所有標籤

**新增輸入框**（管理員限定）
```
inline：[輸入框] [＋ 按鈕]
```

**標籤列表**（每行高 48px）
```
● 色點（隨機）+ 標籤名（16px）+ 使用次數（12px 灰）+ 🗑（管理員限定）
成員視角：無 🗑、無新增輸入框
```

**刪除確認 Bottom Sheet**（覆蓋在標籤 Sheet 上方）
```
背景：rgba(255,255,255,0.8) + backdrop-blur 20px
滑入動畫：從底部

標題：「刪除「VIP客戶」？」（16px Bold）
說明：「此標籤已用於 N 張名片，刪除後無法復原」（14px，#3C4A3C）  ← 【Claude Design 待確認】N 的數量顯示
按鈕：「取消」（ghost）+ 「刪除」（#C0000A 底白字）
```

---

### 6-E. 待辦清單（CRM Tab 首頁）

**API**：`GET /api/v1/actions?status=pending`

#### 元件由上到下

**Top Bar**
```
左：✕ 關閉 LIFF
中：「待辦事項」
右：篩選 icon
```

**分類 Tab**（高 40px）
```
今日到期 · 本週 · 全部 · 已完成
```

**待辦列表**（每筆高 64px，#FFFFFF 卡片，圓角 8px，間距 8px）
```
左：○ checkbox（點擊 → 完成動畫）
中：任務描述（14px Bold）
    關聯：聯絡人名稱 / 案件名稱（12px，#3C4A3C）
右：到期日標示
```

**到期日視覺規則**
```
今日到期：#C0000A 文字 + ⚠️
已過期：  #C0000A 文字 + ‼️（加粗）
未來：    #3C4A3C 文字 + 📅
```

**完成動畫**：checkbox 勾選 → 文字加刪除線 + fade-out 300ms → 移至「已完成」Tab

---

### 6-F. 聯絡人 CRM 視角（CRM Tab 第二層）

**API**：`GET /api/v1/contacts/:id/crm`

從待辦點擊聯絡人名稱，或名片詳情頁點「CRM 視角」按鈕進入。

#### 元件

**Top Bar**
```
左：← 返回
中：聯絡人姓名（或公司名）
右：✕ 關閉
```

**Tab**
```
案件 (N)  |  互動記錄 (N)  |  待辦 (N)
```

**案件列表**（每筆）
```
┌────────────────────────────────┐
│ 公司名（16px Bold）  [Stage]   │
│ 預估 $XXX,XXX                  │
│ 狀態摘要（14px，#3C4A3C）        │
│ 下次行動 2026-05-01            │
└────────────────────────────────┘
```

Stage Badge 顏色：
- 0~2：`#E8F9EE` 底 `#006E2B` 字
- 3~5：`#FEF9C3` 底 `#854D0E` 字
- 6：`#DBEAFE` 底 `#1E40AF` 字
- 成交：`#06C755` 底白字
- 失敗：`#FEE2E2` 底 `#C0000A` 字

**互動記錄時間軸**
```
  ●  2026-04-18  [Positive 🟢]
  │  AI 摘要 1（14px）
  │  AI 摘要 2
  │  [展開原文 ↓]（12px，#006E2B）
  │
  ●  2026-04-10  [Neutral 🟡]
```

Sentiment 圓點：Positive `#06C755`・Neutral `#F59E0B`・Negative `#C0000A`

AI 摘要欄位旁加 `--color-ai-gradient` 左側 3px border，標示此為 AI 生成內容。

---

### 6-G. 團隊管理頁（設定 Tab）

**元件由上到下**

**Top Bar**
```
左：✕ 關閉
中：「名片管理員」
```

**團隊名稱區**（#F3F3F8 底，padding 16px）
```
標籤：「工作室」（12px 灰）
團隊名稱（20px Bold）+ 右側 ✏️（管理員限定）
點 ✏️ → inline 展開輸入框 + 「儲存」按鈕，不跳頁
```

**邀請連結區塊**（#FFFFFF 卡片，管理員限定）
```
狀態 badge + 邀請連結文字（可複製）
「複製連結」（secondary 按鈕）→ 點後變「已複製 ✓」1.5 秒後恢復
「📋 複製邀請給成員」（全寬主要按鈕，#06C755）
```

**成員列表**（標題「成員（N）」）
```
每行高 56px：
頭像 32px + 名稱（16px）+ 角色 tag（管理員/成員）+ 🗑（管理員限定）
超過 5 筆顯示「顯示更多成員」展開按鈕
```

---

## 7. AI 專屬 UX 模式

### 7-A. AI 等待畫面（OCR 處理中）

參考 Covve 的等待體驗設計，將等待轉化為「AI 魔力的展現」。

```
畫面中央：
  [動畫 logo 或波紋效果]
  
  動態進度文字（每 2 秒切換）：
  「正在萃取名片文字...」
  「正在比對繁體中文欄位...」
  「正在透過 AI 整理資訊...」
  「即將完成...」
  
底部：
  進度條（#06C755，animate）
  「通常需要 5-10 秒」（12px 灰）
```

### 7-B. AI 確認卡片（CRM 解析結果）

語音 Recap 或文字輸入後，AI 回傳結構化預覽。

```
┌────────────────────────────────────┐
│ AI 已整理好以下資訊                   │
│ ─────────────────── [AI 漸層邊框]    │
│                                    │
│ 案件更新                            │
│  台積電  初步接觸 → 需求確認          │
│                                    │
│ 新聯絡人                            │
│  王總（從名片解析）                   │
│  助理小李                           │
│                                    │
│ 下一步行動                          │
│  □ 04/28 報價給王總                 │
│  □ 寄產品型錄給小李                  │
│                                    │
│ [👍 確認無誤]    [✏️ 編輯]          │
└────────────────────────────────────┘
```

- 整張卡片有 `--color-ai-gradient` 頂部 3px border
- AI 生成欄位加 `--color-ai-surface` 背景底色
- 確認按鈕：#06C755；編輯按鈕：ghost 樣式

### 7-C. 無縫複製閉環（LIFF Copy Pattern）

複製動作後的 Toast：

```
位置：頂部 Bar 下方，全寬 slide-down
高度：44px
背景：#06C755
文字：「✅ 已複製，關閉視窗後直接貼上」
消失：2 秒後 fade-out
```

---

## 8. 共用元件規格

### Toast 規格（全 LIFF 共用）

```
位置：頂部 Bar 下方，全寬，貼邊（圓角 0px）
高度：44px
成功：#06C755 底，白字
失敗：#C0000A 底，白字
出現：slide-down 200ms
消失：fade-out 300ms，2 秒後自動消失
```

### Skeleton Loading

所有資料載入用 Skeleton（不用 Spinner）：

```
背景：#E2E2E7
動畫：shimmer（左→右漸層掃過，1.5s loop）
形狀：對應實際元件（文字行、頭像圓形、卡片矩形）
```

### Bottom Sheet

```
背景：#FFFFFF
上方圓角：16px
把手條：40×4px，#E2E2E7，居中，margin-top 8px
遮罩：rgba(0,0,0,0.4)
動畫：slide-up 250ms ease-out；關閉 slide-down 200ms
```

### Confirm Modal

```
背景：rgba(255,255,255,0.8) + backdrop-blur 20px
圓角：16px
標題：16px Bold
說明：14px，#3C4A3C
按鈕組：ghost「取消」+ danger「確認刪除」
```

---

## 9. Claude Design Review 行動清單

> 以下為 2026-04-15 初稿 review 後的修改項目，**本次必須完成**。

### 🔴 高優先（必須修改）

- [ ] **全面繁體中文化**：修改所有英文 UI 字串
  - "Card Manager" → 「名片管理員」
  - "Edit Card Details" → 「編輯名片」
  - "Update Card" → 「更新名片」
  - "Cards / Team / Settings" → 「名片 / CRM / 設定」

- [ ] **標籤套用頁補上管理員入口**：Tab 1 底部加「管理所有標籤 →」連結，點擊跳至 Tab 2

### 🟡 中優先

- [ ] **名片總表補上筆數提示**：搜尋後在 Tab 列下方顯示「找到 N 筆」

- [ ] **Toast 位置統一**：儲存失敗的錯誤提示移至頂部 Bar 下方（與成功 Toast 位置一致）

- [ ] **名片詳情補上備忘錄快捷操作**：詳情頁可直接 inline 展開輸入備忘錄，不需進入完整編輯頁

### 🟢 低優先（待確認）

- [ ] 標籤刪除確認 Bottom Sheet：確認是否顯示「此標籤已用於 N 張名片」的數量

- [ ] 標籤套用頁名片資訊：姓名字體調大至 16px Bold

---

## 10. 交付物清單

### 設計稿（Claude Design 修改版）

| 頁面 | 需交付的狀態 |
|------|------------|
| 名片總表 | 正常、搜尋中（含「找到 N 筆」）、搜尋無結果、空狀態、載入中 |
| 名片詳情 | 正常（含備忘錄快捷展開）、照片 / 無照片 |
| 名片編輯 Sheet | 正常、儲存中、儲存成功 Toast、儲存失敗 Toast |
| 標籤套用 Sheet | Tab 1（含管理員入口）、Tab 2（管理員 / 成員視角）、刪除確認 |
| 待辦清單 | 正常（今日/本週）、完成動畫、過期狀態、空狀態 |
| CRM 視角 | 案件列表、互動時間軸（含 AI 標示）、待辦 |
| 團隊管理 | 成員視角、管理員視角、載入中 |
| AI 等待畫面 | 動態進度文字（4 個狀態） |
| AI 確認卡片 | 正常、編輯模式 |

### 前端程式（設計師交付）

- 所有元件的 HTML/CSS（或 JSX）
- Loading / Empty / Error 狀態視覺
- 動畫效果（Toast slide-down、Bottom Sheet slide-up、Skeleton shimmer）
- Bottom Nav 切換邏輯（純前端路由）

### 前端工程師（我）負責，設計師不需要處理

- API client 層
- 資料綁定（`useContacts()`, `useActions()` 等 hooks）
- Null 欄位 fallback 邏輯
- AUTH token 處理

### 選擇性交付

- [ ] 可點擊 Prototype（Claude Design 匯出）
- [ ] 元件標注稿

---

## 11. Mock Server 使用說明

設計師開發期間的資料來源：

```bash
npm install -g @stoplight/prism-cli
prism mock docs/references/api-contract/v1.0-openapi.yaml --port 3001

# LIFF 開發可用 ngrok 建立公開 URL
ngrok http 3001
```

所有回應依 OpenAPI schema 自動生成。`nullable` 欄位會隨機回傳 null 或有值，確保設計師測試兩種狀態。

---

*本文件更新日期：2026-04-21*  
*API 契約：`docs/references/api-contract/v1.0-openapi.yaml`*  
*Web App 規格：`docs/product/01_features/web-app-crm/designer-brief.md`*
