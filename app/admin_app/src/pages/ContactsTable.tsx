import { useEffect, useMemo, useState } from 'react'
import { Building2, Plus, Search, UserRound } from 'lucide-react'
import { useContacts, useCreateContact, type Contact, type ContactCreate } from '../api/contacts'
import ContactDrawer from '../features/contact/ContactDrawer'

type CreatePreset = {
  contact_type?: 'person' | 'company'
  parent_company_id?: string | null
}

function buildInitialForm(preset?: CreatePreset): ContactCreate {
  return {
    display_name: '',
    contact_type: preset?.contact_type ?? 'person',
    parent_company_id: preset?.parent_company_id ?? null,
    company_name: '',
    legal_name: '',
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
  }
}

function ContactFormModal({
  contacts,
  preset,
  onClose,
}: {
  contacts: Contact[]
  preset?: CreatePreset
  onClose: () => void
}) {
  const [form, setForm] = useState<ContactCreate>(() => buildInitialForm(preset))
  const create = useCreateContact()
  const companies = useMemo(
    () => contacts.filter(contact => contact.contact_type === 'company').sort((a, b) => a.display_name.localeCompare(b.display_name, 'zh-TW')),
    [contacts],
  )

  const submit = () => {
    if (!form.display_name.trim()) return
    const selectedCompany = companies.find(company => company.id === form.parent_company_id)
    create.mutate(
      {
        ...form,
        display_name: form.display_name.trim(),
        legal_name: form.contact_type === 'company' ? form.legal_name?.trim() || undefined : undefined,
        parent_company_id: form.contact_type === 'person' ? form.parent_company_id || null : null,
        company_name: form.contact_type === 'person' ? selectedCompany?.display_name ?? null : null,
        title: form.contact_type === 'person' ? form.title?.trim() || undefined : undefined,
        department: form.contact_type === 'person' ? form.department?.trim() || undefined : undefined,
        phone: form.contact_type === 'company' ? form.phone?.trim() || undefined : undefined,
        mobile: form.contact_type === 'person' ? form.mobile?.trim() || undefined : undefined,
        work_phone: form.contact_type === 'person' ? form.work_phone?.trim() || undefined : undefined,
        email: form.email?.trim() || undefined,
        line_id: form.contact_type === 'person' ? form.line_id?.trim() || undefined : undefined,
        address: form.contact_type === 'company' ? form.address?.trim() || undefined : undefined,
        memo: form.memo?.trim() || undefined,
        industry: form.contact_type === 'company' ? form.industry?.trim() || undefined : undefined,
        website: form.contact_type === 'company' ? form.website?.trim() || undefined : undefined,
        employee_count: form.contact_type === 'company' && form.employee_count ? Number(form.employee_count) : null,
      },
      { onSuccess: onClose },
    )
  }

  const isCompany = form.contact_type === 'company'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/45" onClick={onClose} />
      <div className="relative w-full max-w-2xl overflow-hidden rounded-[28px] bg-white shadow-[var(--shadow-popover)]">
        <div className="h-[3px] bg-gradient-to-r from-[color:var(--color-primary)] to-sky-500" />
        <div className="max-h-[84vh] overflow-y-auto p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="display-font text-2xl font-bold text-[color:var(--color-text-primary)]">新增{isCompany ? '公司 Account' : '個人 Contact'}</h2>
              <p className="mt-1 text-sm text-[color:var(--color-text-secondary)]/70">
                {isCompany ? '建立公司帳戶，後續可在這家公司底下新增窗口。' : '建立個人聯絡人，並關聯到既有公司帳戶。'}
              </p>
            </div>
            <button onClick={onClose} className="rounded-full bg-[color:var(--color-bg-section)] px-3 py-1.5 text-sm font-semibold text-[color:var(--color-text-secondary)]">關閉</button>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-3">
              <label className="block">
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[color:var(--color-text-secondary)]/60">類型</div>
                <select
                  value={form.contact_type}
                  onChange={e => setForm({ ...buildInitialForm({ contact_type: e.target.value as 'person' | 'company' }), contact_type: e.target.value as 'person' | 'company' })}
                  className="w-full rounded-2xl border border-[color:var(--color-outline)] bg-[color:var(--color-bg-base)] px-3 py-3 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[color:var(--color-primary)]/20"
                >
                  <option value="person">個人 Contact</option>
                  <option value="company">公司 Account</option>
                </select>
              </label>

              <label className="block">
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[color:var(--color-text-secondary)]/60">{isCompany ? '公司名稱 *' : '姓名 *'}</div>
                <input
                  value={form.display_name}
                  onChange={e => setForm(current => ({ ...current, display_name: e.target.value }))}
                  className="w-full rounded-2xl border border-[color:var(--color-outline)] bg-[color:var(--color-bg-base)] px-3 py-3 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[color:var(--color-primary)]/20"
                  autoFocus
                />
              </label>

              {isCompany ? (
                <>
                  <label className="block">
                    <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[color:var(--color-text-secondary)]/60">法定名稱</div>
                    <input value={form.legal_name ?? ''} onChange={e => setForm(current => ({ ...current, legal_name: e.target.value }))} className="w-full rounded-2xl border border-[color:var(--color-outline)] bg-[color:var(--color-bg-base)] px-3 py-3 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[color:var(--color-primary)]/20" />
                  </label>
                  <label className="block">
                    <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[color:var(--color-text-secondary)]/60">產業別</div>
                    <input value={form.industry ?? ''} onChange={e => setForm(current => ({ ...current, industry: e.target.value }))} className="w-full rounded-2xl border border-[color:var(--color-outline)] bg-[color:var(--color-bg-base)] px-3 py-3 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[color:var(--color-primary)]/20" />
                  </label>
                  <label className="block">
                    <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[color:var(--color-text-secondary)]/60">網站</div>
                    <input value={form.website ?? ''} onChange={e => setForm(current => ({ ...current, website: e.target.value }))} className="w-full rounded-2xl border border-[color:var(--color-outline)] bg-[color:var(--color-bg-base)] px-3 py-3 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[color:var(--color-primary)]/20" />
                  </label>
                  <label className="block">
                    <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[color:var(--color-text-secondary)]/60">總機</div>
                    <input value={form.phone ?? ''} onChange={e => setForm(current => ({ ...current, phone: e.target.value }))} className="w-full rounded-2xl border border-[color:var(--color-outline)] bg-[color:var(--color-bg-base)] px-3 py-3 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[color:var(--color-primary)]/20" />
                  </label>
                </>
              ) : (
                <>
                  <label className="block">
                    <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[color:var(--color-text-secondary)]/60">職稱</div>
                    <input value={form.title ?? ''} onChange={e => setForm(current => ({ ...current, title: e.target.value }))} className="w-full rounded-2xl border border-[color:var(--color-outline)] bg-[color:var(--color-bg-base)] px-3 py-3 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[color:var(--color-primary)]/20" />
                  </label>
                  <label className="block">
                    <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[color:var(--color-text-secondary)]/60">部門</div>
                    <input value={form.department ?? ''} onChange={e => setForm(current => ({ ...current, department: e.target.value }))} className="w-full rounded-2xl border border-[color:var(--color-outline)] bg-[color:var(--color-bg-base)] px-3 py-3 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[color:var(--color-primary)]/20" />
                  </label>
                  <label className="block">
                    <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[color:var(--color-text-secondary)]/60">所屬公司</div>
                    <select
                      value={form.parent_company_id ?? ''}
                      onChange={e => setForm(current => ({ ...current, parent_company_id: e.target.value || null }))}
                      className="w-full rounded-2xl border border-[color:var(--color-outline)] bg-[color:var(--color-bg-base)] px-3 py-3 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[color:var(--color-primary)]/20"
                    >
                      <option value="">未指定</option>
                      {companies.map(company => (
                        <option key={company.id} value={company.id}>{company.display_name}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[color:var(--color-text-secondary)]/60">手機</div>
                    <input value={form.mobile ?? ''} onChange={e => setForm(current => ({ ...current, mobile: e.target.value }))} className="w-full rounded-2xl border border-[color:var(--color-outline)] bg-[color:var(--color-bg-base)] px-3 py-3 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[color:var(--color-primary)]/20" />
                  </label>
                </>
              )}
            </div>

            <div className="space-y-3">
              {isCompany ? (
                <>
                  <label className="block">
                    <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[color:var(--color-text-secondary)]/60">員工人數</div>
                    <input value={form.employee_count ?? ''} onChange={e => setForm(current => ({ ...current, employee_count: e.target.value ? Number(e.target.value) : null }))} inputMode="numeric" className="w-full rounded-2xl border border-[color:var(--color-outline)] bg-[color:var(--color-bg-base)] px-3 py-3 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[color:var(--color-primary)]/20" />
                  </label>
                  <label className="block">
                    <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[color:var(--color-text-secondary)]/60">地址</div>
                    <input value={form.address ?? ''} onChange={e => setForm(current => ({ ...current, address: e.target.value }))} className="w-full rounded-2xl border border-[color:var(--color-outline)] bg-[color:var(--color-bg-base)] px-3 py-3 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[color:var(--color-primary)]/20" />
                  </label>
                </>
              ) : (
                <>
                  <label className="block">
                    <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[color:var(--color-text-secondary)]/60">座機</div>
                    <input value={form.work_phone ?? ''} onChange={e => setForm(current => ({ ...current, work_phone: e.target.value }))} className="w-full rounded-2xl border border-[color:var(--color-outline)] bg-[color:var(--color-bg-base)] px-3 py-3 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[color:var(--color-primary)]/20" />
                  </label>
                  <label className="block">
                    <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[color:var(--color-text-secondary)]/60">LINE ID</div>
                    <input value={form.line_id ?? ''} onChange={e => setForm(current => ({ ...current, line_id: e.target.value }))} className="w-full rounded-2xl border border-[color:var(--color-outline)] bg-[color:var(--color-bg-base)] px-3 py-3 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[color:var(--color-primary)]/20" />
                  </label>
                </>
              )}

              <label className="block">
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[color:var(--color-text-secondary)]/60">Email</div>
                <input value={form.email ?? ''} onChange={e => setForm(current => ({ ...current, email: e.target.value }))} className="w-full rounded-2xl border border-[color:var(--color-outline)] bg-[color:var(--color-bg-base)] px-3 py-3 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[color:var(--color-primary)]/20" />
              </label>
              <label className="block">
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[color:var(--color-text-secondary)]/60">備忘錄</div>
                <textarea value={form.memo ?? ''} onChange={e => setForm(current => ({ ...current, memo: e.target.value }))} rows={isCompany ? 8 : 6} className="w-full resize-none rounded-2xl border border-[color:var(--color-outline)] bg-[color:var(--color-bg-base)] px-3 py-3 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[color:var(--color-primary)]/20" />
              </label>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button onClick={onClose} className="rounded-xl border border-[color:var(--color-outline)] px-4 py-2 text-sm font-semibold text-[color:var(--color-text-secondary)]">取消</button>
            <button onClick={submit} disabled={create.isPending || !form.display_name.trim()} className="rounded-xl bg-[color:var(--color-primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              {create.isPending ? '新增中…' : '建立資料'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ContactsTable() {
  const { data: contacts = [], isLoading, error } = useContacts()
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null)
  const [createPreset, setCreatePreset] = useState<CreatePreset | null>(null)
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'name'>('newest')
  const [typeFilter, setTypeFilter] = useState<'all' | 'company' | 'person'>('all')
  const [search, setSearch] = useState('')

  const memberCountMap = useMemo(() => {
    const map: Record<string, number> = {}
    contacts.forEach(contact => {
      if (contact.parent_company_id) {
        map[contact.parent_company_id] = (map[contact.parent_company_id] ?? 0) + 1
      }
    })
    return map
  }, [contacts])

  const filteredContacts = useMemo(() => {
    let list = [...contacts]
    if (typeFilter !== 'all') list = list.filter(contact => contact.contact_type === typeFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(contact =>
        contact.display_name.toLowerCase().includes(q) ||
        (contact.legal_name ?? '').toLowerCase().includes(q) ||
        (contact.company_name ?? '').toLowerCase().includes(q) ||
        (contact.title ?? '').toLowerCase().includes(q) ||
        (contact.industry ?? '').toLowerCase().includes(q) ||
        (contact.department ?? '').toLowerCase().includes(q),
      )
    }
    if (sortOrder === 'newest') {
      list.sort((a, b) => (b.updated_at ?? b.created_at ?? '') > (a.updated_at ?? a.created_at ?? '') ? 1 : -1)
    } else if (sortOrder === 'oldest') {
      list.sort((a, b) => (a.updated_at ?? a.created_at ?? '') > (b.updated_at ?? b.created_at ?? '') ? 1 : -1)
    } else {
      list.sort((a, b) => a.display_name.localeCompare(b.display_name, 'zh-TW'))
    }
    return list
  }, [contacts, search, sortOrder, typeFilter])

  const selectedContact = useMemo(
    () => contacts.find(contact => contact.id === selectedContactId) ?? filteredContacts[0] ?? null,
    [contacts, filteredContacts, selectedContactId],
  )

  useEffect(() => {
    if (!filteredContacts.length) {
      setSelectedContactId(null)
      return
    }
    if (!selectedContactId || !filteredContacts.some(contact => contact.id === selectedContactId)) {
      setSelectedContactId(filteredContacts[0].id)
    }
  }, [filteredContacts, selectedContactId])

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center text-sm text-gray-400">載入中…</div>
  }
  if (error) {
    return <div className="flex h-64 items-center justify-center text-sm text-red-400">載入失敗，請重新整理</div>
  }

  return (
    <div className="flex h-[calc(100vh-152px)] min-h-[700px] overflow-hidden rounded-[28px] border border-[color:var(--color-outline)] bg-white shadow-[var(--shadow-card)]">
      <div className="flex w-[420px] shrink-0 flex-col border-r border-[color:var(--color-outline)] bg-[color:var(--color-bg-base)]">
        <div className="border-b border-[color:var(--color-outline)] bg-white p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-[color:var(--color-text-secondary)]/55">Contacts Hub</div>
              <h2 className="display-font mt-2 text-2xl font-bold text-[color:var(--color-text-primary)]">Account / Contact 雙視角</h2>
            </div>
            <button
              onClick={() => setCreatePreset({ contact_type: 'person' })}
              className="inline-flex items-center gap-2 rounded-xl bg-[color:var(--color-primary)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[color:var(--color-primary-dark)]"
            >
              <Plus size={16} /> 新增
            </button>
          </div>

          <div className="mt-4 flex gap-2">
            {([
              { key: 'all', label: '全部' },
              { key: 'company', label: '公司 Account' },
              { key: 'person', label: '個人 Contact' },
            ] as const).map(tab => (
              <button
                key={tab.key}
                onClick={() => setTypeFilter(tab.key)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                  typeFilter === tab.key
                    ? 'bg-[color:var(--color-primary-light)] text-[color:var(--color-primary-dark)]'
                    : 'bg-[color:var(--color-bg-section)] text-[color:var(--color-text-secondary)]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative mt-4">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--color-text-secondary)]/50" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="搜尋姓名、公司、產業、部門…"
              className="w-full rounded-2xl border border-[color:var(--color-outline)] bg-[color:var(--color-bg-base)] py-3 pl-10 pr-3 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[color:var(--color-primary)]/20"
            />
          </div>

          <div className="mt-4 flex items-center justify-between text-xs text-[color:var(--color-text-secondary)]/60">
            <span>{filteredContacts.length} 筆資料</span>
            <div className="flex gap-1">
              {([
                { key: 'newest', label: '最近更新' },
                { key: 'name', label: '名稱 A-Z' },
              ] as const).map(opt => (
                <button
                  key={opt.key}
                  onClick={() => setSortOrder(opt.key)}
                  className={`rounded-full px-2.5 py-1 transition-colors ${
                    sortOrder === opt.key
                      ? 'bg-[color:var(--color-primary-light)] text-[color:var(--color-primary-dark)]'
                      : 'bg-transparent hover:bg-[color:var(--color-bg-section)]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {filteredContacts.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-[color:var(--color-outline)] bg-white px-5 py-10 text-center text-sm text-[color:var(--color-text-secondary)]/70">
              沒有符合條件的 Account / Contact
            </div>
          ) : (
            <div className="space-y-2">
              {filteredContacts.map(contact => {
                const active = selectedContact?.id === contact.id
                const isCompany = contact.contact_type === 'company'
                return (
                  <button
                    key={contact.id}
                    onClick={() => setSelectedContactId(contact.id)}
                    className={`w-full rounded-[24px] border px-4 py-4 text-left transition ${
                      active
                        ? 'border-[color:var(--color-primary)] bg-white shadow-[var(--shadow-card)]'
                        : 'border-transparent bg-white/70 hover:border-[color:var(--color-outline)] hover:bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
                        isCompany ? 'bg-sky-100 text-sky-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {isCompany ? <Building2 size={18} /> : <UserRound size={18} />}
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        isCompany ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'
                      }`}>
                        {isCompany ? 'Account' : 'Contact'}
                      </span>
                    </div>

                    <div className="mt-3">
                      <div className="text-base font-semibold text-[color:var(--color-text-primary)]">{contact.display_name}</div>
                      <div className="mt-1 text-sm text-[color:var(--color-text-secondary)]/75">
                        {isCompany
                          ? [contact.industry, contact.website].filter(Boolean).join(' · ') || '尚未補齊公司資料'
                          : [contact.title, contact.company_name].filter(Boolean).join(' · ') || '尚未補齊職稱與公司'}
                      </div>
                    </div>

                    <div className="mt-3 text-xs text-[color:var(--color-text-secondary)]/70">
                      {isCompany
                        ? `${memberCountMap[contact.id] ?? 0} 位聯絡人`
                        : [contact.department, contact.mobile || contact.work_phone].filter(Boolean).join(' · ') || '尚未補齊部門與電話'}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <ContactDrawer
          contact={selectedContact}
          contacts={contacts}
          onClose={() => setSelectedContactId(null)}
          onSelectContact={(contact) => setSelectedContactId(contact.id)}
          onCreateChildContact={(companyId) => setCreatePreset({ contact_type: 'person', parent_company_id: companyId })}
        />
      </div>

      {createPreset && (
        <ContactFormModal
          contacts={contacts}
          preset={createPreset}
          onClose={() => setCreatePreset(null)}
        />
      )}
    </div>
  )
}
