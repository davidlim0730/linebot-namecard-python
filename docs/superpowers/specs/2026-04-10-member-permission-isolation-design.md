# 設計文件：成員權限隔離系統

**日期**：2026-04-10  
**階段**：Phase 2 — 團隊化  
**狀態**：設計已批准，待實作

---

## 目標

修改權限系統，使成員僅能檢視/CRUD 自己建立的名片，管理員能檢視/CRUD 整個團隊的名片。

**當前問題**：成員權限也能檢視/匯出整個團隊的名片資料，違反資料隔離原則。

---

## 設計決策

### 1. 成員可見性

**成員完全隔離**：
- 搜尋結果只顯示自己建立的名片
- 名片列表只顯示自己建立的名片
- 無法看到他人建立的名片（即使是同團隊）

**管理員**：
- 能看到全部團隊名片
- 能搜尋全部名片
- 能匯出全部名片

### 2. 標籤系統

標籤保持團隊級共享：
- 所有成員都能看得到團隊標籤字表
- 成員只能給自己的名片打標籤
- 無法修改他人名片的標籤（因為看不到）

### 3. 權限立即生效

部署後權限立即改變，無迷移策略。現有的「共享名片」會立即對成員隱藏。

### 4. 功能保留

成員保留所有功能（搜尋、匯出、編輯等），但資料範圍限制為自己建立的名片。

---

## 實作策略：權限檢查在查詢層

### 核心原則

在 `firebase_utils.py` 的查詢函數入口加權限檢查，確保每個資料存取都經過權限驗證。

### 權限檢查函數

```python
def _check_card_access(card_added_by: str, current_user_id: str, user_role: str) -> bool:
    """
    檢查使用者是否有權限訪問這張名片
    - 管理員可以訪問所有名片
    - 成員僅可訪問自己建立的名片
    """
    if user_role == "admin":
        return True
    return card_added_by == current_user_id
```

### 受影響的函數

| 函數 | 目前邏輯 | 改動 |
|------|--------|------|
| `get_namecard(card_id, user_id, org_id)` | 直接返回 | 加權限檢查，拒絕無權限訪問 |
| `get_all_namecards(org_id, user_id)` | 返回該 org 的全部 | 改為僅返回自己 + 管理員的名片 |
| `search_namecards(org_id, query, user_id)` | Gemini 搜全部 | 先過濾後再搜尋 |
| `delete_namecard(card_id, user_id, org_id)` | 檢查 org_id | 額外檢查 `added_by` |
| `update_namecard_field(card_id, user_id, org_id)` | 檢查 org_id | 額外檢查 `added_by` |
| `add_tag_to_card(card_id, user_id, org_id)` | 檢查 org_id | 額外檢查 `added_by` |
| `remove_tag_from_card(card_id, user_id, org_id)` | 檢查 org_id | 額外檢查 `added_by` |

### 搜尋特殊處理（Gemini 智慧搜尋）

`search_namecards` 改動流程：

1. 從 Firebase 獲取該 org 的全部名片
2. **本地過濾**：只保留 `added_by == user_id` 或 `user_role == "admin"` 的
3. 把過濾後的資料傳給 Gemini
4. 返回搜尋結果

**優點**：
- 避免 Gemini 處理敏感資料
- 節省 token 使用
- 搜尋結果自動符合權限

### CSV 匯出

`export_namecard_csv` 改動：

```python
def export_namecard_csv(org_id, user_id, user_role):
    # 使用已有權限檢查的查詢函數
    namecards = get_all_namecards(org_id, user_id)
    # 權限檢查已在上面的函數內完成
    return generate_csv(namecards)
```

由於 `get_all_namecards` 已加權限檢查，匯出自動受保護。

---

## 實作清單

- [ ] 在 `firebase_utils.py` 新增 `_check_card_access()` 函數
- [ ] 修改 `get_namecard()` —— 加權限檢查
- [ ] 修改 `get_all_namecards()` —— 加查詢過濾
- [ ] 修改 `search_namecards()` —— 先過濾再搜尋
- [ ] 修改 `delete_namecard()` —— 加 `added_by` 檢查
- [ ] 修改 `update_namecard_field()` —— 加 `added_by` 檢查
- [ ] 修改 `add_tag_to_card()` —— 加 `added_by` 檢查
- [ ] 修改 `remove_tag_from_card()` —— 加 `added_by` 檢查
- [ ] 更新 `line_handlers.py` 中相關的錯誤回應訊息（權限不足）
- [ ] 編寫單元測試（權限檢查邏輯）
- [ ] 編寫整合測試（成員隔離場景）

---

## 測試策略

### 單元測試

```python
def test_check_card_access_admin():
    assert _check_card_access("user_a", "admin_user", "admin") == True

def test_check_card_access_member_own_card():
    assert _check_card_access("user_a", "user_a", "member") == True

def test_check_card_access_member_other_card():
    assert _check_card_access("user_a", "user_b", "member") == False
```

### 整合測試（場景）

1. **場景 1**：成員 A 建立名片，成員 B 無法看到
   - 成員 A 上傳名片 → 建立成功
   - 成員 B 搜尋 → 結果為空
   - 成員 B 呼叫 `get_namecard(card_id)` → 返回權限錯誤

2. **場景 2**：管理員能看到全部名片
   - 成員 A、B 各上傳一張名片
   - 管理員搜尋 → 能看到兩張

3. **場景 3**：成員無法編輯他人的名片
   - 成員 A 建立名片
   - 成員 B 嘗試編輯 → 返回權限錯誤

4. **場景 4**：CSV 匯出符合權限
   - 團隊共 10 張名片，成員 A 建立 3 張
   - 成員 A 匯出 → CSV 只包含 3 張
   - 管理員匯出 → CSV 包含 10 張

---

## 錯誤處理

當成員嘗試訪問無權限的名片時：

**HTTP 403 Forbidden** 返回：
```json
{
  "type": "error",
  "message": "您沒有權限訪問此名片"
}
```

**LINE 回應**：
```
抱歉，您沒有權限訪問或修改此名片。
```

---

## 已知限制

1. **Cloud Run 無狀態特性**：`user_states` 在重啟後會消失（現有限制，本次不修改）
2. **實時同步**：Firebase Realtime DB 沒有強制權限控制，依賴應用層檢查
3. **無批量隱藏**：不支援「批量隱藏舊名片」，成員需逐一查看

---

## 影響範圍

### 修改的文件

- `app/firebase_utils.py` —— 核心權限檢查邏輯
- `app/line_handlers.py` —— 錯誤訊息更新
- `tests/` —— 新增測試用例

### 不修改的文件

- `app/gemini_utils.py` —— 搜尋邏輯本身不變，只改輸入資料
- `app/gsheets_utils.py` —— Google Sheets 同步邏輯無需改動
- 資料結構 —— 已有 `added_by` 欄位，無需遷移

---

## 驗收準則

✅ 成員完全看不到他人的名片（搜尋、列表、直接查詢都拒絕）  
✅ 管理員能看到全部名片  
✅ CSV 匯出符合權限隔離  
✅ 所有操作都返回適當的權限錯誤訊息  
✅ 單元測試覆蓋權限檢查邏輯  
✅ 整合測試覆蓋 4 個主要場景  
