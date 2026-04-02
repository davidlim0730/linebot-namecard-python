## Why

Phase 1 部署後驗收發現搜尋功能完全無回應：`handle_smart_query` 呼叫 Gemini 2.5 Flash（含思考模式）經常超過 LINE reply token 的 1 分鐘有效期，導致 bot 靜默失敗。同時 compact bubble（搜尋結果多筆時的卡片）缺少聯絡資訊欄位，且 Firebase 中部分欄位存為非字串型別（integer 電話號碼），造成 LINE Flex Message API 拒絕請求。

## What Changes

- **以本地關鍵字搜尋取代 Gemini LLM 搜尋**：對 `name`、`company` 欄位做 case-insensitive substring match，消除 API timeout 問題。
- **Compact bubble 補齊欄位**：多筆搜尋結果卡片新增電話、手機、Email 顯示，以及「查看完整名片」postback 按鈕。
- **欄位值強制轉字串**：所有 card data 欄位在組裝 Flex Message 前統一 `str(val).strip()`，防止 integer/None 型別導致 LINE API 400 錯誤。
- **搜尋迴圈防禦性處理**：跳過 Firebase 中 value 為非 dict 的條目。
- **錯誤處理強化**：`handle_smart_query` except block 改為巢狀 try/except，防止 reply token 已耗用時的二次 reply 造成 500，進而觸發 LINE webhook retry 循環。

## Capabilities

### Modified Capabilities

- `search-mode`：搜尋引擎從 Gemini NLP 改為本地 substring match，只搜尋 name + company 欄位。搜尋準確度為精確包含比對，不支援模糊/語意搜尋。
- `namecard-carousel`：compact bubble 新增聯絡欄位與查看按鈕。

## Non-goals

- 搜尋其他欄位（title、phone、email 等）
- 模糊搜尋 / 拼音搜尋
- 搜尋結果排序（依相關度）
