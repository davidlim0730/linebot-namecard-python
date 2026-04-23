// Action / Todo List page

const ActionRow = ({ action, onToggle, inline }) => {
  const contact = getContact(action.contactId);
  const deal = getDeal(action.dealId);
  const [checked, setChecked] = React.useState(action.status === "done");
  const [fading, setFading] = React.useState(false);

  const dueDays = daysFromNow(action.due);
  const isToday = action.status === "today" || dueDays === 0;
  const isOverdue = action.status === "overdue" || dueDays < 0;
  const dueColor = isOverdue ? "#C0000A" : isToday ? "#C0000A" : dueDays <= 7 ? "#854D0E" : "#3C4A3C";

  const handleToggle = () => {
    setFading(true);
    setTimeout(() => { setChecked(true); onToggle && onToggle(action.id); }, 300);
  };

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 14,
      padding: inline ? "10px 12px" : "14px 16px",
      background: "#fff",
      borderRadius: 10,
      boxShadow: inline ? "none" : "var(--shadow-card)",
      border: inline ? "1px solid rgba(60,74,60,0.08)" : "none",
      opacity: fading || checked ? 0.4 : 1,
      transition: "opacity 300ms ease",
      borderLeft: isOverdue ? "3px solid #C0000A" : isToday ? "3px solid #F59E0B" : "3px solid transparent",
    }}>
      <button onClick={handleToggle} style={{
        width: 22, height: 22, borderRadius: 6,
        border: checked ? "2px solid #06C755" : "2px solid rgba(60,74,60,0.3)",
        background: checked ? "#06C755" : "transparent",
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "all 150ms ease",
        flexShrink: 0,
      }}>
        {checked && <IconCheck size={12} strokeWidth={3} style={{ color: "#fff" }} />}
      </button>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 14, fontWeight: 600, color: "#1A1A1A",
          textDecoration: checked ? "line-through" : "none",
          marginBottom: 2,
        }}>
          {action.text}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#3C4A3C", opacity: 0.75 }}>
          {contact && <><Avatar contact={contact} size={16} /><span style={{ fontWeight: 600 }}>{contact.name}</span></>}
          {deal && <>
            <span style={{ opacity: 0.4 }}>·</span>
            <StageBadge stage={deal.stage} size="sm" />
            <span>{deal.company}</span>
          </>}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: dueColor }}>
        {isOverdue ? <IconAlert size={13} /> : isToday ? <IconAlert size={13} /> : <IconCalendar size={13} />}
        <span className="tnum">
          {isOverdue ? `逾期 ${-dueDays}d` : isToday ? "今日" : formatDateWithDay(action.due)}
        </span>
      </div>
    </div>
  );
};

const ActionListPage = () => {
  const [tab, setTab] = React.useState("today");
  const [items, setItems] = React.useState(ACTIONS);

  const buckets = {
    today: items.filter(a => a.status === "today" || a.status === "overdue"),
    week: items.filter(a => a.status === "week"),
    all: items.filter(a => a.status !== "done"),
    done: items.filter(a => a.status === "done"),
  };

  const overdueCount = items.filter(a => a.status === "overdue").length;

  return (
    <div style={{ padding: "24px 32px", maxWidth: 960 }}>
      {/* Hero stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
        <StatCard label="今日到期" value={items.filter(a => a.status === "today").length} sub="需完成" accent="warning" />
        <StatCard label="已逾期" value={overdueCount} sub="需立即處理" accent="danger" />
        <StatCard label="本週" value={items.filter(a => a.status === "week").length} sub="即將到期" />
        <StatCard label="已完成" value={items.filter(a => a.status === "done").length} sub="本週" accent="primary" />
      </div>

      <div style={{ background: "#fff", borderRadius: 16, boxShadow: "var(--shadow-card)", overflow: "hidden" }}>
        <div style={{
          padding: "16px 20px", borderBottom: "1px solid rgba(60,74,60,0.08)",
          display: "flex", alignItems: "center", gap: 16,
        }}>
          <Tabs
            active={tab}
            onChange={setTab}
            tabs={[
              { id: "today", label: "今日", count: buckets.today.length },
              { id: "week", label: "本週", count: buckets.week.length },
              { id: "all", label: "全部", count: buckets.all.length },
              { id: "done", label: "已完成", count: buckets.done.length },
            ]}
          />
          <div style={{ flex: 1 }} />
          <Button variant="ghost" size="sm" icon={<IconFilter size={14} />}>篩選</Button>
          <Button variant="primary" size="sm" icon={<IconPlus size={14} />}>新增待辦</Button>
        </div>

        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
          {tab === "today" && (
            <>
              {overdueCount > 0 && (
                <div>
                  <GroupHeader label="已逾期" count={overdueCount} danger />
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {items.filter(a => a.status === "overdue").map(a =>
                      <ActionRow key={a.id} action={a} />
                    )}
                  </div>
                </div>
              )}
              <div>
                <GroupHeader label="今日到期" count={items.filter(a => a.status === "today").length} />
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {items.filter(a => a.status === "today").map(a =>
                    <ActionRow key={a.id} action={a} />
                  )}
                </div>
              </div>
            </>
          )}
          {tab === "week" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {buckets.week.map(a => <ActionRow key={a.id} action={a} />)}
            </div>
          )}
          {tab === "all" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {buckets.all.map(a => <ActionRow key={a.id} action={a} />)}
            </div>
          )}
          {tab === "done" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {buckets.done.map(a => <ActionRow key={a.id} action={a} />)}
              {buckets.done.length === 0 && <EmptyState text="本週尚無完成項目" />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const GroupHeader = ({ label, count, danger }) => (
  <div style={{
    display: "flex", alignItems: "center", gap: 8,
    marginBottom: 10,
  }}>
    <div style={{
      fontSize: 11, fontWeight: 700, letterSpacing: "0.08em",
      color: danger ? "#C0000A" : "#3C4A3C",
      textTransform: "uppercase", opacity: danger ? 1 : 0.75,
    }}>
      {label}
    </div>
    <div style={{
      fontSize: 10, fontWeight: 700,
      padding: "1px 7px", borderRadius: 10,
      background: danger ? "#FEE2E2" : "#F3F3F8",
      color: danger ? "#C0000A" : "#3C4A3C",
    }}>{count}</div>
    <div style={{ flex: 1, height: 1, background: "rgba(60,74,60,0.08)" }} />
  </div>
);

Object.assign(window, { ActionListPage, ActionRow, GroupHeader });
