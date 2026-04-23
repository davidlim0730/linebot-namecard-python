import { useState } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { Deal, useUpdateDeal } from '../../api/deals'
import { PIPELINE_STAGES } from '../../constants/stages'
import DealCard from './DealCard'
import DealStageTabs from './DealStageTabs'

interface DealKanbanProps {
  deals: Deal[]
}

export default function DealKanban({ deals }: DealKanbanProps) {
  const [activeTab, setActiveTab] = useState<'active' | 'won' | 'lost'>('active')
  const updateDeal = useUpdateDeal()

  const pipelineIdSet = new Set<string>(PIPELINE_STAGES.map(s => s.id))
  const activeDeals = deals.filter(d => pipelineIdSet.has(d.stage))
  const wonDeals = deals.filter(d => d.stage === '成交')
  const lostDeals = deals.filter(d => d.stage === '失敗')

  const counts = {
    active: activeDeals.length,
    won: wonDeals.length,
    lost: lostDeals.length,
  }

  const activeValue = activeDeals.reduce((sum, deal) => sum + (deal.est_value ?? 0), 0)
  const wonValue = wonDeals.reduce((sum, deal) => sum + (deal.est_value ?? 0), 0)

  function onDragEnd(result: DropResult) {
    if (!result.destination) return
    const newStage = result.destination.droppableId
    const dealId = result.draggableId
    const deal = deals.find(d => d.id === dealId)
    if (!deal || deal.stage === newStage) return
    updateDeal.mutate({ id: dealId, update: { stage: newStage } })
  }

  if (activeTab !== 'active') {
    const list = activeTab === 'won' ? wonDeals : lostDeals
    return (
      <div className="flex flex-col">
        <DealStageTabs activeTab={activeTab} onChange={setActiveTab} counts={counts} />
        <div className="mb-4 rounded-[20px] border border-[color:var(--color-outline)] bg-white px-5 py-4 shadow-[var(--shadow-card)]">
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--color-text-secondary)]/65">
            {activeTab === 'won' ? '本月成交金額' : '失敗案件總數'}
          </div>
          <div className="display-font mt-2 text-3xl font-bold text-[color:var(--color-text-primary)]">
            {activeTab === 'won' ? `NT$ ${wonValue.toLocaleString()}` : list.length}
          </div>
        </div>
        <div className="grid max-w-3xl grid-cols-1 gap-3">
          {list.length === 0 ? (
            <div className="rounded-[20px] bg-white px-4 py-12 text-center text-sm text-[color:var(--color-text-secondary)]/70 shadow-[var(--shadow-card)]">
              暫無案件
            </div>
          ) : (
            list.map(deal => <DealCard key={deal.id} deal={deal} />)
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <DealStageTabs activeTab={activeTab} onChange={setActiveTab} counts={counts} />
      <div className="mb-5 grid gap-3 md:grid-cols-4">
        {[
          { label: '進行中案件', value: activeDeals.length, sub: '活躍 pipeline', accent: 'bg-slate-100 text-slate-700' },
          { label: 'Pipeline 總額', value: `NT$ ${activeValue.toLocaleString()}`, sub: '預估 TWD', accent: 'bg-[color:var(--color-primary-light)] text-[color:var(--color-primary-dark)]' },
          { label: '本月成交', value: `NT$ ${wonValue.toLocaleString()}`, sub: '已簽約', accent: 'bg-amber-50 text-amber-700' },
          { label: '失敗案件', value: lostDeals.length, sub: '需複盤', accent: 'bg-red-50 text-[color:var(--color-danger)]' },
        ].map(card => (
          <div key={card.label} className="rounded-[20px] border border-[color:var(--color-outline)] bg-white p-4 shadow-[var(--shadow-card)]">
            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--color-text-secondary)]/65">
              {card.label}
            </div>
            <div className="display-font mt-3 text-2xl font-bold text-[color:var(--color-text-primary)]">
              {card.value}
            </div>
            <div className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${card.accent}`}>
              {card.sub}
            </div>
          </div>
        ))}
      </div>
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="kanban-scroll flex gap-3 overflow-x-auto pb-4">
          {PIPELINE_STAGES.map(stage => {
            const stageDeals = activeDeals.filter(d => d.stage === stage.id)
            return (
              <div key={stage.id} className="flex min-h-[420px] min-w-[264px] max-w-[264px] flex-col rounded-2xl bg-[color:var(--color-bg-section)] p-2.5">
                <div className="mb-2 px-1">
                  <div className="mb-1 flex items-center gap-2">
                    <div className={`h-2 w-2 shrink-0 rounded-full ${stage.dotClass}`} />
                    <span className="display-font truncate text-[13px] font-bold text-[color:var(--color-text-primary)]">{stage.label}</span>
                    <span className="mono ml-auto rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-[color:var(--color-text-secondary)]/75">
                      {stageDeals.length}
                    </span>
                  </div>
                  {stageDeals.length > 0 && (
                    <div className="pl-4 text-[11px] text-[color:var(--color-text-secondary)]/60">
                      NT$ {stageDeals.reduce((sum, item) => sum + (item.est_value ?? 0), 0).toLocaleString()}
                    </div>
                  )}
                </div>
                <Droppable droppableId={stage.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex min-h-[84px] flex-1 flex-col gap-2 rounded-xl p-1.5 transition ${
                        snapshot.isDraggingOver ? 'bg-[color:var(--color-primary-light)] outline outline-2 outline-[color:var(--color-primary)]/40' : 'bg-transparent'
                      }`}
                    >
                      {stageDeals.length === 0 && !snapshot.isDraggingOver && (
                        <div className="flex min-h-[84px] flex-1 items-center justify-center rounded-xl border border-dashed border-[color:var(--color-outline)] bg-white/50 px-3 text-center text-[11px] text-[color:var(--color-text-secondary)]/55">
                          尚無案件
                          <br />
                          拖曳至此
                        </div>
                      )}
                      {stageDeals.map((deal, index) => (
                        <Draggable key={deal.id} draggableId={deal.id} index={index}>
                          {(prov, snap) => (
                            <div
                              ref={prov.innerRef}
                              {...prov.draggableProps}
                              {...prov.dragHandleProps}
                            >
                              <DealCard deal={deal} isDragging={snap.isDragging} />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            )
          })}
        </div>
      </DragDropContext>
    </div>
  )
}
