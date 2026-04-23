export const PIPELINE_STAGES = [
  { id: '0', label: '洽詢',  color: '#6B7280', badgeClass: 'bg-slate-500 text-white', dotClass: 'bg-slate-500' },
  { id: '1', label: '報價',  color: '#3B82F6', badgeClass: 'bg-blue-500 text-white', dotClass: 'bg-blue-500' },
  { id: '2', label: '提案',  color: '#8B5CF6', badgeClass: 'bg-violet-500 text-white', dotClass: 'bg-violet-500' },
  { id: '3', label: '評估',  color: '#F59E0B', badgeClass: 'bg-amber-500 text-white', dotClass: 'bg-amber-500' },
  { id: '4', label: '談判',  color: '#EF4444', badgeClass: 'bg-red-500 text-white', dotClass: 'bg-red-500' },
  { id: '5', label: '決策',  color: '#EC4899', badgeClass: 'bg-pink-500 text-white', dotClass: 'bg-pink-500' },
  { id: '6', label: '簽約',  color: '#10B981', badgeClass: 'bg-emerald-500 text-white', dotClass: 'bg-emerald-500' },
] as const

export const TERMINAL_STAGES = [
  { id: '成交', label: '成交', color: '#06C755', badgeClass: 'bg-[color:var(--color-primary)] text-white', dotClass: 'bg-[color:var(--color-primary)]' },
  { id: '失敗', label: '失敗', color: '#9CA3AF', badgeClass: 'bg-slate-400 text-white', dotClass: 'bg-slate-400' },
] as const

export type PipelineStageId = typeof PIPELINE_STAGES[number]['id']
export type TerminalStageId = typeof TERMINAL_STAGES[number]['id']
export type StageId = PipelineStageId | TerminalStageId

export const ALL_STAGES = [...PIPELINE_STAGES, ...TERMINAL_STAGES]

export function getStage(id: string) {
  return ALL_STAGES.find(s => s.id === id)
}
