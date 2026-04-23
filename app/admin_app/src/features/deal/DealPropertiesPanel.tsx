import { useState } from 'react'
import dayjs from 'dayjs'
import { Edit2, Plus } from 'lucide-react'
import { Deal, DealUpdate, useUpdateDeal } from '../../api/deals'
import { Stakeholder, useAddStakeholder } from '../../api/dealDetail'
import { ALL_STAGES, getStage } from '../../constants/stages'

interface Props {
  deal: Deal
  stakeholders: Stakeholder[]
}

type EditableField = 'entity_name' | 'est_value' | 'next_action_date' | 'status_summary' | 'stage'

function FieldRow({
  label,
  value,
  field,
  type = 'text',
  onSave,
  displayValue,
}: {
  label: string
  value: string | number | null
  field: EditableField
  type?: 'text' | 'number' | 'date' | 'select'
  onSave: (field: EditableField, value: string) => void
  displayValue?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(value ?? ''))

  const save = () => {
    onSave(field, draft)
    setEditing(false)
  }

  const display = field === 'est_value' && value != null
    ? `NT$ ${Number(value).toLocaleString()}`
    : field === 'next_action_date' && value
    ? dayjs(value as string).format('YYYY/MM/DD')
    : (value ?? '—')

  if (type === 'select' && editing) {
    return (
      <div className="flex items-start gap-3 py-3">
        <span className="w-20 shrink-0 pt-1 text-[11px] font-bold uppercase tracking-[0.08em] text-[color:var(--color-text-secondary)]/60">{label}</span>
        <select
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={save}
          autoFocus
          className="flex-1 rounded-xl border border-[color:var(--color-outline)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--color-primary)]/30"
        >
          {ALL_STAGES.map(s => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
      </div>
    )
  }

  return (
    <div className="group flex items-start gap-3 py-3">
      <span className="w-20 shrink-0 pt-1 text-[11px] font-bold uppercase tracking-[0.08em] text-[color:var(--color-text-secondary)]/60">{label}</span>
      {editing ? (
        <input
          type={type}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={save}
          onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false) }}
          autoFocus
          className="flex-1 rounded-xl border border-[color:var(--color-outline)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--color-primary)]/30"
        />
      ) : (
        <span
          className="flex flex-1 cursor-pointer items-center gap-1 rounded-xl px-2 py-2 text-sm text-[color:var(--color-text-primary)] transition hover:bg-white"
          onClick={() => { setDraft(String(value ?? '')); setEditing(true) }}
        >
          {displayValue ?? String(display)}
          <Edit2 size={11} className="shrink-0 text-slate-300 group-hover:text-slate-500" />
        </span>
      )}
    </div>
  )
}

function AddStakeholderForm({ dealId, onDone }: { dealId: string; onDone: () => void }) {
  const [name, setName] = useState('')
  const [role, setRole] = useState('Champion')
  const [attitude, setAttitude] = useState('Supportive')
  const add = useAddStakeholder(dealId)

  const submit = () => {
    if (!name.trim()) return
    add.mutate({ name: name.trim(), role, attitude }, { onSuccess: onDone })
  }

  return (
    <div className="mt-3 space-y-2 rounded-2xl bg-white p-3">
      <input
        placeholder="姓名"
        value={name}
        onChange={e => setName(e.target.value)}
        className="w-full rounded-xl border border-[color:var(--color-outline)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--color-primary)]/30"
        autoFocus
      />
      <div className="flex gap-2">
        <select value={role} onChange={e => setRole(e.target.value)}
          className="flex-1 rounded-xl border border-[color:var(--color-outline)] px-3 py-2 text-xs">
          <option>Champion</option>
          <option>Decision Maker</option>
          <option>Gatekeeper</option>
        </select>
        <select value={attitude} onChange={e => setAttitude(e.target.value)}
          className="flex-1 rounded-xl border border-[color:var(--color-outline)] px-3 py-2 text-xs">
          <option>Supportive</option>
          <option>Neutral</option>
          <option>Skeptical</option>
        </select>
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={onDone} className="text-xs text-[color:var(--color-text-secondary)]/70 hover:text-[color:var(--color-text-secondary)]">取消</button>
        <button onClick={submit} disabled={add.isPending}
          className="rounded-lg bg-[color:var(--color-primary)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[color:var(--color-primary-dark)] disabled:opacity-50">
          新增
        </button>
      </div>
    </div>
  )
}

export default function DealPropertiesPanel({ deal, stakeholders }: Props) {
  const [showAddStakeholder, setShowAddStakeholder] = useState(false)
  const updateDeal = useUpdateDeal()

  const handleFieldSave = (field: EditableField, rawValue: string) => {
    const update: DealUpdate = {}
    if (field === 'est_value') update.est_value = rawValue ? Number(rawValue) : null
    else if (field === 'stage') update.stage = rawValue
    else (update as Record<string, unknown>)[field] = rawValue
    updateDeal.mutate({ id: deal.id, update })
  }

  return (
    <div className="rounded-[20px] border border-[color:var(--color-outline)] bg-white p-5 shadow-[var(--shadow-card)]">
      <div className="mb-4">
        <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-[color:var(--color-text-secondary)]/60">
          Deal Properties
        </div>
        <div className="display-font mt-2 text-xl font-bold text-[color:var(--color-text-primary)]">
          案件資料
        </div>
      </div>
      <FieldRow label="Company" value={deal.entity_name} field="entity_name" onSave={handleFieldSave} />
      <FieldRow label="Stage" value={deal.stage} field="stage" type="select" onSave={handleFieldSave} displayValue={getStage(deal.stage)?.label ?? deal.stage} />
      <FieldRow label="金額" value={deal.est_value} field="est_value" type="number" onSave={handleFieldSave} />
      <FieldRow label="下一步" value={deal.next_action_date} field="next_action_date" type="date" onSave={handleFieldSave} />
      <FieldRow label="摘要" value={deal.status_summary} field="status_summary" onSave={handleFieldSave} />

      <div className="mt-5 border-t border-[color:var(--color-outline)] pt-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-[color:var(--color-text-secondary)]/60">
            Stakeholders <span className="mono ml-1 text-[10px]">{stakeholders.length}</span>
          </h3>
        </div>
        <div className="space-y-2">
          {stakeholders.map(s => (
            <div key={s.id} className="rounded-2xl bg-[color:var(--color-bg-base)] px-3 py-3 text-xs">
              <span className="font-semibold text-[color:var(--color-text-primary)]">{s.name}</span>
              {s.title && <span className="text-[color:var(--color-text-secondary)]/65"> · {s.title}</span>}
              <span className="text-[color:var(--color-text-secondary)]/65"> · {s.role}</span>
            </div>
          ))}
        </div>
        {showAddStakeholder ? (
          <AddStakeholderForm dealId={deal.id} onDone={() => setShowAddStakeholder(false)} />
        ) : (
          <button
            onClick={() => setShowAddStakeholder(true)}
            className="mt-3 inline-flex items-center gap-1 rounded-full bg-[color:var(--color-primary-light)] px-3 py-2 text-xs font-semibold text-[color:var(--color-primary-dark)]"
          >
            <Plus size={12} /> 新增 Stakeholder
          </button>
        )}
      </div>
    </div>
  )
}
