## 1. Compact Namecard Bubble (Carousel 用精簡卡)

- [x] 1.1 在 `app/flex_messages.py` 新增 `get_compact_namecard_bubble(card_data, card_id)` 函式，回傳 dict（非 FlexSendMessage）。Bubble size `kilo`，header 顯示公司名（藍色背景），body 顯示姓名（xxl bold）+ 職稱（md），footer 含 3 個按鈕：「複製電話」（clipboard action）、「複製 Email」（clipboard action）、「查看完整名片」（postback `action=view_card&card_id={card_id}`）。預期呈現：窄卡片，上方藍底公司名，中間大字姓名+小字職稱，底部三個操作按鈕。

## 2. Carousel Container

- [x] 2.1 在 `app/flex_messages.py` 新增 `get_namecard_carousel_msg(cards: list[tuple[str, dict]])` 函式，接收 `[(card_id, card_data), ...]`，回傳 `FlexSendMessage` 包含 carousel container，內含每筆的 compact bubble。上限 10 個 bubble。預期呈現：橫向滑動的精簡名片列，使用者可左右滑動瀏覽。

## 3. Namecard Detail v2 (完整名片改版)

- [x] 3.1 修改 `app/flex_messages.py` 的 `get_namecard_flex_msg()`，將 phone 行改為 horizontal box：左側顯示 `📞 {phone}`，右側放兩個 link button —「複製」（clipboard action, clipboardText=phone）和「撥打」（URI action, uri=`tel:{phone}`）。當 phone 為 "N/A" 時隱藏「撥打」按鈕。預期呈現：電話行右側多出複製和撥打兩個小按鈕。
- [x] 3.2 同上，將 email 行改為 horizontal box：左側 `📧 {email}`，右側「複製」（clipboard action）和「寄信」（URI action, uri=`mailto:{email}`）。當 email 為 "N/A" 時隱藏「寄信」按鈕。預期呈現：Email 行右側多出複製和寄信按鈕。
- [x] 3.3 同上，將 address 行改為 horizontal box：左側 `📍 {address}`，右側「複製」（clipboard action, clipboardText=address）。預期呈現：地址行右側多出一個複製按鈕。

## 4. View Card Postback Handler

- [x] 4.1 在 `app/line_handlers.py` 的 postback handler 中新增 `action=view_card` 處理：解析 `card_id`，從 Firebase 讀取名片資料，回傳完整版 `get_namecard_flex_msg()`。若名片不存在回傳「此名片已不存在。」文字訊息。

## 5. 搜尋結果與標籤篩選切換 Carousel

- [x] 5.1 修改 `app/line_handlers.py` 中 Gemini NLP 搜尋結果回傳邏輯（約 L734-744）：結果 1 筆 → 回傳完整名片；結果 ≥ 2 筆 → 回傳 `get_namecard_carousel_msg()`；超過 10 筆附加文字提示「共 N 筆，顯示前 10 筆」。
- [x] 5.2 修改 `app/line_handlers.py` 中標籤篩選（`list_by_tag`）回傳邏輯（約 L577-587）：同上邏輯，1 筆完整名片，≥ 2 筆 carousel，超過 10 筆附提示。
