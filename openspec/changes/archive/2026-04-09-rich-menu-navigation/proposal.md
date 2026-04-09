## Why

目前使用者只能透過文字指令操作 Bot，缺乏直覺的視覺導覽介面，導致新用戶上手困難、功能可見度低。實作 LINE Rich Menu 與分層 Quick Reply 選單，將提升可發現性並降低學習門檻，為企業業務團隊提供更流暢的日常操作體驗。

## What Changes

- 新增 LINE Rich Menu（3 個主要按鈕：名片操作、團隊功能、資料與設定）
- 各主要按鈕觸發對應的 Quick Reply 次級選單
- Postback 事件處理新增 Rich Menu 相關 action
- 現有文字指令全數保留，Rich Menu 作為補充 UI 層
- 新增 `rich_menu_utils.py`，封裝 Rich Menu 建立、綁定與切換邏輯

## Capabilities

### New Capabilities

- `rich-menu-setup`: 建立、設定並綁定 LINE Rich Menu 到 Bot（主選單三按鈕）
- `quick-reply-navigation`: 點擊主選單按鈕後，以 Quick Reply 呈現次級功能選項，對應現有指令或 Postback action

### Modified Capabilities

- `card-actions`: 新增 Quick Reply 入口路徑（新增名片、搜尋名片、管理名片），需更新 postback handler 以支援選單觸發

## Impact

- **新增檔案**：`app/rich_menu_utils.py`（Rich Menu CRUD）
- **修改檔案**：`app/line_handlers.py`（新增 Quick Reply 回覆邏輯）、`app/flex_messages.py`（Quick Reply button 樣板）、`app/main.py`（啟動時初始化 Rich Menu）
- **LINE API**：需呼叫 Rich Menu API（create、upload image、link to bot）
- **無 Firebase schema 變更**
- **非目標**：Rich Menu 個人化（依角色顯示不同選單）、多語言選單、Help 選單（第一版省略）

## Roadmap Phase

Phase 4（UI 優化），在 Phase 3 標籤系統完成後實施。
