// app/screens-a.jsx — Screens 1-3: Home (Agent Inbox), Voice Capture, AI Confirm

// ═══════════════════════════════════════════════════════════════
// SCREEN 1: HOME — "Agent Inbox"
// Instead of dashboard stats, show "what AI did for you" + priority actions.
// ═══════════════════════════════════════════════════════════════
function HomeScreen({ onOpenContact, onOpenMic, onNav }) {
  const [filter, setFilter] = React.useState('all');

  return (
    <div data-screen-label="01 Home (Agent Inbox)" style={{
      position: 'absolute', inset: 0, background: 'var(--color-bg-base)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Status/nav strip */}
      <div style={{ padding: '10px 16px 6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10, background: 'var(--color-ai-gradient)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
          }}>
            <Icon.sparkle s={16} c="#fff" />
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', fontWeight: 500 }}>早安，Allen</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>4 月 22 日 · 週三</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-secondary)' }}>
            <Icon.search />
          </button>
        </div>
      </div>

      <div className="liff-scroll" style={{ flex: 1, overflow: 'auto', paddingBottom: 80 }}>
        {/* AI Greeting Card */}
        <div style={{ padding: '4px 16px 12px' }}>
          <div style={{
            borderRadius: 16, padding: 16,
            background: 'linear-gradient(135deg, #06C755 0%, #0A84FF 100%)',
            color: '#fff', position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', right: -30, top: -30, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <Icon.sparkle s={14} c="#fff" />
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', opacity: 0.9 }}>AI 早晨摘要</div>
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 700, lineHeight: 1.3, position: 'relative', textWrap: 'balance' }}>
              今天 3 位客戶需要你 ，另有 2 個新機會值得看看。
            </div>
            <div style={{ display: 'flex', gap: 14, marginTop: 14, position: 'relative' }}>
              <div><div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-display)' }}>3</div><div style={{ fontSize: 10, opacity: 0.85 }}>待回覆</div></div>
              <div style={{ width: 1, background: 'rgba(255,255,255,0.25)' }} />
              <div><div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-display)' }}>4</div><div style={{ fontSize: 10, opacity: 0.85 }}>今日會議</div></div>
              <div style={{ width: 1, background: 'rgba(255,255,255,0.25)' }} />
              <div><div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-display)' }}>$3.6M</div><div style={{ fontSize: 10, opacity: 0.85 }}>管道總值</div></div>
            </div>
          </div>
        </div>

        {/* Filter pills */}
        <div style={{ padding: '0 16px 10px', display: 'flex', gap: 6, overflowX: 'auto' }} className="liff-scroll">
          {[
            { id: 'all', label: '全部' },
            { id: 'ai', label: 'AI 處理' },
            { id: 'urgent', label: '需要我' },
            { id: 'insight', label: '洞察' },
          ].map(p => (
            <button key={p.id} onClick={() => setFilter(p.id)} className={`liff-chip ${filter === p.id ? 'liff-chip-active' : ''}`} style={{ flexShrink: 0 }}>
              {p.label}
            </button>
          ))}
        </div>

        {/* Inbox items */}
        <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {INBOX_ITEMS.map(item => <InboxCard key={item.id} item={item} onOpenContact={onOpenContact} />)}
        </div>

        {/* Quick actions */}
        <div style={{ padding: '18px 16px 8px' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon.waveform s={14} /> 語音快速操作
          </div>
          <div className="liff-card" style={{ padding: 4 }}>
            {[
              { label: '紀錄剛才拜訪...', hint: '"下午拜訪了昇陽，陳經理..."' },
              { label: '提醒我明天...', hint: '"明天 10 點打給林建宏"' },
              { label: '這是誰的名片？', hint: '拍照，AI 建檔', camera: true },
            ].map((a, i) => (
              <button key={i} onClick={onOpenMic} style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px',
                borderRadius: 10, textAlign: 'left',
                background: i === 0 ? 'var(--color-ai-surface)' : 'transparent',
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  background: i === 0 ? 'var(--color-ai-gradient)' : 'var(--color-bg-section)',
                  color: i === 0 ? '#fff' : 'var(--color-primary-dark)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {a.camera ? <Icon.camera s={18} /> : <Icon.mic s={18} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>{a.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.hint}</div>
                </div>
                <Icon.chevRight c="var(--color-text-tertiary)" />
              </button>
            ))}
          </div>
        </div>
      </div>

      <BottomNav active="home" onNav={onNav} onMic={onOpenMic} />
    </div>
  );
}

function InboxCard({ item, onOpenContact }) {
  const kindMeta = {
    summary:     { color: '#C0000A', icon: Icon.clock, label: '待辦' },
    'auto-filed':{ color: '#06C755', icon: Icon.check, label: 'AI 已處理' },
    insight:     { color: '#0A84FF', icon: Icon.sparkle, label: 'AI 洞察' },
    reminder:    { color: '#F59E0B', icon: Icon.calendar, label: '提醒' },
  }[item.kind];

  return (
    <div className="liff-card" style={{ padding: 12, position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 10, flexShrink: 0,
          background: kindMeta.color + '15', color: kindMeta.color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <kindMeta.icon s={16} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: kindMeta.color, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              {kindMeta.label}
            </span>
            <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>· {item.time}</span>
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)', lineHeight: 1.3 }}>
            {item.title}
          </div>
          <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 4, lineHeight: 1.45 }}>
            {item.body}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
            <button onClick={() => item.contact && onOpenContact?.()} style={{
              height: 32, padding: '0 12px', borderRadius: 8,
              background: item.kind === 'summary' ? 'var(--color-primary)' : 'var(--color-bg-section)',
              color: item.kind === 'summary' ? '#fff' : 'var(--color-text-primary)',
              fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4,
            }}>
              {item.action}
              <Icon.arrow s={12} />
            </button>
            {item.kind !== 'summary' && (
              <button style={{ fontSize: 12, color: 'var(--color-text-tertiary)', padding: '0 4px' }}>忽略</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SCREEN 2: VOICE CAPTURE (listening state)
// ═══════════════════════════════════════════════════════════════
function VoiceScreen({ onCancel, onDone }) {
  const [transcript, setTranscript] = React.useState('');
  const [elapsed, setElapsed] = React.useState(0);

  // Simulate real-time transcription
  React.useEffect(() => {
    const full = '下午三點拜訪了昇陽科技的陳雅婷經理，她對企業版雲端方案很有興趣，提到希望 5/10 前能拿到合規白皮書，而且競品正在評估 Salesforce。我答應週五前寄出資料並電話確認。預算約八十萬，Q2 目標要簽約。';
    let i = 0;
    const t = setInterval(() => {
      i += 3;
      setTranscript(full.slice(0, i));
      if (i >= full.length) clearInterval(t);
    }, 80);
    const e = setInterval(() => setElapsed(x => x + 1), 1000);
    return () => { clearInterval(t); clearInterval(e); };
  }, []);

  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');

  return (
    <div data-screen-label="02 Voice Capture" style={{
      position: 'absolute', inset: 0, background: '#0A0E14', color: '#fff',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Top */}
      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={onCancel} style={{ width: 40, height: 40, borderRadius: 20, background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
          <Icon.close />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(192,0,10,0.2)', padding: '6px 12px', borderRadius: 20 }}>
          <Dot color="#FF3B30" size={8} />
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
            {mm}:{ss}
          </span>
        </div>
        <div style={{ width: 40 }} />
      </div>

      {/* Label */}
      <div style={{ textAlign: 'center', padding: '8px 24px' }}>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>
          正在聆聽 · 語音紀錄
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, marginTop: 6 }}>
          請自然描述剛才發生的事
        </div>
      </div>

      {/* Transcript */}
      <div className="liff-scroll" style={{
        flex: 1, overflow: 'auto', padding: '16px 24px',
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
      }}>
        <div style={{ fontSize: 17, lineHeight: 1.55, color: 'rgba(255,255,255,0.95)', fontWeight: 400, minHeight: 120 }}>
          {transcript}
          <span style={{
            display: 'inline-block', width: 2, height: 18, background: '#06C755',
            marginLeft: 2, verticalAlign: 'text-bottom',
            animation: 'ai-pulse 1s ease-in-out infinite',
          }} />
        </div>

        {/* Detected entities preview (shows as AI finds them) */}
        {transcript.length > 50 && (
          <div style={{ marginTop: 20, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {[
              { label: '陳雅婷', type: '聯絡人' },
              { label: '昇陽科技', type: '公司', show: transcript.length > 20 },
              { label: '5/10', type: '日期', show: transcript.length > 70 },
              { label: 'NT$800K', type: '金額', show: transcript.length > 140 },
              { label: 'Salesforce', type: '競品', show: transcript.length > 100 },
            ].filter(x => x.show !== false).map(t => (
              <div key={t.label} className="ai-shimmer" style={{
                padding: '4px 10px', borderRadius: 12,
                border: '1px solid rgba(6,199,85,0.4)',
                background: 'rgba(6,199,85,0.08)',
                fontSize: 12,
              }}>
                <span style={{ opacity: 0.55, fontSize: 10, marginRight: 4 }}>{t.type}</span>
                <span style={{ color: '#fff', fontWeight: 600 }}>{t.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Waveform */}
      <div style={{ height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, padding: '0 24px' }}>
        {Array.from({ length: 32 }).map((_, i) => {
          const h = 8 + Math.abs(Math.sin(elapsed * 2 + i * 0.5)) * 36;
          return (
            <div key={i} style={{
              width: 3, height: h, borderRadius: 2,
              background: i % 3 === 0 ? '#06C755' : i % 3 === 1 ? '#0A84FF' : 'rgba(255,255,255,0.4)',
              transition: 'height 0.15s',
            }} />
          );
        })}
      </div>

      {/* Bottom controls */}
      <div style={{ padding: '16px 24px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-around' }}>
        <button onClick={onCancel} style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, padding: '10px 16px' }}>
          取消
        </button>
        <button onClick={onDone} style={{
          width: 72, height: 72, borderRadius: 36,
          background: '#fff', color: '#06C755',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 30px rgba(6,199,85,0.4)',
        }}>
          <Icon.check s={30} />
        </button>
        <button style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, padding: '10px 16px' }}>
          暫停
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SCREEN 3: AI CONFIRM — AI parsed the voice, user confirms before filing
// ═══════════════════════════════════════════════════════════════
function ConfirmScreen({ onCancel, onFile, onNav }) {
  const [selected, setSelected] = React.useState(null);

  return (
    <div data-screen-label="03 AI Confirm & File" style={{
      position: 'absolute', inset: 0, background: 'var(--color-bg-base)',
      display: 'flex', flexDirection: 'column',
    }}>
      <TopBar title="AI 整理結果" onBack={onCancel} trailing={
        <button style={{ padding: '0 10px', height: 36, color: 'var(--color-text-tertiary)', fontSize: 13 }}>編輯全部</button>
      } />

      <div className="liff-scroll" style={{ flex: 1, overflow: 'auto', padding: '0 16px 100px' }}>
        {/* Status line */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px',
          background: 'var(--color-ai-surface)', borderRadius: 12, marginBottom: 14,
        }}>
          <div style={{ width: 28, height: 28, borderRadius: 14, background: 'var(--color-ai-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon.sparkle s={14} c="#fff" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>
              AI 從 47 秒語音 辨識出 1 位聯絡人、3 個事實、2 個待辦
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 2 }}>
              請確認內容無誤後送出
            </div>
          </div>
        </div>

        {/* Matched contact */}
        <Section title="對應聯絡人" badge="1 位匹配">
          <div style={{
            padding: 14, borderRadius: 12, background: 'var(--color-bg-card)',
            border: '2px solid var(--color-primary)',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <Avatar name="陳雅婷" size={44} />
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700 }}>陳雅婷</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>昇陽科技 · 採購經理</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--color-primary-light)', padding: '4px 8px', borderRadius: 12 }}>
              <Icon.check s={12} c="var(--color-primary-dark)" />
              <span style={{ fontSize: 11, color: 'var(--color-primary-dark)', fontWeight: 600 }}>已存在</span>
            </div>
          </div>
          <button style={{ fontSize: 12, color: 'var(--color-ai-blue)', marginTop: 8, fontWeight: 500 }}>
            更換聯絡人
          </button>
        </Section>

        {/* AI-extracted facts */}
        <Section title="AI 整理資訊" badge="3 個欄位" badgeAI>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <AIField label="會議時間" icon={<Icon.calendar s={12} c="var(--color-ai-blue)" />} confidence={98}>
              今天 15:00 · 現場拜訪
            </AIField>
            <AIField label="客戶需求" icon={<Icon.sparkle s={12} c="var(--color-ai-blue)" />} confidence={92}>
              企業版雲端方案，關注合規與導入期程
            </AIField>
            <AIField label="競品評估" icon={<Icon.building s={12} c="var(--color-ai-blue)" />} confidence={88}>
              Salesforce
            </AIField>
            <AIField label="成交金額" icon={<Icon.money s={12} c="var(--color-ai-blue)" />} confidence={95}>
              NT$ 800,000 (預算)
            </AIField>
          </div>
        </Section>

        {/* Generated tasks */}
        <Section title="自動建立的待辦" badge="2 項" badgeAI>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { task: '寄送繁中版合規白皮書', when: '今天 18:00 前', priority: 'high' },
              { task: '電話確認陳經理收到資料', when: '週五 17:00 前', priority: 'med' },
            ].map((t, i) => (
              <div key={i} onClick={() => setSelected(selected === i ? null : i)} className="liff-card" style={{
                padding: 12, cursor: 'pointer',
                borderLeft: `3px solid ${t.priority === 'high' ? '#C0000A' : '#F59E0B'}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: 5,
                    border: '2px solid var(--color-outline)',
                    background: selected === i ? 'var(--color-primary)' : 'transparent',
                    borderColor: selected === i ? 'var(--color-primary)' : 'var(--color-outline)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {selected === i && <Icon.check s={12} c="#fff" />}
                  </div>
                  <div style={{ flex: 1, fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                    {t.task}
                  </div>
                </div>
                <div style={{ marginTop: 6, marginLeft: 28, display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--color-text-tertiary)' }}>
                  <Icon.clock s={11} /> {t.when}
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Next step suggestion */}
        <Section title="AI 建議下一步" badge="" badgeAI>
          <div style={{
            padding: 14, borderRadius: 12,
            background: 'var(--color-ai-surface)',
            border: '1px dashed var(--color-ai-blue)',
          }}>
            <div style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--color-text-primary)' }}>
              這筆商機從 <b>需求評估</b> 階段可以進展到 <b style={{ color: 'var(--color-primary-dark)' }}>提案中</b>，要自動調整嗎？
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button className="liff-btn-primary" style={{ height: 36, padding: '0 14px', fontSize: 13 }}>是，推進到提案中</button>
              <button className="liff-btn-ghost" style={{ height: 36, fontSize: 13 }}>保持現狀</button>
            </div>
          </div>
        </Section>
      </div>

      {/* Sticky bottom CTA */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: '12px 16px 20px', background: 'var(--color-bg-base)',
        borderTop: '1px solid var(--color-outline)',
        display: 'flex', gap: 8,
      }}>
        <button className="liff-btn-ghost" onClick={onCancel} style={{ flex: '0 0 auto', paddingLeft: 20, paddingRight: 20 }}>
          捨棄
        </button>
        <button className="liff-btn-primary" onClick={onFile} style={{ flex: 1 }}>
          確認並歸檔
          <Icon.check s={18} c="#fff" />
        </button>
      </div>
    </div>
  );
}

function Section({ title, badge, badgeAI, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, padding: '0 4px' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          {title}
        </div>
        {badge && (
          <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
            · {badge}
          </div>
        )}
        {badgeAI && <AIBadge sm />}
      </div>
      {children}
    </div>
  );
}

Object.assign(window, { HomeScreen, VoiceScreen, ConfirmScreen });
