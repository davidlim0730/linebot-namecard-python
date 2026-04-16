這是一份基於您提供的來源，仿照重現 Salesforce CRM 核心 Schema 與資料庫結構的完整設計說明。本設計說明分為「底層物理模式」、「邏輯領域模型」、「安全與審計結構」以及「系統效能與實施建議」四大板塊。

### 仿照 Salesforce CRM 核心 Schema 與資料庫結構設計說明

#### 一、 架構核心理念：多租戶與中繼資料驅動

Salesforce 採用的是\*\*「共享資料庫、共享綱要」**的雲端原生多租戶（Multi-tenancy）模式，數以萬計的企業組織皆在同一個物理資料庫表中存儲數據1。其核心為**中繼資料驅動（Metadata-Driven）\*\*的設計理念，將「數據」與「數據的描述（Schema）」徹底分離，無論系統管理員新增任何欄位或對象，底層資料庫都不會執行 CREATE TABLE 或 ALTER TABLE 等 DDL 指令，而是僅更新中繼資料表，藉此實現極高的擴展性與系統穩定性1。

#### 二、 底層物理模式 (Physical Schema)

在底層，Salesforce 依賴「通用數據字典」（Universal Data Dictionary），將租戶自定義的邏輯視圖動態對應到靜態的物理存儲層1-3。  
**1\. 中繼資料註冊表 (Metadata Tables)**這組資料表負責記錄「哪個組織定義了什麼資料結構」。

* **MT\_Objects (虛擬表註冊表)**：管理所有標準與自定義對象1-3。  
* OrgID (GUID)：區分不同客戶組織的唯一識別碼1-3。  
* ObjID (GUID)：邏輯對象（如 Account 或自定義對象）的虛擬表唯一識別碼2-4。  
* ObjName (Varchar)：租戶為對象設定的邏輯 API 名稱2-4。  
* IsCustom (Boolean)：標記為標準對象或自定義對象4。  
* **MT\_Fields (虛擬列註冊表)**：定義虛擬表中的欄位屬性2-4。  
* FieldID (GUID)：欄位的唯一識別碼2, 3。  
* OrgID / ObjID (GUID)：關聯至所屬組織與虛擬對象2, 3。  
* FieldName (Varchar)：租戶自定義的欄位名稱（如 Email\_\_c）2, 3。  
* DataType (Picklist)：資料類型（如 Text, Number, Date 等）2, 3。  
* FieldNum (Integer)：**欄位序號**，這是物理存儲表中的欄位索引，導引系統前往對應的「資料槽位」讀取真實數據2-4。

**2\. 物理數據存儲層 (Data & Index Tables)**所有租戶的業務數據，皆混和存放在一個極度寬廣的海量堆表（Heap Table）中。

* **MT\_Data (核心數據表)**：打破傳統資料庫欄位限制的物理表2-4。  
* GUID (RecordID)：全球唯一的紀錄識別碼，前三位通常代表對象類型（如 001 代表 Account）2-4。  
* OrgID / ObjID：用於物理分區與查詢時的安全過濾2-4。  
* Name (Varchar)：儲存人類可讀的檢索字串（如帳戶名或個案編號）2-4。  
* Value0 ... Value500 **(Flex Columns / 資料槽位)**：預先定義好的泛型欄位（Varchar格式）。系統在運行時會將數據提取並透過 MT\_Fields 動態轉型為正確的業務資料2-4。  
* IsDeleted (Boolean)：用於實現軟刪除（Soft Delete），誤刪時可透過「回收站」機制快速恢復2, 3, 5。  
* **MT\_Clobs**：專門存儲大文本（Text Area Long）數據，藉由關聯鍵與主表連接，保持主表的緊湊與高效2-4。  
* **MT\_Custom\_Indexes**：虛擬索引表。將標記為可索引的 ValueN 欄位數據提取至此建立物理索引，解決泛型欄位無法直接建立有效索引的問題2, 3, 6。

#### 三、 邏輯領域模型 (Logical Domain Schema)

建構在虛擬物理層之上的是具備業務邏輯的銷售雲核心對象，系統透過轉化控制器與中繼欄位映射來維繫對象間的關係2-4, 7。  
**1\. 核心對象與結構**

* **Lead (線索)**：代表潛在商業利益。核心欄位包含 Id, FirstName, LastName, Company, Status, LeadSource, IsConverted2, 3。當線索觸發**轉化 (Conversion)** 時，數據會透過中繼資料的「欄位映射」規則，自動重組並克隆成 Account、Contact 與 Opportunity 三個關聯紀錄7。  
* **Account (客戶/公司)**：資料中樞。包含 Id, Name, ParentId (實現母子公司結構), Industry, OwnerId2, 3。  
* **Contact (聯絡人)**：隸屬公司。包含 Id, AccountId (Lookup至客戶), Email, Phone, ReportsToId (實現組織架構)2, 3。  
* **Opportunity (商機)**：銷售管道核心。包含 Id, AccountId, Name, Amount, CloseDate, StageName, Probability, ForecastCategoryName, Pricebook2Id2, 3。

**2\. 多對多與歷史追蹤對象**

* **OpportunityContactRole** (商機聯絡人角色)：多對多中繼表，包含 OpportunityId, ContactId, Role (如決策者)2, 3。  
* **OpportunityLineItem** (商機產品)：包含 OpportunityId, Product2Id, Quantity, UnitPrice, TotalPrice2, 3。  
* **OpportunityHistory** (商機歷史)：記錄關鍵變更（如階段、金額變更）及變更時間，用於分析趨勢與計算階段停留天數8, 9。

**3\. 關聯建模機制**

* **Lookup (查找關係)**：鬆散關聯（允許 Null）。子紀錄的安全性獨立，刪除父紀錄時子紀錄通常會保留7。  
* **Master-Detail (主從關係)**：強耦合關聯。父紀錄完全控制子紀錄的安全訪問權限；刪除父紀錄會觸發**級聯刪除 (Cascading Delete)**7。此關係支援「匯總摘要欄位 (Roll-up Summary)」，但高併發下更新父紀錄統計數據容易造成行鎖定 (Row Locking)7。

#### 四、 安全、權限與審計結構 (Security & Audit Schema)

Salesforce 的安全架構將權限分為多個維度，嚴格控管「誰能看到哪些欄位或哪幾筆記錄」6。  
**1\. 審計關鍵欄位 (Audit Trail)**每張表（即使是自定義表）都強制自帶以下四個審計欄位確保數據追溯性：

* CreatedById / CreatedDate：系統維護的建立者與創建時間4, 8, 9。  
* LastModifiedById / LastModifiedDate：用戶最後修改的時間。**此欄位允許手動回填**，有利於資料遷移5, 8, 9。  
* SystemModstamp：系統層級戳記，嚴格唯讀。不管是人工或後台觸發更新都會變更，底層建有索引，**是作為 ETL 增量數據同步的最佳過濾條件**5, 8, 9。

**2\. 記錄級安全性與分享表 (Record-level Security)**針對非公開的對象，系統會自動建立對應的共享表（例如 **AccountShare, OpportunityShare**）6, 8, 9。

* 欄位包含：ParentId (指向原始紀錄), UserOrGroupId (獲得權限的用戶或群組), AccessLevel (Read/Edit), RowCause (分享原因，如手動或規則分享)8, 9。  
* 查詢時引擎會將業務表與 Share 表進行 JOIN；為了優化效能，系統會預先計算「角色階層（Role Hierarchy）」的權限，將層級權限扁平化寫入群組成員表以實現極速查詢6, 10。

#### 五、 效能優化與現代實施建議 (Performance & Implementation)

若要利用現代技術棧復刻上述架構，來源資料建議採取以下實施策略：

* **資料分區與儲存引擎**：  
* **資料分區**：在 MT\_Data 物理層，建議以 OrgID 進行 Hash 分區，避免單一客戶的大量查詢影響全系統效能8, 9。  
* **LSM 存儲引擎**：針對百億級數據（如 SalesforceDB 正在轉型的架構），建議採用 LSM-Tree（Log-Structured Merge）架構，將隨機寫入轉為順序寫入，大幅提升高負載的吞吐量5, 8, 9。  
* **效能優化表結構 (Skinny Tables)**：  
* 對於高性能查詢需求，建議建置「瘦表（Skinny Tables）」作為物化視圖。它將常用的標準與自定義欄位整合在同一張窄表中，避免 JOIN 操作、減少磁碟 IO，並排除已標記刪除 (IsDeleted \= true) 的無效紀錄5, 6。  
* **推薦技術棧**：  
* **持久層**：使用 PostgreSQL（支援強大的 JSONB 索引，可用以完美模擬 Flex Columns 結構）10。  
* **緩存層**：使用 Redis 存儲權限矩陣與中繼資料的定義緩存10。  
* **內核語言**：使用 Rust 或 Golang 打造高性能的動態 SQL 編譯器與權限攔截器（需強制在所有 SQL 中注入 TenantID 與 IsDeleted 條件）10。  
* **跨對象搜尋**：利用 Elasticsearch 模擬原生的全文檢索機制10。

這套架構將儲存引擎演化為「元數據整合中心」，並能夠承載大規模的多租戶運行10。  
針對上述的架構設計，您會希望我進一步將這份文件轉為幫助記憶的 **Flashcards (閃卡)**，或是您想深入探討其中哪一個技術細節（例如：**查詢編譯器與權限攔截器的實作方式**）呢？  
