import { useMemo, useState } from 'react'
import { AlertCircle, CalendarDays, CheckCircle2, Filter, Plus } from 'lucide-react'
import dayjs from 'dayjs'
import { useActions, useUpdateAnyAction } from '../api/actions'
import type { Action } from '../api/dealDetail'

type TabId = 'today' | 'week' | 'all' | 'done'

function bucketActions(actions: Action[], tab: TabId) {
  const today = dayjs()
  if (tab === 'done') return actions.filter(action => action.status === 'completed')
  if (tab === 'all') return actions.filter(action => action.status !== 'completed')
  if (tab === 'today') {
    return actions.filter(action => {
      if (action.status === 'completed' || !action.due_date) return false
      return dayjs(action.due_date).isSame(today, 'day') || dayjs(action.due_date).isBefore(today, 'day')
    })
  }
  return actions.filter(action => {
    if (action.status === 'completed' || !action.due_date) return false
    const diff = dayjs(action.due_date).diff(today, 'day')
    return diff <= 7
  })
}

function ActionCard({
  action,
  onToggle,
}: {
  action: Action
  onToggle: (action: Action) => void
}) {
  const isDone = action.status === 'completed'
  const overdue = action.due_date && !isDone && dayjs(action.due_date).isBefore(dayjs(), 'day')
  const dueToday = action.due_date && !isDone && dayjs(action.due_date).isSame(dayjs(), 'day')
  const accentClass = overdue
    ? 'border-l-[3px] border-l-[color:var(--color-danger)]'
    : dueToday
      ? 'border-l-[3px] border-l-[color:var(--color-warning)]'
      : 'border-l-[3px] border-l-transparent'

  return (
    <div
      className={`rounded-2xl border bg-white px-4 py-4 shadow-[var(--shadow-card)] transition ${
        isDone ? 'border-slate-100 opacity-60' : overdue ? 'border-red-200' : 'border-[color:var(--color-outline)]'
      } ${accentClass}`}
    >
      <div className="flex items-start gap-3">
        <button
          onClick={() => onToggle(action)}
          className="mt-0.5 shrink-0 text-slate-400 transition hover:text-[color:var(--color-primary-dark)]"
        >
          {isDone ? (
            <CheckCircle2 size={18} className="text-[color:var(--color-primary)]" />
          ) : (
            <div className="h-[18px] w-[18px] rounded-md border-2 border-[color:var(--color-outline)]" />
          )}
        </button>
        <div className="min-w-0 flex-1">
          <div className={`text-sm font-semibold ${isDone ? 'line-through text-slate-400' : 'text-[color:var(--color-text-primary)]'}`}>
            {action.task_detail}
          </div>
          <div className="mt-1 text-xs text-[color:var(--color-text-secondary)]/75">
            {action.entity_name || '未指定聯絡對象'}
          </div>
        </div>
        {action.due_date && (
          <div
            className={`flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
              overdue
                ? 'bg-red-50 text-[color:var(--color-danger)]'
                : dueToday
                  ? 'bg-amber-50 text-amber-700'
                  : 'bg-slate-100 text-slate-600'
            }`}
          >
            {overdue ? <AlertCircle size={12} /> : <CalendarDays size={12} />}
            <span>{action.due_date}</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default function ActionsPage() {
  const [tab, setTab] = useState<TabId>('today')
  const { data: actions = [], isLoading, error } = useActions()
  const updateAction = useUpdateAnyAction()

  const grouped = useMemo(() => {
    return {
      today: bucketActions(actions, 'today'),
      week: bucketActions(actions, 'week'),
      all: bucketActions(actions, 'all'),
      done: bucketActions(actions, 'done'),
    }
  }, [actions])

  const overdueCount = actions.filter(action => action.status !== 'completed' && action.due_date && dayjs(action.due_date).isBefore(dayjs(), 'day')).length

  const cards = grouped[tab]

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="grid gap-3 md:grid-cols-4">
        {[
          { label: '今日到期', value: grouped.today.length, sub: '需完成', accent: 'bg-amber-50 text-amber-700' },
          { label: '已逾期', value: overdueCount, sub: '需立即處理', accent: 'bg-red-50 text-[color:var(--color-danger)]' },
          { label: '本週', value: grouped.week.length, sub: '即將到期', accent: 'bg-slate-100 text-slate-700' },
          { label: '已完成', value: grouped.done.length, sub: '累積', accent: 'bg-[color:var(--color-primary-light)] text-[color:var(--color-primary-dark)]' },
        ].map(card => (
          <div key={card.label} className="rounded-[var(--radius-card)] border border-[color:var(--color-outline)] bg-white p-4 shadow-[var(--shadow-card)]">
            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--color-text-secondary)]/65">
              {card.label}
            </div>
            <div className="display-font mt-3 text-3xl font-bold text-[color:var(--color-text-primary)]">
              {card.value}
            </div>
            <div className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${card.accent}`}>
              {card.sub}
            </div>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-[22px] border border-[color:var(--color-outline)] bg-white shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-center gap-3 border-b border-[color:var(--color-outline)] px-5 py-4">
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'today', label: '今日', count: grouped.today.length },
              { id: 'week', label: '本週', count: grouped.week.length },
              { id: 'all', label: '全部', count: grouped.all.length },
              { id: 'done', label: '已完成', count: grouped.done.length },
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setTab(item.id as TabId)}
                className={`rounded-full px-3 py-2 text-sm font-semibold transition ${
                  tab === item.id
                    ? 'bg-[color:var(--color-primary-light)] text-[color:var(--color-primary-dark)]'
                    : 'bg-[color:var(--color-bg-section)] text-[color:var(--color-text-secondary)]'
                }`}
              >
                {item.label} <span className="mono ml-1 text-[11px] opacity-70">{item.count}</span>
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button className="inline-flex h-10 items-center gap-2 rounded-[var(--radius-button)] border border-[color:var(--color-outline)] px-3 text-sm font-semibold text-[color:var(--color-text-secondary)] transition hover:bg-[color:var(--color-bg-section)]">
              <Filter size={14} />
              篩選
            </button>
            <button className="inline-flex h-10 items-center gap-2 rounded-[var(--radius-button)] bg-[color:var(--color-primary)] px-4 text-sm font-semibold text-white transition hover:bg-[color:var(--color-primary-dark)]">
              <Plus size={14} />
              新增待辦
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-4 p-5">
          {isLoading && (
            <div className="grid gap-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="shimmer h-20 rounded-2xl" />
              ))}
            </div>
          )}

          {error && !isLoading && (
            <div className="rounded-2xl bg-red-50 px-4 py-6 text-center text-sm text-[color:var(--color-danger)]">
              載入待辦失敗，請重新整理
            </div>
          )}

          {!isLoading && !error && cards.length === 0 && (
            <div className="rounded-2xl bg-[color:var(--color-bg-base)] px-4 py-12 text-center text-sm text-[color:var(--color-text-secondary)]/70">
              這個分頁目前沒有待辦事項
            </div>
          )}

          {!isLoading && !error && cards.length > 0 && (
            <div className="grid gap-3">
              {cards.map(action => (
                <ActionCard
                  key={action.id}
                  action={action}
                  onToggle={current => {
                    updateAction.mutate({
                      id: current.id,
                      status: current.status === 'completed' ? 'pending' : 'completed',
                    })
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
