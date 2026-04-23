// Contacts: List (split-pane) + Detail + CRM tabs

const ContactListItem = ({ contact, active, onClick }) => {
  return (
    <button onClick={onClick}
      style={{
        width: "100%",
        display: "flex", alignItems: "center", gap: 12,
        padding: "12px 16px",
        background: active ? "#E8F9EE" : "transparent",
        borderLeft: active ? "3px solid #06C755" : "3px solid transparent",
        textAlign: "left",
        transition: "all 150ms ease",
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "#F3F3F8"; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
    >
      <Avatar contact={contact} size={40} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 2 }}>
          <span style={{
            fontSize: 14, fontWeight: 700, color: "#1A1A1A",
            fontFamily: "'Plus Jakarta Sans', 'Noto Sans TC', sans-serif",
          }}>{contact.name}</span>
          {contact.nameEn && (
            <span style={{
              fontSize: 11, color: "#3C4A3C", opacity: 0.55,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              textTransform: "lowercase", fontWeight: 500,
            }}>{contact.nameEn.toLowerCase()}</span>
          )}
          {contact.tags?.includes("VIP客戶") && (
            <IconStar size={11} style={{ color: "#F59E0B", fill: "#F59E0B" }} strokeWidth={0} />
          )}
        </div>
        <div style={{
          fontSize: 12, color: "#3C4A3C", opacity: 0.75,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {contact.company} · {contact.title}
        </div>
        {contact.tags?.length > 0 && (
          <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
            {contact.tags.slice(0, 2).map(t => <Chip key={t} variant="active" size="sm">{t}</Chip>)}
          </div>
        )}
      </div>
    </button>
  );
};

// Tag picker that actually adds tags
const ContactTags = ({ contact }) => {
  const [tags, setTags] = React.useState(contact.tags || []);
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const pickerRef = React.useRef(null);
  React.useEffect(() => { setTags(contact.tags || []); setPickerOpen(false); }, [contact.id]);
  React.useEffect(() => {
    if (!pickerOpen) return;
    const onClick = (e) => { if (pickerRef.current && !pickerRef.current.contains(e.target)) setPickerOpen(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [pickerOpen]);
  const available = TAGS.map(t => t.name).filter(n => !tags.includes(n));
  return (
    <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap", position: "relative" }}>
      {tags.map(t => (
        <Chip key={t} variant="active" size="sm">
          {t}
          <button onClick={() => setTags(tags.filter(x => x !== t))}
            style={{ marginLeft: 2, opacity: 0.5, display: "inline-flex" }}>
            <IconX size={10} />
          </button>
        </Chip>
      ))}
      <div ref={pickerRef} style={{ position: "relative" }}>
        <Chip variant="outline" size="sm" onClick={() => setPickerOpen(!pickerOpen)}>
          <IconPlus size={10} /> 標籤
        </Chip>
        {pickerOpen && (
          <div style={{
            position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 20,
            background: "#fff", borderRadius: 10,
            boxShadow: "0 8px 24px rgba(0,0,0,0.12), 0 0 0 1px rgba(60,74,60,0.08)",
            padding: 8, minWidth: 180,
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#3C4A3C", opacity: 0.6, padding: "4px 8px", letterSpacing: "0.06em" }}>
              新增標籤
            </div>
            {available.length === 0 && (
              <div style={{ padding: "8px 8px", fontSize: 12, color: "#3C4A3C", opacity: 0.6 }}>
                已套用全部標籤
              </div>
            )}
            {available.map(name => (
              <button key={name}
                onClick={() => { setTags([...tags, name]); setPickerOpen(false); }}
                style={{
                  display: "flex", alignItems: "center", gap: 8, width: "100%",
                  padding: "6px 8px", borderRadius: 6, textAlign: "left",
                  fontSize: 13, color: "#1A1A1A",
                  transition: "background 120ms",
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "#F3F3F8"}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                <span style={{ width: 6, height: 6, borderRadius: 3, background: (TAGS.find(t => t.name === name) || {}).color || "#3C4A3C" }} />
                {name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const ContactList = ({ selectedId, onSelect }) => {
  const [search, setSearch] = React.useState("");
  const [filter, setFilter] = React.useState("all");

  const filtered = CONTACTS.filter(c => {
    if (filter === "vip" && !c.tags?.includes("VIP客戶")) return false;
    if (filter === "supplier" && !c.tags?.includes("供應商")) return false;
    if (filter === "partner" && !c.tags?.includes("合作夥伴")) return false;
    if (search) {
      const q = search.toLowerCase();
      return c.name.toLowerCase().includes(q) ||
        c.company.toLowerCase().includes(q) ||
        (c.title || "").toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div style={{
      width: 360, flexShrink: 0,
      background: "#fff",
      borderRight: "1px solid rgba(60,74,60,0.08)",
      display: "flex", flexDirection: "column",
      height: "100%",
    }}>
      {/* Search */}
      <div style={{ padding: 16, paddingBottom: 12 }}>
        <SearchInput value={search} onChange={setSearch} placeholder="搜尋姓名、公司、職稱…" />
      </div>

      {/* Filter pills */}
      <div style={{ padding: "0 16px 12px 16px", display: "flex", gap: 6, flexWrap: "wrap" }}>
        {[
          { id: "all", label: "全部", n: CONTACTS.length },
          { id: "vip", label: "VIP", n: 6 },
          { id: "supplier", label: "供應商", n: 4 },
          { id: "partner", label: "合作夥伴", n: 5 },
        ].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            style={{
              padding: "5px 10px",
              fontSize: 12, fontWeight: 600,
              borderRadius: 20,
              background: filter === f.id ? "#06C755" : "#F3F3F8",
              color: filter === f.id ? "#fff" : "#3C4A3C",
              display: "inline-flex", alignItems: "center", gap: 4,
              transition: "all 150ms ease",
            }}>
            {f.label}
            <span style={{ opacity: filter === f.id ? 0.75 : 0.5, fontWeight: 500 }}>{f.n}</span>
          </button>
        ))}
      </div>

      {/* Count */}
      <div style={{
        padding: "8px 16px",
        fontSize: 11, color: "#3C4A3C", opacity: 0.65, fontWeight: 500,
        borderTop: "1px solid rgba(60,74,60,0.06)",
        display: "flex", justifyContent: "space-between",
      }}>
        <span>
          {search ? `找到 ${filtered.length} 筆` : `共 ${filtered.length} 筆聯絡人`}
        </span>
        <span style={{ color: "#006E2B", fontWeight: 600, cursor: "pointer" }}>
          依最近互動 ↓
        </span>
      </div>

      {/* List */}
      <div className="kanban-scroll" style={{ flex: 1, overflowY: "auto" }}>
        {filtered.map(c => (
          <ContactListItem key={c.id} contact={c} active={selectedId === c.id} onClick={() => onSelect(c.id)} />
        ))}
        {filtered.length === 0 && (
          <div style={{ padding: 48, textAlign: "center", color: "#3C4A3C", opacity: 0.6 }}>
            <div style={{ fontSize: 13, marginBottom: 8 }}>找不到符合「{search}」的聯絡人</div>
            <button onClick={() => setSearch("")} style={{ color: "#006E2B", fontSize: 13, fontWeight: 600 }}>
              清除搜尋
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Contact Detail right pane
const ContactDetail = ({ contactId }) => {
  const [tab, setTab] = React.useState("deals");
  const contact = getContact(contactId);
  if (!contact) return <EmptyDetail />;

  const deals = DEALS.filter(d => d.contactId === contactId);
  const activities = ACTIVITIES.filter(a => a.contactId === contactId);
  const actions = ACTIONS.filter(a => a.contactId === contactId && a.status !== "done");

  return (
    <div className="kanban-scroll" style={{ flex: 1, overflowY: "auto", background: "#F9F9FE" }}>
      {/* Top bar */}
      <div style={{
        background: "#fff",
        padding: "16px 32px",
        display: "flex", alignItems: "center", gap: 12,
        position: "sticky", top: 0, zIndex: 5,
        boxShadow: "0 1px 0 rgba(60,74,60,0.08)",
      }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, color: "#3C4A3C", opacity: 0.7 }}>聯絡人</span>
          <IconChevronRight size={12} style={{ color: "#3C4A3C", opacity: 0.4 }} />
          <span style={{ fontSize: 12, color: "#1A1A1A", fontWeight: 600 }}>{contact.name}</span>
        </div>
        <Button variant="ghost" size="sm" icon={<IconEdit size={14} />}>編輯</Button>
        <Button variant="ghost" size="sm" icon={<IconMessage size={14} />}>記錄互動</Button>
        <Button variant="primary" size="sm" icon={<IconPlus size={14} />}>新增案件</Button>
      </div>

      <div style={{ padding: "24px 32px", maxWidth: 1100 }}>
        {/* Hero card */}
        <div style={{
          background: "#fff", borderRadius: 16, padding: 24,
          boxShadow: "var(--shadow-card)", marginBottom: 20,
          display: "flex", gap: 20,
        }}>
          <Avatar contact={contact} size={72} />
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <h2 className="display-font" style={{
                margin: 0, fontSize: 24, fontWeight: 700, color: "#1A1A1A",
                letterSpacing: "-0.01em",
              }}>
                {contact.name}
              </h2>
              {contact.nameEn && (
                <span style={{
                  fontSize: 14, color: "#3C4A3C", opacity: 0.6, fontWeight: 500,
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  textTransform: "lowercase",
                }}>{contact.nameEn.toLowerCase()}</span>
              )}
              {contact.tags?.includes("VIP客戶") && (
                <Chip variant="danger" size="sm">
                  <IconStar size={10} strokeWidth={0} style={{ fill: "#C0000A" }} /> VIP
                </Chip>
              )}
            </div>
            <div style={{ fontSize: 14, color: "#3C4A3C", marginTop: 2 }}>
              {contact.title} · <span style={{ color: "#006E2B", fontWeight: 600, cursor: "pointer" }}>{contact.company}</span>
            </div>
            <ContactTags contact={contact} />
          </div>

          {/* Quick stats */}
          <div style={{ display: "flex", gap: 24, paddingLeft: 20, borderLeft: "1px solid rgba(60,74,60,0.1)" }}>
            <MiniStat label="進行中案件" value={deals.filter(d => d.stage !== "won" && d.stage !== "lost").length} />
            <MiniStat label="最近互動" value="4d" sub="天前" />
            <MiniStat label="總貢獻" value={formatCurrencyShort(deals.reduce((s,d) => s + d.value, 0))} />
          </div>
        </div>

        {/* Grid: Contact info + AI snapshot */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20, marginBottom: 20 }}>
          {/* Contact info card */}
          <div style={{
            background: "#fff", borderRadius: 16, padding: 20,
            boxShadow: "var(--shadow-card)",
          }}>
            <SectionTitle>聯絡資訊</SectionTitle>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 24px" }}>
              <InfoRow icon={<IconPhone size={14} />} label="電話" value={contact.phone} />
              <InfoRow icon={<IconMail size={14} />} label="Email" value={contact.email} />
              <InfoRow icon={<IconPhone size={14} />} label="手機" value={contact.mobile} />
              <InfoRow icon={<IconLine size={14} />} label="LINE ID" value={contact.line} />
              <InfoRow icon={<IconMapPin size={14} />} label="地址" value={contact.address} span={2} />
            </div>

            <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid rgba(60,74,60,0.08)" }}>
              <SectionTitle>備忘錄</SectionTitle>
              <div style={{
                background: "#F3F3F8", borderRadius: 8,
                padding: 12, fontSize: 13, color: "#3C4A3C", lineHeight: 1.5,
              }}>
                經由劉副理介紹；主要關注 ESG 模組。<br/>
                <span style={{ opacity: 0.6 }}>偏好週二、週四下午開會，不喜歡早會。</span>
              </div>
            </div>
          </div>

          {/* AI snapshot card */}
          <div style={{
            background: "#fff", borderRadius: 16, padding: 16,
            boxShadow: "var(--shadow-card)",
            position: "relative",
            overflow: "hidden",
          }}>
            <div style={{
              position: "absolute", top: 0, left: 0, right: 0, height: 3,
              background: "linear-gradient(90deg, #06C755 0%, #0A84FF 100%)",
            }} />
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, marginTop: 2 }}>
              <AIBadge>AI SNAPSHOT</AIBadge>
              <div style={{ flex: 1 }} />
              <span style={{ fontSize: 10, color: "#3C4A3C", opacity: 0.5 }}>更新於 2h 前</span>
            </div>
            <div style={{ fontSize: 13, color: "#1A1A1A", lineHeight: 1.55, marginBottom: 12 }}>
              <strong>{contact.name}</strong> 是 {contact.company} 近期 ESG 相關採購的關鍵決策者，3 次互動均表達正向意向。
            </div>

            <div className="ai-left-border" style={{ paddingLeft: 10, marginBottom: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#0A84FF", letterSpacing: "0.04em", marginBottom: 4 }}>
                破冰話題
              </div>
              <div style={{ fontSize: 12, color: "#3C4A3C", lineHeight: 1.5 }}>
                上次聊到新竹廠區的自動化規劃，可追問 POC 時程。
              </div>
            </div>

            <div className="ai-left-border" style={{ paddingLeft: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#0A84FF", letterSpacing: "0.04em", marginBottom: 4 }}>
                建議下一步
              </div>
              <div style={{ fontSize: 12, color: "#3C4A3C", lineHeight: 1.5 }}>
                於 4/28 前寄送 ESG 白皮書，並同步通知財務副總。
              </div>
            </div>
          </div>
        </div>

        {/* CRM tabs */}
        <div style={{ background: "#fff", borderRadius: 16, boxShadow: "var(--shadow-card)" }}>
          <div style={{ padding: "4px 20px 0" }}>
            <Tabs
              active={tab}
              onChange={setTab}
              tabs={[
                { id: "deals", label: "案件", count: deals.length },
                { id: "activities", label: "互動記錄", count: activities.length },
                { id: "actions", label: "待辦", count: actions.length },
              ]}
            />
          </div>

          <div style={{ padding: 20 }}>
            {tab === "deals" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {deals.map(d => <DealRow key={d.id} deal={d} />)}
                {deals.length === 0 && <EmptyState text="尚無案件紀錄" cta="＋ 新增案件" />}
              </div>
            )}
            {tab === "activities" && <ActivityTimeline activities={activities} />}
            {tab === "actions" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {actions.map(a => <ActionRow key={a.id} action={a} inline />)}
                {actions.length === 0 && <EmptyState text="沒有待辦事項" cta="＋ 新增待辦" />}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const EmptyDetail = () => (
  <div style={{
    flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
    flexDirection: "column", gap: 12,
    background: "#F9F9FE",
  }}>
    <div style={{
      width: 72, height: 72, borderRadius: 18,
      background: "#F3F3F8",
      display: "flex", alignItems: "center", justifyContent: "center",
      color: "#3C4A3C", opacity: 0.5,
    }}>
      <IconUsers size={32} />
    </div>
    <div style={{ fontSize: 14, color: "#3C4A3C", opacity: 0.7 }}>
      選取左側聯絡人以查看詳情
    </div>
    <div style={{ fontSize: 12, color: "#3C4A3C", opacity: 0.5 }}>
      或使用 <span className="mono" style={{ padding: "1px 5px", background: "#F3F3F8", borderRadius: 3 }}>⌘K</span> 快速搜尋
    </div>
  </div>
);

const MiniStat = ({ label, value, sub }) => (
  <div>
    <div className="display-font tnum" style={{ fontSize: 20, fontWeight: 700, color: "#1A1A1A" }}>{value}
      {sub && <span style={{ fontSize: 11, opacity: 0.5, marginLeft: 2, fontWeight: 500 }}>{sub}</span>}
    </div>
    <div style={{ fontSize: 11, color: "#3C4A3C", opacity: 0.65, fontWeight: 500 }}>{label}</div>
  </div>
);

const SectionTitle = ({ children }) => (
  <div style={{
    fontSize: 11, fontWeight: 700, color: "#3C4A3C",
    letterSpacing: "0.08em", textTransform: "uppercase",
    marginBottom: 10, opacity: 0.75,
  }}>{children}</div>
);

const InfoRow = ({ icon, label, value, span }) => (
  <div style={{ gridColumn: span ? `span ${span}` : "auto", display: "flex", alignItems: "flex-start", gap: 8 }}>
    <div style={{ color: "#006E2B", marginTop: 1, opacity: 0.7 }}>{icon}</div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: "#3C4A3C", opacity: 0.7, letterSpacing: "0.04em", marginBottom: 1 }}>
        {label}
      </div>
      <div style={{ fontSize: 13, color: value ? "#1A1A1A" : "rgba(60,74,60,0.5)", fontFamily: label === "Email" || label === "LINE ID" ? "'JetBrains Mono', monospace" : "inherit" }}>
        {value || "未填寫"}
      </div>
    </div>
    {value && (
      <button style={{ opacity: 0.4, padding: 2 }} title="複製">
        <IconCopy size={12} />
      </button>
    )}
  </div>
);

const DealRow = ({ deal }) => (
  <div style={{
    display: "flex", alignItems: "center", gap: 16,
    padding: 14,
    background: "#F9F9FE", borderRadius: 10,
    transition: "all 150ms ease",
  }}>
    <div style={{ flex: 1 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: "#1A1A1A", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          {deal.company}
        </span>
        <StageBadge stage={deal.stage} size="sm" />
      </div>
      <div style={{ fontSize: 12, color: "#3C4A3C", opacity: 0.8 }}>
        {deal.summary}
      </div>
    </div>
    <div style={{ textAlign: "right", minWidth: 100 }}>
      <div className="display-font tnum" style={{ fontSize: 16, fontWeight: 700, color: "#1A1A1A" }}>
        {formatCurrencyShort(deal.value)}
      </div>
      <div style={{ fontSize: 11, color: "#3C4A3C", opacity: 0.6 }}>
        下一步 {formatDate(deal.nextAction)}
      </div>
    </div>
    <IconChevronRight size={16} style={{ color: "#3C4A3C", opacity: 0.4 }} />
  </div>
);

const ActivityTimeline = ({ activities }) => (
  <div style={{ position: "relative", paddingLeft: 24 }}>
    <div style={{
      position: "absolute", left: 7, top: 8, bottom: 8,
      width: 2, background: "rgba(60,74,60,0.1)",
    }} />
    {activities.map((ac, i) => <TimelineItem key={ac.id} activity={ac} last={i === activities.length - 1} />)}
  </div>
);

const TimelineItem = ({ activity, last }) => {
  const sentimentColors = { positive: "#06C755", neutral: "#F59E0B", negative: "#C0000A" };
  const [expanded, setExpanded] = React.useState(false);

  return (
    <div style={{ position: "relative", paddingBottom: last ? 0 : 20 }}>
      <div style={{
        position: "absolute", left: -24, top: 6,
        width: 16, height: 16, borderRadius: "50%",
        background: "#fff",
        border: `3px solid ${sentimentColors[activity.sentiment]}`,
      }} />
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <div className="display-font tnum" style={{ fontSize: 13, fontWeight: 700, color: "#1A1A1A" }}>
          {activity.date}
        </div>
        <SentimentDot sentiment={activity.sentiment} />
        <div style={{ fontSize: 11, color: "#3C4A3C", opacity: 0.5 }}>· 面談紀錄</div>
      </div>
      <div style={{
        background: "var(--color-ai-surface)",
        borderRadius: 10,
        padding: 14,
        borderLeft: "3px solid #0A84FF",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
          <AIBadge>AI 摘要</AIBadge>
        </div>
        <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
          {activity.aiInsights.map((ins, i) => (
            <li key={i} style={{
              fontSize: 13, color: "#1A1A1A", lineHeight: 1.5,
              display: "flex", gap: 8,
            }}>
              <span style={{ color: "#0A84FF", fontWeight: 700, flexShrink: 0 }}>·</span>
              {ins}
            </li>
          ))}
        </ul>
        <button onClick={() => setExpanded(!expanded)}
          style={{ marginTop: 10, color: "#006E2B", fontSize: 12, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}>
          {expanded ? "收合" : "展開原文"} <IconChevronDown size={12} style={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform 200ms" }} />
        </button>
        {expanded && (
          <div style={{
            marginTop: 10, paddingTop: 10,
            borderTop: "1px dashed rgba(60,74,60,0.15)",
            fontSize: 12, color: "#3C4A3C", lineHeight: 1.6, fontStyle: "italic",
          }}>
            「{activity.original}」
          </div>
        )}
      </div>
    </div>
  );
};

const EmptyState = ({ text, cta }) => (
  <div style={{
    padding: 36, textAlign: "center",
    background: "#F9F9FE", borderRadius: 10,
  }}>
    <div style={{ fontSize: 13, color: "#3C4A3C", opacity: 0.7, marginBottom: 10 }}>{text}</div>
    {cta && <Button variant="ghost" size="sm">{cta}</Button>}
  </div>
);

Object.assign(window, { ContactList, ContactDetail, EmptyDetail, DealRow, ActivityTimeline, TimelineItem, InfoRow, MiniStat, SectionTitle, EmptyState });
