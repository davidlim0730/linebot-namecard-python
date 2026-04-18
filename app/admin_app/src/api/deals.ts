import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPut } from './client'

export interface Deal {
  id: string
  entity_name: string
  stage: string
  est_value: number | null
  next_action_date: string | null
  added_by: string | null
  status_summary: string
  updated_at: string | null
  org_id: string
  company_contact_id: string | null
  product_id: string | null
}

export interface DealUpdate {
  stage?: string
  entity_name?: string
  est_value?: number | null
  next_action_date?: string | null
  status_summary?: string
  product_id?: string | null
}

export function useDeals() {
  return useQuery({
    queryKey: ['deals'],
    queryFn: () => apiGet<Deal[]>('/v1/deals'),
  })
}

export function useUpdateDeal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, update }: { id: string; update: DealUpdate }) =>
      apiPut<{ ok: boolean }>(`/v1/deals/${id}`, update),
    onMutate: async ({ id, update }) => {
      await qc.cancelQueries({ queryKey: ['deals'] })
      const previous = qc.getQueryData<Deal[]>(['deals'])
      qc.setQueryData<Deal[]>(['deals'], old =>
        old?.map(d => d.id === id ? { ...d, ...update } : d) ?? []
      )
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) qc.setQueryData(['deals'], context.previous)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['deals'] })
    },
  })
}
