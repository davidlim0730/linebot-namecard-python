// screens-cards.jsx — Cards tab (list + detail + sheets)

// Sample data
const SAMPLE_CARDS = [
  { id:'c1', name:'王建華',  en:'Kenneth Wang', company:'台灣積體電路製造股份有限公司', title:'資深採購經理', tags:['VIP客戶','A級'], date:'04/19', initial:'王', tint:0 },
  { id:'c2', name:'陳怡君',  en:'Yvonne Chen',  company:'華碩電腦',       title:'行銷副理',      tags:['潛在'],        date:'04/18', initial:'陳', tint:1 },
  { id:'c3', name:'林俊傑',  en:'JJ Lin',       company:'富邦金控',       title:'理財顧問',      tags:['VIP客戶'],     date:'04/15', initial:'林', tint:2 },
  { id:'c4', name:'陳俊宏',  en:'Michael Chen', company:'Google Taiwan',  title:'Product Manager',   tags:['合作夥伴'], date:'04/14', initial:'M', tint:3 },
  { id:'c5', name:'黃淑芬',  en:'Sophia Huang', company:'統一超商',       title:'營運主管',      tags:[],             date:'04/11', initial:'黃', tint:4 },
  { id:'c6', name:'張志明',  en:'Jimmy Chang',  company:'台北榮民總醫院', title:'醫療器材採購',   tags:['A級'],         date:'04/09', initial:'張', tint:0 },
];

// ─── 名片總表 ────────────────────────────────────────────────
function CardsListScreen({ state = 'normal' }) {
  // state: normal | searching | empty-search | empty | loading
  const cards = state === 'searching' ? SAMPLE_CARDS.filter(c => c.name.includes('王') || c.company.includes('Google')) : SAMPLE_CARDS;
  return (
    <div className="liff" style={{ background: 'var(--c-bg-base)' }}>
      <LiffTopBar left={I.close(20)} title="名片總表" right={I.more(20)} />

      <div className="liff-scroll" style={{
        position: 'absolute', inset: 0, paddingTop: 48, paddingBottom: 56 + 68,
      }}>
        {/* Search bar */}
        <div style={{ padding: '8px 16px 0' }}>
          <div style={{
            height: 44, borderRadius: 12,
            background: state === 'searching' || state === 'empty-search' ? '#fff' : 'var(--c-bg-input)',
            border: state === 'searching' || state === 'empty-search' ? '2px solid var(--c-primary)' : '2px solid transparent',
            display: 'flex', alignItems: 'center', padding: '0 12px', gap: 8,
          }}>
            <div style={{ color: 'var(--c-text-sub)', opacity: 0.7 }}>{I.search(16)}</div>
            {state === 'searching' || state === 'empty-search' ? (
              <div style={{ fontSize: 14, color: 'var(--c-text)' }}>
                {state === 'empty-search' ? '周小姐' : '王'}
                <span style={{
                  display: 'inline-block', width: 1.5, height: 16, verticalAlign: -3,
                  background: 'var(--c-primary)', marginLeft: 2, animation: 'pulseDot 1s infinite',
                }}/>
              </div>
            ) : (
              <div style={{ fontSize: 14, color: 'var(--c-text-mute)' }}>搜尋姓名、公司、職稱…</div>
            )}
          </div>
        </div>

        {/* Filter tabs (horizontal) */}
        <div style={{
          display: 'flex', gap: 8, padding: '14px 16px 0', overflowX: 'auto',
          scrollbarWidth: 'none',
        }}>
          {['全部名片','最近新增','VIP客戶','A級','潛在','合作夥伴'].map((t, i) => (
            <Chip key={t} active={i === 0}>{t}</Chip>
          ))}
        </div>

        {/* Count hint */}
        <div style={{ padding: '12px 16px 6px', fontSize: 12, color: 'var(--c-text-sub)' }}>
          {state === 'searching' && <span>找到 <b className="num">{cards.length}</b> 筆</span>}
          {state === 'empty-search' && <span>找不到符合「周小姐」的名片</span>}
          {state === 'normal' && <span>共 <b className="num">{SAMPLE_CARDS.length}</b> 張名片 · 依建立日期排序</span>}
          {state === 'loading' && <span>載入中…</span>}
          {state === 'empty' && <span>&nbsp;</span>}
        </div>

        {/* Content body */}
        {state === 'loading' && (
          <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[0,1,2].map(i => (
              <div key={i} style={{
                height: 72, background: '#fff', borderRadius: 16, padding: 12,
                display: 'flex', gap: 12, alignItems: 'center',
              }}>
                <SkelBlock w={48} h={48} r={10}/>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <SkelLine w="55%" h={14}/>
                  <SkelLine w="80%" h={11}/>
                </div>
                <SkelLine w={34} h={10}/>
              </div>
            ))}
          </div>
        )}

        {state === 'empty' && (
          <div style={{ padding: '48px 24px 24px', textAlign: 'center' }}>
            <div style={{
              width: 160, height: 120, margin: '0 auto 18px',
              background: 'var(--c-bg-section)', borderRadius: 16,
              position: 'relative', overflow: 'hidden',
            }}>
              <div style={{
                position: 'absolute', left: 20, top: 30, width: 120, height: 70, borderRadius: 8,
                background: '#fff', border: '1.5px dashed rgba(31,139,92,0.3)', transform: 'rotate(-6deg)',
              }}/>
              <div style={{
                position: 'absolute', left: 30, top: 22, width: 120, height: 70, borderRadius: 8,
                background: '#fff', boxShadow: '0 4px 16px rgba(0,0,0,0.05)', transform: 'rotate(3deg)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--c-primary)',
              }}>{I.card(28, 'var(--c-primary)')}</div>
            </div>
            <div className="display" style={{ fontSize: 18, fontWeight: 700 }}>還沒有任何名片</div>
            <div style={{ fontSize: 13, color: 'var(--c-text-sub)', marginTop: 6 }}>
              拍張名片，AI 幫你建檔
            </div>
            <div style={{ padding: '24px 0 0' }}>
              <PrimaryButton icon={I.plus(18, '#fff')}>新增第一張名片</PrimaryButton>
            </div>
          </div>
        )}

        {state === 'empty-search' && (
          <div style={{ padding: '40px 24px', textAlign: 'center' }}>
            <div style={{
              width: 56, height: 56, margin: '0 auto 16px', borderRadius: 14,
              background: 'var(--c-bg-section)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--c-text-mute)',
            }}>{I.search(24)}</div>
            <div className="display" style={{ fontSize: 15, fontWeight: 700 }}>找不到符合「周小姐」的名片</div>
            <div style={{ fontSize: 12, color: 'var(--c-text-sub)', marginTop: 4 }}>試試其他關鍵字</div>
            <div style={{ marginTop: 16, fontSize: 13, fontWeight: 600, color: 'var(--c-primary-deep)' }}>
              清除搜尋
            </div>
          </div>
        )}

        {(state === 'normal' || state === 'searching') && (
          <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {cards.map(c => <CardRow key={c.id} c={c}/>)}
          </div>
        )}
      </div>

      {/* FAB */}
      <div style={{
        position: 'absolute', left: 16, right: 16, bottom: 56 + 12, zIndex: 20,
      }}>
        <PrimaryButton icon={I.plus(18, '#fff')}>新增名片</PrimaryButton>
      </div>

      <LiffBottomNav active="cards"/>
    </div>
  );
}

function CardRow({ c }) {
  return (
    <div style={{
      height: 72, background: 'var(--c-bg-card)', borderRadius: 16, padding: 12,
      display: 'flex', gap: 12, alignItems: 'center',
      boxShadow: 'var(--sh-card)',
    }}>
      <Avatar name={c.initial} size={48}/>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--c-text)', flexShrink: 0 }}>{c.name}</div>
          {c.en && <div style={{ fontSize: 11, color: 'var(--c-text-mute)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.en}</div>}
        </div>
        <div style={{
          fontSize: 12, color: 'var(--c-text-sub)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{c.company}{c.title && <> · {c.title}</>}</div>
        {c.tags.length > 0 && (
          <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
            {c.tags.map(t => <Chip key={t} variant="tag">{t}</Chip>)}
          </div>
        )}
      </div>
      <div className="num" style={{ fontSize: 11, color: 'var(--c-text-mute)' }}>{c.date}</div>
    </div>
  );
}

// ─── 名片詳情 ────────────────────────────────────────────────
function CardDetailScreen({ hasPhoto = true, memoMode = 'filled' }) {
  // memoMode: filled | empty | inline-edit
  return (
    <div className="liff">
      <LiffTopBar left={I.back(20)} title="名片詳情" right={I.close(20)}/>

      <div className="liff-scroll" style={{ position: 'absolute', inset: 0, paddingTop: 48, paddingBottom: 56 + 56 }}>
        {/* Photo preview */}
        <div style={{
          height: 160, background: 'var(--c-bg-section)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative',
        }}>
          {hasPhoto ? (
            <div style={{
              width: 250, height: 140, borderRadius: 10, background: '#fff',
              boxShadow: '0 8px 24px rgba(0,0,0,0.08)', padding: 14,
              display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
              position: 'relative', overflow: 'hidden',
            }}>
              <div style={{
                position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%',
                background: 'var(--c-primary-soft)', opacity: 0.8,
              }}/>
              <div>
                <div className="display" style={{ fontSize: 16, fontWeight: 700 }}>王建華 <span style={{ fontSize: 10, color: 'var(--c-text-sub)', fontWeight: 500 }}>Kenneth</span></div>
                <div style={{ fontSize: 10, color: 'var(--c-text-sub)', marginTop: 2 }}>資深採購經理</div>
              </div>
              <div style={{ fontSize: 9, color: 'var(--c-text-sub)', lineHeight: 1.5 }}>
                <div style={{ fontWeight: 700, color: 'var(--c-text)', fontSize: 10 }}>TSMC 台灣積體電路</div>
                <div>+886 3 563 6688 · wang@tsmc.com</div>
                <div>新竹市力行六路 8 號</div>
              </div>
            </div>
          ) : (
            <div style={{ color: 'var(--c-text-mute)', fontSize: 13 }}>尚無名片照片</div>
          )}
          <div style={{
            position: 'absolute', right: 12, bottom: 12,
            width: 32, height: 32, borderRadius: 8,
            background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--c-text-sub)',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M4 9V5a1 1 0 0 1 1-1h4M20 9V5a1 1 0 0 0-1-1h-4M4 15v4a1 1 0 0 0 1 1h4M20 15v4a1 1 0 0 1-1 1h-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          </div>
        </div>

        {/* Main info card */}
        <div style={{ padding: '12px 16px 0' }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 16, boxShadow: 'var(--sh-card)' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
              <div className="display" style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>王建華</div>
              <div style={{ fontSize: 13, color: 'var(--c-text-sub)', fontWeight: 500 }}>Kenneth Wang</div>
            </div>
            <div style={{ fontSize: 13, color: 'var(--c-text-sub)', marginTop: 4 }}>資深採購經理</div>
            <div style={{ fontSize: 13, color: 'var(--c-text-sub)' }}>台灣積體電路製造股份有限公司</div>
          </div>
        </div>

        {/* Contact list */}
        <div style={{ padding: '12px 16px 0' }}>
          <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: 'var(--sh-card)' }}>
            <ContactRow icon={I.phone(16)} label="公司電話" value="+886 3 563 6688"/>
            <ContactRow icon={I.mobile(16)} label="手機"     value="0912-345-678"/>
            <ContactRow icon={I.mail(16)}   label="Email"    value="wang.ch@tsmc.com"/>
            <ContactRow icon={I.chat(16)}   label="LINE ID"  value="@wangch" muted/>
            <ContactRow icon={I.pin(16)}    label="地址"     value="新竹市東區力行六路 8 號" addr/>
            <ContactRow icon={I.globe(16)}  label="網站"     value="tsmc.com" last/>
          </div>
        </div>

        {/* Memo */}
        <div style={{ padding: '12px 16px 0' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-text-sub)', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0 4px 6px' }}>
            備忘錄
          </div>
          <div style={{
            background: 'var(--c-bg-section)', borderRadius: 12, padding: 14,
            border: memoMode === 'inline-edit' ? '2px solid var(--c-primary)' : '2px solid transparent',
          }}>
            {memoMode === 'filled' && (
              <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--c-text)' }}>
                04/18 展場相遇。對新一代 3nm 製程很有興趣，特別關注散熱方案。下次聯絡時提供白皮書 + 報價。
              </div>
            )}
            {memoMode === 'empty' && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 13, color: 'var(--c-text-mute)' }}>尚未新增備忘錄</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-primary-deep)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  {I.plus(14, 'var(--c-primary-deep)')} 快速新增
                </div>
              </div>
            )}
            {memoMode === 'inline-edit' && (
              <>
                <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--c-text)', minHeight: 56 }}>
                  04/18 展場相遇。對新一代 3nm 製程很有興趣，
                  <span style={{
                    display: 'inline-block', width: 1.5, height: 15, verticalAlign: -3,
                    background: 'var(--c-primary)', animation: 'pulseDot 1s infinite',
                  }}/>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--c-hairline)' }}>
                  <div style={{ fontSize: 11, color: 'var(--c-text-mute)' }}>30 / 500</div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-text-sub)' }}>取消</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-primary-deep)' }}>儲存</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Tags */}
        <div style={{ padding: '14px 16px 0' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-text-sub)', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0 4px 6px' }}>
            群組標籤
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            <Chip variant="tag">VIP客戶</Chip>
            <Chip variant="tag">A級</Chip>
            <Chip variant="tag">台積電</Chip>
          </div>
        </div>
      </div>

      {/* Bottom action bar */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 56, zIndex: 20,
        height: 56, background: '#fff', borderTop: '1px solid var(--c-hairline)',
        display: 'flex', alignItems: 'stretch',
      }}>
        {[{i:I.edit(18), l:'編輯'},{i:I.tag(18), l:'群組'},{i:I.qr(18), l:'QR'}].map((b,idx) => (
          <div key={idx} style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
            color: 'var(--c-text)',
            borderLeft: idx > 0 ? '1px solid var(--c-hairline)' : '0',
          }}>
            {b.i}
            <div style={{ fontSize: 11, fontWeight: 600 }}>{b.l}</div>
          </div>
        ))}
      </div>

      <LiffBottomNav active="cards"/>
    </div>
  );
}

function ContactRow({ icon, label, value, last, muted, addr }) {
  return (
    <div style={{
      minHeight: 54, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 12,
      borderBottom: last ? '0' : '1px solid rgba(26,27,24,0.05)',
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 8, background: 'var(--c-primary-softer)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--c-primary-deep)', flexShrink: 0,
      }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10.5, color: 'var(--c-text-mute)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{label}</div>
        <div style={{
          fontSize: 14, color: muted ? 'var(--c-text-mute)' : 'var(--c-text)', marginTop: 1,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: addr ? 'normal' : 'nowrap',
          fontFamily: label === 'Email' || label === '網站' ? 'var(--f-mono), var(--f-ui)' : 'var(--f-ui)',
          fontWeight: 500, letterSpacing: '-0.005em',
        }}>{value}</div>
      </div>
      <div style={{ color: 'var(--c-text-mute)', opacity: 0.6 }}>{I.copy(18)}</div>
    </div>
  );
}

Object.assign(window, { CardsListScreen, CardDetailScreen, CardRow });
