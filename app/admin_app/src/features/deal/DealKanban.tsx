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

  const pipelineIds = PIPELINE_STAGES.map(s => s.id)
  const activeDeals = deals.filter(d => pipelineIds.includes(d.stage as typeof pipelineIds[number]))
  const wonDeals = deals.filter(d => d.stage === '成交')
  const lostDeals = deals.filter(d => d.stage === '失敗')

  const counts = {
    active: activeDeals.length,
    won: wonDeals.length,
    lost: lostDeals.length,
  }

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
      <div>
        <DealStageTabs activeTab={activeTab} onChange={setActiveTab} counts={counts} />
        <div className="grid grid-cols-1 gap-3 max-w-2xl">
          {list.length === 0 ? (
            <div className="text-gray-400 text-sm py-8 text-center">暫無案件</div>
          ) : (
            list.map(deal => <DealCard key={deal.id} deal={deal} />)
          )}
        </div>
      </div>
    )
  }

  return (
    <div>
      <DealStageTabs activeTab={activeTab} onChange={setActiveTab} counts={counts} />
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-4">
          {PIPELINE_STAGES.map(stage => {
            const stageDeals = activeDeals.filter(d => d.stage === stage.id)
            return (
              <div key={stage.id} className="flex-1 min-w-[180px] max-w-[260px]">
                <div className="flex items-center gap-2 mb-2 px-1">
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: stage.color }}
                  />
                  <span className="text-xs font-semibold text-gray-600 truncate">{stage.label}</span>
                  <span className="text-xs text-gray-400 ml-auto">{stageDeals.length}</span>
                </div>
                <Droppable droppableId={stage.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`min-h-[80px] rounded-lg p-2 space-y-2 transition-colors ${
                        snapshot.isDraggingOver ? 'bg-green-50 ring-1 ring-green-300' : 'bg-gray-100'
                      }`}
                    >
                      {stageDeals.length === 0 && !snapshot.isDraggingOver && (
                        <div className="text-xs text-gray-300 text-center py-4 border-2 border-dashed border-gray-200 rounded-md">
                          拖曳卡片到此
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
