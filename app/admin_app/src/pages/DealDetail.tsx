import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useDeal, useDealActivities, useDealStakeholders, useDealActions } from '../api/dealDetail'
import { getStage } from '../constants/stages'
import DealPropertiesPanel from '../features/deal/DealPropertiesPanel'
import ActivityTimeline from '../features/deal/ActivityTimeline'
import DealActionsTab from '../features/deal/DealActionsTab'
import NluInlineInput from '../features/deal/NluInlineInput'

type RightTab = 'timeline' | 'actions'

export default function DealDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [rightTab, setRightTab] = useState<RightTab>('timeline')

  const dealId = id ?? ''
  const { data: deal, isLoading: dealLoading } = useDeal(dealId)
  const { data: activities = [] } = useDealActivities(dealId)
  const { data: stakeholders = [] } = useDealStakeholders(dealId)
  const { data: actions = [] } = useDealActions(dealId)

  if (dealLoading || !deal) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-[color:var(--color-text-secondary)]/60">
        {dealLoading ? '載入中…' : '找不到案件'}
      </div>
    )
  }

  const stage = getStage(deal.stage)
  const pendingCount = actions.filter(a => a.status === 'pending').length

  const contextHint = {
    entity_name: deal.entity_name,
    contact_id: deal.company_contact_id ?? undefined,
  }

  const handleNluSuccess = () => {
    // Invalidation handled by useConfirmCrm onSuccess
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col">
      {/* Header */}
      <div className="mb-6">
        <div className="mb-3 flex items-center gap-3">
        <button
          onClick={() => navigate('/deals')}
          className="text-slate-400 transition hover:text-slate-600"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-3">
          <h1 className="display-font text-[28px] font-bold text-[color:var(--color-text-primary)]">{deal.entity_name}</h1>
          {stage && (
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${stage.badgeClass}`}
            >
              {stage.label}
            </span>
          )}
        </div>
      </div>
        <div className="grid gap-3 md:grid-cols-3">
          {[
            { label: '預估金額', value: deal.est_value != null ? `NT$ ${deal.est_value.toLocaleString()}` : '未估金額', sub: 'TWD' },
            { label: '下一步日期', value: deal.next_action_date ?? '尚未安排', sub: deal.next_action_date ? '已設定' : '待更新' },
            { label: '待辦數量', value: pendingCount, sub: '進行中' },
          ].map(card => (
            <div key={card.label} className="rounded-[20px] border border-[color:var(--color-outline)] bg-white p-4 shadow-[var(--shadow-card)]">
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--color-text-secondary)]/65">{card.label}</div>
              <div className="display-font mt-3 text-2xl font-bold text-[color:var(--color-text-primary)]">{card.value}</div>
              <div className="mt-1 text-xs text-[color:var(--color-text-secondary)]/65">{card.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Two-column layout */}
      <div className="flex items-start gap-6">
        {/* Left: Properties + Stakeholders */}
        <div className="w-[320px] shrink-0">
          <DealPropertiesPanel deal={deal} stakeholders={stakeholders} />
        </div>

        {/* Right: Timeline / Actions tabs */}
        <div className="flex-1 rounded-[22px] border border-[color:var(--color-outline)] bg-white p-5 shadow-[var(--shadow-card)]">
          {/* Tabs */}
          <div className="mb-4 flex gap-2 border-b border-[color:var(--color-outline)] pb-3">
            <button
              onClick={() => setRightTab('timeline')}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                rightTab === 'timeline'
                  ? 'bg-[color:var(--color-primary-light)] text-[color:var(--color-primary-dark)]'
                  : 'bg-[color:var(--color-bg-section)] text-[color:var(--color-text-secondary)]'
              }`}
            >
              Timeline
            </button>
            <button
              onClick={() => setRightTab('actions')}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                rightTab === 'actions'
                  ? 'bg-[color:var(--color-primary-light)] text-[color:var(--color-primary-dark)]'
                  : 'bg-[color:var(--color-bg-section)] text-[color:var(--color-text-secondary)]'
              }`}
            >
              待辦 {pendingCount > 0 && `(${pendingCount})`}
            </button>
          </div>

          {rightTab === 'timeline' ? (
            <>
              <NluInlineInput
                dealId={dealId}
                contextHint={contextHint}
                onSuccess={handleNluSuccess}
              />
              <ActivityTimeline activities={activities} />
            </>
          ) : (
            <DealActionsTab dealId={dealId} actions={actions} />
          )}
        </div>
      </div>
    </div>
  )
}
