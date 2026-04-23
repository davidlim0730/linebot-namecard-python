// AppShell: Sidebar + Top Navigation

const Sidebar = ({ currentRoute, onNavigate }) => {
  const [userMenuOpen, setUserMenuOpen] = React.useState(false);
  const userMenuRef = React.useRef(null);
  React.useEffect(() => {
    if (!userMenuOpen) return;
    const onDoc = (e) => { if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserMenuOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [userMenuOpen]);

  const navItems = [
    { id: "deals", label: "案件看板", icon: IconLayout, badge: null, primary: true },
    { id: "contacts", label: "聯絡人", icon: IconUsers, badge: null },
    { id: "actions", label: "待辦事項", icon: IconCheckSquare, badge: 3 },
    { id: "activities", label: "互動記錄", icon: IconMessage, badge: null },
  ];
  const adminItems = [
    { id: "pipeline", label: "Pipeline 儀表板", icon: IconTrendUp, badge: "admin" },
    { id: "products", label: "產品線管理", icon: IconBriefcase, badge: "admin" },
  ];

  const renderItem = (item) => {
    const isActive = currentRoute === item.id;
    const Icon = item.icon;
    return (
      <button key={item.id} onClick={() => onNavigate(item.id)}
        style={{
          width: "100%",
          display: "flex", alignItems: "center", gap: 10,
          padding: "9px 12px",
          borderRadius: 8,
          background: isActive ? "#E8F9EE" : "transparent",
          color: isActive ? "#006E2B" : "#3C4A3C",
          fontWeight: isActive ? 600 : 500,
          fontSize: 14,
          transition: "all 150ms ease",
          textAlign: "left",
        }}
        onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "rgba(60,74,60,0.05)"; }}
        onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
      >
        <Icon size={18} strokeWidth={isActive ? 2 : 1.75} />
        <span style={{ flex: 1 }}>{item.label}</span>
        {typeof item.badge === "number" && (
          <span style={{
            fontSize: 11, fontWeight: 700, padding: "1px 7px",
            borderRadius: 10, background: "#C0000A", color: "#fff",
            minWidth: 18, textAlign: "center",
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}>{item.badge}</span>
        )}
        {item.badge === "admin" && (
          <span style={{
            fontSize: 9, fontWeight: 700, padding: "1px 5px", letterSpacing: "0.04em",
            borderRadius: 3, border: "1px solid rgba(60,74,60,0.2)", color: "#3C4A3C",
          }}>ADMIN</span>
        )}
      </button>
    );
  };

  return (
    <aside style={{
      width: 232, flexShrink: 0,
      background: "#F3F3F8",
      borderRight: "1px solid rgba(60,74,60,0.06)",
      display: "flex", flexDirection: "column",
      padding: "16px 12px",
      height: "100vh", position: "sticky", top: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: "4px 8px 20px 8px", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: "linear-gradient(135deg, #06C755, #006E2B)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", fontWeight: 800,
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: 16,
          boxShadow: "0 2px 6px rgba(6,199,85,0.3)"
        }}>
          M
        </div>
        <div style={{ lineHeight: 1.1 }}>
          <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 15, color: "#1A1A1A" }}>
            Mingpian
          </div>
          <div style={{ fontSize: 10, color: "#3C4A3C", opacity: 0.6, fontWeight: 500, letterSpacing: "0.04em" }}>
            銷售 AI 助理
          </div>
        </div>
      </div>

      {/* Main nav */}
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {navItems.map(renderItem)}
      </div>

      {/* Admin section */}
      <div style={{
        marginTop: 20, paddingTop: 12,
        borderTop: "1px solid rgba(60,74,60,0.08)",
      }}>
        <div style={{
          padding: "0 12px 8px", fontSize: 10, fontWeight: 700,
          letterSpacing: "0.08em", color: "#3C4A3C", opacity: 0.55, textTransform: "uppercase"
        }}>管理員</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {adminItems.map(renderItem)}
        </div>
      </div>

      {/* Spacer + merged user/settings */}
      <div style={{ flex: 1 }} />

      <div ref={userMenuRef} style={{ position: "relative" }}>
        {userMenuOpen && (
          <div style={{
            position: "absolute", bottom: "calc(100% + 8px)", left: 0, right: 0,
            background: "#fff", borderRadius: 10,
            boxShadow: "0 8px 24px rgba(0,0,0,0.12), 0 0 0 1px rgba(60,74,60,0.08)",
            padding: 6, zIndex: 30,
          }}>
            <div style={{ padding: "8px 10px 6px", borderBottom: "1px solid rgba(60,74,60,0.08)", marginBottom: 4 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1A1A1A" }}>施威宇</div>
              <div style={{ fontSize: 11, color: "#3C4A3C", opacity: 0.7 }}>shihwei@local · 管理員</div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 6,
                padding: "2px 7px", borderRadius: 10, background: "#E8F9EE",
                fontSize: 10, fontWeight: 700, color: "#006E2B",
              }}>
                <span style={{ width: 6, height: 6, borderRadius: 3, background: "#06C755" }} />
                線上
              </div>
            </div>
            {[
              { icon: IconUser, label: "個人資料" },
              { icon: IconBell, label: "通知偏好" },
              { icon: IconSettings, label: "團隊設定", onClick: () => { onNavigate("settings"); setUserMenuOpen(false); } },
              { icon: IconBriefcase, label: "產品線管理", onClick: () => { onNavigate("products"); setUserMenuOpen(false); } },
            ].map((it, i) => {
              const Ic = it.icon;
              return (
                <button key={i} onClick={it.onClick || (() => setUserMenuOpen(false))}
                  onMouseEnter={(e) => e.currentTarget.style.background = "#F3F3F8"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                  style={{
                    display: "flex", alignItems: "center", gap: 10, width: "100%",
                    padding: "8px 10px", borderRadius: 6, textAlign: "left",
                    fontSize: 13, color: "#1A1A1A",
                    transition: "background 120ms",
                  }}>
                  <Ic size={14} style={{ color: "#3C4A3C", opacity: 0.7 }} />
                  {it.label}
                </button>
              );
            })}
            <div style={{ borderTop: "1px solid rgba(60,74,60,0.08)", marginTop: 4, paddingTop: 4 }}>
              <button
                onMouseEnter={(e) => e.currentTarget.style.background = "#FEE2E2"}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                style={{
                  display: "flex", alignItems: "center", gap: 10, width: "100%",
                  padding: "8px 10px", borderRadius: 6, textAlign: "left",
                  fontSize: 13, color: "#C0000A", fontWeight: 500,
                }}>
                <IconLogOut size={14} />
                登出
              </button>
            </div>
          </div>
        )}

        <button onClick={() => setUserMenuOpen(!userMenuOpen)}
          style={{
            width: "100%", padding: "10px 12px",
            borderRadius: 10,
            background: userMenuOpen ? "#E8F9EE" : "#fff",
            border: userMenuOpen ? "1px solid rgba(6,199,85,0.35)" : "1px solid rgba(60,74,60,0.08)",
            display: "flex", alignItems: "center", gap: 10, textAlign: "left",
            transition: "all 150ms ease",
          }}
          onMouseEnter={(e) => { if (!userMenuOpen) e.currentTarget.style.borderColor = "rgba(6,199,85,0.25)"; }}
          onMouseLeave={(e) => { if (!userMenuOpen) e.currentTarget.style.borderColor = "rgba(60,74,60,0.08)"; }}
        >
          <div style={{ position: "relative" }}>
            <Avatar contact={{ initials: "施", color: "#E8F9EE" }} size={32} />
            <div style={{
              position: "absolute", bottom: -2, right: -2,
              width: 10, height: 10, borderRadius: 5,
              background: "#06C755", border: "2px solid #fff",
            }} />
          </div>
          <div style={{ flex: 1, minWidth: 0, lineHeight: 1.25 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#1A1A1A", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              施威宇
            </div>
            <div style={{ fontSize: 11, color: "#3C4A3C", opacity: 0.7, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              威宇工作室 · 管理員
            </div>
          </div>
          <IconChevronRight size={14} style={{
            color: "#3C4A3C", opacity: 0.5,
            transform: userMenuOpen ? "rotate(-90deg)" : "rotate(-90deg)",
            transition: "transform 200ms",
          }} />
        </button>
      </div>
    </aside>
  );
};

const TopBar = ({ title, subtitle, rightSlot }) => (
  <div style={{
    display: "flex", alignItems: "center",
    padding: "16px 32px",
    background: "#fff",
    boxShadow: "0 1px 0 rgba(60,74,60,0.08)",
    gap: 20, minHeight: 64,
    position: "sticky", top: 0, zIndex: 20,
  }}>
    <div style={{ flex: 1, minWidth: 0 }}>
      <h1 className="display-font" style={{
        margin: 0, fontSize: 22, fontWeight: 700, color: "#1A1A1A",
        lineHeight: 1.2,
      }}>{title}</h1>
      {subtitle && (
        <div style={{ fontSize: 12, color: "#3C4A3C", opacity: 0.7, marginTop: 2 }}>
          {subtitle}
        </div>
      )}
    </div>
    {rightSlot}
  </div>
);

Object.assign(window, { Sidebar, TopBar });
