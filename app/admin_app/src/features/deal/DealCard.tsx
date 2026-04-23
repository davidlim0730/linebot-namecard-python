import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { AlertCircle } from 'lucide-react'
import { Deal } from '../../api/deals'

dayjs.extend(relativeTime)

interface DealCardProps {
  deal: Deal
  isDragging?: boolean
}

function ownerInitial(userId: string | null): string {
  if (!userId) return '?'
  // LINE user IDs are opaque — use hash-based letter as visual identity placeholder
  const hash = userId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return String.fromCharCode(65 + (hash % 26))
}

function ownerTone(userId: string | null): string {
  if (!userId) return 'bg-slate-400'
  const hash = userId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  const colors = ['bg-emerald-500', 'bg-blue-500', 'bg-violet-500', 'bg-amber-500', 'bg-red-500', 'bg-pink-500', 'bg-teal-500']
  return colors[hash % colors.length]
}

function stageBorderTone(stageId: string): string {
  const tones: Record<string, string> = {
    '0': 'border-l-slate-500',
    '1': 'border-l-blue-500',
    '2': 'border-l-violet-500',
    '3': 'border-l-amber-500',
    '4': 'border-l-red-500',
    '5': 'border-l-pink-500',
    '6': 'border-l-emerald-500',
    '成交': 'border-l-transparent',
    '失敗': 'border-l-transparent',
  }
  return tones[stageId] ?? 'border-l-slate-500'
}

export default function DealCard({ deal, isDragging }: DealCardProps) {
  const navigate = useNavigate()
  const accentClass = stageBorderTone(deal.stage)

  const isOverdue = deal.next_action_date
    ? dayjs(deal.next_action_date).isBefore(dayjs(), 'day')
    : false
  const daysLabel = deal.next_action_date
    ? (() => {
        const diff = dayjs(deal.next_action_date).diff(dayjs(), 'day')
        if (diff === 0) return '今天'
        if (diff > 0) return `${diff} 天後`
        return `${Math.abs(diff)} 天前`
      })()
    : null

  return (
    <div
      onClick={() => navigate(`/deals/${deal.id}`)}
      className={`deal-card cursor-pointer rounded-2xl border-l-[3px] bg-white p-3.5 shadow-[var(--shadow-card)] ${accentClass} ${
        isDragging ? 'rotate-1 shadow-[var(--shadow-card-hover)]' : ''
      }`}
    >
      <div className="mb-1 flex items-start justify-between gap-2">
        <div className="display-font line-clamp-2 text-[13.5px] font-bold leading-snug text-[color:var(--color-text-primary)]">
          {deal.entity_name}
        </div>
      </div>
      <div className="display-font text-[18px] font-bold leading-none tracking-[-0.02em] text-[color:var(--color-text-primary)]">
        {deal.est_value != null ? `NT$ ${deal.est_value.toLocaleString()}` : '未估金額'}
        {deal.est_value != null && (
          <span className="ml-1 text-[10px] font-medium text-[color:var(--color-text-secondary)]/55">TWD</span>
        )}
      </div>
      <div className="mt-2 line-clamp-2 text-xs leading-relaxed text-[color:var(--color-text-secondary)]/85">
        {deal.status_summary || '尚未建立摘要，點開後可補充案件進度與下一步。'}
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 border-t border-[color:var(--color-outline)]/40 pt-2.5">
        <div className={`flex min-w-0 items-center gap-1 text-[11px] font-semibold ${isOverdue ? 'text-[color:var(--color-danger)]' : 'text-[color:var(--color-text-secondary)]/80'}`}>
          {isOverdue && <AlertCircle size={12} />}
          <span className="truncate">
            {daysLabel ? `${daysLabel} · ${deal.next_action_date}` : '尚未安排下一步'}
          </span>
        </div>
        <div
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold text-white ${ownerTone(deal.added_by)}`}
          title={deal.added_by ?? ''}
        >
          {ownerInitial(deal.added_by)}
        </div>
      </div>
    </div>
  )
}
