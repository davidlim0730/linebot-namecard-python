# **Networking Copilot 完整產品開發路線圖 (2026)**

**版本**：v2026  
**狀態**：現行文件 — 長期願景與 Phase 5+ 規劃  
**關聯文件**：MVP 詳細執行狀態見 `roadmap_mvp.md`

## **專案概述 (Project Overview)**

**產品定位**：專為台灣商務人士打造的 AI 社交助理，解決實體名片數位化與後續客情維護（Follow-up）斷點。

**核心競爭力**：極速繁中 OCR 掃描 ＋ AI 企業/個人背景增益 (Enrichment) ＋ Line 自動化破冰閉環。

## **階段一：MVP 基礎建設與數位化 (Month 1-2)**

**目標 (Sprint Goal)**：打造流暢的「掃描、建檔、檢視」體驗，取代傳統名片夾。

### **1\. 產品功能 (Epics & Features)**

* **Epic 1: 帳號與初始設定**  
  * 支援 Apple ID / Google / Line 一鍵登入。  
  * 建立個人數位名片 (支援上傳實體名片圖檔或手動填寫)。  
* **Epic 2: 核心掃描引擎 (The Magic Capture)**  
  * 相機模組：支援「邊緣自動偵測 (Edge Detection)」與「自動裁切校正」。  
  * 批次掃描：支援連續拍攝多張名片，背景佇列處理。  
  * 精準 OCR：專為台灣繁體中文、統編、台灣地址與手機格式（09xx-xxx-xxx）優化的文字萃取。  
* **Epic 3: 名片庫管理 (CRM 雛形)**  
  * 列表與搜尋：支援姓名、公司、關鍵字全域搜尋。  
  * 卡片詳情頁：顯示名片原圖（對照用）與結構化聯絡資訊。

### **2\. UI/UX 交付物**

* Dark Mode 設計系統 (Design System) 定義。  
* 首頁 Dashboard 介面 (主打巨大的相機 FAB 按鈕)。  
* 掃描/校正/確認的流暢動畫與過場 (參考 Popl 的卡片翻轉)。

### **3\. 技術依賴 (Technical Dependencies)**

* 前端：React Native / Flutter 或 Next.js PWA (確保跨平台與相機調用效能)。  
* 後端/DB：PostgreSQL (存放用戶資料) \+ AWS S3/GCS (存放名片圖檔)。  
* OCR 引擎：Google Cloud Vision API 或 AWS Textract 進行初步封裝與 Prompt 微調。

## **階段二：AI 洞察增強 (Month 3-4)**

**目標 (Sprint Goal)**：實作 Covve 的核心價值，讓名片從「死資料」變成「活洞察」。

### **1\. 產品功能 (Epics & Features)**

* **Epic 1: 背景徵信增益 (Data Enrichment)**  
  * **台灣工商連線**：根據名片公司名/統編，自動抓取：資本額、負責人、成立時間、產業別。  
  * **社群數位足跡**：整合 LinkedIn 或公開搜尋，自動抓取對方的職涯歷程摘要。  
* **Epic 2: AI 摘要與破冰話題生成 (Conversation Starters)**  
  * 自動將上述收集到的雜亂資料，轉換為「50 字重點摘要」。  
  * 生成 3 個適合聊天的「破冰話題」（例如：對方公司近期動態、同業趨勢）。  
* **Epic 3: 語音情境筆記 (Voice Context)**  
  * 掃描完成當下彈出錄音提示。  
  * 使用者用語音輸入（例如：「這位是大巨蛋案子的 PM」），AI 自動轉文字並提取關鍵字作為標籤 (Tags)。

### **2\. UI/UX 交付物**

* **AI 處理進度條 (The Loading UX)**：等待 AI 抓取資料時的動態文案 (如：「正在搜尋工商登記...」)，降低焦慮感。  
* 情報摘要卡片 (Summary Card)：資訊層級重新排版，將「破冰話題」置於最顯眼處。

### **3\. 技術依賴 (Technical Dependencies)**

* AI Agent：串接 OpenAI GPT-4o 或 Claude 3.5 Sonnet 進行資料清洗與摘要。  
* 語音轉文字：OpenAI Whisper API。  
* 公開資料 API：政府開放資料平台 (台灣公司網 API)、SerpAPI (用於網路搜尋)。

## **階段三：自動化社交閉環與台灣場景優化 (Month 5-6)**

**目標 (Sprint Goal)**：打通「認識」到「跟進」的最後一哩路，建立產品黏著度。

### **1\. 產品功能 (Epics & Features)**

* **Epic 1: Line / Email 智慧聯動**  
  * **AI 訊息草稿**：根據名片與語音筆記，自動生成符合情境的 Line 招呼語。  
  * **一鍵跳轉**：點擊「加 Line」按鈕，自動複製草稿並呼叫手機 Line App (透過 Deeplink)。  
  * **EDM 個人化電子報**（POC v1，2026-04-21 設計完成）：業務員以個人 Gmail 帳號寄送差異化電子報給口袋名單，支援 merge tag 個人化（`{{name}}`、`{{company}}`、`{{opening_line}}` AI 生成開場白）、分眾管理（標籤篩選 + 手動調整）、公司信箱自動 CC。  
* **Epic 2: 智慧追蹤提醒 (Smart Follow-up)**  
  * 自訂追蹤節奏：預設「1 天後發感謝信」、「7 天後跟進專案」。  
  * 首頁小工具 (Widget) 提醒：今日待聯絡清單。  
* **Epic 3: 團隊協作與名片池 (Team Sharing)**  
  * 群組功能：建立「公司業務部」群組。  
  * 權限設定：分享特定名片至團隊，避免重複開發同一個客戶 (Lead Collision)。

### **2\. UI/UX 交付物**

* 「Generative UI」對話框：AI 提供三種不同語氣的 Line 訊息供使用者滑動選擇。  
* 行事曆/待辦事項 (To-Do List) 視圖與提醒通知設計。

### **3\. 技術依賴 (Technical Dependencies)**

* 通知系統：Firebase Cloud Messaging (FCM) 或 APNs (Apple)。  
* URL Scheme / Deeplinking：處理與 Line、LinkedIn App 的系統級跳轉。

## **階段四：商業化、變現與生態系 (Month 7-8)**

**目標 (Sprint Goal)**：建立健康的商業模式，並導入企業級功能。

### **1\. 產品功能 (Epics & Features)**

* **Epic 1: 訂閱制付費牆 (SaaS Paywall)**  
  * **免費版 (Freemium)**：每月掃描 50 張，基礎 OCR，不含 AI 洞察。  
  * **專業版 (Pro)**：無限制掃描，解鎖 AI 破冰話題、工商查詢、進階追蹤提醒。  
* **Epic 2: 企業級資料匯出**  
  * 支援批量匯出成 CSV/Excel。  
  * API 串接：與企業現有 CRM (如 Salesforce、HubSpot) 進行單向/雙向同步。  
* **Epic 3: AI 社交影響力報告**  
  * 每月生成報表：「您這個月認識了 15 位 C-level 高階主管」、「您在科技業的人脈增加了 20%」。

### **2\. UI/UX 交付物**

* 引人入勝的付費升級頁面 (Pricing Table) 與微動畫。  
* 個人數據洞察 Dashboard (圖表視覺化設計)。

### **3\. 技術依賴 (Technical Dependencies)**

* 金流串接：Stripe API 或 Apple IAP (In-App Purchase) / Google Play Billing。  
* 資料匯出模組：後端生成 CSV/XLSX 報表微服務。

## **專案風險與管控策略 (Risks & Mitigations)**

1. **AI 幻覺與資料錯誤 (AI Hallucination)**  
   * *解法*：在 AI 產出的「工商背景」或「破冰話題」旁加上「免責與回報機制」，並確保原圖隨時可供人工比對 (Human-in-the-loop)。  
2. **隱私權與個資法 (GDPR / 台灣個資法)**  
   * *解法*：確保所有名片資料僅存放於安全的雲端環境，明文規定 AI Agent 僅進行檢索摘要，不將用戶聯絡人作為模型訓練資料 (Opt-out from training)。  
3. **OCR 繁體字辨識率瓶頸**  
   * *解法*：前期投入資源收集台灣各產業名片樣式，並允許使用者建立「糾錯回饋機制」，逐步微調辨識模型。