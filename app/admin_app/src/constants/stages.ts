export const PIPELINE_STAGES = [
  { id: '0', label: '洽詢',  color: '#6B7280' },
  { id: '1', label: '報價',  color: '#3B82F6' },
  { id: '2', label: '提案',  color: '#8B5CF6' },
  { id: '3', label: '評估',  color: '#F59E0B' },
  { id: '4', label: '談判',  color: '#EF4444' },
  { id: '5', label: '決策',  color: '#EC4899' },
  { id: '6', label: '簽約',  color: '#10B981' },
] as const

export const TERMINAL_STAGES = [
  { id: '成交', label: '成交', color: '#06C755' },
  { id: '失敗', label: '失敗', color: '#9CA3AF' },
] as const

export type PipelineStageId = typeof PIPELINE_STAGES[number]['id']
export type TerminalStageId = typeof TERMINAL_STAGES[number]['id']
export type StageId = PipelineStageId | TerminalStageId

export const ALL_STAGES = [...PIPELINE_STAGES, ...TERMINAL_STAGES]

export function getStage(id: string) {
  return ALL_STAGES.find(s => s.id === id)
}
