// primitives.jsx — shared LIFF UI primitives
// Top bar, bottom nav, toast, skeleton, chips, buttons, icons

// ─── Icons (stroke-based, no emoji) ──────────────────────────
const I = {
  close: (s=20, c='currentColor') => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M6 6l12 12M18 6L6 18" stroke={c} strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
  back: (s=20, c='currentColor') => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M14 6l-6 6 6 6" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  more: (s=20, c='currentColor') => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <circle cx="5" cy="12" r="1.6" fill={c}/><circle cx="12" cy="12" r="1.6" fill={c}/><circle cx="19" cy="12" r="1.6" fill={c}/>
    </svg>
  ),
  search: (s=16, c='currentColor') => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <circle cx="11" cy="11" r="6.5" stroke={c} strokeWidth="1.8"/>
      <path d="M20 20l-4.3-4.3" stroke={c} strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
  filter: (s=20, c='currentColor') => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M4 6h16M7 12h10M10 18h4" stroke={c} strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
  phone: (s=16, c='currentColor') => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M5 4h3l2 5-2.5 1.5a11 11 0 0 0 6 6L15 14l5 2v3a2 2 0 0 1-2 2A15 15 0 0 1 3 6a2 2 0 0 1 2-2z" stroke={c} strokeWidth="1.6" strokeLinejoin="round"/>
    </svg>
  ),
  mobile: (s=16, c='currentColor') => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <rect x="7" y="3" width="10" height="18" rx="2" stroke={c} strokeWidth="1.6"/>
      <circle cx="12" cy="17.5" r="0.9" fill={c}/>
    </svg>
  ),
  mail: (s=16, c='currentColor') => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="5" width="18" height="14" rx="2" stroke={c} strokeWidth="1.6"/>
      <path d="M4 7l8 6 8-6" stroke={c} strokeWidth="1.6" strokeLinejoin="round"/>
    </svg>
  ),
  chat: (s=16, c='currentColor') => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-7l-4 3v-3H6a2 2 0 0 1-2-2V6z" stroke={c} strokeWidth="1.6" strokeLinejoin="round"/>
    </svg>
  ),
  pin: (s=16, c='currentColor') => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M12 22s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12z" stroke={c} strokeWidth="1.6" strokeLinejoin="round"/>
      <circle cx="12" cy="10" r="2.5" stroke={c} strokeWidth="1.6"/>
    </svg>
  ),
  globe: (s=16, c='currentColor') => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke={c} strokeWidth="1.6"/>
      <path d="M3 12h18M12 3c2.5 3 2.5 15 0 18M12 3c-2.5 3-2.5 15 0 18" stroke={c} strokeWidth="1.6"/>
    </svg>
  ),
  copy: (s=18, c='currentColor') => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <rect x="8" y="8" width="12" height="12" rx="2" stroke={c} strokeWidth="1.6"/>
      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" stroke={c} strokeWidth="1.6"/>
    </svg>
  ),
  edit: (s=18, c='currentColor') => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M4 20h4l10-10-4-4L4 16v4z" stroke={c} strokeWidth="1.6" strokeLinejoin="round"/>
      <path d="M13 6l4 4" stroke={c} strokeWidth="1.6"/>
    </svg>
  ),
  tag: (s=18, c='currentColor') => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M13 3H4v9l9 9 9-9-9-9z" stroke={c} strokeWidth="1.6" strokeLinejoin="round"/>
      <circle cx="8" cy="8" r="1.4" fill={c}/>
    </svg>
  ),
  qr: (s=18, c='currentColor') => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="7" height="7" stroke={c} strokeWidth="1.6"/>
      <rect x="14" y="3" width="7" height="7" stroke={c} strokeWidth="1.6"/>
      <rect x="3" y="14" width="7" height="7" stroke={c} strokeWidth="1.6"/>
      <path d="M14 14h3v3h-3zM20 14v3M14 20h3v1M20 17v4" stroke={c} strokeWidth="1.6"/>
    </svg>
  ),
  card: (s=22, c='currentColor') => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="6" width="18" height="13" rx="2.5" stroke={c} strokeWidth="1.7"/>
      <circle cx="9" cy="12" r="2" stroke={c} strokeWidth="1.6"/>
      <path d="M14 11h4M14 14h3" stroke={c} strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  ),
  chart: (s=22, c='currentColor') => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M4 20V9M10 20V4M16 20v-7M22 20H2" stroke={c} strokeWidth="1.7" strokeLinecap="round"/>
    </svg>
  ),
  gear: (s=22, c='currentColor') => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="3.2" stroke={c} strokeWidth="1.7"/>
      <path d="M12 2.5v2.5M12 19v2.5M4.2 7l2.1 1.2M17.7 15.8l2.1 1.2M4.2 17l2.1-1.2M17.7 8.2l2.1-1.2M2.5 12H5M19 12h2.5" stroke={c} strokeWidth="1.7" strokeLinecap="round"/>
    </svg>
  ),
  plus: (s=18, c='currentColor') => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M12 5v14M5 12h14" stroke={c} strokeWidth="1.9" strokeLinecap="round"/>
    </svg>
  ),
  check: (s=16, c='currentColor') => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M5 12l5 5 9-10" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  calendar: (s=16, c='currentColor') => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <rect x="3.5" y="5" width="17" height="15" rx="2" stroke={c} strokeWidth="1.6"/>
      <path d="M3.5 10h17M8 3v4M16 3v4" stroke={c} strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  ),
  alert: (s=16, c='currentColor') => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M12 3l10 18H2L12 3z" stroke={c} strokeWidth="1.6" strokeLinejoin="round"/>
      <path d="M12 10v5M12 18v.1" stroke={c} strokeWidth="1.7" strokeLinecap="round"/>
    </svg>
  ),
  trash: (s=16, c='currentColor') => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M4 7h16M10 4h4a1 1 0 0 1 1 1v2H9V5a1 1 0 0 1 1-1z" stroke={c} strokeWidth="1.6" strokeLinejoin="round"/>
      <path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13" stroke={c} strokeWidth="1.6"/>
    </svg>
  ),
  mic: (s=22, c='currentColor') => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <rect x="9" y="3" width="6" height="12" rx="3" stroke={c} strokeWidth="1.7"/>
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6" stroke={c} strokeWidth="1.7" strokeLinecap="round"/>
    </svg>
  ),
  sparkle: (s=14, c='currentColor') => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M12 2l1.8 5.5L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.5L12 2z" fill={c}/>
      <path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16z" fill={c} opacity="0.6"/>
    </svg>
  ),
  caret: (s=12, c='currentColor') => (
    <svg width={s} height={s} viewBox="0 0 12 12" fill="none">
      <path d="M3 4.5l3 3 3-3" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
};

// ─── Top bar (48px, glass) ───────────────────────────────────
function LiffTopBar({ left, title, right, glass = true }) {
  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0, zIndex: 30,
      height: 48, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 8px',
      background: glass ? 'rgba(250,250,247,0.78)' : 'var(--c-bg-base)',
      backdropFilter: glass ? 'blur(20px) saturate(180%)' : 'none',
      WebkitBackdropFilter: glass ? 'blur(20px) saturate(180%)' : 'none',
    }}>
      <div style={{ width: 44, display: 'flex', justifyContent: 'flex-start' }}>
        {left && <button style={iconBtn}>{left}</button>}
      </div>
      <div className="display" style={{
        fontSize: 15, fontWeight: 700, color: 'var(--c-text)',
      }}>{title}</div>
      <div style={{ width: 44, display: 'flex', justifyContent: 'flex-end' }}>
        {right && <button style={iconBtn}>{right}</button>}
      </div>
    </div>
  );
}
const iconBtn = {
  width: 40, height: 40, borderRadius: 10,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  color: 'var(--c-text)',
};

// ─── Bottom nav (56px) ───────────────────────────────────────
function LiffBottomNav({ active = 'cards' }) {
  const tabs = [
    { id: 'cards', label: '名片', icon: I.card(22) },
    { id: 'crm',   label: 'CRM',  icon: I.chart(22) },
    { id: 'settings', label: '設定', icon: I.gear(22) },
  ];
  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 40,
      height: 56, background: 'var(--c-bg-card)',
      borderTop: '1px solid var(--c-hairline)',
      display: 'flex', alignItems: 'stretch',
    }}>
      {tabs.map(t => {
        const on = t.id === active;
        const c = on ? 'var(--c-primary-deep)' : 'rgba(85,88,79,0.55)';
        return (
          <div key={t.id} style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 3,
            color: c, position: 'relative',
          }}>
            <div style={{ display: 'flex' }}>{React.cloneElement(t.icon, { stroke: c })}</div>
            <div style={{ fontSize: 10.5, fontWeight: on ? 700 : 500 }}>{t.label}</div>
            {on && <div style={{
              position: 'absolute', bottom: 4, width: 4, height: 4, borderRadius: 99,
              background: 'var(--c-primary-deep)',
            }}/>}
          </div>
        );
      })}
    </div>
  );
}

// ─── Toast ───────────────────────────────────────────────────
function LiffToast({ kind = 'success', children, top = 48 }) {
  const bg = kind === 'success' ? 'var(--c-primary)' : 'var(--c-danger)';
  return (
    <div style={{
      position: 'absolute', top, left: 0, right: 0, zIndex: 50,
      height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: 8, background: bg, color: '#fff',
      fontSize: 14, fontWeight: 600,
      animation: 'slideDown 200ms ease-out',
    }}>
      {children}
    </div>
  );
}

// ─── Avatar ──────────────────────────────────────────────────
function Avatar({ name, size = 48, color, src }) {
  const char = name ? name[0] : '?';
  const palette = ['#E6F4EC', '#FCF2DE', '#E8EFFB', '#F3EBE3', '#EBF0E4'];
  const textPal = ['#0E5E3A', '#8A5A0F', '#1D3E85', '#6A4A2E', '#3E5620'];
  const idx = (name || '').charCodeAt(0) % palette.length;
  return (
    <div style={{
      width: size, height: size, borderRadius: 10, flexShrink: 0,
      background: color || palette[idx],
      color: textPal[idx], fontFamily: 'var(--f-display)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 700, fontSize: size * 0.38,
      overflow: 'hidden', position: 'relative',
    }}>
      {src ? <div style={{
        position: 'absolute', inset: 0,
        background: src, backgroundSize: 'cover', backgroundPosition: 'center',
      }}/> : char}
    </div>
  );
}

// ─── Tag chip ────────────────────────────────────────────────
function Chip({ children, active, onClick, size = 'md', variant = 'filter' }) {
  const h = size === 'sm' ? 24 : 32;
  const base = {
    height: h, padding: size === 'sm' ? '0 10px' : '0 14px',
    borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: 6,
    fontSize: size === 'sm' ? 12 : 13, fontWeight: 600,
    whiteSpace: 'nowrap',
  };
  if (variant === 'tag') {
    return <span style={{
      ...base, height: 22, padding: '0 8px', fontSize: 11, fontWeight: 600,
      background: 'var(--c-primary-softer)', color: 'var(--c-primary-deep)',
      border: '1px solid rgba(31,139,92,0.2)',
    }}>{children}</span>;
  }
  return (
    <div onClick={onClick} style={{
      ...base,
      background: active ? 'var(--c-primary)' : 'var(--c-bg-section)',
      color: active ? '#fff' : 'var(--c-text-sub)',
    }}>{children}</div>
  );
}

// ─── Button ──────────────────────────────────────────────────
function PrimaryButton({ children, height = 52, disabled, icon }) {
  return (
    <div style={{
      height, borderRadius: 12,
      background: disabled ? 'var(--c-bg-input)'
        : 'linear-gradient(180deg, #1F8B5C 0%, #0E5E3A 100%)',
      color: disabled ? 'var(--c-text-disabled)' : '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em',
      boxShadow: disabled ? 'none' : '0 1px 0 rgba(255,255,255,0.2) inset, 0 6px 18px rgba(14,94,58,0.2)',
    }}>
      {icon}{children}
    </div>
  );
}
function GhostButton({ children, height = 44, color = 'var(--c-text-sub)' }) {
  return (
    <div style={{
      height, borderRadius: 10, padding: '0 16px',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
      fontSize: 14, fontWeight: 600, color,
      background: 'transparent',
    }}>{children}</div>
  );
}

// ─── Skeleton ────────────────────────────────────────────────
function SkelLine({ w = '80%', h = 12, style }) {
  return <div className="skel" style={{ width: w, height: h, borderRadius: 6, ...style }}/>;
}
function SkelBlock({ w = 48, h = 48, r = 10, style }) {
  return <div className="skel" style={{ width: w, height: h, borderRadius: r, ...style }}/>;
}

// Expose globals
Object.assign(window, {
  I, LiffTopBar, LiffBottomNav, LiffToast,
  Avatar, Chip, PrimaryButton, GhostButton,
  SkelLine, SkelBlock,
});
