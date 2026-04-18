import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { AlertCircle } from 'lucide-react'
import { Deal } from '../../api/deals'
import { getStage } from '../../constants/stages'

dayjs.extend(relativeTime)

interface DealCardProps {
  deal: Deal
  isDragging?: boolean
}

function ownerInitial(userId: string | null): string {
  if (!userId) return '?'
  return userId.slice(-2).toUpperCase()
}

function ownerColor(userId: string | null): string {
  if (!userId) return '#9CA3AF'
  const hash = userId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  const colors = ['#06C755', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899', '#10B981']
  return colors[hash % colors.length]
}

export default function DealCard({ deal, isDragging }: DealCardProps) {
  const navigate = useNavigate()
  const stage = getStage(deal.stage)
  const accentColor = stage?.color ?? '#6B7280'

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
      className={`bg-white rounded-lg p-3 cursor-pointer border-l-[3px] shadow-sm hover:shadow-md transition-shadow ${
        isDragging ? 'shadow-lg rotate-1' : ''
      }`}
      style={{ borderLeftColor: accentColor }}
    >
      <div className="font-medium text-sm text-gray-800 leading-snug line-clamp-2">
        {deal.entity_name}
      </div>
      <div className="text-xs text-gray-500 mt-1">
        {deal.est_value != null
          ? `NT$ ${deal.est_value.toLocaleString()}`
          : '未估金額'}
      </div>
      {(daysLabel || deal.added_by) && (
        <div className="flex items-center justify-between mt-2">
          {daysLabel ? (
            <div className={`flex items-center gap-1 text-xs ${isOverdue ? 'text-red-500' : 'text-gray-400'}`}>
              {isOverdue && <AlertCircle size={12} />}
              📅 {deal.next_action_date} ({daysLabel})
            </div>
          ) : (
            <div />
          )}
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
            style={{ backgroundColor: ownerColor(deal.added_by) }}
            title={deal.added_by ?? ''}
          >
            {ownerInitial(deal.added_by)}
          </div>
        </div>
      )}
    </div>
  )
}
