# Release Notes — 成員權限隔離

**版本**：v3.6.0  
**發佈日期**：2026-04-10  
**對應 PRD**：`docs/gtm/prd/2026-04-10-member-permission-isolation-prd.md`  

---

## 🎯 核心亮點

- 成員現在只能看到、搜尋、編輯、匯出**自己建立**的名片
- 管理員維持全團隊可見性，功能不變
- 資料隔離在查詢層強制執行，CSV 匯出自動反映權限

---

## ✨ 新功能

| 功能 | 說明 |
|------|------|
| 成員資料隔離 | 搜尋、列表、直接查詢均只返回 `added_by == user_id` 的名片 |
| 權限感知 CSV 匯出 | 成員匯出只包含自己的名片；管理員匯出全部 |
| 清楚的權限錯誤訊息 | 嘗試操作他人名片時回覆明確提示，而非靜默失敗 |

---

## 🐛 已修復

- 修復 CSV 匯出未套用成員權限隔離（`get_all_cards()` 改為 `get_all_namecards()`）
- 修復成員可透過直接 API 查詢取得他人名片資料

---

## ⚙️ 技術改進

- 新增 `_check_card_access(card_added_by, user_id, user_role)` 核心權限函數
- 7 個 `firebase_utils.py` 函數統一加入 `user_role` 參數（預設 `"member"`，向後相容）
- Gemini 搜尋前先本地過濾，節省 token 並保護成員隱私
- 新增 28 個權限相關測試（單元 + 整合場景）

---

## 📋 已知限制 / 後續工作

- 管理員無法將單張名片「指定分享」給特定成員（Phase 4 CRM 規劃中）
- Cloud Run 無狀態：`user_states` 重啟後消失（現有已知限制）
- 舊名片無遷移策略：成員建立前的舊共享名片立即對成員隱藏

---

## 🚀 升級指南

```bash
gcloud builds submit --tag gcr.io/{PROJECT_ID}/linebot-namecard

gcloud run deploy linebot-namecard \
  --image gcr.io/{PROJECT_ID}/linebot-namecard \
  --platform managed \
  --region asia-east1
```

確認 `SMTP_USER` 與 `SMTP_PASSWORD` 環境變數已設定（CSV 匯出功能需要）。

---

## 📖 相關資源

- PRD：`docs/gtm/prd/2026-04-10-member-permission-isolation-prd.md`
- 設計文件：`docs/superpowers/specs/2026-04-10-member-permission-isolation-design.md`
- 產品功能清單：`docs/gtm/pr/product-features.md`
