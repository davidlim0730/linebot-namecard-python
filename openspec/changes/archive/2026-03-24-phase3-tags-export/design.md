## Context

Phase 2 完成後，Bot 已有組織化的名片庫（`namecard/{org_id}/{card_id}/`）、成員角色權限、Quick Reply 8 顆按鈕。名片數量成長後，使用者需要分類能力。目前名片只有基本欄位（name, title, company, address, phone, email, memo），沒有分類標籤。匯出功能目前只有單張 vCard QR Code，無批量匯出。

LINE Quick Reply 上限 13 顆，目前已用 8 顆，尚有 5 顆空間可擴充。

## Goals / Non-Goals

**Goals:**
- 支援角色標籤的完整 CRUD（新增、列出、刪除、指派、移除）
- 標籤為組織層級資源，同組織成員共享標籤定義
- 點選標籤可查看該標籤下的名片列表（簡易呈現）
- 保留原有純文字 Gemini 智慧搜尋
- 使用者可申請 CSV 匯出，系統寄到指定 email
- Quick Reply 新增標籤與匯出入口

**Non-Goals:**
- 不做生命週期標籤（本期只做角色標籤）
- 標籤不支援顏色/icon 自訂
- CSV 不支援欄位自訂（固定匯出所有欄位 + 標籤）
- 不做即時檔案下載（LINE 限制）
- 不做標籤搜尋的 UI 優化（用最簡易方式先上線）

## Decisions

### Decision 1：標籤資料結構

**選擇：標籤定義存組織層級，名片只存標籤名稱字串**

Firebase RTDB schema：

```
organizations/{org_id}/tags/
  roles/
    {tag_id}: "合作夥伴"
    {tag_id}: "供應商"
    {tag_id}: "客戶"
    {tag_id}: "同業"
    {tag_id}: "媒體/KOL"

namecard/{org_id}/{card_id}/
  ... (existing fields)
  role_tags: ["客戶", "合作夥伴"]  ← 多選，存字串陣列
```

**理由**：
- 標籤定義在組織層級管理，所有成員看到一致的選項
- 名片上存字串而非 tag_id，方便篩選和 CSV 匯出（不需 join）
- 角色標籤預設 5 個（合作夥伴、供應商、客戶、同業、媒體/KOL），管理員可新增自訂

**替代方案**：名片存 tag_id 再 join → 增加讀取複雜度，Firebase RTDB 不支援 join，實際效益低。

---

### Decision 2：標籤管理 UX

**選擇：文字指令 + Quick Reply + Postback 組合**

操作流程：

1. **查看標籤清單**：Quick Reply「🏷 標籤」→ 顯示所有角色標籤 + 每個標籤的名片數量，點擊標籤可查看名片列表
2. **新增角色標籤**：文字指令 `新增角色 <名稱>`（管理員限定）
3. **刪除角色標籤**：文字指令 `刪除標籤 <名稱>`（管理員限定）
4. **為名片加標籤**：名片詳情 Flex Message 新增「🏷 標籤」按鈕 → postback 顯示角色標籤選項 → 點擊 toggle

標籤指派流程利用 postback 直接操作（不需 user_states）。

---

### Decision 3：標籤名單查詢

**選擇：點擊標籤名稱直接回傳名片列表**

操作方式：
- 從標籤清單 Flex Message 點擊某個標籤（如「客戶」）
- 系統讀取組織全部名片，篩選 `role_tags` 包含該標籤的名片
- 用現有的名片 Flex Message 列表回覆（最多 5 張，與現有搜尋一致）

**理由**：最簡易實作，複用現有 `get_namecard_flex_msg`，UI 之後再優化。不需要新增 `#` 搜尋語法，降低複雜度。

---

### Decision 4：CSV 匯出流程

**選擇：Cloud Run 上產生 CSV → 透過 email 附件寄送**

流程：
1. 使用者點 Quick Reply「📤 匯出」或輸入「匯出」
2. Bot 回覆「請輸入您的 email 地址」
3. 使用者輸入 email，進入 `user_states` 的 `exporting_csv` 狀態
4. 系統讀取該組織所有名片 → 產生 CSV（含標籤欄位）
5. 用 SMTP（Gmail SMTP）寄送 CSV 附件到指定 email
6. 回覆「CSV 已寄送至 xxx@yyy.com」

**Email 寄送方案**：使用 Python 內建 `smtplib` + Gmail App Password（免費、簡單），不額外引入 SendGrid。環境變數新增 `SMTP_USER` 和 `SMTP_PASSWORD`。

---

### Decision 5：Quick Reply 擴充

**選擇：新增 2 顆按鈕至 10 顆（上限 13 顆內）**

| 新增按鈕 | 動作 |
|---------|------|
| 🏷 標籤 | postback `action=show_tags` |
| 📤 匯出 | postback `action=show_export` |

排列順序調整：📊 統計、📋 列表、🏷 標籤、📤 匯出、👥 團隊、👤 成員、📨 邀請、🧪 測試、ℹ️ 說明、➕ 加入

## Risks / Trade-offs

- **Firebase RTDB 無 query by child value** → 標籤篩選需要讀取組織全部名片後本地過濾。在名片數量小（<1000）的場景效能可接受。Mitigation：Phase 4 若量大可遷移至 Firestore。
- **Email 寄送失敗** → SMTP 可能因 Gmail 限制（每日 500 封）或網路問題失敗。Mitigation：catch exception，回覆使用者「寄送失敗，請稍後再試」。
- **標籤名稱重複** → 使用者可能建立同名標籤。Mitigation：新增時檢查重複，回覆提示。
- **名片存標籤字串而非 ID** → 刪除標籤定義後，已貼標的名片仍保留舊字串。Mitigation：可接受，刪除標籤只影響「可選項目」，不影響歷史紀錄。

## Open Questions

- Gmail App Password 的環境變數命名：建議 `SMTP_USER` / `SMTP_PASSWORD`，是否有其他偏好？
- CSV 欄位順序與編碼：建議 UTF-8 BOM（Excel 相容），欄位為 name, title, company, address, phone, email, memo, role_tags, added_by, created_at
