# Release Notes — Phase 3 Proactive Onboarding Welcome

**版本**: v3.5.0  
**發佈日期**: 2026-04-09  
**對應功能**: Proactive Onboarding Welcome + State Cleanup  
**部署版本**: `linebot-namecard-00053-59q`  
**部署地區**: Asia East 1 (asia-east1)

---

## 🎯 核心亮點

提升新用戶 onboarding 體驗，減少操作誤觸、簡化狀態管理。

- ✅ **Proactive Onboarding Welcome**：新用戶加入 OA 時主動推播歡迎訊息
- ✅ **降級攔截機制**：防止無效 Follow 事件造成重複推播
- ✅ **State Cleanup**：修復 user_states / batch_state 殘留問題
- ✅ **Rich Menu Navigation**：3 區段主選單（名片操作、團隊功能、資料與設定）

---

## ✨ 新功能

| 功能 | 說明 | 備註 |
|------|------|------|
| Follow Event Handler | 偵測新用戶加入 OA，主動推播歡迎訊息 | 含降級攔截（避免重複推播） |
| Rich Menu 3 區段 | 底部常駐選單，分類 15+ 個操作 | UI 改版，提升易用性 |
| 快速回覆「取消」按鈕 | 所有多步驟操作都有「❌ 取消」選項 | 改善誤觸體驗 |

---

## 🐛 已修復

- **user_states 殘留**：操作中斷後，state 未清除導致下次無法新增名片
- **batch_state 殘留**：批量上傳後，狀態未完全清除
- **掃描提示文案**：優化提示文字，降低用戶誤解
- **Flex Message 相容性**：確保舊版 LINE 用戶能正常顯示

---

## ⚙️ 技術改進

- 強化 Follow event 降級邏輯（幂等性檢查）
- Firestore batch operation 優化
- 日誌記錄改善（便於 debug）

---

## 📋 已知限制 / 後續工作

| 項目 | 說明 | 預計解決 |
|------|------|---------|
| 頂層指令清除 state | 「新增」等命令不會清除 user_states | Phase 4 |
| Quick Reply 永顯 | 需 LINE Rich Menu 底部常駐（目前只在特定回覆後出現） | Phase 3.x |
| user_states 持久化 | Cloud Run 重啟後消失 | 已知限制，後續優化 |

---

## 📊 用戶體驗改進

- **Onboarding 完成率**：新用戶首次操作不再被自動建立「個人 org」困擾
- **操作誤觸減少**：所有多步驟操作都有明確「取消」選項
- **菜單易用性**：Rich Menu 3 區段分類，查找功能更快

---

## 🚀 升級指南

已自動部署至 Google Cloud Run，無需用戶手動升級。

### 若需手動部署：
```bash
git pull origin main
gcloud builds submit --tag gcr.io/linebot-namecard-488409/linebot-namecard
gcloud run deploy linebot-namecard \
  --image gcr.io/linebot-namecard-488409/linebot-namecard \
  --region asia-east1 \
  --allow-unauthenticated
```

---

## 📖 相關資源

- 設計文件：`docs/superpowers/specs/2026-04-09-onboarding-flow-design.md`
- 實作計畫：`docs/superpowers/plans/2026-04-09-onboarding-flow.md`
- 產品功能清單：`pr/product-features.md`
- 產品路線圖：`planning/roadmap.md`

---

## 🔄 後續版本規劃

- **v3.6.0**（預計 4 月底）：進階篩選、Web 管理介面 Prototype
- **v4.0.0**（預計 5 月）：CRM API 串接

---

**發佈者**: David Lin  
**驗證狀態**: ✅ 所有測試通過、功能驗收完成
