# 產品需求文件 v2：SaaS 試用版與訂閱權限管理機制

**Author**: David Lin
**Date**: 2026-04-07
**Status**: Draft
**Stakeholders**: 產品、工程、業務

---

## 1. Executive Summary

為「智慧名片管家」建立免費試用機制，讓企業團隊在 7 天內免費體驗核心功能（OCR 掃描、協作查詢、CSV 匯出），並在觸及用量上限時引導升級為付費方案。目標是在不增加銷售人力的情況下，透過產品本身實現 PLG（Product-Led Growth）轉換。

---

## 2. Background & Context

**問題背景**：
目前所有用戶皆免費使用，無營收模式。Phase 1–3 功能（OCR、搜尋、標籤、CSV 匯出）已足夠驗證產品價值，適合進入商業化。

**用戶痛點與決策鏈**：
- **使用者**（業務員）：需要快速掃描、查詢名片，不想額外安裝 App。
- **付費決策者**（主管/老闆）：需要確信資料安全、能匯出整合進 CRM、值得花錢。
- **關鍵洞察**：CSV 匯出功能必須在試用期開放——讓決策者確認「資料帶得走」，才能消除鎖定疑慮，這是最大的試用轉換障礙。

**限制數字的商業邏輯**：
- 7 天：足以完整跑過一次參展週期。
- 50 張：足以讓一個業務員感受到價值，但不足以支撐全公司需求。**當第 51 張被攔截時，使用者正處於「覺得好用且當下急需」的狀態，這是最佳的付費轉換時機。**
- 3 人：足以體驗協作功能，但要擴展至全公司必須升級。

**為何現在做**：
- 功能已足夠（Phase 1–3 完成）。
- Alpha 測試用戶已累積實際使用資料，時機成熟。
- 若持續免費，難以評估產品真實市場價值。

---

## 3. Objectives & Success Metrics

### 目標

1. 建立可自動化運行的試用轉換漏斗，無需人工介入。
2. 讓用戶在試用期內達到「Aha Moment」（成功掃描名片 + 完成一次搜尋）。
3. 在用量觸頂時提供低摩擦的升級路徑。

### Non-Goals（明確不做）

- **本次不實作付款流程**：升級按鈕導向聯繫表單或 LINE 官方客服，人工收款。自動化付款留待 Phase 2。
- **不做多方案分層**：本次只有 `trial` 和 `pro` 兩種狀態，不做 Starter / Business / Enterprise 分層。
- **不做試用期延長功能**：無後台管理介面，延長需直接改 DB（已知技術債，接受）。
- **不做用量警告推播**：試用快到期或快用完時不主動通知，觀察是否影響轉換率後再決定。

### 成功指標

*註：各項指標的「基準（目前）」數值，皆待內部團隊 Alpha 測試完成後確認並補上。*

| Metric | 基準（目前） | 目標（上線後 30 天） | 衡量方式 |
|--------|------------|-------------------|---------|
| 試用啟用率（新用戶上傳第 1 張名片）| 待內部 Alpha 後確認 | > 60% | RTDB `scan_count >= 1` |
| 觸頂率（達到 50 張或 3 人上限） | 待內部 Alpha 後確認 | > 20% | `scan_count >= 50` 或 `members >= 3` 事件 |
| 升級詢問率（點擊「了解升級方案」） | 待內部 Alpha 後確認 | > 30% 的觸頂用戶 | Postback 事件計數 |
| 付費轉換率（人工確認收款） | 待內部 Alpha 後確認 | > 10% 的詢問者 | 手動記錄 |

---

## 4. Target Users & Segments

### Persona A：業務員（主要使用者）
- 每天參展或拜訪客戶，收集大量名片
- 習慣用 LINE，不願學新工具
- 核心需求：快速掃描、快速找人

### Persona B：業務主管（付費決策者）
- 不一定每天用，但需要確認團隊的名片庫可以匯出、可以整合
- 核心疑慮：「資料會不會被鎖住？」「萬一不用了能拿回資料嗎？」
- 轉換觸發點：下屬說「很好用但用到上限了」

---

## 5. User Stories & Requirements

### P0 — Must Have

| # | User Story | Acceptance Criteria |
|---|-----------|-------------------|
| P0-1 | 新用戶第一次使用時，系統自動開通 7 天試用，並收到歡迎訊息 | `create_org` 時自動寫入 `plan_type=trial`、`trial_ends_at=now+7d`；推播歡迎 Flex Message |
| P0-2 | 試用期內，掃描 OCR 正常運作（上限 50 張） | 每次掃描成功後 `scan_count +1`（transaction），超過 50 張時攔截 |
| P0-3 | 試用期結束後，掃描功能被鎖定，顯示付費牆 | `trial_ends_at` 過期後，圖片事件回傳升級引導 Flex Message |
| P0-4 | 超過掃描上限時，顯示付費牆並提供聯繫升級管道 | Paywall Flex Message 含「了解升級方案」按鈕，導向預設聯繫方式 |
| P0-5 | 邀請成員超過 3 人上限時，顯示付費牆 | 第 4 人加入邀請流程時攔截 |
| P0-6 | 舊組織（Alpha 測試）不受限制 | 讀取不到 `plan_type` 時，預設判定為 `pro`（祖父條款） |
| P0-7 | 批量上傳不得突破用量上限 | `batch_processor` 迴圈中每張前先檢查額度，超量立即中斷並在摘要中提示 |

### P1 — Should Have

| # | User Story | Acceptance Criteria |
|---|-----------|-------------------|
| P1-1 | 試用期間，CSV 匯出功能正常可用 | `pro` 和 `trial` 皆允許 CSV 匯出 |
| P1-2 | 付費牆訊息根據攔截原因顯示不同文案 | 「超量」與「過期」顯示不同訊息（文案見 Section 6） |
| P1-3 | 升級按鈕的 Postback 事件有 log | 方便手動追蹤哪個 org 有升級意願 |

### P2 — Nice to Have / Future

| # | User Story | Acceptance Criteria |
|---|-----------|-------------------|
| P2-1 | 接近上限（剩 10 張）時主動通知 | 掃描第 40 張時推播提醒 |
| P2-2 | 後台管理介面可延長試用期 | 管理員可設定特定 org 的 `trial_ends_at` |
| P2-3 | 自動化付款流程 | 整合 LINE Pay 或 Stripe |

---

## 6. Solution Overview

### 試用期結束後的狀態定義（v1 缺漏）

試用期結束後，組織進入 **read-limited 狀態**：
- **可以做**：搜尋查詢既有名片、查看名片詳情、CSV 匯出（保留一次，讓決策者能匯出資料）
- **不能做**：新增掃描、邀請成員
- **原因**：讓用戶「看得到資料但加不了新的」，而非直接鎖死，降低緊迫感下的負面情緒

### 付費升級路徑（本次簡化版）

升級按鈕 Postback → 回傳文字訊息：
```
感謝您的試用！如需升級為 Pro 方案，請聯繫：[LINE 官方帳號連結 or Email]
我們將在 24 小時內回覆您。
```
升級後由客服手動將 RTDB 中 `plan_type` 改為 `pro`、清除 `trial_ends_at`。

### 核心資料模型（organizations 節點）

```json
{
  "name": "某某企業團隊",
  "created_by": "user_123",
  "plan_type": "trial",
  "trial_ends_at": "2026-04-14T23:59:59Z",
  "usage": {
    "scan_count": 0
  }
}
```

**狀態判斷邏輯（check_org_permission）**：
```
plan_type 缺失 → pro（祖父條款，向後相容 Alpha 用戶）
plan_type == "pro" → 無限制
plan_type == "trial" AND trial_ends_at 未過期 AND scan_count < 50 → 允許掃描
plan_type == "trial" AND (過期 OR scan_count >= 50) → 攔截，顯示付費牆
```

**邊界情境與防護細節**：
- **祖父條款**：機制上線前建立的舊組織缺乏 `plan_type`，讀取不到時預設 `pro`，避免誤擋 Alpha 內部測試。
- **批量防超刷**：額度檢查實作於 `batch_processor.py` 迴圈中，不能只在入口前檢查一次。若剩餘 1 張額度但排程了 30 張，第 2 張時即中斷，摘要說明已處理張數。
- **高併發計數**：遞增 `scan_count` 使用 Firebase Transaction，防止用戶瞬間連傳多張時計數器被覆蓋（Race Condition）。

### 付費牆 Flex Message 文案設計

**情境 A：掃描超量**
> 您的團隊已掃描 50 張名片，已達試用上限 🎉
> 升級為 Pro 方案，解鎖無限掃描與更多成員席位。

**情境 B：試用期到期**
> 您的 7 天免費試用已結束。
> 升級後即可繼續新增名片，現有資料完整保留。

---

## 7. Open Questions

| 問題 | Owner | 截止日 |
|------|-------|--------|
| Pro 方案定價為何？每月 / 每年？ | David | 上線前確認 |
| 升級聯繫管道：LINE 客服 OA 還是 Email？ | David | 實作 Paywall 前確認 |
| 試用上限 7 天 / 50 張 / 3 人是否有數據支撐，或只是假設？ | David | 上線後 A/B 測試驗證 |
| Firebase RTDB transaction 在目前使用量下的效能是否有疑慮？ | 工程 | Phase 1 開發時評估 |
| Alpha 用戶（祖父條款）是否需要主動通知他們的特殊狀態？ | David | 可暫緩 |

---

## 8. Timeline & Phasing

### Phase 1：資料基底與精準計數
**目標**：確保計數準確，不超賣額度
- `create_org` 寫入 `plan_type=trial`、`trial_ends_at`
- `add_namecard` 改用 Firebase Transaction 遞增 `scan_count`
- **驗收**：同時觸發 5 張圖片，`scan_count` 精確為 5

### Phase 2：核心防護網
**目標**：攔截超量與過期請求
- 實作 `check_org_permission(org_id, action_type)`，含祖父條款（無 `plan_type` → 預設 `pro`）
- 埋入 `batch_processor.py` 迴圈——額度檢查必須在每張圖片處理前執行，一旦超量立即中斷後續，並在摘要中提示已處理張數與剩餘狀態
- **驗收**：剩餘 1 張額度時排程 30 張，確認第 2 張時中斷，摘要正確顯示

### Phase 3：付費牆 UI 與歡迎體驗
**目標**：完整的用戶面向體驗
- 實作歡迎試用 Flex Message（onboarding push）
- 實作付費牆 Flex Message（兩種文案）
- 在 `line_handlers.py` 的圖片/邀請入口埋入 `check_org_permission`
- **驗收**：手動走完新用戶 onboarding → 觸頂 → 點擊升級的完整流程
