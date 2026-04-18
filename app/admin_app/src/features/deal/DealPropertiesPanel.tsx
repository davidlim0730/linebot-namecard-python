import { useState } from 'react'
import dayjs from 'dayjs'
import { Edit2, Plus } from 'lucide-react'
import { Deal, DealUpdate, useUpdateDeal } from '../../api/deals'
import { Stakeholder, useAddStakeholder } from '../../api/dealDetail'
import { ALL_STAGES } from '../../constants/stages'

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
}: {
  label: string
  value: string | number | null
  field: EditableField
  type?: 'text' | 'number' | 'date' | 'select'
  onSave: (field: EditableField, value: string) => void
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
      <div className="flex items-start gap-2 py-2 border-b border-gray-50">
        <span className="text-xs text-gray-400 w-24 shrink-0 pt-1">{label}</span>
        <select
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={save}
          autoFocus
          className="flex-1 text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-green-400"
        >
          {ALL_STAGES.map(s => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-2 py-2 border-b border-gray-50 group">
      <span className="text-xs text-gray-400 w-24 shrink-0 pt-1">{label}</span>
      {editing ? (
        <input
          type={type}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={save}
          onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false) }}
          autoFocus
          className="flex-1 text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-green-400"
        />
      ) : (
        <span
          className="flex-1 text-sm text-gray-700 cursor-pointer hover:bg-gray-50 px-1 rounded group-hover:text-gray-900 flex items-center gap-1"
          onClick={() => { setDraft(String(value ?? '')); setEditing(true) }}
        >
          {String(display)}
          <Edit2 size={11} className="text-gray-300 group-hover:text-gray-400 shrink-0" />
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
    <div className="bg-gray-50 rounded-lg p-3 mt-2 space-y-2">
      <input
        placeholder="姓名"
        value={name}
        onChange={e => setName(e.target.value)}
        className="w-full text-sm border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-green-400"
        autoFocus
      />
      <div className="flex gap-2">
        <select value={role} onChange={e => setRole(e.target.value)}
          className="flex-1 text-xs border border-gray-200 rounded px-2 py-1">
          <option>Champion</option>
          <option>Decision Maker</option>
          <option>Gatekeeper</option>
        </select>
        <select value={attitude} onChange={e => setAttitude(e.target.value)}
          className="flex-1 text-xs border border-gray-200 rounded px-2 py-1">
          <option>Supportive</option>
          <option>Neutral</option>
          <option>Skeptical</option>
        </select>
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={onDone} className="text-xs text-gray-400 hover:text-gray-600">取消</button>
        <button onClick={submit} disabled={add.isPending}
          className="text-xs bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 disabled:opacity-50">
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
    <div className="bg-white rounded-xl p-5 space-y-1">
      <h2 className="text-sm font-semibold text-gray-500 mb-3">📝 屬性</h2>
      <FieldRow label="Company" value={deal.entity_name} field="entity_name" onSave={handleFieldSave} />
      <FieldRow label="Stage" value={deal.stage} field="stage" type="select" onSave={handleFieldSave} />
      <FieldRow label="金額" value={deal.est_value} field="est_value" type="number" onSave={handleFieldSave} />
      <FieldRow label="下一步" value={deal.next_action_date} field="next_action_date" type="date" onSave={handleFieldSave} />
      <FieldRow label="摘要" value={deal.status_summary} field="status_summary" onSave={handleFieldSave} />

      <div className="mt-4 pt-3 border-t border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-500">👥 Stakeholders ({stakeholders.length})</h3>
        </div>
        <div className="space-y-1">
          {stakeholders.map(s => (
            <div key={s.id} className="bg-gray-50 rounded px-3 py-2 text-xs">
              <span className="font-medium text-gray-700">{s.name}</span>
              {s.title && <span className="text-gray-400"> · {s.title}</span>}
              <span className="text-gray-400"> · {s.role}</span>
            </div>
          ))}
        </div>
        {showAddStakeholder ? (
          <AddStakeholderForm dealId={deal.id} onDone={() => setShowAddStakeholder(false)} />
        ) : (
          <button
            onClick={() => setShowAddStakeholder(true)}
            className="mt-2 flex items-center gap-1 text-xs text-green-600 hover:text-green-700"
          >
            <Plus size={12} /> 新增 Stakeholder
          </button>
        )}
      </div>
    </div>
  )
}
