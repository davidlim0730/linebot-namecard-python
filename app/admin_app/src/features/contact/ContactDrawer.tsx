import { X, ExternalLink, Building2, Plus } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { type Contact, type ContactUpdate, useContactCrm, useUpdateContact } from '../../api/contacts'
import { getStage } from '../../constants/stages'

dayjs.extend(relativeTime)

interface Props {
  contact: Contact | null
  contacts: Contact[]
  onClose: () => void
  onSelectContact: (contact: Contact) => void
  onCreateChildContact: (companyId: string) => void
}

function emptyToUndefined(value?: string | null) {
  const next = value?.trim()
  return next ? next : undefined
}

export default function ContactDrawer({
  contact,
  contacts,
  onClose,
  onSelectContact,
  onCreateChildContact,
}: Props) {
  const navigate = useNavigate()
  const { data: crm, isLoading } = useContactCrm(contact?.id ?? '')
  const updateContact = useUpdateContact()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<ContactUpdate>({
    display_name: '',
    legal_name: '',
    parent_company_id: null,
    title: '',
    phone: '',
    mobile: '',
    email: '',
    line_id: '',
    address: '',
    memo: '',
    industry: '',
    website: '',
    employee_count: null,
    department: '',
    work_phone: '',
  })

  useEffect(() => {
    if (!contact) return
    setEditing(false)
    setForm({
      display_name: contact.display_name ?? '',
      legal_name: contact.legal_name ?? '',
      parent_company_id: contact.parent_company_id ?? null,
      title: contact.title ?? '',
      phone: contact.phone ?? '',
      mobile: contact.mobile ?? '',
      email: contact.email ?? '',
      line_id: contact.line_id ?? '',
      address: contact.address ?? '',
      memo: contact.memo ?? '',
      industry: contact.industry ?? '',
      website: contact.website ?? '',
      employee_count: contact.employee_count ?? null,
      department: contact.department ?? '',
      work_phone: contact.work_phone ?? '',
    })
  }, [contact])

  const companyOptions = useMemo(
    () => contacts.filter(item => item.contact_type === 'company').sort((a, b) => a.display_name.localeCompare(b.display_name, 'zh-TW')),
    [contacts],
  )

  if (!contact) {
    return (
      <div className="flex h-full items-center justify-center bg-[color:var(--color-bg-base)] p-8">
        <div className="max-w-md rounded-[28px] border border-dashed border-[color:var(--color-outline)] bg-white px-8 py-10 text-center shadow-[var(--shadow-card)]">
          <div className="display-font text-2xl font-bold text-[color:var(--color-text-primary)]">選擇一筆資料</div>
          <p className="mt-3 text-sm leading-relaxed text-[color:var(--color-text-secondary)]/70">
            左側可在 Account 與 Contact 間切換。點選任一公司或聯絡人後，右側就會顯示對應的 detail 視角。
          </p>
        </div>
      </div>
    )
  }

  const isCompany = contact.contact_type === 'company'
  const linkedCompany = crm?.company_contact ?? null

  const save = () => {
    const selectedCompany = companyOptions.find(company => company.id === form.parent_company_id)
    updateContact.mutate(
      {
        id: contact.id,
        update: {
          display_name: form.display_name?.trim() || contact.display_name,
          legal_name: isCompany ? emptyToUndefined(form.legal_name) : undefined,
          parent_company_id: isCompany ? null : form.parent_company_id || null,
          company_name: isCompany ? null : (selectedCompany?.display_name ?? null),
          title: !isCompany ? emptyToUndefined(form.title) : undefined,
          phone: isCompany ? emptyToUndefined(form.phone) : undefined,
          mobile: !isCompany ? emptyToUndefined(form.mobile) : undefined,
          email: emptyToUndefined(form.email),
          line_id: !isCompany ? emptyToUndefined(form.line_id) : undefined,
          address: isCompany ? emptyToUndefined(form.address) : undefined,
          memo: emptyToUndefined(form.memo),
          industry: isCompany ? emptyToUndefined(form.industry) : undefined,
          website: isCompany ? emptyToUndefined(form.website) : undefined,
          employee_count: isCompany ? (form.employee_count ? Number(form.employee_count) : null) : undefined,
          department: !isCompany ? emptyToUndefined(form.department) : undefined,
          work_phone: !isCompany ? emptyToUndefined(form.work_phone) : undefined,
        },
      },
      { onSuccess: () => setEditing(false) },
    )
  }

  const visibleInfoRows = isCompany
    ? [
        { label: '產業', value: contact.industry, icon: '🏷' },
        { label: '網站', value: contact.website, icon: '🌐' },
        { label: '員工規模', value: contact.employee_count ? `${contact.employee_count.toLocaleString()} 人` : null, icon: '👥' },
        { label: '總機', value: contact.phone, icon: '📞' },
        { label: '地址', value: contact.address, icon: '📍' },
      ].filter(row => row.value)
    : [
        { label: '部門', value: contact.department, icon: '🏢' },
        { label: '所屬公司', value: contact.company_name, icon: '🏭' },
        { label: '手機', value: contact.mobile, icon: '📱' },
        { label: '座機', value: contact.work_phone, icon: '☎️' },
        { label: 'Email', value: contact.email, icon: '✉️' },
        { label: 'LINE ID', value: contact.line_id, icon: '💬' },
      ].filter(row => row.value)

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex items-center justify-between border-b border-[color:var(--color-outline)] px-5 py-4">
        <div>
          <h2 className="display-font text-xl font-bold text-[color:var(--color-text-primary)]">{contact.display_name}</h2>
          <p className="mt-1 text-xs text-[color:var(--color-text-secondary)]/70">
            {isCompany ? 'Account 公司視角' : [contact.title, contact.department].filter(Boolean).join(' · ') || 'Contact 個人視角'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setEditing(value => !value)}
            className="rounded-xl bg-[color:var(--color-primary-light)] px-3 py-2 text-xs font-semibold text-[color:var(--color-primary-dark)]"
          >
            {editing ? '取消編輯' : '編輯'}
          </button>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto bg-[color:var(--color-bg-base)] p-5">
        <div className="rounded-[20px] bg-white p-4 shadow-[var(--shadow-card)]">
          <span className={`inline-block rounded-full px-2.5 py-1 text-[11px] font-semibold ${
            isCompany ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'
          }`}>
            {isCompany ? '公司 Account' : '個人 Contact'}
          </span>
          <div className="mt-3 space-y-2 text-sm text-[color:var(--color-text-secondary)]">
            {visibleInfoRows.map(row => (
              <div key={row.label} className="flex items-start gap-2">
                <span>{row.icon}</span>
                <div className="flex-1">
                  <span className="font-medium text-[color:var(--color-text-primary)]">{row.label}：</span>
                  {row.label === '所屬公司' && linkedCompany ? (
                    <button
                      onClick={() => onSelectContact(linkedCompany)}
                      className="ml-1 inline-flex items-center gap-1 text-[color:var(--color-primary-dark)] underline-offset-2 hover:underline"
                    >
                      {row.value}
                      <Building2 size={14} />
                    </button>
                  ) : (
                    <span className="ml-1">{row.value}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
          {contact.memo && (
            <div className="mt-4 rounded-2xl bg-[color:var(--color-bg-base)] p-3 text-sm leading-relaxed text-[color:var(--color-text-secondary)]">
              {contact.memo}
            </div>
          )}
        </div>

        {crm && (
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-[20px] bg-white p-4 shadow-[var(--shadow-card)]">
              <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-[color:var(--color-text-secondary)]/55">案件</div>
              <div className="mt-2 text-2xl font-bold text-[color:var(--color-text-primary)]">{crm.deals.length}</div>
            </div>
            <div className="rounded-[20px] bg-white p-4 shadow-[var(--shadow-card)]">
              <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-[color:var(--color-text-secondary)]/55">互動記錄</div>
              <div className="mt-2 text-2xl font-bold text-[color:var(--color-text-primary)]">{crm.activities.length}</div>
            </div>
            <div className="rounded-[20px] bg-white p-4 shadow-[var(--shadow-card)]">
              <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-[color:var(--color-text-secondary)]/55">待辦</div>
              <div className="mt-2 text-2xl font-bold text-[color:var(--color-text-primary)]">{crm.actions.length}</div>
            </div>
          </div>
        )}

        {editing && (
          <div className="rounded-[20px] bg-white p-4 shadow-[var(--shadow-card)]">
            <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-[color:var(--color-text-secondary)]/60">編輯{isCompany ? '公司' : '聯絡人'}</h3>
            <div className="space-y-3">
              <label className="block">
                <div className="mb-1 text-[11px] font-semibold text-[color:var(--color-text-secondary)]/65">{isCompany ? '公司名稱 *' : '姓名 *'}</div>
                <input value={form.display_name ?? ''} onChange={e => setForm(current => ({ ...current, display_name: e.target.value }))} className="w-full rounded-2xl border border-[color:var(--color-outline)] bg-[color:var(--color-bg-base)] px-3 py-2.5 text-sm text-[color:var(--color-text-primary)] outline-none focus:bg-white focus:ring-2 focus:ring-[color:var(--color-primary)]/20" />
              </label>

              {isCompany ? (
                <>
                  <label className="block">
                    <div className="mb-1 text-[11px] font-semibold text-[color:var(--color-text-secondary)]/65">法定名稱</div>
                    <input value={form.legal_name ?? ''} onChange={e => setForm(current => ({ ...current, legal_name: e.target.value }))} className="w-full rounded-2xl border border-[color:var(--color-outline)] bg-[color:var(--color-bg-base)] px-3 py-2.5 text-sm text-[color:var(--color-text-primary)] outline-none focus:bg-white focus:ring-2 focus:ring-[color:var(--color-primary)]/20" />
                  </label>
                  <label className="block">
                    <div className="mb-1 text-[11px] font-semibold text-[color:var(--color-text-secondary)]/65">產業別</div>
                    <input value={form.industry ?? ''} onChange={e => setForm(current => ({ ...current, industry: e.target.value }))} className="w-full rounded-2xl border border-[color:var(--color-outline)] bg-[color:var(--color-bg-base)] px-3 py-2.5 text-sm text-[color:var(--color-text-primary)] outline-none focus:bg-white focus:ring-2 focus:ring-[color:var(--color-primary)]/20" />
                  </label>
                  <label className="block">
                    <div className="mb-1 text-[11px] font-semibold text-[color:var(--color-text-secondary)]/65">網站</div>
                    <input value={form.website ?? ''} onChange={e => setForm(current => ({ ...current, website: e.target.value }))} className="w-full rounded-2xl border border-[color:var(--color-outline)] bg-[color:var(--color-bg-base)] px-3 py-2.5 text-sm text-[color:var(--color-text-primary)] outline-none focus:bg-white focus:ring-2 focus:ring-[color:var(--color-primary)]/20" />
                  </label>
                  <label className="block">
                    <div className="mb-1 text-[11px] font-semibold text-[color:var(--color-text-secondary)]/65">員工人數</div>
                    <input value={form.employee_count ?? ''} inputMode="numeric" onChange={e => setForm(current => ({ ...current, employee_count: e.target.value ? Number(e.target.value) : null }))} className="w-full rounded-2xl border border-[color:var(--color-outline)] bg-[color:var(--color-bg-base)] px-3 py-2.5 text-sm text-[color:var(--color-text-primary)] outline-none focus:bg-white focus:ring-2 focus:ring-[color:var(--color-primary)]/20" />
                  </label>
                  <label className="block">
                    <div className="mb-1 text-[11px] font-semibold text-[color:var(--color-text-secondary)]/65">總機</div>
                    <input value={form.phone ?? ''} onChange={e => setForm(current => ({ ...current, phone: e.target.value }))} className="w-full rounded-2xl border border-[color:var(--color-outline)] bg-[color:var(--color-bg-base)] px-3 py-2.5 text-sm text-[color:var(--color-text-primary)] outline-none focus:bg-white focus:ring-2 focus:ring-[color:var(--color-primary)]/20" />
                  </label>
                  <label className="block">
                    <div className="mb-1 text-[11px] font-semibold text-[color:var(--color-text-secondary)]/65">地址</div>
                    <input value={form.address ?? ''} onChange={e => setForm(current => ({ ...current, address: e.target.value }))} className="w-full rounded-2xl border border-[color:var(--color-outline)] bg-[color:var(--color-bg-base)] px-3 py-2.5 text-sm text-[color:var(--color-text-primary)] outline-none focus:bg-white focus:ring-2 focus:ring-[color:var(--color-primary)]/20" />
                  </label>
                </>
              ) : (
                <>
                  <label className="block">
                    <div className="mb-1 text-[11px] font-semibold text-[color:var(--color-text-secondary)]/65">職稱</div>
                    <input value={form.title ?? ''} onChange={e => setForm(current => ({ ...current, title: e.target.value }))} className="w-full rounded-2xl border border-[color:var(--color-outline)] bg-[color:var(--color-bg-base)] px-3 py-2.5 text-sm text-[color:var(--color-text-primary)] outline-none focus:bg-white focus:ring-2 focus:ring-[color:var(--color-primary)]/20" />
                  </label>
                  <label className="block">
                    <div className="mb-1 text-[11px] font-semibold text-[color:var(--color-text-secondary)]/65">部門</div>
                    <input value={form.department ?? ''} onChange={e => setForm(current => ({ ...current, department: e.target.value }))} className="w-full rounded-2xl border border-[color:var(--color-outline)] bg-[color:var(--color-bg-base)] px-3 py-2.5 text-sm text-[color:var(--color-text-primary)] outline-none focus:bg-white focus:ring-2 focus:ring-[color:var(--color-primary)]/20" />
                  </label>
                  <label className="block">
                    <div className="mb-1 text-[11px] font-semibold text-[color:var(--color-text-secondary)]/65">所屬公司</div>
                    <select value={form.parent_company_id ?? ''} onChange={e => setForm(current => ({ ...current, parent_company_id: e.target.value || null }))} className="w-full rounded-2xl border border-[color:var(--color-outline)] bg-[color:var(--color-bg-base)] px-3 py-2.5 text-sm text-[color:var(--color-text-primary)] outline-none focus:bg-white focus:ring-2 focus:ring-[color:var(--color-primary)]/20">
                      <option value="">未指定</option>
                      {companyOptions.map(company => (
                        <option key={company.id} value={company.id}>{company.display_name}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <div className="mb-1 text-[11px] font-semibold text-[color:var(--color-text-secondary)]/65">手機</div>
                    <input value={form.mobile ?? ''} onChange={e => setForm(current => ({ ...current, mobile: e.target.value }))} className="w-full rounded-2xl border border-[color:var(--color-outline)] bg-[color:var(--color-bg-base)] px-3 py-2.5 text-sm text-[color:var(--color-text-primary)] outline-none focus:bg-white focus:ring-2 focus:ring-[color:var(--color-primary)]/20" />
                  </label>
                  <label className="block">
                    <div className="mb-1 text-[11px] font-semibold text-[color:var(--color-text-secondary)]/65">座機</div>
                    <input value={form.work_phone ?? ''} onChange={e => setForm(current => ({ ...current, work_phone: e.target.value }))} className="w-full rounded-2xl border border-[color:var(--color-outline)] bg-[color:var(--color-bg-base)] px-3 py-2.5 text-sm text-[color:var(--color-text-primary)] outline-none focus:bg-white focus:ring-2 focus:ring-[color:var(--color-primary)]/20" />
                  </label>
                  <label className="block">
                    <div className="mb-1 text-[11px] font-semibold text-[color:var(--color-text-secondary)]/65">LINE ID</div>
                    <input value={form.line_id ?? ''} onChange={e => setForm(current => ({ ...current, line_id: e.target.value }))} className="w-full rounded-2xl border border-[color:var(--color-outline)] bg-[color:var(--color-bg-base)] px-3 py-2.5 text-sm text-[color:var(--color-text-primary)] outline-none focus:bg-white focus:ring-2 focus:ring-[color:var(--color-primary)]/20" />
                  </label>
                </>
              )}

              <label className="block">
                <div className="mb-1 text-[11px] font-semibold text-[color:var(--color-text-secondary)]/65">Email</div>
                <input value={form.email ?? ''} onChange={e => setForm(current => ({ ...current, email: e.target.value }))} className="w-full rounded-2xl border border-[color:var(--color-outline)] bg-[color:var(--color-bg-base)] px-3 py-2.5 text-sm text-[color:var(--color-text-primary)] outline-none focus:bg-white focus:ring-2 focus:ring-[color:var(--color-primary)]/20" />
              </label>
              <label className="block">
                <div className="mb-1 text-[11px] font-semibold text-[color:var(--color-text-secondary)]/65">備忘錄</div>
                <textarea value={form.memo ?? ''} onChange={e => setForm(current => ({ ...current, memo: e.target.value }))} rows={4} className="w-full resize-none rounded-2xl border border-[color:var(--color-outline)] bg-[color:var(--color-bg-base)] px-3 py-2.5 text-sm text-[color:var(--color-text-primary)] outline-none focus:bg-white focus:ring-2 focus:ring-[color:var(--color-primary)]/20" />
              </label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setEditing(false)} className="rounded-xl border border-[color:var(--color-outline)] px-3 py-2 text-sm font-semibold text-[color:var(--color-text-secondary)]">取消</button>
              <button onClick={save} disabled={updateContact.isPending} className="rounded-xl bg-[color:var(--color-primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                {updateContact.isPending ? '儲存中…' : '儲存變更'}
              </button>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="rounded-[20px] bg-white px-4 py-8 text-center text-sm text-[color:var(--color-text-secondary)]/60 shadow-[var(--shadow-card)]">載入中…</div>
        )}

        {isCompany && crm && (
          <div className="rounded-[20px] bg-white p-4 shadow-[var(--shadow-card)]">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-[color:var(--color-text-secondary)]/60">聯絡人 ({crm.members.length})</h3>
              <button onClick={() => onCreateChildContact(contact.id)} className="inline-flex items-center gap-1 rounded-xl bg-[color:var(--color-primary-light)] px-3 py-2 text-xs font-semibold text-[color:var(--color-primary-dark)]">
                <Plus size={14} /> 新增
              </button>
            </div>
            <div className="space-y-2">
              {crm.members.length === 0 ? (
                <div className="rounded-2xl bg-[color:var(--color-bg-base)] px-3 py-4 text-sm text-[color:var(--color-text-secondary)]/70">這家公司底下還沒有聯絡人</div>
              ) : (
                crm.members.map(member => (
                  <button
                    key={member.id}
                    onClick={() => onSelectContact(member)}
                    className="flex w-full items-center justify-between rounded-2xl bg-[color:var(--color-bg-base)] px-3 py-3 text-left transition hover:bg-[color:var(--color-primary-light)]/50"
                  >
                    <div>
                      <p className="text-sm font-semibold text-[color:var(--color-text-primary)]">{member.display_name}</p>
                      <p className="text-xs text-[color:var(--color-text-secondary)]/70">{[member.title, member.department].filter(Boolean).join(' · ') || '尚未補上職稱與部門'}</p>
                    </div>
                    <div className="text-right text-xs text-[color:var(--color-text-secondary)]/70">
                      <div>{member.mobile || member.work_phone || '—'}</div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {crm && (
          <div className="rounded-[20px] bg-white p-4 shadow-[var(--shadow-card)]">
            <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-[color:var(--color-text-secondary)]/60">相關案件 ({crm.deals.length})</h3>
            <div className="space-y-2">
              {crm.deals.length === 0 ? (
                <div className="rounded-2xl bg-[color:var(--color-bg-base)] px-3 py-4 text-sm text-[color:var(--color-text-secondary)]/70">目前沒有相關案件</div>
              ) : crm.deals.map(deal => {
                const stage = getStage(deal.stage)
                return (
                  <div
                    key={deal.id}
                    className="flex cursor-pointer items-center justify-between rounded-2xl bg-[color:var(--color-bg-base)] px-3 py-3 transition hover:bg-[color:var(--color-primary-light)]/50"
                    onClick={() => { onClose(); navigate(`/deals/${deal.id}`) }}
                  >
                    <div>
                      <p className="text-sm font-semibold text-[color:var(--color-text-primary)]">{deal.entity_name}</p>
                      {deal.est_value != null && (
                        <p className="mono text-[11px] text-[color:var(--color-text-secondary)]/65">NT$ {deal.est_value.toLocaleString()}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {stage && <span className={`rounded px-1.5 py-0.5 text-xs ${stage.badgeClass}`}>{stage.label}</span>}
                      <ExternalLink size={12} className="text-gray-300" />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {crm && (
          <div className="rounded-[20px] bg-white p-4 shadow-[var(--shadow-card)]">
            <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-[color:var(--color-text-secondary)]/60">最近互動（{Math.min(crm.activities.length, 5)} / {crm.activities.length}）</h3>
            <div className="space-y-2">
              {crm.activities.length === 0 ? (
                <div className="rounded-2xl bg-[color:var(--color-bg-base)] px-3 py-4 text-sm text-[color:var(--color-text-secondary)]/70">目前沒有互動記錄</div>
              ) : [...crm.activities]
                .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
                .slice(0, 5)
                .map(act => (
                  <div key={act.id} className="rounded-2xl bg-[color:var(--color-bg-base)] p-3">
                    <p className="line-clamp-2 text-xs leading-relaxed text-[color:var(--color-text-secondary)]">{act.raw_transcript}</p>
                    {act.created_at && <p className="mono mt-2 text-[11px] text-[color:var(--color-text-secondary)]/60">{dayjs(act.created_at).fromNow()}</p>}
                  </div>
                ))}
            </div>
          </div>
        )}

        {crm && (
          <div className="rounded-[20px] bg-white p-4 shadow-[var(--shadow-card)]">
            <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-[color:var(--color-text-secondary)]/60">待辦 ({crm.actions.length})</h3>
            <div className="space-y-2">
              {crm.actions.length === 0 ? (
                <div className="rounded-2xl bg-[color:var(--color-bg-base)] px-3 py-4 text-sm text-[color:var(--color-text-secondary)]/70">目前沒有待辦事項</div>
              ) : crm.actions.slice(0, 5).map(action => (
                <div key={action.id} className="rounded-2xl bg-[color:var(--color-bg-base)] p-3">
                  <p className="text-sm font-medium text-[color:var(--color-text-primary)]">{action.task_detail}</p>
                  <p className="mt-1 text-xs text-[color:var(--color-text-secondary)]/70">{[action.due_date, action.status].filter(Boolean).join(' · ')}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
