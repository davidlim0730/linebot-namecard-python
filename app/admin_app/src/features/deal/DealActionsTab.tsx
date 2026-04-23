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
    // completed always last
    if (a.status === 'completed' && b.status !== 'completed') return 1
    if (a.status !== 'completed' && b.status === 'completed') return -1
    // among pending: null due_date goes to bottom
    if (!a.due_date && !b.due_date) return 0
    if (!a.due_date) return 1
    if (!b.due_date) return -1
    return a.due_date < b.due_date ? -1 : 1
  })

  const toggle = (action: Action) => {
    const newStatus = action.status === 'completed' ? 'pending' : 'completed'
    updateAction.mutate({ id: action.id, status: newStatus })
  }

  if (sorted.length === 0) {
    return <div className="rounded-2xl bg-[color:var(--color-bg-base)] px-4 py-10 text-center text-sm text-[color:var(--color-text-secondary)]/70">尚無待辦</div>
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
            className={`flex items-start gap-3 rounded-2xl px-4 py-4 ${
              isDone ? 'border-l-[3px] border-l-transparent bg-[color:var(--color-bg-base)] opacity-60' : `border-l-[3px] ${isOverdue ? 'border-l-[color:var(--color-danger)]' : 'border-l-transparent'} bg-white shadow-[var(--shadow-card)]`
            }`}
          >
            <button
              onClick={() => toggle(action)}
              className="mt-0.5 shrink-0 text-slate-400 transition hover:text-[color:var(--color-primary)]"
            >
              {isDone ? <CheckCircle size={18} className="text-green-500" /> : <Circle size={18} />}
            </button>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold ${isDone ? 'line-through text-slate-400' : 'text-[color:var(--color-text-primary)]'}`}>
                {action.task_detail}
              </p>
              {action.due_date && (
                <div className={`mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  isOverdue ? 'bg-red-50 text-[color:var(--color-danger)]' : 'bg-slate-100 text-slate-500'
                }`}>
                  {isOverdue && <AlertCircle size={11} />}
                  {!isOverdue && <AlertCircle size={11} className="opacity-0" />}
                  {action.due_date}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
