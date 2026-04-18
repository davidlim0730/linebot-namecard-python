import { ParsedResult } from '../../api/dealDetail'

interface Props {
  parsed: ParsedResult
}

export default function NluPreview({ parsed }: Props) {
  const pipelines = parsed.pipelines as Array<{ entity_name?: string; stage?: string }>
  const interactions = parsed.interactions as Array<{ raw_transcript?: string; entity_name?: string }>
  const actions = parsed.actions as Array<{ task_detail?: string; due_date?: string; entity_name?: string }>

  const hasAny = pipelines.length > 0 || interactions.length > 0 || actions.length > 0

  if (!hasAny) {
    return <p className="text-xs text-gray-400">無解析結果</p>
  }

  return (
    <div className="space-y-2 text-xs">
      {pipelines.length > 0 && (
        <div>
          <span className="font-semibold text-blue-700">📊 案件</span>
          <ul className="mt-1 space-y-0.5">
            {pipelines.map((p, i) => (
              <li key={i} className="text-blue-600">
                {p.entity_name ?? '未知客戶'}{p.stage ? ` · ${p.stage}` : ''}
              </li>
            ))}
          </ul>
        </div>
      )}
      {interactions.length > 0 && (
        <div>
          <span className="font-semibold text-green-700">💬 互動</span>
          <ul className="mt-1 space-y-0.5">
            {interactions.map((it, i) => (
              <li key={i} className="text-green-600 line-clamp-2">
                {it.raw_transcript?.slice(0, 60) ?? ''}
                {(it.raw_transcript?.length ?? 0) > 60 ? '…' : ''}
              </li>
            ))}
          </ul>
        </div>
      )}
      {actions.length > 0 && (
        <div>
          <span className="font-semibold text-orange-700">✅ 待辦</span>
          <ul className="mt-1 space-y-0.5">
            {actions.map((a, i) => (
              <li key={i} className="text-orange-600">
                {a.task_detail ?? '未知待辦'}{a.due_date ? ` · ${a.due_date}` : ''}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
