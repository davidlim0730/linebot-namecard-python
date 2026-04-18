import dayjs from 'dayjs'
import { CheckCircle, Circle, AlertCircle } from 'lucide-react'
import { Action, useUpdateAction } from '../../api/dealDetail'

interface Props {
  dealId: string
  actions: Action[]
}

export default function DealActionsTab({ dealId, actions }: Props) {
  const updateAction = useUpdateAction(dealId)

  const sorted = [...actions].sort((a, b) => {
    if (a.status === 'completed' && b.status !== 'completed') return 1
    if (a.status !== 'completed' && b.status === 'completed') return -1
    return (a.due_date ?? '').localeCompare(b.due_date ?? '')
  })

  const toggle = (action: Action) => {
    const newStatus = action.status === 'completed' ? 'pending' : 'completed'
    updateAction.mutate({ id: action.id, status: newStatus })
  }

  if (sorted.length === 0) {
    return <div className="text-sm text-gray-400 text-center py-8">尚無待辦</div>
  }

  return (
    <div className="space-y-2">
      {sorted.map(action => {
        const isOverdue = action.due_date
          ? action.status !== 'completed' && dayjs(action.due_date).isBefore(dayjs(), 'day')
          : false
        const isDone = action.status === 'completed'

        return (
          <div
            key={action.id}
            className={`flex items-start gap-3 p-3 rounded-lg border ${
              isDone ? 'bg-gray-50 border-gray-100 opacity-60' : 'bg-white border-gray-200'
            }`}
          >
            <button
              onClick={() => toggle(action)}
              className="mt-0.5 shrink-0 text-gray-400 hover:text-green-500 transition-colors"
            >
              {isDone ? <CheckCircle size={18} className="text-green-500" /> : <Circle size={18} />}
            </button>
            <div className="flex-1 min-w-0">
              <p className={`text-sm ${isDone ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                {action.task_detail}
              </p>
              {action.due_date && (
                <div className={`flex items-center gap-1 mt-1 text-xs ${
                  isOverdue ? 'text-red-500' : 'text-gray-400'
                }`}>
                  {isOverdue && <AlertCircle size={11} />}
                  📅 {action.due_date}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
