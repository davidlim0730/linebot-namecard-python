// Deal Kanban Board

const DealCard = ({ deal, onDragStart, onDragEnd, isDragging, onClick }) => {
  const contact = getContact(deal.contactId);
  const dueDays = daysFromNow(deal.nextAction);
  const dueColor = dueDays < 0 ? "#C0000A" : dueDays <= 2 ? "#C0000A" : dueDays <= 7 ? "#854D0E" : "#3C4A3C";
  const dueLabel = dueDays === 0 ? "今日" : dueDays === 1 ? "明日" : dueDays < 0 ? `逾期 ${-dueDays}d` : `${dueDays} 天`;

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(deal.id, e)}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className="deal-card"
      style={{
        background: "#fff",
        borderRadius: 12,
        padding: 12,
        boxShadow: "var(--shadow-card)",
        cursor: "grab",
        opacity: isDragging ? 0.4 : 1,
        position: "relative",
        borderLeft: deal.pending ? "3px solid #F59E0B" : "3px solid transparent",
      }}
    >
      {/* Top row: company name + pending */}
      <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
        <div style={{
          fontSize: 13.5, fontWeight: 700, color: "#1A1A1A",
          fontFamily: "'Plus Jakarta Sans', 'Noto Sans TC', sans-serif",
          lineHeight: 1.3,
        }}>
          {deal.company}
        </div>
        {deal.pending && (
          <span style={{
            fontSize: 9, fontWeight: 700, letterSpacing: "0.06em",
            padding: "1px 5px", borderRadius: 3,
            background: "#FEF3C7", color: "#854D0E"
          }}>擱置</span>
        )}
      </div>

      {/* Value */}
      <div className="display-font tnum" style={{
        fontSize: 18, fontWeight: 700, color: "#1A1A1A",
        lineHeight: 1.1, marginBottom: 8,
        letterSpacing: "-0.02em",
      }}>
        {formatCurrencyShort(deal.value)}
        <span style={{ fontSize: 10, color: "#3C4A3C", opacity: 0.55, marginLeft: 4, fontWeight: 500 }}>TWD</span>
      </div>

      {/* Summary */}
      <div style={{
        fontSize: 12, color: "#3C4A3C", lineHeight: 1.45,
        marginBottom: 10,
        display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
        overflow: "hidden",
      }}>
        {deal.summary}
      </div>

      {/* Footer: next action + owner */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        paddingTop: 8, borderTop: "1px solid rgba(60,74,60,0.06)",
        gap: 8,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 0 }}>
          <IconCalendar size={12} style={{ color: dueColor, flexShrink: 0 }} strokeWidth={2} />
          <span style={{ fontSize: 11, fontWeight: 600, color: dueColor, whiteSpace: "nowrap" }}>
            {dueLabel}
          </span>
          <span style={{
            fontSize: 11, color: "#3C4A3C", opacity: 0.7,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            · {deal.nextActionText}
          </span>
        </div>
        <Avatar contact={getContact(deal.owner)} size={22} />
      </div>
    </div>
  );
};

const KanbanColumn = ({ stage, deals, onDragStart, onDragEnd, onDrop, onDragOver, isOver, draggingId, onCardClick }) => {
  const totalValue = deals.reduce((sum, d) => sum + d.value, 0);
  const isEndStage = stage.id === "won" || stage.id === "lost";

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); onDragOver(stage.id); }}
      onDragLeave={() => onDragOver(null)}
      onDrop={(e) => { e.preventDefault(); onDrop(stage.id); }}
      style={{
        flex: "0 0 264px",
        display: "flex", flexDirection: "column",
        background: isOver ? "#E8F9EE" : "#F3F3F8",
        borderRadius: 12,
        padding: 10,
        transition: "background 160ms ease",
        maxHeight: "100%",
        border: isOver ? "2px dashed #06C755" : "2px dashed transparent",
      }}
    >
      {/* Column header */}
      <div style={{ padding: "2px 4px 10px 4px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{
              width: 8, height: 8, borderRadius: "50%",
              background: stage.id === "won" ? "#06C755" : stage.id === "lost" ? "#C0000A" :
                stage.text,
            }} />
            <span className="display-font" style={{
              fontSize: 13, fontWeight: 700, color: "#1A1A1A",
            }}>
              {stage.name}
            </span>
            <span className="mono" style={{
              fontSize: 11, fontWeight: 600,
              color: "#3C4A3C", opacity: 0.55,
              padding: "1px 6px", background: "#fff", borderRadius: 10,
            }}>
              {deals.length}
            </span>
          </div>
          <button style={{ opacity: 0.4, padding: 2 }}>
            <IconMoreH size={14} />
          </button>
        </div>
        {!isEndStage && deals.length > 0 && (
          <div className="tnum" style={{
            fontSize: 11, color: "#3C4A3C", opacity: 0.6,
            paddingLeft: 14,
          }}>
            {formatCurrencyShort(totalValue)} · 共 {deals.length} 案
          </div>
        )}
      </div>

      {/* Cards */}
      <div className="kanban-scroll" style={{
        display: "flex", flexDirection: "column", gap: 8,
        overflowY: "auto", paddingRight: 2, paddingBottom: 4,
        minHeight: 40, flex: 1,
      }}>
        {deals.map(deal => (
          <DealCard
            key={deal.id}
            deal={deal}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            isDragging={draggingId === deal.id}
            onClick={() => onCardClick && onCardClick(deal)}
          />
        ))}
        {deals.length === 0 && (
          <div style={{
            padding: 16, textAlign: "center",
            fontSize: 11, color: "#3C4A3C", opacity: 0.45,
            border: "1px dashed rgba(60,74,60,0.15)",
            borderRadius: 8,
          }}>
            尚無案件<br/>
            <span style={{ fontSize: 10 }}>拖曳至此</span>
          </div>
        )}
      </div>
    </div>
  );
};

const DealKanban = ({ onCardClick, onToast }) => {
  const [deals, setDeals] = React.useState(DEALS);
  const [draggingId, setDraggingId] = React.useState(null);
  const [overStage, setOverStage] = React.useState(null);
  const [filter, setFilter] = React.useState("all");
  const [search, setSearch] = React.useState("");
  const [density, setDensity] = React.useState("cozy");
  const [ownerFilter, setOwnerFilter] = React.useState("all"); // all | me | c1
  const [quarterFilter, setQuarterFilter] = React.useState("q2"); // q2 | q3 | all
  const [ownerOpen, setOwnerOpen] = React.useState(false);
  const [quarterOpen, setQuarterOpen] = React.useState(false);

  const ownerLabels = { all: "全部負責人", me: "施威宇", c1: "王文彥" };
  const quarterLabels = { q2: "本季 Q2", q3: "下季 Q3", all: "全部時間" };
  // Q2: Apr-Jun (4,5,6); Q3: Jul-Sep (7,8,9)
  const quarterMatch = (dateStr) => {
    if (quarterFilter === "all") return true;
    const m = new Date(dateStr).getMonth() + 1;
    if (quarterFilter === "q2") return m >= 4 && m <= 6;
    if (quarterFilter === "q3") return m >= 7 && m <= 9;
    return true;
  };

  const filtered = deals.filter(d => {
    if (filter === "mine" && d.owner !== "c5") return false;
    if (filter === "pending" && !d.pending) return false;
    if (ownerFilter === "me" && d.owner !== "c5") return false;
    if (ownerFilter === "c1" && d.owner !== "c1") return false;
    if (!quarterMatch(d.nextAction)) return false;
    if (search && !d.company.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleDrop = (stageId) => {
    if (!draggingId) return;
    setDeals(prev => prev.map(d => d.id === draggingId ? { ...d, stage: stageId } : d));
    const deal = deals.find(d => d.id === draggingId);
    const stage = getStage(stageId);
    if (deal && stage && deal.stage !== stageId) {
      onToast && onToast(`${deal.company} 已移至「${stage.name}」`);
    }
    setDraggingId(null);
    setOverStage(null);
  };

  const totalActive = filtered.filter(d => d.stage !== "won" && d.stage !== "lost").reduce((s, d) => s + d.value, 0);
  const wonThisMonth = filtered.filter(d => d.stage === "won").reduce((s, d) => s + d.value, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      {/* Stats bar */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
        gap: 12, padding: "20px 32px 0 32px",
      }}>
        <StatCard label="進行中案件" value={filtered.filter(d => d.stage !== "won" && d.stage !== "lost").length + " 案"} sub="本月新增 3 案" />
        <StatCard label="Pipeline 總額" value={formatCurrencyShort(totalActive)} sub={"TWD \u00b7 \u5171 " + filtered.filter(d => d.stage !== "won" && d.stage !== "lost").length + " \u6848"} accent="primary" />
        <StatCard label="本月預估成交" value={formatCurrencyShort(12_800_000)} sub="達成率 78%" accent="warning" />
        <StatCard label="今日待辦" value="3" sub="2 項逾期" accent="danger" />
      </div>

      {/* Filter bar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "20px 32px 16px 32px",
      }}>
        <div style={{ display: "flex", gap: 4, background: "#F3F3F8", padding: 3, borderRadius: 8 }}>
          {[
            { id: "all", label: "全部案件" },
            { id: "mine", label: "我的案件" },
            { id: "pending", label: "擱置中" },
          ].map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              style={{
                padding: "6px 12px",
                fontSize: 13, fontWeight: 600,
                borderRadius: 6,
                background: filter === f.id ? "#fff" : "transparent",
                color: filter === f.id ? "#006E2B" : "#3C4A3C",
                boxShadow: filter === f.id ? "0 1px 2px rgba(0,0,0,0.08)" : "none",
                transition: "all 150ms ease",
              }}>
              {f.label}
            </button>
          ))}
        </div>

        <div style={{ width: 280 }}>
          <SearchInput value={search} onChange={setSearch} placeholder="搜尋公司或案件…" />
        </div>

        <div style={{ flex: 1 }} />

        <Popover open={ownerOpen} onOpenChange={setOwnerOpen} trigger={
          <Chip variant={ownerFilter !== "all" ? "active" : "outline"} onClick={() => setOwnerOpen(!ownerOpen)}>
            <IconFilter size={12} /> {ownerLabels[ownerFilter]}
            {ownerFilter !== "all" && (
              <button onClick={(e) => { e.stopPropagation(); setOwnerFilter("all"); }} style={{ marginLeft: 2, opacity: 0.6, display: "inline-flex" }}>
                <IconX size={10} />
              </button>
            )}
          </Chip>
        }>
          {[
            { id: "all", label: "全部負責人" },
            { id: "me", label: "施威宇 (我)" },
            { id: "c1", label: "王文彥" },
          ].map(o => (
            <PopoverItem key={o.id} active={ownerFilter === o.id}
              onClick={() => { setOwnerFilter(o.id); setOwnerOpen(false); }}>
              {o.label}
            </PopoverItem>
          ))}
        </Popover>

        <Popover open={quarterOpen} onOpenChange={setQuarterOpen} trigger={
          <Chip variant={quarterFilter !== "q2" ? "active" : "outline"} onClick={() => setQuarterOpen(!quarterOpen)}>
            <IconCalendar size={12} /> {quarterLabels[quarterFilter]}
          </Chip>
        }>
          {[
            { id: "q2", label: "本季 Q2 (4-6月)" },
            { id: "q3", label: "下季 Q3 (7-9月)" },
            { id: "all", label: "全部時間" },
          ].map(o => (
            <PopoverItem key={o.id} active={quarterFilter === o.id}
              onClick={() => { setQuarterFilter(o.id); setQuarterOpen(false); }}>
              {o.label}
            </PopoverItem>
          ))}
        </Popover>

        <div style={{ width: 1, height: 20, background: "rgba(60,74,60,0.15)" }} />

        <Button variant="ghost" size="sm" icon={<IconPlus size={14} />}>
          新增案件
        </Button>
      </div>

      {/* Kanban columns */}
      <div className="kanban-scroll" style={{
        flex: 1,
        display: "flex", gap: 12,
        overflowX: "auto", overflowY: "hidden",
        padding: "0 32px 32px 32px",
        alignItems: "stretch",
      }}>
        {STAGES.filter(s => s.id !== "won" && s.id !== "lost").map(stage => (
          <KanbanColumn
            key={stage.id}
            stage={stage}
            deals={filtered.filter(d => d.stage === stage.id)}
            onDragStart={(id) => setDraggingId(id)}
            onDragEnd={() => { setDraggingId(null); setOverStage(null); }}
            onDrop={handleDrop}
            onDragOver={setOverStage}
            isOver={overStage === stage.id}
            draggingId={draggingId}
            onCardClick={onCardClick}
          />
        ))}

        {/* Separator */}
        <div style={{ flex: "0 0 1px", background: "rgba(60,74,60,0.12)", margin: "40px 4px" }} />

        {STAGES.filter(s => s.id === "won" || s.id === "lost").map(stage => (
          <KanbanColumn
            key={stage.id}
            stage={stage}
            deals={filtered.filter(d => d.stage === stage.id)}
            onDragStart={(id) => setDraggingId(id)}
            onDragEnd={() => { setDraggingId(null); setOverStage(null); }}
            onDrop={handleDrop}
            onDragOver={setOverStage}
            isOver={overStage === stage.id}
            draggingId={draggingId}
            onCardClick={onCardClick}
          />
        ))}
      </div>
    </div>
  );
};

const StatCard = ({ label, value, sub, accent }) => {
  const accentColors = {
    primary: { bar: "#06C755", tint: "#E8F9EE" },
    warning: { bar: "#F59E0B", tint: "#FEF9C3" },
    danger: { bar: "#C0000A", tint: "#FEE2E2" },
  };
  const a = accentColors[accent];
  return (
    <div style={{
      background: "#fff", borderRadius: 12, padding: 16,
      position: "relative", overflow: "hidden",
      boxShadow: "var(--shadow-card)",
    }}>
      {a && <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: a.bar }} />}
      <div style={{ fontSize: 11, color: "#3C4A3C", opacity: 0.7, fontWeight: 600, letterSpacing: "0.02em" }}>
        {label}
      </div>
      <div className="display-font tnum" style={{
        fontSize: 26, fontWeight: 700, color: "#1A1A1A", marginTop: 4,
        letterSpacing: "-0.02em",
      }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: "#3C4A3C", opacity: 0.65, marginTop: 2 }}>
        {sub}
      </div>
    </div>
  );
};

Object.assign(window, { DealKanban, DealCard, KanbanColumn, StatCard });
