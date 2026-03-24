## Why

目前名片搜尋結果以多個獨立 Flex bubble 逐一回傳，用戶難以快速瀏覽比較；名片上的電話、Email、地址等資訊無法一鍵複製，用戶需要手動長按選取再複製，操作體驗不佳。隨著 Phase 3 標籤篩選功能上線，多筆名片的呈現場景更加頻繁，UI 體驗成為核心體驗瓶頸。

此變更屬於 **Phase 3 — 管理與整合**，針對名片呈現的 UX 進行優化。

## What Changes

- **Carousel 搜尋結果**：搜尋與標籤篩選結果改用 LINE Flex Carousel 容器，精簡版名片卡橫向滑動瀏覽（最多 12 張）
- **Clipboard Action 整合**：名片詳情中的電話、Email、地址加入 LINE Clipboard Action，支援一鍵複製到剪貼簿
- **URI Action 整合**：電話加入 `tel:` URI Action 直接撥打，Email 加入 `mailto:` URI Action 直接開啟郵件
- **精簡卡片與完整卡片分離**：新增精簡版名片卡（carousel 用），保留並改版完整名片卡（單張查看用）
- **新增「查看完整名片」postback**：從 carousel 精簡卡展開到完整名片詳情

## Non-goals

- 不改變名片資料結構或 Firebase schema
- 不變更搜尋邏輯或 Gemini 查詢流程
- 不新增或修改 Quick Reply 按鈕
- 不處理 LINE PC 版（Clipboard Action 僅手機支援，PC 降級為顯示文字即可）

## Capabilities

### New Capabilities
- `namecard-carousel`: 精簡版名片 Carousel 呈現，用於搜尋結果與標籤篩選的多筆名片瀏覽
- `namecard-detail-v2`: 改版完整名片 Flex Message，整合 Clipboard Action 與 URI Action

### Modified Capabilities
（無既有 spec 需修改，名片呈現目前無獨立 spec）

## Impact

- **app/flex_messages.py**：新增 `get_namecard_carousel_msg()` 函式，修改 `get_namecard_flex_msg()` 加入 clipboard/URI action
- **app/line_handlers.py**：搜尋結果與標籤篩選改呼叫 carousel 版本；新增 `view_card` postback handler
- **依賴**：無新增 Python 套件，僅使用 LINE Messaging API 既有的 Clipboard Action 與 URI Action（linebot SDK 已支援）
- **相容性**：Clipboard Action 僅支援 LINE 手機版，LINE PC 用戶會看到按鈕但無法複製（可接受的降級）
