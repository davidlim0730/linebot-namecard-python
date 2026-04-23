// Lucide-style stroke icons, hand-coded small set
const Icon = ({ children, size = 18, className = "", strokeWidth = 1.75, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
    className={className} style={style}>
    {children}
  </svg>
);

const IconSearch = (p) => <Icon {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></Icon>;
const IconPlus = (p) => <Icon {...p}><path d="M12 5v14M5 12h14" /></Icon>;
const IconX = (p) => <Icon {...p}><path d="M18 6 6 18M6 6l12 12" /></Icon>;
const IconCheck = (p) => <Icon {...p}><path d="M20 6 9 17l-5-5" /></Icon>;
const IconChevronDown = (p) => <Icon {...p}><path d="m6 9 6 6 6-6" /></Icon>;
const IconChevronRight = (p) => <Icon {...p}><path d="m9 18 6-6-6-6" /></Icon>;
const IconChevronLeft = (p) => <Icon {...p}><path d="m15 18-6-6 6-6" /></Icon>;
const IconPhone = (p) => <Icon {...p}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" /></Icon>;
const IconMail = (p) => <Icon {...p}><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-10 5L2 7" /></Icon>;
const IconMapPin = (p) => <Icon {...p}><path d="M20 10c0 7-8 13-8 13s-8-6-8-13a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></Icon>;
const IconBuilding = (p) => <Icon {...p}><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01M16 6h.01M8 10h.01M16 10h.01M8 14h.01M16 14h.01"/></Icon>;
const IconBriefcase = (p) => <Icon {...p}><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></Icon>;
const IconUsers = (p) => <Icon {...p}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></Icon>;
const IconUser = (p) => <Icon {...p}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></Icon>;
const IconCheckSquare = (p) => <Icon {...p}><path d="m9 11 3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></Icon>;
const IconLayout = (p) => <Icon {...p}><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M3 9h18"/></Icon>;
const IconLine = (p) => <Icon {...p}><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7a12 12 0 0 1-4-.6L3 22l1.5-4A10 10 0 0 1 2 12Z"/></Icon>;
const IconSettings = (p) => <Icon {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></Icon>;
const IconMic = (p) => <Icon {...p}><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3"/></Icon>;
const IconSparkles = (p) => <Icon {...p}><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/><circle cx="12" cy="12" r="3"/></Icon>;
const IconFilter = (p) => <Icon {...p}><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/></Icon>;
const IconMoreH = (p) => <Icon {...p}><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></Icon>;
const IconMoreV = (p) => <Icon {...p}><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></Icon>;
const IconCalendar = (p) => <Icon {...p}><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></Icon>;
const IconAlert = (p) => <Icon {...p}><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></Icon>;
const IconTrendUp = (p) => <Icon {...p}><path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/></Icon>;
const IconClock = (p) => <Icon {...p}><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></Icon>;
const IconEdit = (p) => <Icon {...p}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></Icon>;
const IconCopy = (p) => <Icon {...p}><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></Icon>;
const IconTag = (p) => <Icon {...p}><path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><path d="M7 7h.01"/></Icon>;
const IconMessage = (p) => <Icon {...p}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></Icon>;
const IconBell = (p) => <Icon {...p}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"/></Icon>;
const IconGrip = (p) => <Icon {...p}><circle cx="9" cy="6" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="18" r="1"/></Icon>;
const IconDollar = (p) => <Icon {...p}><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></Icon>;
const IconArrowRight = (p) => <Icon {...p}><path d="M5 12h14M12 5l7 7-7 7"/></Icon>;
const IconArrowLeft = (p) => <Icon {...p}><path d="M19 12H5M12 19l-7-7 7-7"/></Icon>;
const IconStar = (p) => <Icon {...p}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></Icon>;
const IconSend = (p) => <Icon {...p}><path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/></Icon>;
const IconDot = (p) => <Icon {...p}><circle cx="12" cy="12" r="4" fill="currentColor" stroke="none"/></Icon>;
const IconLink = (p) => <Icon {...p}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></Icon>;
const IconLogOut = (p) => <Icon {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></Icon>;

Object.assign(window, {
  Icon, IconSearch, IconPlus, IconX, IconCheck, IconChevronDown, IconChevronRight, IconChevronLeft,
  IconPhone, IconMail, IconMapPin, IconBuilding, IconBriefcase, IconUsers, IconUser, IconCheckSquare,
  IconLayout, IconLine, IconSettings, IconMic, IconSparkles, IconFilter, IconMoreH, IconMoreV,
  IconCalendar, IconAlert, IconTrendUp, IconClock, IconEdit, IconCopy, IconTag, IconMessage,
  IconBell, IconGrip, IconDollar, IconArrowRight, IconArrowLeft, IconStar, IconSend, IconDot, IconLink, IconLogOut
});
