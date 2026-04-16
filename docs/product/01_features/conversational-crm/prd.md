# PRD — Conversational CRM

**狀態**：後端已完成（含 CRM Schema Migration）/ LIFF 前端開發中
**負責人**：David Lin  
**計畫文件**：[docs/superpowers/plans/conversational-crm.md](../../superpowers/plans/conversational-crm.md)

---

## 產品目標

透過 AI 讓業務人員在 LINE 上用「說話」完成所有 CRM 操作——不需填表單，說完見客戶內容，系統自動整理成結構化資料寫入 Firebase。

**主介面**：LIFF App（取代 LINE Chat 單線對話）  
**輔助介面**：LINE Chat（推播通知 + 快速查詢指令）

---

## 目標用戶

台灣企業業務團隊，已使用 LINE 名片管理 Bot（`linebot-namecard-python`）的組織。

---

## 核心流程（Happy Path）

```
業務人員輸入：「剛見完台積電王總，他對我們的 Pro 方案很有興趣，
              下週三要寄報價，pipeline 到提案階段」

→ LIFF CrmInput 畫面
→ POST /crm/parse → Gemini NLU
→ 顯示預覽卡片：
    entity: 台積電（已連結名片：王總）
    stage: 提案（Stage 3）
    activity: 見面，sentiment: Positive
    action: 2026-04-23 寄報價
→ 用戶確認 → POST /crm/confirm
→ Firebase 寫入 deals / activities / actions
→ LIFF 跳轉 DealDetail
```

---

## 功能規格

### 1. NLU 解析（後端，已完成）

| 功能 | 說明 | 實作位置 |
|------|------|---------|
| `parse_text` | 呼叫 Gemini，注入 Grounding Context | `services/nlu_service.py` |
| `build_grounding_context` | 從 Firebase 讀取 contacts（display_name）+ deals，格式化為 prompt | `services/nlu_service.py` |
| `fuzzy_match_entity` | difflib，threshold 0.4，精確 → 包含 → 相似 | `services/nlu_service.py` |
| `auto_link_or_create_contact` | fuzzy match contacts（display_name + legal_name + aliases），找不到則建立公司型 Contact | `services/nlu_service.py` |
| `auto_link_namecard` | deprecated shim，保留向下相容 | `services/nlu_service.py` |

### 2. CRM 資料模型（後端，已完成）

> **Schema Migration 完成（2026-04-16）**：namecard/ → contacts/，Contact-centric 架構，Deal/Activity/Action 改用 FK。

| Model | 重點欄位 |
|-------|---------|
| `Contact` | contact_type(company/person), display_name, legal_name, aliases[], parent_company_id, source |
| `Deal` | company_contact_id(FK), poc_contact_id(FK), entity_name(cache), stage(0–6/成交/失敗), est_value |
| `Activity` | contact_id(FK), deal_id(FK), raw_transcript, ai_key_insights[3], sentiment |
| `Action` | contact_id(FK), deal_id(FK), task_detail, due_date, status(pending/completed) |
| `Stakeholder` | contact_id(FK), deal_id(FK), role(Champion/DecisionMaker/Gatekeeper), is_champion |
| `Product` | name, status(Active/Beta/Sunset) |

### 3. API 端點（後端，已完成）

```
POST /api/v1/crm/parse              ← NLU 解析，回傳預覽
POST /api/v1/crm/confirm            ← 確認寫入 Firebase
GET  /api/v1/deals                  ← 我的案件（member 只看自己，admin 看全部）
GET  /api/v1/deals/{id}             ← 案件詳情
PUT  /api/v1/deals/{id}             ← 更新案件
GET  /api/v1/deals/{id}/activities  ← 互動時間軸
GET  /api/v1/deals/{id}/stakeholders
POST /api/v1/deals/{id}/stakeholders
GET  /api/v1/activities
GET  /api/v1/actions                ← ?status=pending
PUT  /api/v1/actions/{id}
GET  /api/v1/pipeline/summary       ← admin only
GET  /api/v1/contacts/{id}/crm      ← 聯絡人 CRM 視角
```

### 4. LIFF 頁面（前端，待完成）

| 路由 | 頁面 | 說明 |
|------|------|------|
| `#/crm` | CrmInput | 意識流輸入 + NLU 預覽 + 確認 |
| `#/deals` | DealList | Pipeline Kanban，mobile-friendly 橫向捲動 |
| `#/deals/:id` | DealDetail | 案件詳情 + 編輯 + Activities 時間軸 + Stakeholders |
| `#/actions` | ActionList | 今日 / 本週 / 全部 tab，一鍵完成 |
| `#/contacts/:id/crm` | ContactCrm | 從 CardDetail 連入，deals + activities |
| `#/pipeline` | ManagerPipeline | 主管 team pipeline 儀表板（admin only） |
| `#/products` | ProductList | 產品線管理（admin only） |

### 5. LINE Chat 快速指令（已完成）

| 指令 | 行為 |
|------|------|
| `我的待辦` / `today` | 推播今日到期 actions（Flex Message） |
| `查 [名稱]` | Fuzzy match → Contact 摘要 + 最新 Deal + LIFF 連結 |
| `pipeline` | admin 限定，本週 stage 分佈快照 |

### 6. 推播排程（已完成）

| 排程 | 時間 | 端點 |
|------|------|------|
| 每日到期提醒 | 09:00（Asia/Taipei） | `POST /internal/push-action-reminders` |
| 每週摘要 | 週五 18:00（Asia/Taipei） | `POST /internal/push-weekly-summary` |

---

## Rich Menu 架構（已完成）

### 業務版（所有用戶）

| 格子 | 標籤 | 動作 |
|------|------|------|
| 1 | 回報拜訪 | LIFF `#/crm` |
| 2 | 我的案件 | LIFF `#/deals` |
| 3 | 我的待辦 | LIFF `#/actions` |
| 4 | 名片管理 | LIFF `#/`（名片庫） |
| 5 | 查聯絡人 | LIFF `#/`（CardList） |
| 6 | 團隊 | 文字指令 |

### 主管版（admin 帳號）

同業務版，但格子 5 替換為：

| 格子 | 標籤 | 動作 |
|------|------|------|
| 5 | Pipeline 總覽 | LIFF `#/pipeline` |

---

## 權限設計

| 功能 | member | admin |
|------|--------|-------|
| NLU 解析 / 確認 | ✅ | ✅ |
| 查看自己的 deals / activities / actions | ✅ | ✅ |
| 查看全團隊 deals / activities | ❌ | ✅ |
| Pipeline Summary | ❌ | ✅ |
| 新增 / 修改產品線 | ❌ | ✅ |

---

## 技術決策記錄

- **Firebase Realtime DB**（非 Firestore）：與現有 namecard 資料同庫，CRUD 沿用 `contact_repo.py` 模式
- **Contact-centric Schema**：一張 contacts 表（contact_type 區分公司/人員），Deal/Activity/Action 使用 FK，對齊 Twenty HQ Logical Domain Schema
- **NLU aliases**：Contact 有 aliases[] 陣列，fuzzy match 支援「TSMC / 台積 / 積電」→ 同一 Contact
- **Grounding Context**：每次 NLU 呼叫注入現有 contacts（display_name）+ deals（entity_name），提升 entity 識別準確度
- **Migration Script**：`scripts/migrate_namecard_to_contacts.py` 支援 dry-run，5 phase 完整 backfill
- **Cloud Run 不變**：同 `linebot-namecard-python` 服務，不另開新服務

---

## 驗收標準

1. **主流程**：意識流輸入 → NLU 解析 → 預覽確認 → Firebase 寫入 → LIFF 顯示
2. **LINE 快速指令**：「查王總」→ Contact + Deal 摘要；「我的待辦」→ 今日 actions
3. **主管視角**：admin 帳號可見 ManagerPipeline，member 無法存取
4. **推播測試**：手動 POST `/internal/push-action-reminders` 成功推播
5. **迴歸測試**：名片 OCR、邀請碼、CSV 匯出 不受影響
