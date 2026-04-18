import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { Activity } from '../../api/dealDetail'

dayjs.extend(relativeTime)

const SENTIMENT_ICON: Record<string, string> = {
  Positive: '😊',
  Negative: '😟',
  Neutral: '😐',
}

function sentimentColor(s: string): string {
  if (s === 'Positive') return '#31A24C'
  if (s === 'Negative') return '#EF4444'
  return '#6B7280'
}

interface Props {
  activities: Activity[]
}

export default function ActivityTimeline({ activities }: Props) {
  const sorted = [...activities].sort((a, b) =>
    (b.created_at ?? '').localeCompare(a.created_at ?? '')
  )

  if (sorted.length === 0) {
    return (
      <div className="text-sm text-gray-400 text-center py-8">
        尚無互動記錄
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {sorted.map(act => (
        <div
          key={act.id}
          className="bg-gray-50 rounded-lg p-3 border-l-[3px]"
          style={{ borderLeftColor: sentimentColor(act.sentiment) }}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-gray-700">
              {SENTIMENT_ICON[act.sentiment] ?? '💬'} {act.sentiment}
            </span>
            {act.created_at && (
              <span className="text-xs text-gray-400 ml-auto">
                {dayjs(act.created_at).fromNow()}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">{act.raw_transcript}</p>
          {act.ai_key_insights.length > 0 && (
            <ul className="mt-2 space-y-1">
              {act.ai_key_insights.map((insight, i) => (
                <li key={i} className="text-xs text-gray-500 flex gap-1">
                  <span className="text-green-500 shrink-0">•</span>
                  {insight}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  )
}
