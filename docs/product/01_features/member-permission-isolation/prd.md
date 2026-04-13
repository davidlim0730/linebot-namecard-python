# PRD — 成員權限隔離系統

**作者**：David Lin  
**日期**：2026-04-10  
**狀態**：已實作  
**版本**：v3.6.0  
**對應設計文件**：`docs/superpowers/specs/2026-04-10-member-permission-isolation-design.md`

---

### 1. Executive Summary

修改現有權限系統，使成員僅能檢視、搜尋、編輯、匯出自己建立的名片；管理員維持能操作整個團隊名片庫的權限。解決現有「成員可看到全團隊名片，違反資料隔離原則」的安全性問題。

---

### 2. Background & Context

Phase 2 建立了組織架構與 admin/member 角色，但查詢層未套用成員隔離：
- `get_all_namecards()`、`search_namecards()`、`export_namecard_csv()` 均返回整個 org 的名片
- 成員理論上能看到（並匯出）不是自己建立的名片
- 違反「個人業務資料不應被同事看到」的使用情境

觸發原因：進入 Pilot 階段前需補強資料隔離，避免正式用戶產生資料外洩疑慮。

---

### 3. Objectives & Success Metrics

**Goals**：
1. 成員完全看不到他人建立的名片（搜尋、列表、直接查詢）
2. 管理員維持全團隊可見性，不影響現有功能
3. CSV 匯出自動反映權限範圍

**Non-Goals**：
1. 不支援「管理員將某張名片分享給特定成員」
2. 不修改 Firebase Security Rules（應用層控制即可）
3. 不提供遷移工具（舊名片立即對成員隱藏）

**Success Metrics**：

| Metric | 目標 |
|--------|------|
| 成員查詢他人名片 | 返回 None / 空列表 |
| 成員 CSV 匯出 | 僅包含自己建立的名片 |
| 測試覆蓋率 | 28 個權限相關測試全通過 |
| 現有功能回歸 | 69 個測試全通過 |

---

### 4. Target Users & Segments

**成員（member）**：業務人員，掃描並管理自己的名片，不需要看到同事名片庫  
**管理員（admin）**：團隊負責人，需要全局視角管理整個團隊名片庫

---

### 5. User Stories & Requirements

**P0 — Must Have**：

| # | User Story | Acceptance Criteria |
|---|-----------|-------------------|
| 1 | 成員搜尋名片時，只看到自己上傳的結果 | `search_namecards()` 先過濾 `added_by == user_id` 再傳給 Gemini |
| 2 | 成員無法直接取得他人名片 | `get_namecard()` 對非 `added_by` 的成員返回 `None` |
| 3 | 成員列表名片只顯示自己的 | `get_all_namecards()` 依 `user_role` 過濾 |
| 4 | 成員無法刪除 / 編輯他人名片 | `delete_namecard()`, `update_namecard_field()` 返回 `False` 並回覆錯誤訊息 |
| 5 | 成員無法對他人名片加/移標籤 | `add_tag_to_card()`, `remove_tag_from_card()` 加 `added_by` 檢查 |
| 6 | 成員 CSV 匯出只包含自己的名片 | `handle_export_email_state()` 傳入 `user_role` |

**P1 — Should Have**：

| # | User Story | Acceptance Criteria |
|---|-----------|-------------------|
| 7 | 管理員維持全團隊可見性 | `user_role == "admin"` 時所有函數行為不變 |
| 8 | 權限錯誤回覆清楚訊息 | 回覆「抱歉，您沒有權限…」而非靜默失敗 |

---

### 6. Solution Overview

**核心機制**：在 `firebase_utils.py` 每個資料存取函數入口加 `_check_card_access()` 檢查：

```python
def _check_card_access(card_added_by, current_user_id, user_role):
    if user_role == "admin":
        return True
    return card_added_by == current_user_id
```

**受影響的函數**（共 7 個）：
- `get_namecard()` — 取得後檢查，無權限返回 `None`
- `get_all_namecards()` — 列表過濾，只返回有權限的名片
- `search_namecards()` — 先本地過濾，再傳給 Gemini（節省 token + 保護隱私）
- `delete_namecard()` / `update_namecard_field()` — 無權限返回 `False`
- `add_tag_to_card()` / `remove_tag_from_card()` — 無權限返回 `False`

**匯出整合**：`handle_export_email_state()` 取得 `user_role` 後傳入 `get_all_namecards()`，自動繼承權限過濾。

**向後相容**：所有函數的 `user_role` 參數預設值為 `"member"`，現有呼叫不需修改。

---

### 7. Open Questions

| Question | 決策 |
|----------|------|
| 管理員能看到「誰建立」的資訊嗎？ | 是，`added_by` 欄位已在 CSV 匯出 |
| 成員能看到團隊標籤列表嗎？ | 是，標籤為團隊共享，不隔離 |
| 要遷移舊名片可見性嗎？ | 否，立即生效，無遷移策略 |

---

### 8. Timeline & Phasing

| 里程碑 | 日期 | 狀態 |
|--------|------|------|
| 設計文件批准 | 2026-04-10 | ✅ |
| firebase_utils.py 權限實作 | 2026-04-10 | ✅ |
| line_handlers.py 錯誤訊息 | 2026-04-10 | ✅ |
| 單元測試 + 整合測試（28 cases） | 2026-04-10 | ✅ |
| CSV 匯出權限整合修復 | 2026-04-10 | ✅ |
| 全套測試通過（69 cases） | 2026-04-10 | ✅ |
