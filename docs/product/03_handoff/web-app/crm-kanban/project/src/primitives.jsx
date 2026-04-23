// Reusable primitives

const Avatar = ({ contact, size = 40, className = "" }) => {
  const s = size;
  return (
    <div
      className={"flex items-center justify-center shrink-0 " + className}
      style={{
        width: s, height: s, borderRadius: s >= 48 ? 10 : 8,
        background: contact?.color || "#F3F3F8",
        color: "#1A1A1A",
        fontFamily: "'Plus Jakarta Sans', 'Noto Sans TC', sans-serif",
        fontWeight: 700,
        fontSize: Math.max(12, Math.floor(s * 0.42))
      }}
    >
      {contact?.initials || "?"}
    </div>
  );
};

const Chip = ({ children, variant = "default", size = "md", onClick, style }) => {
  const base = {
    display: "inline-flex", alignItems: "center", gap: 4,
    borderRadius: 20,
    fontSize: size === "sm" ? 11 : 12,
    fontWeight: 500,
    padding: size === "sm" ? "2px 8px" : "3px 10px",
    lineHeight: 1.3,
    cursor: onClick ? "pointer" : "default",
    whiteSpace: "nowrap",
    transition: "all 150ms ease",
  };
  const variants = {
    default: { background: "#F3F3F8", color: "#3C4A3C" },
    active: { background: "#E8F9EE", color: "#006E2B", border: "1px solid rgba(6,199,85,0.25)" },
    primary: { background: "#06C755", color: "#fff" },
    outline: { background: "#fff", color: "#3C4A3C", border: "1px solid rgba(60,74,60,0.2)" },
    danger: { background: "#FEE2E2", color: "#C0000A" },
    warning: { background: "#FEF9C3", color: "#854D0E" },
    info: { background: "#DBEAFE", color: "#1E40AF" },
  };
  return (
    <span onClick={onClick} style={{ ...base, ...variants[variant], ...style }}>
      {children}
    </span>
  );
};

const Button = ({ variant = "primary", size = "md", icon, children, onClick, disabled, className = "", style }) => {
  const base = {
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    gap: 6,
    fontFamily: "inherit",
    fontWeight: 600,
    fontSize: 14,
    borderRadius: 8,
    padding: size === "sm" ? "6px 12px" : size === "lg" ? "14px 20px" : "9px 14px",
    height: size === "sm" ? 32 : size === "lg" ? 48 : 40,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
    transition: "all 160ms ease",
    whiteSpace: "nowrap",
  };
  const variants = {
    primary: { background: "linear-gradient(135deg, #06C755, #006E2B)", color: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,0.08)" },
    ghost: { background: "transparent", color: "#3C4A3C", border: "1px solid rgba(60,74,60,0.2)" },
    subtle: { background: "#F3F3F8", color: "#3C4A3C" },
    danger: { background: "#C0000A", color: "#fff" },
    text: { background: "transparent", color: "#006E2B", padding: "4px 6px", height: "auto" },
  };
  return (
    <button disabled={disabled} onClick={onClick}
      className={className}
      onMouseEnter={(e) => {
        if (disabled) return;
        if (variant === "primary") e.currentTarget.style.transform = "translateY(-1px)";
        if (variant === "ghost") e.currentTarget.style.background = "#F3F3F8";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "";
        if (variant === "ghost") e.currentTarget.style.background = "transparent";
      }}
      style={{ ...base, ...variants[variant], ...style }}>
      {icon}
      {children}
    </button>
  );
};

const StageBadge = ({ stage, size = "md" }) => {
  const s = getStage(stage);
  if (!s) return null;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      background: s.color, color: s.text,
      fontSize: size === "sm" ? 11 : 12, fontWeight: 600,
      padding: size === "sm" ? "2px 7px" : "3px 9px",
      borderRadius: 6,
      fontFamily: "'Plus Jakarta Sans', 'Noto Sans TC', sans-serif",
      whiteSpace: "nowrap",
    }}>
      {s.name}
    </span>
  );
};

const SentimentDot = ({ sentiment }) => {
  const colors = { positive: "#06C755", neutral: "#F59E0B", negative: "#C0000A" };
  const labels = { positive: "正向", neutral: "中性", negative: "負向" };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 600, color: colors[sentiment] }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: colors[sentiment] }} />
      {labels[sentiment]}
    </span>
  );
};

const Skeleton = ({ w = "100%", h = 12, r = 4, className = "", style }) => (
  <div className={"shimmer " + className} style={{ width: w, height: h, borderRadius: r, ...style }} />
);

const AIBadge = ({ children = "AI", icon = true }) => (
  <span style={{
    display: "inline-flex", alignItems: "center", gap: 4,
    padding: "1px 6px", borderRadius: 4,
    fontSize: 10, fontWeight: 700, letterSpacing: "0.04em",
    background: "linear-gradient(90deg, rgba(6,199,85,0.12) 0%, rgba(10,132,255,0.12) 100%)",
    color: "#0A84FF",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  }}>
    {icon && <IconSparkles size={10} strokeWidth={2} />}
    {children}
  </span>
);

// Toast system — simple, top-centered
const Toast = ({ message, variant = "success", onClose }) => {
  React.useEffect(() => {
    const t = setTimeout(onClose, 2400);
    return () => clearTimeout(t);
  }, []);
  const bg = variant === "success" ? "#06C755" : variant === "error" ? "#C0000A" : "#1A1A1A";
  return (
    <div className="toast-enter" style={{
      position: "fixed", right: 24, bottom: 24,
      background: bg, color: "#fff",
      padding: "12px 16px", borderRadius: 8,
      fontSize: 14, fontWeight: 500,
      display: "flex", alignItems: "center", gap: 10,
      boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
      zIndex: 9999, minWidth: 280,
    }}>
      {variant === "success" && <IconCheck size={18} strokeWidth={2.5} />}
      {variant === "error" && <IconAlert size={18} strokeWidth={2.5} />}
      {message}
    </div>
  );
};

// Tab bar
const Tabs = ({ tabs, active, onChange }) => (
  <div style={{ display: "flex", gap: 2, borderBottom: "1px solid rgba(60,74,60,0.12)" }}>
    {tabs.map(t => (
      <button key={t.id} onClick={() => onChange(t.id)}
        style={{
          padding: "10px 16px",
          fontSize: 14, fontWeight: 600,
          color: active === t.id ? "#006E2B" : "#3C4A3C",
          borderBottom: active === t.id ? "2px solid #06C755" : "2px solid transparent",
          marginBottom: -1,
          transition: "all 150ms ease",
          display: "inline-flex", alignItems: "center", gap: 6,
        }}>
        {t.label}
        {t.count !== undefined && (
          <span style={{
            fontSize: 11, fontWeight: 600,
            padding: "1px 7px",
            borderRadius: 10,
            background: active === t.id ? "#E8F9EE" : "#F3F3F8",
            color: active === t.id ? "#006E2B" : "#3C4A3C",
            minWidth: 20, textAlign: "center"
          }}>{t.count}</span>
        )}
      </button>
    ))}
  </div>
);

// Search input
const SearchInput = ({ value, onChange, placeholder = "搜尋…", onClear }) => (
  <div className="focus-ring" style={{
    display: "flex", alignItems: "center", gap: 8,
    background: value ? "#fff" : "#E2E2E7",
    borderRadius: 8,
    padding: "0 12px",
    height: 40,
    transition: "background 150ms ease",
  }}>
    <IconSearch size={16} style={{ color: "#3C4A3C" }} />
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        flex: 1, border: "none", outline: "none",
        background: "transparent",
        fontSize: 14, color: "#1A1A1A",
        fontFamily: "inherit"
      }}
    />
    {value && (
      <button onClick={onClear || (() => onChange(""))} style={{
        display: "inline-flex", padding: 2, color: "#3C4A3C", opacity: 0.6,
      }}>
        <IconX size={14} />
      </button>
    )}
  </div>
);

// Popover
const Popover = ({ open, onOpenChange, trigger, children, align = "end" }) => {
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) onOpenChange && onOpenChange(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, onOpenChange]);
  return (
    <div ref={ref} style={{ position: "relative", display: "inline-flex" }}>
      {trigger}
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)",
          [align === "end" ? "right" : "left"]: 0,
          zIndex: 30,
          background: "#fff", borderRadius: 10,
          boxShadow: "0 8px 24px rgba(0,0,0,0.12), 0 0 0 1px rgba(60,74,60,0.08)",
          padding: 6, minWidth: 180,
        }}>
          {children}
        </div>
      )}
    </div>
  );
};

const PopoverItem = ({ active, onClick, children }) => (
  <button onClick={onClick}
    onMouseEnter={(e) => e.currentTarget.style.background = active ? "#E8F9EE" : "#F3F3F8"}
    onMouseLeave={(e) => e.currentTarget.style.background = active ? "#E8F9EE" : "transparent"}
    style={{
      display: "flex", alignItems: "center", gap: 8, width: "100%",
      padding: "7px 10px", borderRadius: 6, textAlign: "left",
      fontSize: 13, fontWeight: active ? 600 : 500,
      color: active ? "#006E2B" : "#1A1A1A",
      background: active ? "#E8F9EE" : "transparent",
      transition: "background 120ms",
    }}>
    {children}
  </button>
);

Object.assign(window, {
  Avatar, Chip, Button, StageBadge, SentimentDot, Skeleton, AIBadge, Toast, Tabs, SearchInput, Popover, PopoverItem
});
