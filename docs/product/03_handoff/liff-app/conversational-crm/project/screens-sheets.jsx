// screens-sheets.jsx — Edit sheet + Tag sheet (with delete confirm) + AI cards

// ─── 名片編輯 Bottom Sheet ─────────────────────────────────
function EditSheetScreen({ mode = 'normal' }) {
  // mode: normal | saving | success | error
  return (
    <div className="liff" style={{ background: 'rgba(0,0,0,0.4)' }}>
      {mode === 'success' && <LiffToast>{I.check(16,'#fff')}<span>名片已更新</span></LiffToast>}
      {mode === 'error'   && <LiffToast kind="error">{I.alert(16,'#fff')}<span>儲存失敗，請重試</span></LiffToast>}

      {/* Behind sheet: show dimmed list page */}
      <div style={{
        position: 'absolute', inset: 0, background: 'var(--c-bg-base)', opacity: 0.4,
      }}/>

      {/* Sheet */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        background: '#fff', borderRadius: '20px 20px 0 0',
        maxHeight: '92%', display: 'flex', flexDirection: 'column',
        boxShadow: '0 -8px 30px rgba(0,0,0,0.12)',
      }}>
        <div style={{ padding: '10px 0 6px', display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: 40, height: 4, borderRadius: 99, background: 'var(--c-bg-input)' }}/>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '4px 16px 12px',
        }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-text-sub)' }}>取消</div>
          <div className="display" style={{ fontSize: 16, fontWeight: 700 }}>編輯名片</div>
          <div style={{
            fontSize: 14, fontWeight: 700,
            color: mode === 'saving' ? 'var(--c-text-disabled)' : 'var(--c-primary-deep)',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            {mode === 'saving' && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2.5"/>
                <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            )}
            {mode === 'saving' ? '更新中…' : '儲存'}
          </div>
        </div>

        <div className="liff-scroll" style={{
          flex: 1, padding: '0 16px 20px',
          opacity: mode === 'saving' ? 0.5 : 1, pointerEvents: mode === 'saving' ? 'none' : 'auto',
        }}>
          {/* Thumbnail row */}
          <div style={{
            display: 'flex', gap: 12, alignItems: 'center', padding: '6px 0 16px',
          }}>
            <div style={{
              width: 72, height: 72, borderRadius: 10, background: 'var(--c-bg-section)',
              border: '1px solid var(--c-hairline)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--f-display)', fontWeight: 700, color: 'var(--c-primary-deep)',
              fontSize: 12, flexShrink: 0, flexDirection: 'column', gap: 4, position: 'relative', overflow: 'hidden',
            }}>
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(31,139,92,0.1), rgba(43,108,214,0.05))' }}/>
              <div style={{ position: 'relative', fontSize: 20 }}>王</div>
              <div style={{ position: 'relative', fontSize: 9, color: 'var(--c-text-sub)' }}>TSMC</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-text)' }}>對照原始照片修正</div>
              <div style={{ fontSize: 11, color: 'var(--c-text-mute)', marginTop: 3 }}>點擊縮圖可全螢幕預覽</div>
            </div>
          </div>

          <Field label="姓名" required value="王建華" filled/>
          <Field label="英文名" value="Kenneth Wang" filled/>
          <Field label="職稱" value="資深採購經理" filled/>
          <Field label="公司" value="台灣積體電路製造股份有限公司" filled/>
          <Field label="電話" value="+886 3 563 6688" mono filled/>
          <Field label="手機" value="" placeholder="輸入手機號碼"/>
          <Field label="Email" value="wang.ch@tsmc.com" mono filled/>
          <Field label="地址" value="新竹市東區力行六路 8 號" filled/>
          <Field label="備忘錄" value="" placeholder="新增備忘錄…" multi/>

          <div style={{ paddingTop: 12 }}>
            <PrimaryButton disabled={mode === 'saving'}>{mode === 'saving' ? '更新中…' : '更新名片'}</PrimaryButton>
          </div>
        </div>
      </div>
    </div>
  );
}
function Field({ label, required, value, placeholder, mono, multi, filled, focused }) {
  return (
    <div style={{ paddingBottom: 14 }}>
      <div style={{
        fontSize: 11, fontWeight: 700, color: 'var(--c-text-sub)',
        textTransform: 'uppercase', letterSpacing: '0.06em', paddingBottom: 6, paddingLeft: 2,
      }}>
        {label}{required && <span style={{ color: 'var(--c-danger)', marginLeft: 3 }}>*</span>}
      </div>
      <div style={{
        minHeight: multi ? 88 : 44, padding: multi ? '11px 14px' : '0 14px',
        display: 'flex', alignItems: multi ? 'flex-start' : 'center', gap: 8,
        background: filled ? '#fff' : 'var(--c-bg-input)',
        border: focused ? '2px solid var(--c-primary)' : filled ? '1px solid var(--c-hairline)' : '1px solid transparent',
        borderRadius: 10,
      }}>
        <div style={{
          flex: 1, fontSize: 14,
          fontFamily: mono ? 'var(--f-mono), var(--f-ui)' : 'var(--f-ui)',
          color: filled ? 'var(--c-text)' : 'var(--c-text-mute)',
          letterSpacing: mono ? 0 : '-0.005em',
        }}>
          {value || placeholder}
        </div>
        {filled && (
          <div style={{
            width: 20, height: 20, borderRadius: 99, background: 'var(--c-bg-input)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--c-text-mute)',
          }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 標籤套用 Sheet ─────────────────────────────────────────
function TagSheetScreen({ tab = 1, role = 'admin', showDelete = false }) {
  return (
    <div className="liff" style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'var(--c-bg-base)', opacity: 0.35 }}/>

      {/* Main sheet */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        background: '#fff', borderRadius: '20px 20px 0 0', maxHeight: '88%',
        boxShadow: '0 -8px 30px rgba(0,0,0,0.12)',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ padding: '10px 0 6px', display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: 40, height: 4, borderRadius: 99, background: 'var(--c-bg-input)' }}/>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 16px 10px' }}>
          <div style={{ fontSize: 14, color: 'var(--c-text-sub)', display: 'flex', alignItems: 'center', gap: 4 }}>{I.close(18)}</div>
          <div className="display" style={{ fontSize: 16, fontWeight: 700 }}>選擇群組標籤</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--c-primary-deep)' }}>確認</div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--c-hairline)' }}>
          {[
            { id: 1, label: '此名片標籤' },
            { id: 2, label: '所有標籤' },
          ].map(t => {
            const on = t.id === tab;
            return (
              <div key={t.id} style={{
                flex: 1, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: on ? 700 : 500, color: on ? 'var(--c-primary-deep)' : 'var(--c-text-sub)',
                borderBottom: on ? '2px solid var(--c-primary)' : '2px solid transparent',
                marginBottom: -1,
              }}>{t.label}</div>
            );
          })}
        </div>

        <div className="liff-scroll" style={{ flex: 1, padding: '14px 16px 24px' }}>
          {tab === 1 ? (
            <>
              {/* Card info */}
              <div style={{
                background: 'var(--c-bg-section)', borderRadius: 12, padding: '10px 12px',
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <Avatar name="王" size={36}/>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--c-text)' }}>王建華</div>
                    <div style={{ fontSize: 11, color: 'var(--c-text-mute)', fontWeight: 500 }}>Kenneth Wang</div>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--c-text-sub)' }}>台灣積體電路 · 資深採購經理</div>
                </div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--c-text-sub)', padding: '14px 2px 10px' }}>
                為這張名片選擇群組標籤（可多選）
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <TagChip on>VIP客戶</TagChip>
                <TagChip on>A級</TagChip>
                <TagChip>潛在</TagChip>
                <TagChip>合作夥伴</TagChip>
                <TagChip>待聯繫</TagChip>
                <TagChip>展場認識</TagChip>
                <TagChip>需報價</TagChip>
                <TagChip dashed>＋ 新標籤</TagChip>
              </div>

              {role === 'admin' && (
                <div style={{
                  marginTop: 24, padding: '14px 4px', borderTop: '1px solid var(--c-hairline)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <div style={{ fontSize: 12, color: 'var(--c-text-sub)' }}>要新增 / 刪除標籤？</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-primary-deep)' }}>
                    管理所有標籤 →
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {role === 'admin' && (
                <div style={{
                  display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10,
                  background: 'var(--c-bg-input)', borderRadius: 10, padding: '4px 4px 4px 12px',
                }}>
                  <div style={{ flex: 1, fontSize: 14, color: 'var(--c-text-mute)' }}>輸入新標籤名稱</div>
                  <div style={{
                    width: 36, height: 36, borderRadius: 8, background: 'var(--c-primary)',
                    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>{I.plus(18, '#fff')}</div>
                </div>
              )}
              {[
                { c: '#1F8B5C', n: 'VIP客戶', u: 12 },
                { c: '#B06B0F', n: 'A級',     u: 28 },
                { c: '#2B6CD6', n: '潛在',     u: 47 },
                { c: '#8A4AB8', n: '合作夥伴', u: 9 },
                { c: '#C2483A', n: '待聯繫',   u: 5 },
                { c: '#3A6B45', n: '展場認識', u: 34 },
              ].map((t, i) => (
                <div key={i} style={{
                  height: 48, display: 'flex', alignItems: 'center', gap: 12,
                  borderBottom: '1px solid var(--c-hairline)',
                }}>
                  <div style={{ width: 10, height: 10, borderRadius: 99, background: t.c }}/>
                  <div style={{ flex: 1, fontSize: 15, color: 'var(--c-text)' }}>{t.n}</div>
                  <div style={{ fontSize: 11, color: 'var(--c-text-mute)' }}>{t.u} 張</div>
                  {role === 'admin' && <div style={{ color: 'var(--c-text-mute)', padding: '0 4px' }}>{I.trash(16)}</div>}
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Delete confirm overlay */}
      {showDelete && (
        <>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)' }}/>
          <div style={{
            position: 'absolute', left: 0, right: 0, bottom: 0,
            background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(20px)',
            borderRadius: '20px 20px 0 0', padding: '14px 20px 28px',
            boxShadow: '0 -8px 30px rgba(0,0,0,0.18)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div style={{ width: 40, height: 4, borderRadius: 99, background: 'var(--c-bg-input)' }}/>
            </div>
            <div style={{
              margin: '14px auto 10px', width: 44, height: 44, borderRadius: 99,
              background: 'var(--c-danger-soft)', color: 'var(--c-danger)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{I.trash(20, 'var(--c-danger)')}</div>
            <div className="display" style={{ fontSize: 17, fontWeight: 700, textAlign: 'center' }}>
              刪除「VIP客戶」？
            </div>
            <div style={{ fontSize: 13, color: 'var(--c-text-sub)', textAlign: 'center', marginTop: 6, lineHeight: 1.5 }}>
              此標籤已用於 <b className="num" style={{ color: 'var(--c-text)' }}>12</b> 張名片，刪除後無法復原
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
              <div style={{
                flex: 1, height: 48, borderRadius: 12, background: 'var(--c-bg-section)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 15, fontWeight: 600, color: 'var(--c-text)',
              }}>取消</div>
              <div style={{
                flex: 1, height: 48, borderRadius: 12, background: 'var(--c-danger)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 15, fontWeight: 700, color: '#fff',
              }}>刪除</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
function TagChip({ on, dashed, children }) {
  if (dashed) return (
    <div style={{
      height: 32, padding: '0 12px', borderRadius: 999,
      display: 'inline-flex', alignItems: 'center',
      fontSize: 13, fontWeight: 600, color: 'var(--c-text-sub)',
      border: '1.5px dashed var(--c-outline)',
    }}>{children}</div>
  );
  return (
    <div style={{
      height: 32, padding: '0 14px', borderRadius: 999,
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 13, fontWeight: 600,
      background: on ? 'var(--c-primary)' : 'var(--c-bg-section)',
      color: on ? '#fff' : 'var(--c-text-sub)',
    }}>
      {on && I.check(13, '#fff')}
      {children}
    </div>
  );
}

Object.assign(window, { EditSheetScreen, TagSheetScreen });
