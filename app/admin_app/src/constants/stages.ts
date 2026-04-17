export const PIPELINE_STAGES = [
  { id: 'inquiry',     label: '洽詢',  color: '#6B7280' },
  { id: 'quote',       label: '報價',  color: '#3B82F6' },
  { id: 'proposal',    label: '提案',  color: '#8B5CF6' },
  { id: 'evaluation',  label: '評估',  color: '#F59E0B' },
  { id: 'negotiation', label: '談判',  color: '#EF4444' },
  { id: 'decision',    label: '決策',  color: '#EC4899' },
  { id: 'contract',    label: '簽約',  color: '#10B981' },
] as const

export const TERMINAL_STAGES = [
  { id: 'won',  label: '成交', color: '#06C755' },
  { id: 'lost', label: '失敗', color: '#9CA3AF' },
] as const

export type PipelineStageId = typeof PIPELINE_STAGES[number]['id']
export type TerminalStageId = typeof TERMINAL_STAGES[number]['id']
export type StageId = PipelineStageId | TerminalStageId

export const ALL_STAGES = [...PIPELINE_STAGES, ...TERMINAL_STAGES]

export function getStage(id: string) {
  return ALL_STAGES.find(s => s.id === id)
}
