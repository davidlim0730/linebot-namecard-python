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
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
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
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/deals')}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-gray-800">{deal.entity_name}</h1>
          {stage && (
            <span
              className="text-xs font-medium px-2 py-1 rounded-full text-white"
              style={{ backgroundColor: stage.color }}
            >
              {stage.label}
            </span>
          )}
        </div>
      </div>

      {/* Two-column layout */}
      <div className="flex gap-6 items-start">
        {/* Left: Properties + Stakeholders */}
        <div className="w-64 shrink-0">
          <DealPropertiesPanel deal={deal} stakeholders={stakeholders} />
        </div>

        {/* Right: Timeline / Actions tabs */}
        <div className="flex-1 bg-white rounded-xl p-5">
          {/* Tabs */}
          <div className="flex gap-1 border-b border-gray-100 mb-4">
            <button
              onClick={() => setRightTab('timeline')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                rightTab === 'timeline'
                  ? 'border-green-500 text-green-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              💬 Timeline
            </button>
            <button
              onClick={() => setRightTab('actions')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                rightTab === 'actions'
                  ? 'border-green-500 text-green-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              ✅ 待辦 {pendingCount > 0 && `(${pendingCount})`}
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
