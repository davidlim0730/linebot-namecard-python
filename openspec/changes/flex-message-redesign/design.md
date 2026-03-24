## Context

目前名片搜尋（Gemini NLP）和標籤篩選都回傳最多 5 個獨立 Flex bubble，佔滿聊天畫面且難以快速比較。名片詳情中的電話、Email 等資訊只能靠長按選取複製，操作不便。

LINE Messaging API 提供兩個可直接運用的能力：
- **Carousel 容器**：最多 12 個 bubble 橫向滑動，單一 carousel 限 50KB
- **Clipboard Action**：點擊即複製文字到剪貼簿（僅手機版支援），clipboardText 上限 1000 字元

現行程式碼集中於 `app/flex_messages.py`（Flex 模板）與 `app/line_handlers.py`（呼叫端），改動範圍明確。

## Goals / Non-Goals

**Goals:**
- 多筆名片結果用 Carousel 橫向瀏覽，精簡卡片只顯示核心資訊
- 完整名片中的電話、Email、地址可一鍵複製
- 電話可直接撥打（`tel:`）、Email 可直接寄信（`mailto:`）
- 精簡卡可展開為完整名片

**Non-Goals:**
- 不改變 Firebase schema
- 不變更 Gemini 搜尋邏輯
- 不處理 LINE PC 版的 Clipboard 降級（按鈕顯示但無效，可接受）
- 不新增 Quick Reply 按鈕

## Decisions

### Decision 1：Carousel 精簡卡片設計

**選擇：bubble size `kilo`，只顯示姓名/公司/職稱 + 複製電話/Email 按鈕 + 查看完整按鈕**

精簡卡結構：
- **Header**：公司名（背景色）
- **Body**：姓名（xxl bold）+ 職稱（md）
- **Footer**：3 個按鈕 — 複製電話（clipboard）、複製 Email（clipboard）、查看完整名片（postback）

**理由**：
- `kilo` 寬度較窄，carousel 中一次可看到約 1.5 張卡，暗示可滑動
- 精簡卡只保留「誰 + 在哪」的識別資訊，複製按鈕滿足最常見的快速動作
- 單張 bubble JSON < 2KB，12 張 carousel < 24KB，遠低於 50KB 限制

**替代方案**：使用 `mega` 尺寸放更多欄位 → 卡片過寬，carousel 一次只能看 1 張，失去橫向比較的優勢。

---

### Decision 2：完整名片 v2 — 聯絡資訊改為可操作按鈕組

**選擇：每個聯絡欄位改為 horizontal box，左邊顯示值，右邊放 action 按鈕**

電話行結構：
```
[📞 0912-345-678          ] [複製] [撥打]
```
- 「複製」→ clipboard action（clipboardText = 電話號碼）
- 「撥打」→ URI action（uri = `tel:0912345678`）

Email 行結構：
```
[📧 zhang@tsmc.com        ] [複製] [寄信]
```
- 「複製」→ clipboard action（clipboardText = email）
- 「寄信」→ URI action（uri = `mailto:zhang@tsmc.com`）

地址行：
```
[📍 新竹科學園區...        ] [複製]
```
- 「複製」→ clipboard action（clipboardText = 完整地址）

**理由**：
- Clipboard Action 讓用戶不用長按選取，一鍵完成最常見的操作
- URI Action 讓電話、Email 直接可操作，減少步驟
- 保留文字顯示讓用戶先看到值，再決定要複製還是直接操作

**替代方案**：整個文字行設為 clipboard action → 無法同時提供「複製」和「撥打/寄信」兩種操作。

---

### Decision 3：「查看完整名片」postback 設計

**選擇：新增 `action=view_card&card_id={card_id}` postback**

- Carousel 精簡卡底部的「查看完整名片」按鈕觸發此 postback
- Handler 從 Firebase 讀取該卡片完整資料，回傳 `get_namecard_flex_msg()` 完整版
- 複用現有 Firebase 讀取邏輯

**理由**：
- 與現有 `edit_card`、`delete_card` 等 postback pattern 一致
- 不需要在 carousel 中塞入完整資料（降低 JSON 大小）
- 用戶只在需要時才展開，減少資訊過載

---

### Decision 4：搜尋結果呼叫端切換策略

**選擇：多筆結果（≥2 筆）用 carousel，單筆結果直接回傳完整名片**

- `line_handlers.py` 中搜尋結果和標籤篩選的回傳邏輯：
  - 結果 = 1 筆 → 回傳完整名片 v2（`get_namecard_flex_msg`）
  - 結果 ≥ 2 筆 → 回傳 carousel（`get_namecard_carousel_msg`）
  - 結果 = 0 筆 → 維持現有「查無資料」文字訊息
- 最多顯示 10 筆（carousel 上限 12，保守取 10）

**理由**：單筆時直接看完整資訊更有效率；多筆時 carousel 方便瀏覽比較。

## Risks / Trade-offs

- **Clipboard Action 僅手機支援** → LINE PC 用戶點擊複製按鈕無反應。Mitigation：按鈕旁邊的文字仍顯示完整值，PC 用戶可手動複製。可接受的降級。
- **Carousel 10 筆上限** → 搜尋結果超過 10 筆時只顯示前 10。Mitigation：附加文字提示「共 N 筆，顯示前 10 筆，請縮小搜尋範圍」。
- **linebot SDK 版本** → 需確認使用的 `line-bot-sdk` 版本是否支援 Clipboard Action JSON。若 SDK 不直接支援，可使用 `FlexSendMessage(contents=dict)` 直接傳入 JSON dict（現有程式碼已採用此方式）。風險極低。
- **精簡卡資訊不足** → 同名不同公司的人可能在精簡卡上不易區分。Mitigation：精簡卡 header 顯示公司名，body 顯示姓名+職稱，三項資訊足以區分。
