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
    <div className="space-y-3 text-xs">
      {pipelines.length > 0 && (
        <div className="rounded-xl bg-white px-3 py-3">
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-sky-600">案件</span>
          <ul className="mt-2 space-y-1">
            {pipelines.map((p, i) => (
              <li key={i} className="text-[13px] text-sky-700">
                {p.entity_name ?? '未知客戶'}{p.stage ? ` · ${p.stage}` : ''}
              </li>
            ))}
          </ul>
        </div>
      )}
      {interactions.length > 0 && (
        <div className="rounded-xl bg-white px-3 py-3">
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-700">互動</span>
          <ul className="mt-2 space-y-1">
            {interactions.map((it, i) => (
              <li key={i} className="line-clamp-2 text-[13px] text-emerald-700">
                {it.raw_transcript?.slice(0, 60) ?? ''}
                {(it.raw_transcript?.length ?? 0) > 60 ? '…' : ''}
              </li>
            ))}
          </ul>
        </div>
      )}
      {actions.length > 0 && (
        <div className="rounded-xl bg-white px-3 py-3">
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-amber-700">待辦</span>
          <ul className="mt-2 space-y-1">
            {actions.map((a, i) => (
              <li key={i} className="text-[13px] text-amber-700">
                {a.task_detail ?? '未知待辦'}{a.due_date ? ` · ${a.due_date}` : ''}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
