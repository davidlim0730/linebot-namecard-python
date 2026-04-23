// app/data.jsx — Mock data for the CRM prototype

const CONTACTS = [
  {
    id: 'c1', name: '陳雅婷', company: '昇陽科技', role: '採購經理',
    phone: '0928-445-712', email: 'yating.chen@sunpower.tw',
    lastContact: '今天 14:32', status: 'hot', dealValue: 820000,
    source: 'LINE 官方帳號', tags: ['決策者', 'Q2 目標'],
    summary: '對企業版雲端方案高度感興趣，已索取估價單。預計 5/10 前完成內部評估，關注資料合規與導入期程。競品正評估 Salesforce。',
    nextStep: '寄送繁中版合規白皮書，週五前電話確認',
    nextStepBy: '週五 17:00',
  },
  {
    id: 'c2', name: '林建宏', company: '恆基物流', role: '資訊長',
    phone: '0933-208-196', email: 'ch.lin@henkilogistics.com',
    lastContact: '昨天 16:10', status: 'warm', dealValue: 450000,
    source: '展會名片', tags: ['技術評估中'],
    summary: '已完成兩次技術會議。團隊正試用 Sandbox 環境，對 API 限流有疑慮。下一步需安排解決方案架構師通話。',
    nextStep: '預約 SA 技術會議',
    nextStepBy: '下週二',
  },
  {
    id: 'c3', name: '王淑芬', company: 'AllGood 食品', role: '行銷總監',
    phone: '0912-557-033', email: 'sf.wang@allgoodfood.tw',
    lastContact: '3 天前', status: 'warm', dealValue: 280000,
    source: '客戶轉介紹', tags: ['夏季活動'],
    summary: '預算已批准 NT$28 萬，等待集團法務回覆合約條款。關鍵人是財務副總張先生。',
    nextStep: '跟進合約法務進度',
    nextStepBy: '5/2',
  },
  {
    id: 'c4', name: 'Michael Tang', company: 'Paxora Digital', role: 'COO',
    phone: '0910-223-847', email: 'michael@paxora.io',
    lastContact: '5 天前', status: 'cold', dealValue: 1200000,
    source: 'Cold outbound', tags: ['大型機會'],
    summary: '初步接洽已介紹 Pro Plan。對方正在內部提案階段，需等到 Q3 才會重啟討論。',
    nextStep: '7/1 重啟聯繫',
    nextStepBy: '7/1',
  },
  {
    id: 'c5', name: '黃子豪', company: '晨曦生醫', role: 'CEO',
    phone: '0922-441-065', email: 'zh.huang@chenxi-bio.com',
    lastContact: '1 週前', status: 'cold', dealValue: 0,
    source: '網站表單', tags: [],
    summary: null, nextStep: null, nextStepBy: null,
  },
];

const PIPELINE = {
  '初步接觸': { count: 4, value: 1480000, color: '#B4BABF' },
  '需求評估': { count: 3, value: 2100000, color: '#0A84FF' },
  '提案中':   { count: 2, value: 1270000, color: '#F59E0B' },
  '簽約中':   { count: 2, value: 950000,  color: '#06C755' },
};

const DEALS_BY_STAGE = {
  '初步接觸': [
    { id: 'd1', name: '雲端遷移 POC', company: '晨曦生醫', value: 380000, days: 3, contact: '黃子豪' },
    { id: 'd2', name: '年度授權續約', company: 'TriCloud', value: 520000, days: 5, contact: '張婉容' },
    { id: 'd3', name: 'API 整合試用', company: '漁獲物聯', value: 280000, days: 8, contact: '李文昌' },
    { id: 'd4', name: '企業版諮詢', company: 'Neo Retail', value: 300000, days: 12, contact: 'Jenny Wu' },
  ],
  '需求評估': [
    { id: 'd5', name: '總部系統升級', company: '昇陽科技', value: 820000, days: 2, contact: '陳雅婷', hot: true },
    { id: 'd6', name: '物流 SaaS 導入', company: '恆基物流', value: 450000, days: 1, contact: '林建宏' },
    { id: 'd7', name: '多品牌部署', company: 'AllGood 食品', value: 830000, days: 6, contact: '王淑芬' },
  ],
  '提案中': [
    { id: 'd8', name: '全站升級方案', company: 'Paxora Digital', value: 1200000, days: 5, contact: 'Michael Tang' },
    { id: 'd9', name: 'Pro Plan 擴充', company: '樂活保健', value: 70000, days: 2, contact: '劉承恩' },
  ],
  '簽約中': [
    { id: 'd10', name: '年度合約', company: 'AllGood 食品', value: 280000, days: 1, contact: '王淑芬', hot: true },
    { id: 'd11', name: '團隊授權', company: '群晉資訊', value: 670000, days: 3, contact: '吳雅筑' },
  ],
};

const TASKS_TODAY = [
  {
    id: 't1', time: '09:30', type: 'call', done: true,
    title: '回電 陳雅婷 確認合規白皮書收到',
    contact: '陳雅婷', company: '昇陽科技',
    aiGenerated: true, source: '來自昨天的語音紀錄',
  },
  {
    id: 't2', time: '11:00', type: 'meeting', done: false,
    title: 'SA 技術會議 × 恆基物流',
    contact: '林建宏', company: '恆基物流',
    aiGenerated: false, duration: 60,
  },
  {
    id: 't3', time: '14:00', type: 'email', done: false,
    title: '寄送合約草稿給王淑芬',
    contact: '王淑芬', company: 'AllGood 食品',
    aiGenerated: true, source: 'AI 偵測：合約法務已回覆',
  },
  {
    id: 't4', time: '16:30', type: 'follow', done: false,
    title: 'LINE 訊息跟進黃子豪 官網表單',
    contact: '黃子豪', company: '晨曦生醫',
    aiGenerated: true, source: '7 天未聯繫 · AI 建議',
  },
];

const INBOX_ITEMS = [
  {
    id: 'i1', kind: 'summary', priority: 'high',
    title: '陳雅婷 需要下一步',
    body: '已等待白皮書 2 天。AI 建議：今天內電話確認收到。',
    contact: '陳雅婷', time: '14 分鐘前',
    action: '立即通話',
  },
  {
    id: 'i2', kind: 'auto-filed', priority: 'med',
    title: 'AI 已整理 3 則語音紀錄',
    body: '自動歸檔到：林建宏 (2)、王淑芬 (1)。',
    time: '1 小時前',
    action: '查看',
  },
  {
    id: 'i3', kind: 'insight', priority: 'med',
    title: '發現潛在機會',
    body: 'Paxora Digital 在 LinkedIn 發布新一輪募資新聞。建議重啟對話。',
    contact: 'Michael Tang', time: '今天 09:21',
    action: '重啟對話',
  },
  {
    id: 'i4', kind: 'reminder', priority: 'low',
    title: '週二需求評估會議準備',
    body: 'AI 已整理恆基物流 6 個月內對話重點。',
    contact: '林建宏', time: '今早',
    action: '查看摘要',
  },
];

Object.assign(window, { CONTACTS, PIPELINE, DEALS_BY_STAGE, TASKS_TODAY, INBOX_ITEMS });
