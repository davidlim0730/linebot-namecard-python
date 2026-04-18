import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, apiPut } from './client'
import type { Deal } from './deals'

export interface Activity {
  id: string
  deal_id: string | null
  contact_id: string | null
  entity_name: string | null
  raw_transcript: string
  ai_key_insights: string[]
  sentiment: string
  added_by: string | null
  created_at: string | null
}

export interface Stakeholder {
  id: string
  deal_id: string
  name: string
  title: string | null
  role: string
  attitude: string | null
  is_champion: boolean
  notes: string | null
  contact_id: string | null
  added_by: string
  created_at: string
}

export interface StakeholderCreate {
  name: string
  title?: string
  role: string
  attitude?: string
  notes?: string
}

export interface Action {
  id: string
  deal_id: string | null
  entity_name: string | null
  task_detail: string
  due_date: string | null
  status: string
  added_by: string
  created_at: string
}

export interface ContextHint {
  contact_id?: string | null
  contact_name?: string | null
  entity_name?: string | null
}

export interface ParsedResult {
  pipelines: unknown[]
  interactions: unknown[]
  actions: unknown[]
}

export function useDeal(dealId: string) {
  return useQuery({
    queryKey: ['deal', dealId],
    queryFn: () => apiGet<Deal & { activities: Activity[] }>(`/v1/deals/${dealId}`),
    enabled: !!dealId,
  })
}

export function useDealActivities(dealId: string) {
  return useQuery({
    queryKey: ['deal-activities', dealId],
    queryFn: () => apiGet<Activity[]>(`/v1/deals/${dealId}/activities`),
    enabled: !!dealId,
  })
}

export function useDealStakeholders(dealId: string) {
  return useQuery({
    queryKey: ['deal-stakeholders', dealId],
    queryFn: () => apiGet<Stakeholder[]>(`/v1/deals/${dealId}/stakeholders`),
    enabled: !!dealId,
  })
}

export function useAddStakeholder(dealId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: StakeholderCreate) =>
      apiPost<{ id: string; ok: boolean }>(`/v1/deals/${dealId}/stakeholders`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['deal-stakeholders', dealId] }),
  })
}

export function useDealActions(dealId: string) {
  return useQuery({
    queryKey: ['deal-actions', dealId],
    queryFn: async () => {
      const all = await apiGet<Action[]>('/v1/actions')
      return all.filter(a => a.deal_id === dealId)
    },
    enabled: !!dealId,
  })
}

export function useUpdateAction(dealId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiPut<{ ok: boolean }>(`/v1/actions/${id}`, { status }),
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: ['deal-actions', dealId] })
      const prev = qc.getQueryData<Action[]>(['deal-actions', dealId])
      qc.setQueryData<Action[]>(['deal-actions', dealId], old =>
        old?.map(a => a.id === id ? { ...a, status } : a) ?? []
      )
      return { prev }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(['deal-actions', dealId], ctx.prev)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['deal-actions', dealId] }),
  })
}

export function useParseCrm() {
  return useMutation({
    mutationFn: ({ rawText, contextHint }: { rawText: string; contextHint?: ContextHint }) =>
      apiPost<{ parsed: ParsedResult }>('/v1/crm/parse', {
        raw_text: rawText,
        context_hint: contextHint ?? null,
      }),
  })
}

export function useConfirmCrm(dealId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ confirmedData, contextHint }: { confirmedData: unknown; contextHint?: ContextHint }) =>
      apiPost<{ written: unknown }>('/v1/crm/confirm', {
        confirmed_data: confirmedData,
        context_hint: contextHint ?? null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deal-activities', dealId] })
      qc.invalidateQueries({ queryKey: ['deal-actions', dealId] })
    },
  })
}
