import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { Activity } from '../../api/dealDetail'

dayjs.extend(relativeTime)

const SENTIMENT_ICON: Record<string, string> = {
  Positive: '😊',
  Negative: '😟',
  Neutral: '😐',
}

function sentimentBorderClass(s: string): string {
  if (s === 'Positive') return 'border-l-emerald-500'
  if (s === 'Negative') return 'border-l-red-500'
  return 'border-l-slate-400'
}

interface Props {
  activities: Activity[]
}

export default function ActivityTimeline({ activities }: Props) {
  const sorted = [...activities].sort((a, b) => {
    if (!b.created_at) return -1
    if (!a.created_at) return 1
    return b.created_at > a.created_at ? 1 : -1
  })

  if (sorted.length === 0) {
    return (
      <div className="rounded-2xl bg-[color:var(--color-bg-base)] px-4 py-10 text-center text-sm text-[color:var(--color-text-secondary)]/70">
        尚無互動記錄
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {sorted.map(act => (
        <div
          key={act.id}
          className={`rounded-2xl border-l-[3px] bg-[color:var(--color-bg-base)] p-4 ${sentimentBorderClass(act.sentiment)}`}
        >
          <div className="mb-2 flex items-center gap-2">
            <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-[color:var(--color-text-primary)] shadow-sm">
              {SENTIMENT_ICON[act.sentiment] ?? '💬'} {act.sentiment}
            </span>
            {act.created_at && (
              <span className="mono ml-auto text-[11px] text-[color:var(--color-text-secondary)]/60">
                {dayjs(act.created_at).fromNow()}
              </span>
            )}
          </div>
          <p className="text-sm leading-relaxed text-[color:var(--color-text-primary)]/88">{act.raw_transcript}</p>
          {act.ai_key_insights.length > 0 && (
            <div className="ai-left-border mt-3 rounded-xl bg-white px-3 py-3">
              <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-sky-600">
                AI 整理
              </div>
              <ul className="space-y-1">
              {act.ai_key_insights.map((insight, i) => (
                <li key={i} className="flex gap-1 text-xs leading-relaxed text-[color:var(--color-text-secondary)]/85">
                  <span className="shrink-0 text-[color:var(--color-primary)]">•</span>
                  {insight}
                </li>
              ))}
              </ul>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
