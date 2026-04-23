# PRD — Account / Contact 雙視角聯絡人模型

**版本**：v1.0（2026-04-22）  
**狀態**：待開發  
**PM**：David  
**範疇**：Web App（桌面）+ LIFF（手機）後端資料模型  

---

## 1. 背景與問題

現有系統將「公司」與「個人」都存在同一個 `contacts` 集合，欄位不分型別一律相同。實際使用上：

- 業務員拜訪的是**個人**（王協理），但業務關係綁在**公司**（台積電）
- 現在看不到「台積電底下有哪些聯絡人」
- 公司層級缺乏產業、網站等欄位；個人層級缺乏部門、座機欄位
- 案件（Deal）掛在公司，但 Next Step 的執行對象是個人 → 兩個視角目前無法互通

參考：Salesforce Account（公司）/ Contact（個人）雙層架構，是 B2B CRM 的業界標準。

---

## 2. 目標

1. 讓業務員在公司頁看到「這家公司有哪些窗口」
2. 讓業務員在個人頁看到「這個人在哪家公司、我們有什麼案件」
3. 欄位依型別分化，減少空欄位干擾
4. 不破壞現有資料（schema 向後相容）

---

## 3. 使用者故事

**業務員（一般成員）**

> 我拜訪台積電採購部，名片上有王協理和李專員兩個人。我希望把他們都掛在「台積電」底下，以後查台積電就能看到所有窗口和我們的往來紀錄。

> 我要快速找到王協理的手機號，不想看到一堆公司欄位（產業、網站）。

**業務主管（管理員）**

> 我要看台積電這個帳戶，所有業務員跟他們的互動、進行中的案件、下一步行動一覽無遺。

---

## 4. 欄位規格

### 4-A. Account（公司）— `contact_type = "company"`

| 欄位 | 型別 | 現有/新增 | 說明 |
|------|------|---------|------|
| `display_name` | string | 現有 | 公司簡稱（台積電）|
| `legal_name` | string? | 現有 | 法定全名（台灣積體電路製造股份有限公司）|
| `industry` | string? | **新增** | 產業別（半導體、金融、製造...）|
| `website` | string? | **新增** | 公司網站 |
| `employee_count` | int? | **新增** | 員工人數（規模參考）|
| `phone` | string? | 現有 | 公司總機 |
| `address` | string? | 現有 | 公司地址 |
| `memo` | string? | 現有 | 備忘錄 |
| `tags` | [string] | 現有 | 分類標籤 |

**移除或隱藏（公司不適用）**：`mobile`、`line_id`、`title`、`department`

---

### 4-B. Contact（個人）— `contact_type = "person"`

| 欄位 | 型別 | 現有/新增 | 說明 |
|------|------|---------|------|
| `display_name` | string | 現有 | 姓名（王大明）|
| `title` | string? | 現有 | 職稱（採購協理）|
| `department` | string? | **新增** | 部門（採購部）|
| `parent_company_id` | string? | 現有 | 所屬公司 FK |
| `company_name` | string? | 現有 | 公司名（denormalized，供搜尋）|
| `mobile` | string? | 現有 | 個人手機 |
| `work_phone` | string? | **新增** | 公司座機 |
| `email` | string? | 現有 | Email |
| `line_id` | string? | 現有 | LINE ID |
| `memo` | string? | 現有 | 備忘錄 |
| `tags` | [string] | 現有 | 分類標籤 |

**移除或隱藏（個人不適用）**：`website`、`industry`、`employee_count`、`legal_name`

---

## 5. UI 規格

### 5-A. 聯絡人列表（Web App `/contacts`）

左側列表加入型別切換：

```
[全部] [公司 Account] [個人 Contact]
```

- 篩選 Account 時：列表每行顯示公司名 + 產業 + 底下聯絡人數量
- 篩選 Contact 時：列表每行顯示姓名 + 職稱 + 所屬公司名

---

### 5-B. Account 詳情頁（公司視角）

```
┌─────────────────────────────────────────────┐
│ 台積電                          [編輯] [⋮]  │
│ 半導體 · tsmc.com · 約 70,000 人             │
│ 📞 總機：+886-3-563-6688                     │
│ 📍 新竹科學園區...                            │
│ 📝 備忘錄...                                 │
│ 🏷 [VIP] [半導體]                            │
├─────────────────────────────────────────────┤
│ 聯絡人（3）                      [＋ 新增]   │
│  王大明  採購協理   採購部   📱 091x-xxx      │
│  李小花  業務窗口   業務部   ✉️  li@tsmc.com  │
│  陳主任  IT部門主管  IT部   📱 092x-xxx      │
├─────────────────────────────────────────────┤
│ 案件 (2)  |  互動記錄 (8)  |  待辦 (1)       │
└─────────────────────────────────────────────┘
```

- 聯絡人子列表點擊 → 進入個人 Contact 詳情
- 「＋ 新增」→ 新增 Contact 並自動 pre-fill `parent_company_id`

---

### 5-C. Contact 詳情頁（個人視角）

```
┌─────────────────────────────────────────────┐
│ 王大明  採購協理                 [編輯] [⋮]  │
│ 採購部                                       │
│ 🏢 台積電  →（點擊進入公司頁）                │
│ 📱 手機：091x-xxx-xxx                        │
│ 📞 座機：+886-3-563-xxxx 分機 123            │
│ ✉️  wang@tsmc.com                            │
│ 💬 LINE ID：wang_mm                          │
│ 📝 備忘錄...                                 │
├─────────────────────────────────────────────┤
│ 案件 (1)  |  互動記錄 (3)  |  待辦 (2)       │
└─────────────────────────────────────────────┘
```

- 公司名稱可點擊，跳至 Account 詳情頁
- 僅顯示有值的欄位（null 不佔行）

---

### 5-D. 新增 / 編輯表單欄位分化

**Account 表單欄位**：公司名稱\*、法定名稱、產業別、網站、總機、地址、備忘錄、標籤  
**Contact 表單欄位**：姓名\*、職稱、部門、所屬公司（下拉選現有 Account）、手機、座機、Email、LINE ID、備忘錄、標籤

---

## 6. 迭代規劃

### Iteration 1 — 後端 Schema 擴充（後端，約 0.5 天）

**目標**：擴充欄位，不動現有資料，API 向後相容。

- [ ] `app/models/card.py`：`Contact` model 新增 `industry`、`website`、`employee_count`、`department`、`work_phone`
- [ ] `app/repositories/contact_repo.py`：確認 `update` 方法正確寫入新欄位
- [ ] `app/api/liff.py` + `app/api/crm.py`：`PUT /contacts/:id` 接收新欄位（`ContactUpdate` model 更新）

**驗收**：`PUT /api/v1/contacts/:id` 可寫入 `industry`、`department` 等新欄位並正確讀出。

---

### Iteration 2 — Account 子聯絡人 API（後端，約 0.5 天）

**目標**：提供「公司底下的聯絡人列表」端點。

- [ ] `GET /api/v1/contacts/:id/members`：回傳同 org 下 `parent_company_id == id` 的所有 Contact

**驗收**：呼叫 `/contacts/{台積電id}/members` 回傳王大明、李小花等人員列表。

---

### Iteration 3 — Web App UI 分化（前端，約 2 天）

**目標**：Account / Contact 在 Web App 有不同視角。

- [ ] 聯絡人列表左側加 `[全部] [公司] [個人]` 篩選 Tab
- [ ] Account 詳情右側：補「聯絡人子列表」區塊（呼叫 Iter 2 新端點）
- [ ] Contact 詳情右側：公司名稱改為可點擊連結
- [ ] 新增 / 編輯表單：依 `contact_type` 顯示不同欄位集合
- [ ] Account 表單新增：產業別、網站、員工人數
- [ ] Contact 表單新增：部門、座機；所屬公司改為下拉選現有 Account

**驗收**：
- 篩選「公司」→ 台積電列表顯示底下有 N 位聯絡人
- 點進台積電 → 右側有聯絡人子列表
- 點王大明 → 顯示所屬公司連結，點連結跳回台積電

---

### Iteration 4 — LIFF 分化（前端，約 1 天）

**目標**：LIFF 名片詳情依型別顯示對應欄位。

- [ ] `CardDetail.js`：依 `contact_type` 條件渲染欄位
  - Company：顯示網站、總機、產業；隱藏個人手機、LINE ID
  - Person：顯示手機、座機、LINE ID、部門；顯示所屬公司（可點擊）
- [ ] `CardEdit.js`：表單欄位依型別切換

**驗收**：LIFF 開公司名片不顯示 LINE ID 欄位；開個人名片顯示部門欄位。

---

## 7. 不在本次範圍

- 現有舊資料的型別補標（既有名片 `contact_type` 未設定的處理）→ 之後另立 migration task
- Account Hierarchy（母公司 / 子公司多層）→ 現有 `parent_company_id` 只支援一層，多層之後再做
- 重複合併（Merge duplicate contacts）→ 獨立功能

---

## 8. 驗收標準（整體）

1. 業務員新增台積電（Account）後，可在同一頁新增王大明並自動關聯
2. 台積電詳情頁顯示底下所有聯絡人清單
3. 王大明詳情頁顯示所屬公司「台積電」並可點擊跳轉
4. 編輯台積電時只看到公司欄位；編輯王大明時只看到個人欄位
5. 現有已存名片資料全部正常顯示，無 breaking change

---

*更新日期：2026-04-22*
