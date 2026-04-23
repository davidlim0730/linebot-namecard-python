// app/shared.jsx — Shared widgets for the LIFF CRM
// TopBar, BottomNav, MicFAB, AIField, AIBadge, icons

// ─────────────────────────────────────────────────────────────
// Icons (inline SVG, stroke-based for crispness)
// ─────────────────────────────────────────────────────────────
const Icon = {
  home: (p = {}) => (
    <svg viewBox="0 0 24 24" width={p.s || 22} height={p.s || 22} fill="none" stroke={p.c || 'currentColor'} strokeWidth={p.w || 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>
    </svg>
  ),
  inbox: (p = {}) => (
    <svg viewBox="0 0 24 24" width={p.s || 22} height={p.s || 22} fill="none" stroke={p.c || 'currentColor'} strokeWidth={p.w || 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z"/>
    </svg>
  ),
  contacts: (p = {}) => (
    <svg viewBox="0 0 24 24" width={p.s || 22} height={p.s || 22} fill="none" stroke={p.c || 'currentColor'} strokeWidth={p.w || 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  pipeline: (p = {}) => (
    <svg viewBox="0 0 24 24" width={p.s || 22} height={p.s || 22} fill="none" stroke={p.c || 'currentColor'} strokeWidth={p.w || 1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="4" height="16" rx="1"/><rect x="10" y="4" width="4" height="10" rx="1"/><rect x="17" y="4" width="4" height="6" rx="1"/>
    </svg>
  ),
  tasks: (p = {}) => (
    <svg viewBox="0 0 24 24" width={p.s || 22} height={p.s || 22} fill="none" stroke={p.c || 'currentColor'} strokeWidth={p.w || 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
    </svg>
  ),
  search: (p = {}) => (
    <svg viewBox="0 0 24 24" width={p.s || 20} height={p.s || 20} fill="none" stroke={p.c || 'currentColor'} strokeWidth={p.w || 1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>
    </svg>
  ),
  mic: (p = {}) => (
    <svg viewBox="0 0 24 24" width={p.s || 26} height={p.s || 26} fill="none" stroke={p.c || 'currentColor'} strokeWidth={p.w || 2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2" width="6" height="12" rx="3"/><path d="M19 10a7 7 0 0 1-14 0"/><path d="M12 17v5"/>
    </svg>
  ),
  camera: (p = {}) => (
    <svg viewBox="0 0 24 24" width={p.s || 22} height={p.s || 22} fill="none" stroke={p.c || 'currentColor'} strokeWidth={p.w || 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
    </svg>
  ),
  plus: (p = {}) => (
    <svg viewBox="0 0 24 24" width={p.s || 22} height={p.s || 22} fill="none" stroke={p.c || 'currentColor'} strokeWidth={p.w || 2} strokeLinecap="round">
      <path d="M12 5v14M5 12h14"/>
    </svg>
  ),
  chevRight: (p = {}) => (
    <svg viewBox="0 0 24 24" width={p.s || 18} height={p.s || 18} fill="none" stroke={p.c || 'currentColor'} strokeWidth={p.w || 2} strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6"/>
    </svg>
  ),
  chevDown: (p = {}) => (
    <svg viewBox="0 0 24 24" width={p.s || 18} height={p.s || 18} fill="none" stroke={p.c || 'currentColor'} strokeWidth={p.w || 2} strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6"/>
    </svg>
  ),
  back: (p = {}) => (
    <svg viewBox="0 0 24 24" width={p.s || 22} height={p.s || 22} fill="none" stroke={p.c || 'currentColor'} strokeWidth={p.w || 2} strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 18-6-6 6-6"/>
    </svg>
  ),
  phone: (p = {}) => (
    <svg viewBox="0 0 24 24" width={p.s || 18} height={p.s || 18} fill="none" stroke={p.c || 'currentColor'} strokeWidth={p.w || 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
    </svg>
  ),
  line: (p = {}) => (
    <svg viewBox="0 0 24 24" width={p.s || 18} height={p.s || 18} fill={p.c || 'currentColor'}>
      <path d="M12 2C6.48 2 2 5.66 2 10.16c0 4.03 3.56 7.4 8.36 8.03.33.07.77.22.89.5.1.26.07.66.03.92l-.14.87c-.04.26-.2 1 .88.55 1.08-.46 5.84-3.44 7.97-5.88h-.01C21.5 13.37 22 11.82 22 10.16 22 5.66 17.52 2 12 2zM8.08 12.77H6.1c-.29 0-.52-.23-.52-.52V8.3c0-.29.23-.52.52-.52.29 0 .52.23.52.52v3.43h1.46c.29 0 .52.23.52.52s-.23.52-.52.52zm2.05-.52c0 .29-.23.52-.52.52-.29 0-.52-.23-.52-.52V8.3c0-.29.23-.52.52-.52.29 0 .52.23.52.52zm4.76 0c0 .22-.14.42-.35.49-.05.02-.11.03-.17.03-.16 0-.3-.07-.4-.19l-2.03-2.76v2.43c0 .29-.23.52-.52.52-.29 0-.52-.23-.52-.52V8.3c0-.22.14-.42.35-.49.05-.02.11-.02.16-.02.16 0 .3.08.4.2l2.03 2.76V8.3c0-.29.23-.52.52-.52.29 0 .52.23.52.52v3.95zm3.2-2.49c.29 0 .52.23.52.52s-.23.52-.52.52h-1.47v.93h1.47c.29 0 .52.23.52.52s-.23.52-.52.52h-1.98c-.29 0-.52-.23-.52-.52V8.3c0-.29.23-.52.52-.52h1.98c.29 0 .52.23.52.52s-.23.52-.52.52h-1.47v.93z"/>
    </svg>
  ),
  sparkle: (p = {}) => (
    <svg viewBox="0 0 24 24" width={p.s || 14} height={p.s || 14} fill={p.c || 'currentColor'}>
      <path d="M12 2l1.8 5.4L19 9l-5.2 1.6L12 16l-1.8-5.4L5 9l5.2-1.6z"/>
      <path d="M19 14l.9 2.7L22 18l-2.1.9L19 22l-.9-2.7L16 18l2.1-1.3z" opacity="0.6"/>
    </svg>
  ),
  waveform: (p = {}) => (
    <svg viewBox="0 0 24 24" width={p.s || 18} height={p.s || 18} fill="none" stroke={p.c || 'currentColor'} strokeWidth={p.w || 2} strokeLinecap="round">
      <path d="M2 12h2M7 7v10M12 4v16M17 7v10M22 12h-2"/>
    </svg>
  ),
  edit: (p = {}) => (
    <svg viewBox="0 0 24 24" width={p.s || 16} height={p.s || 16} fill="none" stroke={p.c || 'currentColor'} strokeWidth={p.w || 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>
    </svg>
  ),
  close: (p = {}) => (
    <svg viewBox="0 0 24 24" width={p.s || 20} height={p.s || 20} fill="none" stroke={p.c || 'currentColor'} strokeWidth={p.w || 2} strokeLinecap="round">
      <path d="M18 6 6 18M6 6l12 12"/>
    </svg>
  ),
  clock: (p = {}) => (
    <svg viewBox="0 0 24 24" width={p.s || 16} height={p.s || 16} fill="none" stroke={p.c || 'currentColor'} strokeWidth={p.w || 1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
    </svg>
  ),
  check: (p = {}) => (
    <svg viewBox="0 0 24 24" width={p.s || 18} height={p.s || 18} fill="none" stroke={p.c || 'currentColor'} strokeWidth={p.w || 2.4} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5"/>
    </svg>
  ),
  building: (p = {}) => (
    <svg viewBox="0 0 24 24" width={p.s || 16} height={p.s || 16} fill="none" stroke={p.c || 'currentColor'} strokeWidth={p.w || 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21h18M5 21V7l7-4 7 4v14M9 9v.01M9 13v.01M9 17v.01M15 9v.01M15 13v.01M15 17v.01"/>
    </svg>
  ),
  mail: (p = {}) => (
    <svg viewBox="0 0 24 24" width={p.s || 16} height={p.s || 16} fill="none" stroke={p.c || 'currentColor'} strokeWidth={p.w || 1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 6-10 7L2 6"/>
    </svg>
  ),
  money: (p = {}) => (
    <svg viewBox="0 0 24 24" width={p.s || 16} height={p.s || 16} fill="none" stroke={p.c || 'currentColor'} strokeWidth={p.w || 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 1 0 0 7h5a3.5 3.5 0 1 1 0 7H6"/>
    </svg>
  ),
  calendar: (p = {}) => (
    <svg viewBox="0 0 24 24" width={p.s || 16} height={p.s || 16} fill="none" stroke={p.c || 'currentColor'} strokeWidth={p.w || 1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
    </svg>
  ),
  arrow: (p = {}) => (
    <svg viewBox="0 0 24 24" width={p.s || 16} height={p.s || 16} fill="none" stroke={p.c || 'currentColor'} strokeWidth={p.w || 2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M13 6l6 6-6 6"/>
    </svg>
  ),
};

// ─────────────────────────────────────────────────────────────
// TopBar (48px, per spec)
// ─────────────────────────────────────────────────────────────
function TopBar({ title, leading, trailing, onBack, large }) {
  if (large) {
    return (
      <div style={{ padding: '12px 16px 8px', background: 'var(--color-bg-base)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: 32 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600, color: 'var(--color-primary-dark)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            {leading}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>{trailing}</div>
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 700, lineHeight: 1.15, marginTop: 4, color: 'var(--color-text-primary)', textWrap: 'balance' }}>{title}</h1>
      </div>
    );
  }
  return (
    <div style={{
      height: 48, display: 'flex', alignItems: 'center', padding: '0 8px 0 4px',
      background: 'var(--color-bg-base)', gap: 4,
    }}>
      {onBack ? (
        <button onClick={onBack} style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10 }}>
          <Icon.back />
        </button>
      ) : (
        <div style={{ width: 8 }} />
      )}
      <div style={{ flex: 1, fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, color: 'var(--color-text-primary)' }}>
        {title}
      </div>
      <div style={{ display: 'flex', gap: 2 }}>{trailing}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// BottomNav (56px, 5 tabs, center is big mic)
// ─────────────────────────────────────────────────────────────
function BottomNav({ active, onNav, onMic }) {
  const tabs = [
    { id: 'home', label: '今日', icon: Icon.home },
    { id: 'contacts', label: '客戶', icon: Icon.contacts },
    { id: 'mic', label: '', icon: null },
    { id: 'pipeline', label: '商機', icon: Icon.pipeline },
    { id: 'tasks', label: '待辦', icon: Icon.tasks },
  ];
  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0, height: 56,
      background: 'var(--color-bg-card)',
      borderTop: '1px solid var(--color-outline)',
      display: 'flex', alignItems: 'stretch', zIndex: 5,
    }}>
      {tabs.map((t, i) => {
        if (t.id === 'mic') {
          return (
            <div key="mic" style={{ flex: 1, position: 'relative', display: 'flex', justifyContent: 'center' }}>
              <button onClick={onMic} aria-label="語音快速紀錄" style={{
                position: 'absolute', top: -22, width: 60, height: 60, borderRadius: 30,
                background: 'var(--color-ai-gradient)',
                boxShadow: '0 6px 20px rgba(6,199,85,0.4), 0 2px 6px rgba(10,132,255,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff',
              }}>
                <Icon.mic s={28} w={2.2} />
              </button>
            </div>
          );
        }
        const isActive = active === t.id;
        return (
          <button key={t.id} onClick={() => onNav?.(t.id)} style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
            color: isActive ? 'var(--color-primary-dark)' : 'var(--color-text-secondary)',
          }}>
            <t.icon s={22} w={isActive ? 2 : 1.8} />
            <div style={{ fontSize: 10, fontWeight: isActive ? 600 : 500 }}>{t.label}</div>
          </button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// AIField — A field with an AI-generated value.
// ─────────────────────────────────────────────────────────────
function AIField({ label, value, confidence, icon, children }) {
  return (
    <div style={{ position: 'relative', padding: '10px 12px 10px 16px', borderRadius: 10, background: 'var(--color-ai-surface)' }}>
      <div className="ai-ribbon" />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
        {icon}
        <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-text-tertiary)', letterSpacing: '0.02em' }}>
          {label}
        </div>
        <AIBadge sm />
        {confidence && (
          <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)', marginLeft: 'auto' }}>
            {confidence}% 信心
          </span>
        )}
      </div>
      <div style={{ fontSize: 15, color: 'var(--color-text-primary)', fontWeight: 500 }}>
        {children || value}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// AIBadge — Small AI indicator chip.
// ─────────────────────────────────────────────────────────────
function AIBadge({ sm, label = 'AI' }) {
  if (sm) {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 2,
        height: 16, padding: '0 6px', borderRadius: 8,
        background: 'var(--color-ai-gradient)', color: '#fff',
        fontSize: 9, fontWeight: 700, letterSpacing: '0.04em',
      }}>
        <Icon.sparkle s={9} c="#fff" />{label}
      </span>
    );
  }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      height: 20, padding: '0 8px', borderRadius: 10,
      background: 'var(--color-ai-gradient)', color: '#fff',
      fontSize: 11, fontWeight: 600,
    }}>
      <Icon.sparkle s={11} c="#fff" />{label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// Avatar — Initial-based avatar with tint.
// ─────────────────────────────────────────────────────────────
function Avatar({ name, size = 40, color }) {
  const colors = ['#06C755', '#0A84FF', '#FF9500', '#AF52DE', '#FF3B30', '#5AC8FA', '#34C759'];
  const hash = (name || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const bg = color || colors[hash % colors.length];
  const initial = (name || '?').slice(0, 1);
  return (
    <div style={{
      width: size, height: size, borderRadius: size / 2,
      background: bg + '22', color: bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--font-display)', fontSize: size * 0.42, fontWeight: 700,
      flexShrink: 0,
    }}>
      {initial}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Dot — small colored status dot
// ─────────────────────────────────────────────────────────────
function Dot({ color = 'var(--color-primary)', size = 6 }) {
  return <span style={{ width: size, height: size, borderRadius: size / 2, background: color, display: 'inline-block' }} />;
}

Object.assign(window, { Icon, TopBar, BottomNav, AIField, AIBadge, Avatar, Dot });
