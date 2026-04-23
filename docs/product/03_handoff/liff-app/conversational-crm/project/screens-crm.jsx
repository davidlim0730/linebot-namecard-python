// screens-crm.jsx — Todo list + CRM view + Team settings + AI screens

// ─── 待辦清單 ────────────────────────────────────────────────
function TodoScreen() {
  const todos = [
    { id: 't1', text: '寄送 3nm 白皮書與報價', person: '王建華 · 台積電', due: 'overdue', date: '04/20 過期' },
    { id: 't2', text: '回覆產品型錄需求',      person: '助理小李 · 台積電', due: 'today',   date: '今日 17:00' },
    { id: 't3', text: '安排線上 demo 會議',    person: '陳怡君 · 華碩',    due: 'today',   date: '今日' },
    { id: 't4', text: '確認 PO 金額',          person: '黃淑芬 · 統一超商', due: 'future',  date: '04/24' },
    { id: 't5', text: '發送季度報告',          person: '林俊傑 · 富邦',    due: 'future',  date: '04/25' },
    { id: 't6', text: '整理展場聯絡人名單',    person: '內部任務',         due: 'future',  date: '04/28' },
  ];
  return (
    <div className="liff">
      <LiffTopBar left={I.close(20)} title="待辦事項" right={I.filter(20)}/>
      <div className="liff-scroll" style={{ position: 'absolute', inset: 0, paddingTop: 48, paddingBottom: 56 + 12 }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, padding: '10px 16px 4px', overflowX: 'auto' }}>
          {['今日到期','本週','全部','已完成'].map((t, i) => (
            <Chip key={t} active={i === 0}>{t}{i === 0 && <span className="num" style={{ marginLeft: 4, opacity: 0.9 }}>3</span>}</Chip>
          ))}
        </div>
        {/* Summary strip */}
        <div style={{
          margin: '10px 16px 10px', padding: '12px 14px', borderRadius: 14,
          background: 'var(--c-primary-softer)',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div className="display" style={{ fontSize: 28, fontWeight: 800, color: 'var(--c-primary-deep)' }}>3</div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--c-primary-deep)', fontWeight: 700 }}>今日到期</div>
            <div style={{ fontSize: 11, color: 'var(--c-text-sub)', marginTop: 2 }}>
              其中 <b style={{ color: 'var(--c-danger)' }}>1 項已過期</b>，盡快處理
            </div>
          </div>
          <div style={{ flex: 1 }}/>
          <div style={{
            width: 40, height: 40, borderRadius: 10, background: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--c-primary-deep)',
          }}>{I.sparkle(18, 'var(--c-primary)')}</div>
        </div>

        <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {todos.map(t => <TodoRow key={t.id} t={t}/>)}
        </div>

        {/* Empty completed preview tile */}
        <div style={{
          margin: '16px 16px 0', padding: '14px', borderRadius: 14,
          border: '1.5px dashed var(--c-outline)', textAlign: 'center',
          color: 'var(--c-text-sub)', fontSize: 12,
        }}>
          已完成 <b className="num" style={{ color: 'var(--c-text)' }}>14</b> 項 · 點擊查看
        </div>
      </div>
      <LiffBottomNav active="crm"/>
    </div>
  );
}
function TodoRow({ t }) {
  const dueColor = t.due === 'overdue' || t.due === 'today' ? 'var(--c-danger)' : 'var(--c-text-sub)';
  return (
    <div style={{
      minHeight: 64, background: '#fff', borderRadius: 12, padding: '12px 14px',
      display: 'flex', gap: 12, alignItems: 'center',
      boxShadow: 'var(--sh-card)',
      borderLeft: t.due === 'overdue' ? '3px solid var(--c-danger)' : '3px solid transparent',
    }}>
      <div style={{
        width: 22, height: 22, borderRadius: 99, border: '2px solid var(--c-outline)',
        flexShrink: 0,
      }}/>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--c-text)', lineHeight: 1.3 }}>{t.text}</div>
        <div style={{ fontSize: 11, color: 'var(--c-text-sub)', marginTop: 3 }}>{t.person}</div>
      </div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 4,
        fontSize: 11, fontWeight: 700, color: dueColor,
        whiteSpace: 'nowrap',
      }}>
        {t.due === 'overdue' && I.alert(13, dueColor)}
        {t.due === 'today' && I.calendar(13, dueColor)}
        {t.due === 'future' && I.calendar(13, 'var(--c-text-mute)')}
        <span className="num">{t.date}</span>
      </div>
    </div>
  );
}

// ─── CRM Contact View ──────────────────────────────────────
function CRMContactScreen() {
  return (
    <div className="liff">
      <LiffTopBar left={I.back(20)} title="王建華 · Kenneth" right={I.close(20)}/>
      <div className="liff-scroll" style={{ position: 'absolute', inset: 0, paddingTop: 48, paddingBottom: 56 + 12 }}>
        {/* Identity strip */}
        <div style={{ padding: '10px 16px 0' }}>
          <div style={{
            background: '#fff', borderRadius: 14, padding: '12px 14px',
            display: 'flex', gap: 12, alignItems: 'center',
            boxShadow: 'var(--sh-card)',
          }}>
            <Avatar name="王" size={44}/>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <div className="display" style={{ fontSize: 17, fontWeight: 700 }}>王建華</div>
                <div style={{ fontSize: 12, color: 'var(--c-text-mute)', fontWeight: 500 }}>Kenneth Wang</div>
              </div>
              <div style={{ fontSize: 11, color: 'var(--c-text-sub)' }}>台灣積體電路 · 資深採購經理</div>
            </div>
            <div style={{
              padding: '4px 10px', borderRadius: 99, background: 'var(--c-primary-softer)',
              fontSize: 10, fontWeight: 700, color: 'var(--c-primary-deep)',
              border: '1px solid rgba(31,139,92,0.2)',
            }}>已聯絡 3 次</div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex', padding: '10px 16px 4px', gap: 4,
        }}>
          {[
            { label: '案件', n: 2, active: true },
            { label: '互動記錄', n: 5 },
            { label: '待辦', n: 3 },
          ].map((t, i) => (
            <div key={t.label} style={{
              flex: 1, height: 36, borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
              fontSize: 12, fontWeight: 700,
              background: t.active ? 'var(--c-primary-deep)' : 'transparent',
              color: t.active ? '#fff' : 'var(--c-text-sub)',
            }}>
              {t.label}<span className="num" style={{ opacity: 0.8 }}>{t.n}</span>
            </div>
          ))}
        </div>

        {/* Deals */}
        <div style={{ padding: '8px 16px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <DealCard
            company="TSMC 3nm 散熱方案" stage="需求確認" stageIdx={2}
            amount="$2,400,000" summary="客戶要求 4/28 前提供正式報價與白皮書" next="2026-04-28"
          />
          <DealCard
            company="TSMC 5nm 擴廠案" stage="議價中" stageIdx={4}
            amount="$8,750,000" summary="PM 對交期有疑慮，需法務審閱 SLA 條款" next="2026-05-03"
          />
        </div>

        {/* Interaction timeline header */}
        <div style={{ padding: '18px 16px 6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-text-sub)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            最近互動
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-primary-deep)' }}>查看全部</div>
        </div>

        <div style={{ padding: '0 16px 0' }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: '14px 14px 4px', boxShadow: 'var(--sh-card)' }}>
            <TimelineItem
              date="2026-04-18" sent="pos" title="展場初次接觸"
              summary={[
                'AI 摘要：客戶對 3nm 節點散熱方案表示高度興趣，特別關注導熱係數。',
                '下一步行動：於本週內寄送白皮書並安排 demo。',
              ]}
            />
            <TimelineItem
              date="2026-04-10" sent="neu" title="電話確認需求"
              summary={[
                'AI 摘要：客戶正在比較三家供應商，預算敏感度中等，交期比價格更關鍵。',
              ]}
            />
            <TimelineItem
              date="2026-03-28" sent="pos" title="Email 交換產品規格"
              last
              summary={[ 'AI 摘要：確認需符合 JEDEC MO-220 規範，樣品數量 50 pcs。' ]}
            />
          </div>
        </div>
      </div>
      <LiffBottomNav active="crm"/>
    </div>
  );
}

function DealCard({ company, stage, stageIdx, amount, summary, next }) {
  const stageStyles = [
    { bg: 'var(--c-primary-softer)', c: 'var(--c-primary-deep)' }, // 0-2
    { bg: 'var(--c-warning-soft)',  c: 'var(--c-warning)' },       // 3-5
    { bg: 'var(--c-info-soft)',     c: 'var(--c-info)' },          // 6
  ];
  const s = stageIdx <= 2 ? stageStyles[0] : stageIdx <= 5 ? stageStyles[1] : stageStyles[2];
  return (
    <div style={{ background: '#fff', borderRadius: 14, padding: 14, boxShadow: 'var(--sh-card)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--c-text)', flex: 1, lineHeight: 1.3 }}>{company}</div>
        <div style={{
          padding: '3px 9px', borderRadius: 99,
          background: s.bg, color: s.c, fontSize: 11, fontWeight: 700,
          border: '1px solid rgba(0,0,0,0.04)', whiteSpace: 'nowrap',
        }}>{stage}</div>
      </div>
      <div className="num" style={{ fontSize: 20, fontWeight: 800, color: 'var(--c-text)', marginTop: 6, letterSpacing: '-0.02em' }}>{amount}</div>
      <div style={{ fontSize: 12, color: 'var(--c-text-sub)', marginTop: 8, lineHeight: 1.5 }}>{summary}</div>
      <div style={{
        marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--c-hairline)',
        display: 'flex', alignItems: 'center', gap: 6,
        fontSize: 11, color: 'var(--c-text-sub)',
      }}>
        {I.calendar(12, 'var(--c-text-sub)')}
        <span>下次行動</span>
        <span className="num" style={{ color: 'var(--c-text)', fontWeight: 700 }}>{next}</span>
      </div>
    </div>
  );
}

function TimelineItem({ date, sent, title, summary, last }) {
  const sentColors = { pos: 'var(--c-primary)', neu: 'var(--c-warning)', neg: 'var(--c-danger)' };
  const sentLabel = { pos: 'Positive', neu: 'Neutral', neg: 'Negative' };
  return (
    <div style={{ display: 'flex', gap: 10, paddingBottom: last ? 12 : 16 }}>
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 4,
      }}>
        <div style={{ width: 10, height: 10, borderRadius: 99, background: sentColors[sent], flexShrink: 0 }}/>
        {!last && <div style={{ width: 2, flex: 1, background: 'var(--c-hairline)', marginTop: 4 }}/>}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span className="num" style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-text-sub)' }}>{date}</span>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 99,
            background: 'var(--c-bg-section)', color: sentColors[sent],
          }}>{sentLabel[sent]}</span>
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--c-text)', marginTop: 4 }}>{title}</div>
        <div className="ai-border-left" style={{
          marginTop: 8, background: 'var(--c-ai-soft)', borderRadius: 8,
          padding: '8px 10px 8px 14px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, color: 'var(--c-ai)', marginBottom: 4 }}>
            {I.sparkle(10, 'var(--c-ai)')} AI 整理
          </div>
          {summary.map((s, i) => (
            <div key={i} style={{ fontSize: 12.5, color: 'var(--c-text)', lineHeight: 1.5, marginTop: i > 0 ? 4 : 0 }}>
              · {s.replace(/^AI 摘要：/, '').replace(/^下一步行動：/, '')}
            </div>
          ))}
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-primary-deep)', marginTop: 6 }}>展開原文 ↓</div>
        </div>
      </div>
    </div>
  );
}

// ─── 團隊管理 ────────────────────────────────────────────────
function TeamScreen({ role = 'admin' }) {
  return (
    <div className="liff">
      <LiffTopBar left={I.close(20)} title="名片管理員"/>
      <div className="liff-scroll" style={{ position: 'absolute', inset: 0, paddingTop: 48, paddingBottom: 56 + 12 }}>
        {/* Team name block */}
        <div style={{
          margin: '10px 16px 0', padding: '14px 16px', borderRadius: 14,
          background: 'var(--c-bg-section)',
        }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--c-text-mute)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>工作室</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <div className="display" style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>
              晨光業務團隊
            </div>
            {role === 'admin' && (
              <div style={{ color: 'var(--c-text-sub)' }}>{I.edit(16, 'var(--c-text-sub)')}</div>
            )}
          </div>
          <div style={{ fontSize: 11, color: 'var(--c-text-sub)', marginTop: 4 }}>
            建立於 2024-11-03 · 共 <b className="num" style={{ color: 'var(--c-text)' }}>6</b> 位成員
          </div>
        </div>

        {/* Invite card (admin) */}
        {role === 'admin' && (
          <div style={{ padding: '12px 16px 0' }}>
            <div style={{
              background: '#fff', borderRadius: 14, padding: 14, boxShadow: 'var(--sh-card)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{
                  padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 700,
                  background: 'var(--c-primary-softer)', color: 'var(--c-primary-deep)',
                  border: '1px solid rgba(31,139,92,0.2)',
                }}>● 啟用中</div>
                <div style={{ fontSize: 11, color: 'var(--c-text-sub)' }}>剩餘 7 天</div>
              </div>
              <div style={{
                marginTop: 10, padding: '10px 12px', borderRadius: 10,
                background: 'var(--c-bg-section)',
                fontFamily: 'var(--f-mono)', fontSize: 12, color: 'var(--c-text)',
                wordBreak: 'break-all',
              }}>
                https://crm.app/j/aK7x9
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <div style={{
                  flex: 1, height: 44, borderRadius: 10,
                  background: 'var(--c-bg-section)', color: 'var(--c-text)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  fontSize: 13, fontWeight: 600,
                }}>{I.copy(16)} 複製連結</div>
                <div style={{
                  flex: 1.5, height: 44, borderRadius: 10,
                  background: 'linear-gradient(180deg, #1F8B5C 0%, #0E5E3A 100%)', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  fontSize: 13, fontWeight: 700,
                }}>{I.chat(16, '#fff')} 邀請給成員</div>
              </div>
            </div>
          </div>
        )}

        {/* Members */}
        <div style={{ padding: '18px 16px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 4px 8px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-text-sub)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              成員 <span className="num">(6)</span>
            </div>
          </div>
          <div style={{ background: '#fff', borderRadius: 14, boxShadow: 'var(--sh-card)', overflow: 'hidden' }}>
            {[
              { n: '張志強', r: 'admin' },
              { n: '李美玲', r: 'admin' },
              { n: '王冠傑', r: 'member' },
              { n: '陳柏宏', r: 'member' },
              { n: '林雅芬', r: 'member' },
            ].map((m, i, arr) => (
              <div key={m.n} style={{
                minHeight: 56, padding: '0 14px', display: 'flex', alignItems: 'center', gap: 10,
                borderBottom: i < arr.length - 1 ? '1px solid rgba(26,27,24,0.05)' : 0,
              }}>
                <Avatar name={m.n} size={32}/>
                <div style={{ flex: 1, fontSize: 14, color: 'var(--c-text)', fontWeight: 500 }}>{m.n}</div>
                <div style={{
                  padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 700,
                  background: m.r === 'admin' ? 'var(--c-primary-soft)' : 'var(--c-bg-section)',
                  color: m.r === 'admin' ? 'var(--c-primary-deep)' : 'var(--c-text-sub)',
                }}>{m.r === 'admin' ? '管理員' : '成員'}</div>
                {role === 'admin' && m.r !== 'admin' && (
                  <div style={{ color: 'var(--c-text-mute)', padding: '0 4px' }}>{I.trash(16)}</div>
                )}
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center', padding: '14px 0 4px', fontSize: 12, fontWeight: 600, color: 'var(--c-primary-deep)' }}>
            顯示全部 6 位成員 ↓
          </div>
        </div>
      </div>
      <LiffBottomNav active="settings"/>
    </div>
  );
}

// ─── AI wait screen ─────────────────────────────────────────
function AIWaitScreen({ stepIdx = 1 }) {
  const steps = [
    '正在萃取資訊…',
    'AI 正在整理資訊…',
    'AI 正在輸入資料庫…',
    '即將完成…',
  ];
  const pct = [18, 42, 72, 92][stepIdx];
  return (
    <div className="liff" style={{
      background: 'linear-gradient(180deg, #FAFAF7 0%, #E6F4EC 60%, #F1FAF4 100%)',
    }}>
      <LiffTopBar left={I.close(20)} title="名片辨識中" glass={false}/>
      <div style={{
        position: 'absolute', inset: 0, paddingTop: 48, paddingBottom: 56,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        {/* Ripple logo */}
        <div style={{ position: 'relative', width: 160, height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              position: 'absolute', width: 160, height: 160, borderRadius: '50%',
              border: '1.5px solid var(--c-primary)',
              opacity: [0.35, 0.22, 0.1][i],
              transform: `scale(${[0.5, 0.75, 1][i]})`,
            }}/>
          ))}
          <div style={{
            width: 72, height: 72, borderRadius: 20,
            background: 'linear-gradient(135deg, #1F8B5C 0%, #2B6CD6 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 12px 30px rgba(31,139,92,0.35)',
            color: '#fff',
          }}>{I.sparkle(30, '#fff')}</div>
        </div>

        <div className="display" style={{ fontSize: 20, fontWeight: 700, marginTop: 32, color: 'var(--c-text)', textAlign: 'center' }}>
          {steps[stepIdx]}
        </div>
        <div style={{ fontSize: 12, color: 'var(--c-text-sub)', marginTop: 8 }}>
          通常需要 5–10 秒
        </div>

        {/* Progress */}
        <div style={{ width: 260, marginTop: 28 }}>
          <div style={{
            height: 6, borderRadius: 99, background: 'rgba(31,139,92,0.15)', overflow: 'hidden',
          }}>
            <div style={{
              width: pct + '%', height: '100%',
              background: 'linear-gradient(90deg, #1F8B5C, #2B6CD6)',
              borderRadius: 99,
              transition: 'width 300ms',
            }}/>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 10, color: 'var(--c-text-mute)' }}>
            {steps.map((_, i) => (
              <div key={i} style={{
                width: 6, height: 6, borderRadius: 99,
                background: i <= stepIdx ? 'var(--c-primary)' : 'rgba(26,27,24,0.15)',
              }}/>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── AI 確認卡 ────────────────────────────────────────────
function AIConfirmScreen() {
  return (
    <div className="liff">
      <LiffTopBar left={I.close(20)} title="AI 整理結果"/>
      <div className="liff-scroll" style={{ position: 'absolute', inset: 0, paddingTop: 48, paddingBottom: 16 }}>
        <div style={{ padding: '12px 16px 0' }}>
          <div style={{ fontSize: 12, color: 'var(--c-text-sub)', display: 'flex', alignItems: 'center', gap: 6 }}>
            {I.sparkle(13, 'var(--c-ai)')}
            <span>根據你 35 秒的語音紀錄整理</span>
          </div>
        </div>

        {/* Main AI card */}
        <div style={{ padding: '10px 16px 0' }}>
          <div className="ai-border-top" style={{
            background: '#fff', borderRadius: 16, overflow: 'hidden',
            boxShadow: 'var(--sh-card)', paddingTop: 3,
          }}>
            <div style={{ padding: '14px 16px 8px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--c-ai)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                AI 已整理以下資訊
              </div>
              <div className="display" style={{ fontSize: 17, fontWeight: 700, marginTop: 2 }}>
                請確認或編輯
              </div>
            </div>

            {/* Case update */}
            <AISection title="案件更新" n={1}>
              <div style={{
                padding: '10px 12px', background: 'var(--c-ai-soft)', borderRadius: 10,
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>TSMC 3nm 散熱方案</div>
                  <div style={{ fontSize: 11, color: 'var(--c-text-sub)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>初步接觸</span>
                    <span>→</span>
                    <b style={{ color: 'var(--c-primary-deep)' }}>需求確認</b>
                  </div>
                </div>
                <div style={{ color: 'var(--c-text-mute)' }}>{I.edit(16)}</div>
              </div>
            </AISection>

            <AISection title="新聯絡人" n={2}>
              {[
                { n: '王總', m: '從展場名片解析', tag: '新' },
                { n: '助理小李', m: '談話中提到', tag: '新' },
              ].map(p => (
                <div key={p.n} style={{
                  padding: '10px 12px', background: 'var(--c-ai-soft)', borderRadius: 10,
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <Avatar name={p.n} size={32}/>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{p.n}</div>
                    <div style={{ fontSize: 11, color: 'var(--c-text-sub)' }}>{p.m}</div>
                  </div>
                  <div style={{
                    fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 99,
                    background: '#fff', color: 'var(--c-ai)', border: '1px solid rgba(43,108,214,0.2)',
                  }}>{p.tag}</div>
                </div>
              ))}
            </AISection>

            <AISection title="下一步行動" n={2} last>
              {[
                { d: '04/28', t: '寄送 3nm 白皮書與報價給王總' },
                { d: '04/30', t: '寄產品型錄給助理小李' },
              ].map((a, i) => (
                <div key={i} style={{
                  padding: '10px 12px', background: 'var(--c-ai-soft)', borderRadius: 10,
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: 6, border: '2px solid var(--c-outline)',
                    background: '#fff', flexShrink: 0,
                  }}/>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-text)' }}>{a.t}</div>
                  </div>
                  <div className="num" style={{
                    fontSize: 11, fontWeight: 700, color: 'var(--c-primary-deep)',
                    background: 'var(--c-primary-softer)', padding: '2px 8px', borderRadius: 99,
                  }}>{a.d}</div>
                </div>
              ))}
            </AISection>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ padding: '16px 16px 0', display: 'flex', gap: 10 }}>
          <div style={{
            flex: 1, height: 52, borderRadius: 12,
            border: '1.5px solid var(--c-outline)', background: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            fontSize: 14, fontWeight: 700, color: 'var(--c-text)',
          }}>{I.edit(16)} 編輯</div>
          <div style={{ flex: 1.6 }}>
            <PrimaryButton icon={I.check(16, '#fff')}>確認無誤</PrimaryButton>
          </div>
        </div>
        <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--c-text-mute)', padding: '12px 0' }}>
          AI 有時會出錯 · 確認後將自動歸檔
        </div>
      </div>
    </div>
  );
}

function AISection({ title, n, children, last }) {
  return (
    <div style={{
      padding: '10px 16px 14px',
      borderBottom: last ? 0 : '1px solid var(--c-hairline)',
    }}>
      <div style={{
        fontSize: 10.5, fontWeight: 700, color: 'var(--c-text-sub)',
        textTransform: 'uppercase', letterSpacing: '0.08em', paddingBottom: 8,
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <span>{title}</span>
        <span className="num" style={{
          padding: '1px 6px', borderRadius: 99, background: 'var(--c-bg-section)',
          fontSize: 10, color: 'var(--c-text-sub)',
        }}>{n}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{children}</div>
    </div>
  );
}

Object.assign(window, { TodoScreen, CRMContactScreen, TeamScreen, AIWaitScreen, AIConfirmScreen });
