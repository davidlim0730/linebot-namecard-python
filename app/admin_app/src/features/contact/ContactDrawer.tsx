import {
  X,
  ExternalLink,
  Building2,
  Plus,
  Copy,
  Globe,
  MapPin,
  Phone,
  Mail,
  MessageCircle,
  BriefcaseBusiness,
  Landmark,
  Users,
  Sparkles,
  ShieldCheck,
  BadgeInfo,
  UserRound,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { type Contact, type ContactUpdate, useContactCrm, useUpdateContact } from '../../api/contacts'
import { PIPELINE_STAGES, getStage } from '../../constants/stages'

dayjs.extend(relativeTime)

interface Props {
  contact: Contact | null
  contacts: Contact[]
  onClose: () => void
  onSelectContact: (contact: Contact) => void
  onCreateChildContact: (companyId: string) => void
}

interface InfoTileConfig {
  icon: LucideIcon
  label: string
  value?: string | number | null
  mono?: boolean
}

function emptyToUndefined(value?: string | null) {
  const next = value?.trim()
  return next ? next : undefined
}

function formatContribution(value: number) {
  const wan = value / 10000
  return `NT$${wan.toLocaleString('zh-TW', {
    minimumFractionDigits: wan >= 100 ? 0 : 1,
    maximumFractionDigits: wan >= 100 ? 0 : 1,
  })}萬`
}

function getInitial(name: string) {
  return name?.trim().charAt(0).toUpperCase() || '?'
}

function CopyButton({ value }: { value?: string | number | null }) {
  if (value == null || value === '') return null

  return (
    <button
      type="button"
      title="複製"
      onClick={() => {
        const text = String(value)
        if (!text) return
        void navigator.clipboard?.writeText(text)
      }}
      className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[color:var(--color-outline)] bg-white text-[color:var(--color-text-secondary)]/60 transition hover:border-[color:var(--color-primary)]/30 hover:text-[color:var(--color-primary-dark)]"
    >
      <Copy size={12} />
    </button>
  )
}

function InfoTile({ icon: Icon, label, value, mono = false }: InfoTileConfig) {
  const hasValue = value != null && value !== ''

  return (
    <div className="flex min-h-[88px] items-start gap-3 rounded-[18px] border border-[color:var(--color-outline)]/80 bg-[color:var(--color-bg-base)]/55 px-4 py-3">
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[color:var(--color-primary-light)] text-[color:var(--color-primary-dark)]">
        <Icon size={16} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[color:var(--color-text-secondary)]/60">{label}</div>
        <div className={`mt-1 break-words text-sm leading-relaxed ${hasValue ? 'text-[color:var(--color-text-primary)]' : 'text-[color:var(--color-text-secondary)]/45'} ${mono ? 'mono' : ''}`}>
          {hasValue ? value : '未填寫'}
        </div>
      </div>
      <CopyButton value={value} />
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="min-w-[92px]">
      <div className="display-font text-[24px] font-bold tracking-[-0.02em] text-[color:var(--color-text-primary)]">{value}</div>
      <div className="mt-1 text-[11px] font-semibold tracking-[0.08em] text-[color:var(--color-text-secondary)]/65">{label}</div>
    </div>
  )
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
  const romanizedName = contact.aliases?.[0]
  const isVip = contact.tags?.includes('VIP客戶')
  const deals = crm?.deals ?? []
  const activities = [...(crm?.activities ?? [])].sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
  const actions = [...(crm?.actions ?? [])].sort((a, b) => {
    if (a.status === 'completed' && b.status !== 'completed') return 1
    if (a.status !== 'completed' && b.status === 'completed') return -1
    return (a.due_date ?? a.created_at ?? '').localeCompare(b.due_date ?? b.created_at ?? '')
  })
  const activeDealsCount = deals.filter(deal => PIPELINE_STAGES.some(stage => stage.id === deal.stage)).length
  const totalContribution = deals.reduce((sum, deal) => sum + (deal.est_value ?? 0), 0)
  const latestActivity = activities[0]
  const pendingAction = actions.find(action => action.status !== 'completed')
  const aiTopic = latestActivity?.ai_key_insights?.[0]
  const aiNextStep = pendingAction?.task_detail
  const showAiSnapshot = Boolean(aiTopic || aiNextStep)
  const companyPhone = contact.work_phone || contact.phone

  const companySubtitle = [
    contact.industry,
    romanizedName,
    contact.employee_count != null ? `${contact.employee_count.toLocaleString('zh-TW')} 員` : null,
  ].filter(Boolean).join(' · ')

  const personSubtitleLead = [contact.title, contact.company_name].filter(Boolean)

  const fieldTiles: InfoTileConfig[] = isCompany
    ? [
        { icon: Landmark, label: '法定名稱', value: contact.legal_name },
        { icon: BriefcaseBusiness, label: '產業', value: contact.industry },
        { icon: Users, label: '員工人數', value: contact.employee_count != null ? `${contact.employee_count.toLocaleString('zh-TW')} 員` : null },
        { icon: Globe, label: '網站', value: contact.website },
        { icon: MapPin, label: '地址', value: contact.address },
      ]
    : [
        { icon: BadgeInfo, label: '職稱', value: contact.title },
        { icon: Building2, label: '部門', value: contact.department },
        { icon: Phone, label: '公司電話', value: companyPhone, mono: true },
        { icon: Phone, label: '手機', value: contact.mobile, mono: true },
        { icon: Mail, label: 'Email', value: contact.email, mono: true },
        { icon: MessageCircle, label: 'LINE ID', value: contact.line_id, mono: true },
        { icon: MapPin, label: '地址', value: contact.address },
      ]

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
          address: emptyToUndefined(form.address),
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

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex items-center justify-between border-b border-[color:var(--color-outline)] px-5 py-4">
        <div>
          <h2 className="display-font text-xl font-bold text-[color:var(--color-text-primary)]">{contact.display_name}</h2>
          <p className="mt-1 text-xs text-[color:var(--color-text-secondary)]/70">
            {isCompany ? 'Account 公司視角' : 'Contact 個人視角'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setEditing(value => !value)}
            className="rounded-xl bg-[color:var(--color-primary-light)] px-3 py-2 text-xs font-semibold text-[color:var(--color-primary-dark)]"
          >
            {editing ? '取消編輯' : '編輯'}
          </button>
          <button onClick={onClose} className="text-slate-400 transition hover:text-slate-600">
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto bg-[color:var(--color-bg-base)] p-5">
        <div className="rounded-[24px] bg-white p-5 shadow-[var(--shadow-card)]">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start">
            <div className={`flex h-[72px] w-[72px] shrink-0 items-center justify-center ${isCompany ? 'rounded-[18px] bg-slate-100 text-slate-700' : 'rounded-full bg-[color:var(--color-primary-light)] text-[color:var(--color-primary-dark)]'} display-font text-[28px] font-bold`}>
              {isCompany ? <Building2 size={34} /> : getInitial(contact.display_name)}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="display-font text-[30px] font-bold tracking-[-0.02em] text-[color:var(--color-text-primary)]">
                  {contact.display_name}
                </h3>
                {romanizedName && (
                  <span className="text-sm font-medium lowercase tracking-[0.02em] text-[color:var(--color-text-secondary)]/60">
                    {romanizedName}
                  </span>
                )}
                {isVip && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700">
                    <ShieldCheck size={12} />
                    VIP
                  </span>
                )}
              </div>

              <div className="mt-2 text-sm text-[color:var(--color-text-secondary)]/80">
                {isCompany ? (
                  companySubtitle || '尚未補上產業、別名與員工規模'
                ) : personSubtitleLead.length > 0 ? (
                  <span>
                    {contact.title || '未填寫職稱'}
                    {contact.company_name && (
                      <>
                        {' · '}
                        {linkedCompany ? (
                          <button
                            type="button"
                            onClick={() => onSelectContact(linkedCompany)}
                            className="font-semibold text-[color:var(--color-primary-dark)] underline-offset-2 hover:underline"
                          >
                            {contact.company_name}
                          </button>
                        ) : (
                          <span className="font-semibold text-[color:var(--color-primary-dark)]">{contact.company_name}</span>
                        )}
                      </>
                    )}
                  </span>
                ) : (
                  '尚未補上職稱與公司'
                )}
              </div>

              {contact.tags.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {contact.tags.map(tag => (
                    <span key={tag} className="rounded-full bg-[color:var(--color-bg-base)] px-3 py-1 text-xs font-medium text-[color:var(--color-text-secondary)]">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-[color:var(--color-outline)]/70 pt-4 xl:border-l xl:border-t-0 xl:pl-5 xl:pt-0">
              <MiniStat label="進行中案件" value={activeDealsCount} />
              <MiniStat label="總貢獻" value={formatContribution(totalContribution)} />
            </div>
          </div>
        </div>

        <div className={showAiSnapshot ? 'grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]' : 'grid gap-5'}>
          <div className="rounded-[24px] bg-white p-5 shadow-[var(--shadow-card)]">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-[color:var(--color-text-secondary)]/60">
              {isCompany ? '公司資訊' : '聯絡資訊'}
            </h3>
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              {fieldTiles.map(tile => (
                <InfoTile key={tile.label} {...tile} />
              ))}
            </div>

            {contact.memo && (
              <div className="mt-5 border-t border-[color:var(--color-outline)]/70 pt-5">
                <h4 className="text-[11px] font-bold uppercase tracking-[0.12em] text-[color:var(--color-text-secondary)]/60">備忘錄</h4>
                <div className="mt-3 rounded-[18px] bg-[color:var(--color-bg-base)] px-4 py-3 text-sm leading-relaxed text-[color:var(--color-text-secondary)]">
                  {contact.memo}
                </div>
              </div>
            )}
          </div>

          {showAiSnapshot && (
            <div className="relative overflow-hidden rounded-[24px] bg-white p-4 shadow-[var(--shadow-card)]">
              <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#06C755_0%,#38BDF8_100%)]" />
              <div className="mt-1 flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--color-primary-light)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[color:var(--color-primary-dark)]">
                  <Sparkles size={12} />
                  AI Snapshot
                </span>
              </div>
              <div className="mt-4 space-y-4">
                {aiTopic && (
                  <div className="rounded-[18px] border border-sky-100 bg-sky-50/50 px-4 py-3">
                    <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-sky-700">破冰話題</div>
                    <p className="mt-2 text-sm leading-relaxed text-[color:var(--color-text-primary)]">{aiTopic}</p>
                  </div>
                )}
                {aiNextStep && (
                  <div className="rounded-[18px] border border-emerald-100 bg-emerald-50/60 px-4 py-3">
                    <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-700">建議下一步</div>
                    <p className="mt-2 text-sm leading-relaxed text-[color:var(--color-text-primary)]">{aiNextStep}</p>
                  </div>
                )}
              </div>
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
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[color:var(--color-primary-light)] text-[color:var(--color-primary-dark)]">
                        <UserRound size={18} />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[color:var(--color-text-primary)]">{member.display_name}</p>
                        <p className="truncate text-xs text-[color:var(--color-text-secondary)]/70">{[member.title, member.department].filter(Boolean).join(' · ') || '尚未補上職稱與部門'}</p>
                      </div>
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
              {activities.length === 0 ? (
                <div className="rounded-2xl bg-[color:var(--color-bg-base)] px-3 py-4 text-sm text-[color:var(--color-text-secondary)]/70">目前沒有互動記錄</div>
              ) : activities
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
              {actions.length === 0 ? (
                <div className="rounded-2xl bg-[color:var(--color-bg-base)] px-3 py-4 text-sm text-[color:var(--color-text-secondary)]/70">目前沒有待辦事項</div>
              ) : actions.slice(0, 5).map(action => (
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
