## Context

LINE reply token 有效期為 1 分鐘。Gemini 2.5 Flash 含思考模式在高負載時回應時間可超過此限制，導致 bot 靜默失敗（webhook 返回 500，LINE retry 後 token 已過期）。

核心約束：
- 不可使用任何需要等待 LLM 回應的 API（超時風險）
- 搜尋結果最多回傳 10 筆（LINE carousel 上限）
- Flex Message `text` 屬性必須為非空字串

## Decisions

### 1. 搜尋引擎：本地 substring match

**選擇**：`query in name.lower() or query in company.lower()`

**理由**：
- 完全同步，無 API timeout 風險
- 台灣業務搜尋模式通常是輸入姓名片段（「王」）或公司名（「台積電」），substring match 已滿足 90% 使用場景
- 無需 API key 或外部依賴，成本為零

**已考慮替代方案**：
- Gemini NLP → 已知 timeout 問題，放棄
- Elasticsearch / Algolia → 基礎設施成本過高，MVP 不值得

### 2. Compact bubble 欄位顯示策略：條件顯示非空欄位

**選擇**：phone、mobile、email 只在值非空時顯示列（避免卡片過長），但強制加入「查看完整名片」按鈕

**理由**：kilo size bubble 空間有限，顯示所有 N/A 欄位會使卡片過長且視覺雜亂。按鈕提供完整資訊的入口。

### 3. 欄位值型別處理：`str(val).strip()` 統一轉換

**選擇**：在 `get_namecard_flex_msg` 和 `get_compact_namecard_bubble` 頂部加入 `_s()` / `_str()` helper

**理由**：Firebase 儲存 JSON，OCR 解析出的電話號碼若為純數字可能被存為 integer（如 `886227123456`）。LINE Flex Message API 嚴格要求 `text` 必須為字串，integer 會觸發 `invalid property` 400 錯誤。在組裝前統一轉換比在每個 `get()` 呼叫後轉換更可靠。

### 4. except block 的 reply 處理：巢狀 try/except

**選擇**：except block 內的 `reply_message` 再包一層 try/except，吞掉 `LineBotApiError`

**理由**：
- try block 內若 `reply_message` 成功（token 已耗用），之後若有任何錯誤，except 嘗試用同一 token reply 會得到 "Invalid reply token"
- 若此錯誤未被捕捉，FastAPI 返回 500，LINE webhook 重試，形成循環
- 巢狀捕捉確保函式正常返回，FastAPI 返回 200，終止 retry 循環

## Risks / Trade-offs

| 風險 | 說明 |
|------|------|
| substring match 不支援語意搜尋 | 用戶輸入「電子業大廠」找不到台積電；可接受，未來可加同義詞表 |
| 搜尋只涵蓋 name + company | title、phone、email 不在搜尋範圍；符合 80% 使用場景 |
| 大量名片時全表掃描 | Firebase 讀取全表 → 本地過濾；1000 筆以內效能無感，未來可加 index |
