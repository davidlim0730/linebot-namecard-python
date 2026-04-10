# GTM 素材總覽 — 智慧名片管理 LINE Bot

此文件夾整合所有與產品策略、市場推廣、功能規劃相關的素材，供 PM / 市場團隊參考。

---

## 📋 文件結構

```
docs/gtm/
├── README.md (本文件)
├── planning/                     ← 📅 規劃（未來願景）
│   ├── feature-planning.md       ├─ 功能模組詳細規劃 & 分層設計
│   └── roadmap.md                └─ 產品路線圖 & Phase 規劃
├── prd/                          ← 🏗️ 開發（進行中的規格）
│   └── 2026-04-07-trial-version-prd-v2.md  └─ 試用版 PRD
└── pr/                           ← 📢 發佈（已發行）
    ├── product-features.md       ├─ 完整功能清單 + Rich Menu 架構
    ├── RELEASE-NOTES-TEMPLATE.md ├─ 發版模板（每個版本一份）
    └── [date]-release-notes.md   └─ 實際發版說明
```

---

## 🎯 各文件用途

### 📅 Planning（規劃中）

**1. planning/roadmap.md**
   - **用途**：產品策略與長期規劃
   - **內容**：Phase 1-5 進度、設計原則、各階段驗收指標
   - **適合場景**：技術主管會議、利益相關方溝通、年度規劃

**2. planning/feature-planning.md**
   - **用途**：功能設計與分層邏輯
   - **內容**：功能模組整理、UI 分層建議、Rich Menu 3 層結構設計
   - **適合場景**：設計評審、開發討論、新功能規劃

### 🏗️ PRD（進行中開發）

**3. prd/2026-04-07-trial-version-prd-v2.md**
   - **用途**：功能規格書（進行中）
   - **內容**：完整規格、驗收標準、技術實現細節
   - **適合場景**：開發實作、QA 測試、設計評審
   - **流程**：PRD 完成 → 實作開發 → 上線發佈

### 📢 PR（已發佈）

**4. pr/product-features.md**
   - **用途**：對外推廣、客戶介紹、內部對齊
   - **內容**：已上線功能清單、Rich Menu 導覽、角色權限、技術亮點
   - **適合場景**：業務提案、網站功能介紹、售前資料

**5. pr/[date]-release-notes.md**
   - **用途**：版本發佈說明
   - **內容**：核心亮點、新功能、修復內容、已知限制、升級指南
   - **適合場景**：客戶公告、內部溝通、發版備忘
   - **流程**：PRD 開發完成 → 撰寫 Release Notes → 發佈 → 更新 product-features.md

---

## 💡 快速參考

| 角色 | 推薦閱讀 | 優先級 |
|------|---------|-------|
| 業務 / 行銷 | product-features.md, roadmap.md | ⭐⭐⭐ |
| PM | product-features.md, feature-planning.md, roadmap.md | ⭐⭐⭐ |
| 設計師 | feature-planning.md, product-features.md | ⭐⭐ |
| 開發工程師 | feature-planning.md, prd/ | ⭐⭐ |
| 技術主管 | roadmap.md, prd/ | ⭐⭐ |

---

## 📌 核心價值主張

**「用 LINE 就能管名片」**
- ✅ 無需額外安裝 App
- ✅ AI 自動辨識名片文字
- ✅ 團隊共享名片庫
- ✅ 智慧搜尋快速查找
- ✅ 與 CRM / 行銷工具無縫串接（Phase 4+）

---

## 🚀 當前進度

- **Phase 1-3**：已上線（名片管理、批量上傳、團隊協作、CSV 匯出、Google Sheets 同步）
- **Phase 4**：規劃中（CRM 串接、進階群組管理）
- **Phase 5**：待定（自動化追蹤、Follow-up 提醒）

---

---

## 📊 工作流程

```
規劃（Planning）→ 開發（PRD + Coding）→ 發佈（Release Notes + Product Features）
     ↓                    ↓                         ↓
  roadmap.md          prd/*.md          pr/release-notes.md
                                        pr/product-features.md
```

最後更新：2026-04-10
