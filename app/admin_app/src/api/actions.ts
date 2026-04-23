import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPut } from './client'
import type { Action } from './dealDetail'

export function useActions(status?: string) {
  return useQuery({
    queryKey: ['actions', status ?? 'all'],
    queryFn: () => apiGet<Action[]>(status ? `/v1/actions?status=${status}` : '/v1/actions'),
  })
}

export function useUpdateAnyAction() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiPut<{ ok: boolean }>(`/v1/actions/${id}`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['actions'] })
      qc.invalidateQueries({ queryKey: ['deal-actions'] })
    },
  })
}
