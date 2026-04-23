// Main app — routing + state

const App = () => {
  const [route, setRoute] = React.useState(() => localStorage.getItem("crm-route") || "deals");
  const [selectedContact, setSelectedContact] = React.useState("c1");
  const [selectedDeal, setSelectedDeal] = React.useState(null);
  const [aiOpen, setAiOpen] = React.useState(false);
  const [toast, setToast] = React.useState(null);

  React.useEffect(() => { localStorage.setItem("crm-route", route); }, [route]);

  // Keyboard shortcuts
  React.useEffect(() => {
    const h = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault(); setAiOpen(true);
      }
      if (e.key === "Escape") setAiOpen(false);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const showToast = (msg, variant = "success") => {
    setToast({ msg, variant, id: Date.now() });
  };

  const navigate = (r) => {
    if (r === "ai-input") { setAiOpen(true); return; }
    setRoute(r);
  };

  const topBarProps = {
    deals: {
      title: "案件看板",
      subtitle: "拖曳卡片調整階段 · 共 13 個進行中案件",
      rightSlot: <TopBarActions showToast={showToast} setAiOpen={setAiOpen} />
    },
    contacts: {
      title: "聯絡人",
      subtitle: "12 位聯絡人 · 最近互動 4 小時前",
      rightSlot: <TopBarActions showToast={showToast} setAiOpen={setAiOpen} primaryLabel="＋ 新增聯絡人" />
    },
    actions: {
      title: "待辦事項",
      subtitle: "3 項今日到期 · 1 項已逾期",
      rightSlot: <TopBarActions showToast={showToast} setAiOpen={setAiOpen} />
    },
    activities: {
      title: "互動記錄",
      subtitle: "近 7 天共 12 筆互動",
      rightSlot: <TopBarActions showToast={showToast} setAiOpen={setAiOpen} />
    },
    pipeline: {
      title: "Pipeline 儀表板",
      subtitle: "本季 Q2 · 團隊銷售概覽",
      rightSlot: <TopBarActions showToast={showToast} setAiOpen={setAiOpen} />
    },
    products: {
      title: "產品線管理",
      subtitle: "6 個產品線",
      rightSlot: null,
    },
    settings: {
      title: "團隊設定",
      subtitle: "威宇工作室 · 5 位成員",
      rightSlot: null,
    }
  };

  const currentTop = topBarProps[route] || { title: "—", subtitle: "", rightSlot: null };

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar currentRoute={route} onNavigate={navigate} />

      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        {route !== "contacts" && <TopBar {...currentTop} />}

        <div style={{ flex: 1, display: "flex", minHeight: 0, flexDirection: "column" }}>
          {route === "deals" && <DealKanban onCardClick={(d) => { setSelectedDeal(d); }} onToast={(m) => showToast(m)} />}
          {route === "contacts" && (
            <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
              <ContactList selectedId={selectedContact} onSelect={setSelectedContact} />
              <ContactDetail contactId={selectedContact} />
            </div>
          )}
          {route === "actions" && <ActionListPage />}
          {route === "activities" && <ActivitiesPage />}
          {route === "pipeline" && <PipelineDashboard />}
          {route === "products" && <PlaceholderPage title="產品線管理" />}
          {route === "settings" && <PlaceholderPage title="團隊設定" />}
        </div>
      </div>

      <AIInputModal open={aiOpen} onClose={() => setAiOpen(false)} onConfirm={() => showToast("✓ 已儲存到 CRM · 台積電案件已更新")} />

      {selectedDeal && <DealDetailModal deal={selectedDeal} onClose={() => setSelectedDeal(null)} onToast={showToast} />}

      {toast && <Toast key={toast.id} message={toast.msg} variant={toast.variant} onClose={() => setToast(null)} />}
    </div>
  );
};

const DealDetailModal = ({ deal, onClose, onToast }) => {
  const contact = getContact(deal.contactId);
  const stage = getStage(deal.stage);
  const dealActions = ACTIONS.filter(a => a.dealId === deal.id);
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 95,
      background: "rgba(26,26,26,0.5)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: 720, maxHeight: "88vh",
        background: "#fff", borderRadius: 20,
        boxShadow: "0 30px 90px rgba(0,0,0,0.25)",
        overflow: "hidden",
        display: "flex", flexDirection: "column",
      }}>
        <div style={{
          padding: "18px 24px",
          borderBottom: "1px solid rgba(60,74,60,0.08)",
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <h2 className="display-font" style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#1A1A1A" }}>
                {deal.company}
              </h2>
              <StageBadge stage={deal.stage} />
              {deal.pending && <Chip variant="warning" size="sm">擱置中</Chip>}
            </div>
            <div style={{ fontSize: 13, color: "#3C4A3C", opacity: 0.75 }}>
              聯絡人 · <span style={{ color: "#006E2B", fontWeight: 600 }}>{contact?.name}</span> · {contact?.title}
            </div>
          </div>
          <button onClick={onClose} style={{ padding: 8, color: "#3C4A3C" }}>
            <IconX size={18} />
          </button>
        </div>
        <div className="kanban-scroll" style={{ padding: 24, overflowY: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <MiniStat label="預估金額" value={formatCurrencyShort(deal.value)} sub="TWD" />
            <MiniStat label="下一步日期" value={formatDate(deal.nextAction)} />
            <MiniStat label="待辦" value={dealActions.filter(a => a.status !== "done").length} sub="進行中" />
          </div>

          <div style={{ background: "#F9F9FE", borderRadius: 12, padding: 16 }}>
            <SectionTitle>案件摘要</SectionTitle>
            <div style={{ fontSize: 14, lineHeight: 1.6, color: "#1A1A1A" }}>{deal.summary}</div>
          </div>

          <div className="ai-left-border" style={{
            padding: 16, background: "var(--color-ai-surface)", borderRadius: 12,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <AIBadge>AI 建議</AIBadge>
            </div>
            <div style={{ fontSize: 13, color: "#1A1A1A", lineHeight: 1.55 }}>
              下一步：<strong>{deal.nextActionText}</strong>（{formatDate(deal.nextAction)}）
              <br/>此案件已停留於「{stage?.name}」階段 4 天，建議本週內推進至下個階段以維持節奏。
            </div>
          </div>

          <div>
            <SectionTitle>相關待辦</SectionTitle>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {dealActions.map(a => <ActionRow key={a.id} action={a} inline />)}
              {dealActions.length === 0 && (
                <div style={{ padding: 20, textAlign: "center", fontSize: 13, color: "#3C4A3C", opacity: 0.6, background: "#F9F9FE", borderRadius: 10 }}>
                  尚無待辦
                </div>
              )}
            </div>
          </div>
        </div>
        <div style={{
          padding: "12px 24px", borderTop: "1px solid rgba(60,74,60,0.08)",
          display: "flex", gap: 8, justifyContent: "flex-end",
        }}>
          <Button variant="ghost" onClick={onClose}>關閉</Button>
          <Button variant="ghost" icon={<IconEdit size={14} />}>編輯</Button>
          <Button variant="primary" icon={<IconSparkles size={14} />}
            onClick={() => { onClose(); onToast && onToast("已開啟 AI 記錄 · 更新此案件"); }}>
            AI 記錄互動
          </Button>
        </div>
      </div>
    </div>
  );
};

const TopBarActions = ({ showToast, setAiOpen, primaryLabel }) => {
  const [notifOpen, setNotifOpen] = React.useState(false);
  return (
    <>
      <div style={{ width: 280 }}>
        <SearchInput value="" onChange={() => {}} placeholder="全域搜尋…" />
      </div>
      <button onClick={() => setAiOpen(true)} style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "8px 12px", borderRadius: 8, height: 40,
        background: "linear-gradient(135deg, rgba(6,199,85,0.1), rgba(10,132,255,0.1))",
        border: "1px solid rgba(6,199,85,0.25)",
        color: "#006E2B", fontWeight: 600, fontSize: 13,
        whiteSpace: "nowrap", flexShrink: 0,
        transition: "all 150ms",
      }}>
        <IconSparkles size={14} /> AI 記錄
        <span className="mono" style={{ fontSize: 10, padding: "1px 5px", background: "rgba(0,0,0,0.05)", borderRadius: 3, marginLeft: 2 }}>⌘K</span>
      </button>
      <Popover open={notifOpen} onOpenChange={setNotifOpen} align="end" trigger={
        <button onClick={() => setNotifOpen(!notifOpen)} style={{
          padding: 8, position: "relative", color: "#3C4A3C",
          borderRadius: 8,
          background: notifOpen ? "#F3F3F8" : "transparent",
          transition: "background 120ms",
        }}>
          <IconBell size={18} />
          <span style={{
            position: "absolute", top: 5, right: 5,
            width: 8, height: 8, borderRadius: "50%", background: "#C0000A",
            border: "2px solid #fff",
          }} />
        </button>
      }>
        <div style={{ minWidth: 320, maxWidth: 340 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "6px 10px 10px", borderBottom: "1px solid rgba(60,74,60,0.08)",
            marginBottom: 4,
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#1A1A1A", flex: 1 }}>通知</div>
            <button style={{ fontSize: 11, color: "#006E2B", fontWeight: 600 }}
              onClick={() => { setNotifOpen(false); showToast && showToast("全部標示為已讀"); }}>
              全部標為已讀
            </button>
          </div>
          {[
            { icon: <IconAlert size={12} />, color: "#C0000A", bg: "#FEE2E2",
              title: "工研院合約附件 B 逾期", sub: "預定 4/20 提交 · 已逾期 2 日", time: "2 小時前", unread: true },
            { icon: <IconSparkles size={12} />, color: "#0A84FF", bg: "rgba(10,132,255,0.1)",
              title: "AI 整理完成 1 筆拜訪紀錄", sub: "台積電 · 王文彥", time: "4 小時前", unread: true },
            { icon: <IconMessage size={12} />, color: "#006E2B", bg: "#E8F9EE",
              title: "王文彥 回覆了訊息", sub: "「下週三 POC 時間 OK」", time: "昨天", unread: true },
            { icon: <IconCheck size={12} />, color: "#3C4A3C", bg: "#F3F3F8",
              title: "聯電先進封裝 已簽約", sub: "NT$ 5,500,000 · 恭喜成交 🎉", time: "2 天前", unread: false },
          ].map((n, i) => (
            <button key={i} onClick={() => { setNotifOpen(false); }}
              onMouseEnter={(e) => e.currentTarget.style.background = "#F3F3F8"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
              style={{
                display: "flex", gap: 10, width: "100%",
                padding: "10px 10px", borderRadius: 8, textAlign: "left",
                alignItems: "flex-start",
                transition: "background 120ms",
              }}>
              <div style={{
                width: 24, height: 24, borderRadius: 6, flexShrink: 0,
                background: n.bg, color: n.color,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>{n.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: "#1A1A1A", marginBottom: 1 }}>
                  {n.title}
                </div>
                <div style={{ fontSize: 11, color: "#3C4A3C", opacity: 0.75, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {n.sub}
                </div>
                <div style={{ fontSize: 10, color: "#3C4A3C", opacity: 0.5, marginTop: 2 }}>
                  {n.time}
                </div>
              </div>
              {n.unread && <div style={{ width: 6, height: 6, borderRadius: 3, background: "#06C755", marginTop: 6, flexShrink: 0 }} />}
            </button>
          ))}
          <div style={{ padding: "6px 10px", borderTop: "1px solid rgba(60,74,60,0.08)", marginTop: 4 }}>
            <button style={{ fontSize: 12, color: "#006E2B", fontWeight: 600, width: "100%", textAlign: "center", padding: 4 }}>
              查看全部通知 →
            </button>
          </div>
        </div>
      </Popover>
    </>
  );
};

// Placeholder pages
const ActivitiesPage = () => (
  <div style={{ padding: "24px 32px", maxWidth: 900 }}>
    <div style={{ background: "#fff", borderRadius: 16, padding: 24, boxShadow: "var(--shadow-card)" }}>
      <SectionTitle>近期互動時間軸</SectionTitle>
      <ActivityTimeline activities={ACTIVITIES} />
    </div>
  </div>
);

const PipelineDashboard = () => {
  const [aiQuery, setAiQuery] = React.useState("");
  const [aiAnswer, setAiAnswer] = React.useState(null);
  const [thinking, setThinking] = React.useState(false);

  const askAI = (q) => {
    setAiQuery(q); setThinking(true); setAiAnswer(null);
    setTimeout(() => {
      setThinking(false);
      setAiAnswer({
        summary: "本月成交最多的業務是 施威宇,共 2 件,總金額 NT$ 12.8M。",
        details: [
          { label: "施威宇", value: "NT$ 12.8M", sub: "2 件 · 日月光 + 工研院" },
          { label: "王文彥", value: "NT$ 5.5M", sub: "1 件 · 聯電" },
        ]
      });
    }, 1600);
  };

  const stageDist = STAGES.filter(s => s.id !== "won" && s.id !== "lost").map(s => ({
    ...s, n: DEALS.filter(d => d.stage === s.id).length,
    sum: DEALS.filter(d => d.stage === s.id).reduce((a, d) => a + d.value, 0),
  }));

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20, padding: "24px 32px" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          <StatCard label="總案件數" value="13" sub="進行中" />
          <StatCard label="Pipeline 總額" value="$36.8M" sub="TWD · 13 案進行中" accent="primary" />
          <StatCard label="本月成交" value="$12.8M" sub="2 件 · 達成率 78%" accent="warning" />
          <StatCard label="預計 Q2" value="$48.0M" sub="目標 $60M" accent="danger" />
        </div>

        <div style={{ background: "#fff", borderRadius: 16, padding: 20, boxShadow: "var(--shadow-card)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <SectionTitle>Stage 分布</SectionTitle>
            <span style={{ fontSize: 11, color: "#3C4A3C", opacity: 0.6 }}>案件數 · 金額</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {stageDist.map(s => {
              const maxN = Math.max(...stageDist.map(x => x.n));
              const pct = (s.n / maxN) * 100;
              return (
                <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 80, fontSize: 12, fontWeight: 600, color: "#1A1A1A" }}>{s.name}</div>
                  <div style={{ flex: 1, height: 22, background: "#F3F3F8", borderRadius: 4, position: "relative", overflow: "hidden" }}>
                    <div style={{
                      width: `${pct}%`, height: "100%",
                      background: s.color, borderRadius: 4,
                      display: "flex", alignItems: "center", paddingLeft: 8,
                      fontSize: 11, fontWeight: 700, color: s.text,
                    }}>{s.n}</div>
                  </div>
                  <div className="tnum" style={{ width: 80, textAlign: "right", fontSize: 12, color: "#3C4A3C", opacity: 0.8 }}>
                    {formatCurrencyShort(s.sum)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ background: "#fff", borderRadius: 16, padding: 20, boxShadow: "var(--shadow-card)" }}>
          <SectionTitle>近期更新案件</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {DEALS.slice(0, 5).map(d => <DealRow key={d.id} deal={d} />)}
          </div>
        </div>
      </div>

      {/* AI Assistant sidebar */}
      <div style={{
        background: "#F3F3F8",
        borderRadius: 16,
        padding: 16,
        display: "flex", flexDirection: "column", gap: 12,
        minHeight: 500,
        position: "sticky", top: 80, alignSelf: "start",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: "linear-gradient(135deg, #06C755, #0A84FF)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff",
          }}><IconSparkles size={14} strokeWidth={2.2} /></div>
          <div>
            <div className="display-font" style={{ fontSize: 14, fontWeight: 700 }}>AI 業績助理</div>
            <div style={{ fontSize: 10, color: "#3C4A3C", opacity: 0.7 }}>自然語言查詢數據</div>
          </div>
        </div>

        {!aiAnswer && !thinking && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#3C4A3C", letterSpacing: "0.06em", textTransform: "uppercase", marginTop: 4 }}>常見問題</div>
            {[
              "本月哪個業務成交最多?",
              "台積電的案件目前進度?",
              "哪些案件擱置超過 7 天?",
              "Q2 預計可成交多少?",
            ].map(q => (
              <button key={q} onClick={() => askAI(q)} style={{
                padding: "10px 12px",
                background: "#fff", borderRadius: 8,
                fontSize: 12, textAlign: "left",
                color: "#1A1A1A", fontWeight: 500,
                border: "1px solid transparent",
                transition: "all 150ms",
              }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = "#06C755"}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = "transparent"}>
                {q}
              </button>
            ))}
          </div>
        )}

        {thinking && (
          <div style={{ padding: 16, background: "#fff", borderRadius: 10 }}>
            <div style={{ fontSize: 11, color: "#3C4A3C", marginBottom: 6 }}>「{aiQuery}」</div>
            <div className="ai-gradient-text pulse-soft" style={{ fontSize: 13, fontWeight: 600 }}>AI 正在分析數據…</div>
          </div>
        )}

        {aiAnswer && (
          <div className="ai-left-border" style={{
            padding: "12px 14px", background: "#fff", borderRadius: 10,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <AIBadge>AI 回覆</AIBadge>
            </div>
            <div style={{ fontSize: 11, color: "#3C4A3C", opacity: 0.7, marginBottom: 6 }}>「{aiQuery}」</div>
            <div style={{ fontSize: 13, color: "#1A1A1A", lineHeight: 1.55, marginBottom: 10 }}>{aiAnswer.summary}</div>
            {aiAnswer.details.map((d, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", padding: "6px 0", borderTop: i > 0 ? "1px dashed rgba(60,74,60,0.1)" : "none" }}>
                <div style={{ flex: 1, fontSize: 12, fontWeight: 600 }}>{d.label}</div>
                <div style={{ textAlign: "right" }}>
                  <div className="tnum" style={{ fontSize: 13, fontWeight: 700 }}>{d.value}</div>
                  <div style={{ fontSize: 10, color: "#3C4A3C", opacity: 0.6 }}>{d.sub}</div>
                </div>
              </div>
            ))}
            <button onClick={() => { setAiAnswer(null); setAiQuery(""); }} style={{ marginTop: 8, fontSize: 11, color: "#006E2B", fontWeight: 600 }}>
              ← 回到建議
            </button>
          </div>
        )}

        <div style={{ flex: 1 }} />

        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "8px 10px",
          background: "#fff",
          borderRadius: 10,
          border: "1px solid rgba(60,74,60,0.12)",
        }}>
          <input
            value={aiQuery}
            onChange={(e) => setAiQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && aiQuery.trim()) askAI(aiQuery); }}
            placeholder="問 AI 任何數據問題…"
            style={{ flex: 1, border: "none", outline: "none", fontSize: 13, background: "transparent" }}
          />
          <button onClick={() => aiQuery.trim() && askAI(aiQuery)} style={{
            padding: 6, borderRadius: 6,
            background: "linear-gradient(135deg, #06C755, #0A84FF)",
            color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <IconSend size={12} />
          </button>
        </div>
      </div>
    </div>
  );
};

const PlaceholderPage = ({ title }) => (
  <div style={{ padding: "40px 32px", color: "#3C4A3C", opacity: 0.6 }}>
    <div style={{ padding: 48, background: "#fff", borderRadius: 16, textAlign: "center", boxShadow: "var(--shadow-card)" }}>
      <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 13 }}>此頁面為 P2 優先度,尚未納入本期設計範圍</div>
    </div>
  </div>
);

Object.assign(window, { App, ActivitiesPage, PipelineDashboard, PlaceholderPage, TopBarActions, DealDetailModal });

// Mount
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
