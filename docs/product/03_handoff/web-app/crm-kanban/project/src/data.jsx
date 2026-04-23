// Mock data for CRM app
const STAGES = [
  { id: "0", name: "初步接觸", short: "初接", color: "#E8F9EE", text: "#006E2B" },
  { id: "1", name: "需求確認", short: "需求", color: "#E8F9EE", text: "#006E2B" },
  { id: "2", name: "提案中", short: "提案", color: "#E8F9EE", text: "#006E2B" },
  { id: "3", name: "報價送出", short: "報價", color: "#FEF9C3", text: "#854D0E" },
  { id: "4", name: "議價協商", short: "議價", color: "#FEF9C3", text: "#854D0E" },
  { id: "5", name: "合約審查", short: "合約", color: "#FEF9C3", text: "#854D0E" },
  { id: "6", name: "等待簽約", short: "簽約", color: "#DBEAFE", text: "#1E40AF" },
  { id: "won", name: "成交", short: "✓", color: "#06C755", text: "#FFFFFF" },
  { id: "lost", name: "失敗", short: "✕", color: "#FEE2E2", text: "#C0000A" },
];

const TAGS = [
  { id: "t1", name: "VIP客戶", color: "#C0000A" },
  { id: "t2", name: "供應商", color: "#1E40AF" },
  { id: "t3", name: "合作夥伴", color: "#854D0E" },
  { id: "t4", name: "潛在客戶", color: "#006E2B" },
  { id: "t5", name: "展場認識", color: "#F59E0B" },
  { id: "t6", name: "政府機關", color: "#7C3AED" },
];

const CONTACTS = [
  { id: "c1", name: "王文彥", nameEn: "Wenyen Wang", title: "業務協理", company: "台積電", email: "wy.wang@tsmc-demo.com", phone: "02-2345-6789", mobile: "0912-345-678", line: "wenyen.w", tags: ["VIP客戶"], initials: "王", color: "#E8F9EE", address: "新竹科學園區力行六路 8 號" },
  { id: "c2", name: "李佳蓉", nameEn: "Jiarong Lee", title: "採購主管", company: "鴻海科技", email: "jr.lee@hon-demo.com", phone: "02-2268-3466", mobile: "0933-128-211", line: "", tags: ["供應商"], initials: "李", color: "#DBEAFE", address: "新北市土城區中山路 66 號" },
  { id: "c3", name: "張博翔", nameEn: "Box Chang", title: "產品經理", company: "聯發科", email: "box.chang@mtk-demo.com", phone: "03-567-0766", mobile: "0921-884-332", line: "boxchang", tags: ["VIP客戶", "合作夥伴"], initials: "張", color: "#FEF9C3", address: "新竹市東區科學園區研發六路 1 號" },
  { id: "c4", name: "陳怡君", nameEn: "Yijun Chen", title: "財務長", company: "統一企業", email: "yijun.chen@uni-demo.com", phone: "02-2513-5388", mobile: "0955-012-901", line: "yijun0901", tags: ["潛在客戶"], initials: "陳", color: "#FEE2E2", address: "台南市永康區鹽行里中正路 301 號" },
  { id: "c5", name: "林世偉", nameEn: "Shih-Wei Lin", title: "執行長", company: "綠色動能", email: "sw.lin@greenmo-demo.com", phone: "02-8978-2311", mobile: "0987-221-455", line: "swlin", tags: ["VIP客戶", "展場認識"], initials: "林", color: "#E8F9EE", address: "台北市信義區松仁路 100 號 15F" },
  { id: "c6", name: "黃雅婷", nameEn: "Yating Huang", title: "行銷總監", company: "誠品生活", email: "yt.huang@eslite-demo.com", phone: "02-8789-3388", mobile: "0919-777-231", line: "", tags: ["合作夥伴"], initials: "黃", color: "#FDE68A" },
  { id: "c7", name: "蘇冠廷", nameEn: "Kuan-Ting Su", title: "研發經理", company: "工研院", email: "kt.su@itri-demo.com", phone: "03-591-3000", mobile: "0912-003-887", line: "ktsu_itri", tags: ["政府機關"], initials: "蘇", color: "#E0E7FF" },
  { id: "c8", name: "吳子涵", nameEn: "Zihan Wu", title: "業務副總", company: "日月光半導體", email: "zh.wu@ase-demo.com", phone: "07-361-7131", mobile: "0966-554-100", line: "", tags: ["VIP客戶"], initials: "吳", color: "#FEE2E2" },
  { id: "c9", name: "鄭宜庭", nameEn: "Yiting Cheng", title: "採購專員", company: "中華電信", email: "yt.cheng@cht-demo.com", phone: "02-2344-3232", mobile: "", line: "", tags: ["供應商"], initials: "鄭", color: "#F3F3F8" },
  { id: "c10", name: "劉建宏", nameEn: "Jianhong Liu", title: "工程副理", company: "台達電子", email: "jh.liu@delta-demo.com", phone: "03-452-6107", mobile: "0935-881-223", line: "jhliu", tags: [], initials: "劉", color: "#DBEAFE" },
  { id: "c11", name: "楊郁雯", nameEn: "Yuwen Yang", title: "專案經理", company: "宏碁集團", email: "yw.yang@acer-demo.com", phone: "02-2696-1234", mobile: "0988-223-441", line: "yuwen.y", tags: ["潛在客戶"], initials: "楊", color: "#FEF9C3" },
  { id: "c12", name: "周志豪", nameEn: "Chih-Hao Chou", title: "技術長", company: "緯創資通", email: "ch.chou@wistron-demo.com", phone: "02-6612-6666", mobile: "0918-566-727", line: "", tags: ["VIP客戶", "合作夥伴"], initials: "周", color: "#E8F9EE" },
];

const DEALS = [
  { id: "d1", company: "台積電", contactId: "c1", stage: "0", value: 2_400_000, summary: "介紹完產品線；王協理對 ESG 模組感興趣，約下週深談。", nextAction: "2026-04-28", nextActionText: "寄送技術白皮書", pending: false, owner: "c5" },
  { id: "d2", company: "鴻海科技", contactId: "c2", stage: "1", value: 850_000, summary: "李主管提出三項採購需求，需要整合供應鏈資料。", nextAction: "2026-04-24", nextActionText: "整理客製化需求清單", pending: false, owner: "c5" },
  { id: "d3", company: "聯發科 R&D", contactId: "c3", stage: "2", value: 4_600_000, summary: "已提交初步提案，張 PM 評估中；預計兩週內回覆。", nextAction: "2026-05-06", nextActionText: "追蹤提案回饋", pending: true, owner: "c1" },
  { id: "d4", company: "統一企業", contactId: "c4", stage: "3", value: 1_200_000, summary: "報價已送至陳財務長；等待內部簽核。", nextAction: "2026-04-30", nextActionText: "電話確認報價進度", pending: false, owner: "c1" },
  { id: "d5", company: "綠色動能", contactId: "c5", stage: "3", value: 5_800_000, summary: "報價金額高於預算 8%，林執行長希望討論分期方案。", nextAction: "2026-04-25", nextActionText: "準備分期付款提案", pending: false, owner: "c5" },
  { id: "d6", company: "誠品生活", contactId: "c6", stage: "4", value: 980_000, summary: "雙方就合約年限與違約條款拉鋸，黃總監態度趨於保守。", nextAction: "2026-04-29", nextActionText: "法務會議討論違約條款", pending: false, owner: "c1" },
  { id: "d7", company: "工研院 產服中心", contactId: "c7", stage: "5", value: 3_200_000, summary: "合約文本已由雙方法務審查，僅剩附件 B 調整。", nextAction: "2026-04-26", nextActionText: "提交附件 B 修訂版", pending: false, owner: "c1" },
  { id: "d8", company: "日月光半導體", contactId: "c8", stage: "6", value: 7_200_000, summary: "吳副總同意合約內容，排程下週二簽約。", nextAction: "2026-04-29", nextActionText: "確認簽約日程與見證人", pending: false, owner: "c5" },
  { id: "d9", company: "台達電子", contactId: "c10", stage: "1", value: 1_650_000, summary: "劉副理詢問 API 整合規格，正在評估內部導入成本。", nextAction: "2026-05-03", nextActionText: "技術窗口會議", pending: true, owner: "c1" },
  { id: "d10", company: "中華電信", contactId: "c9", stage: "2", value: 2_100_000, summary: "提案已送出；鄭專員表示需等待跨部門評估。", nextAction: "2026-05-10", nextActionText: "寄送補充案例", pending: false, owner: "c5" },
  { id: "d11", company: "宏碁集團", contactId: "c11", stage: "4", value: 3_400_000, summary: "楊 PM 希望再降 6% 才能進入最終簽核。", nextAction: "2026-04-27", nextActionText: "內部折扣核准", pending: false, owner: "c1" },
  { id: "d12", company: "緯創資通", contactId: "c12", stage: "0", value: 1_000_000, summary: "周 CTO 介紹產品線；下階段邀約技術 POC。", nextAction: "2026-05-05", nextActionText: "POC 範圍會議", pending: false, owner: "c5" },
  { id: "d13", company: "聯電先進封裝", contactId: "c3", stage: "5", value: 5_500_000, summary: "合約已會簽三輪，僅剩 IP 條款未確認。", nextAction: "2026-04-25", nextActionText: "IP 條款雙方窗口對齊", pending: false, owner: "c5" },
];

// Actions / Todos
const ACTIONS = [
  { id: "a1", text: "電話確認 台積電 報價進度", dealId: "d4", contactId: "c1", due: "2026-04-22", status: "today" },
  { id: "a2", text: "寄產品型錄給陳財務長", dealId: "d4", contactId: "c4", due: "2026-04-22", status: "today" },
  { id: "a3", text: "整理鴻海客製化需求清單", dealId: "d2", contactId: "c2", due: "2026-04-22", status: "today" },
  { id: "a4", text: "提交工研院合約附件 B 修訂版", dealId: "d7", contactId: "c7", due: "2026-04-20", status: "overdue" },
  { id: "a5", text: "準備綠色動能分期付款提案", dealId: "d5", contactId: "c5", due: "2026-04-25", status: "week" },
  { id: "a6", text: "宏碁折扣核准 — 內部走簽", dealId: "d11", contactId: "c11", due: "2026-04-27", status: "week" },
  { id: "a7", text: "誠品違約條款 — 約法務會議", dealId: "d6", contactId: "c6", due: "2026-04-29", status: "week" },
  { id: "a8", text: "台達技術窗口會議（API 規格）", dealId: "d9", contactId: "c10", due: "2026-05-03", status: "later" },
  { id: "a9", text: "寄送中華電信補充案例（金融業）", dealId: "d10", contactId: "c9", due: "2026-05-10", status: "later" },
  { id: "a10", text: "完成聯發科競品分析", dealId: "d3", contactId: "c3", due: "2026-04-18", status: "done" },
];

// Activity timeline
const ACTIVITIES = [
  { id: "ac1", contactId: "c1", date: "2026-04-18", sentiment: "positive",
    aiInsights: [
      "王協理對 ESG 碳排放模組有高度興趣",
      "關鍵決策者為王協理與財務副總兩人",
      "預算週期為 Q3 開始，需在 6 月底前完成報價"
    ],
    original: "今天下午拜訪台積電王協理，他主動提到 ESG 模組，詢問能否針對新竹廠區先做 POC。說要跟財務副總討論預算，Q3 才開始編，希望我們 6 月底前把報價送進去。" },
  { id: "ac2", contactId: "c1", date: "2026-04-10", sentiment: "neutral",
    aiInsights: [
      "初次碰面，雙方互留名片",
      "王協理負責工廠自動化相關採購"
    ],
    original: "展場認識王協理，聊了 15 分鐘，主要是台積電的自動化流程。" },
  { id: "ac3", contactId: "c1", date: "2026-03-22", sentiment: "positive",
    aiInsights: ["經由劉副理介紹，取得台積電聯絡窗口"],
    original: "劉副理幫我介紹王協理，已加 LINE。" },
];

// Tag usage counts
const TAG_USAGE = {
  "VIP客戶": 6, "供應商": 4, "合作夥伴": 5, "潛在客戶": 3, "展場認識": 2, "政府機關": 1
};

const CURRENT_USER = { id: "me", name: "施威宇", initials: "施", role: "admin", color: "#006E2B" };

// helpers
const formatCurrency = (n) => "NT$ " + n.toLocaleString();
const formatCurrencyShort = (n) => {
  if (n >= 1_000_000) return "$" + (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return "$" + (n / 1_000).toFixed(0) + "K";
  return "$" + n;
};
const formatDate = (d) => {
  const dt = new Date(d);
  return `${dt.getMonth() + 1}/${String(dt.getDate()).padStart(2, "0")}`;
};
const WEEKDAYS_ZH = ["日", "一", "二", "三", "四", "五", "六"];
const formatDateWithDay = (d) => {
  const dt = new Date(d);
  return `${dt.getMonth() + 1}/${String(dt.getDate()).padStart(2, "0")} 週${WEEKDAYS_ZH[dt.getDay()]}`;
};
const daysFromNow = (d) => {
  const today = new Date("2026-04-22");
  const dt = new Date(d);
  return Math.round((dt - today) / 86400000);
};

const getContact = (id) => CONTACTS.find(c => c.id === id);
const getDeal = (id) => DEALS.find(d => d.id === id);
const getStage = (id) => STAGES.find(s => s.id === id);

Object.assign(window, {
  STAGES, TAGS, CONTACTS, DEALS, ACTIONS, ACTIVITIES, TAG_USAGE, CURRENT_USER,
  formatCurrency, formatCurrencyShort, formatDate, formatDateWithDay, daysFromNow, getContact, getDeal, getStage
});
