import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, apiPut } from './client'
import type { Activity } from './dealDetail'
import type { Deal } from './deals'

export interface Contact {
  id: string
  contact_type: string        // 'person' | 'company'
  display_name: string
  legal_name: string | null
  aliases: string[]
  parent_company_id: string | null
  title: string | null
  phone: string | null
  mobile: string | null
  email: string | null
  line_id: string | null
  memo: string | null
  source: string | null
  added_by: string
  created_at: string
  updated_at?: string | null
}

export interface ContactUpdate {
  display_name?: string
  title?: string
  phone?: string
  mobile?: string
  email?: string
  memo?: string
}

export interface ContactCreate {
  display_name: string
  contact_type: string
  title?: string
  phone?: string
  mobile?: string
  email?: string
  memo?: string
}

export interface ContactCrm {
  contact: Contact
  deals: Deal[]
  activities: Activity[]
}

export function useContacts() {
  return useQuery({
    queryKey: ['contacts'],
    queryFn: () => apiGet<Contact[]>('/v1/contacts'),
  })
}

export function useContact(contactId: string) {
  return useQuery({
    queryKey: ['contact', contactId],
    queryFn: () => apiGet<Contact>(`/v1/contacts/${contactId}`),
    enabled: !!contactId,
  })
}

export function useContactCrm(contactId: string) {
  return useQuery({
    queryKey: ['contact-crm', contactId],
    queryFn: () => apiGet<ContactCrm>(`/v1/contacts/${contactId}/crm`),
    enabled: !!contactId,
  })
}

export function useUpdateContact() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, update }: { id: string; update: ContactUpdate }) =>
      apiPut<{ ok: boolean }>(`/v1/contacts/${id}`, update),
    onMutate: async ({ id, update }) => {
      await qc.cancelQueries({ queryKey: ['contacts'] })
      await qc.cancelQueries({ queryKey: ['contact', id] })
      const previous = qc.getQueryData<Contact[]>(['contacts'])
      qc.setQueryData<Contact[]>(['contacts'], old =>
        old?.map(c => c.id === id ? { ...c, ...update } : c) ?? []
      )
      const prevSingle = qc.getQueryData<Contact>(['contact', id])
      qc.setQueryData<Contact>(['contact', id], old => old ? { ...old, ...update } : old)
      return { previous, prevSingle }
    },
    onError: (_err, vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(['contacts'], ctx.previous)
      if (ctx?.prevSingle) qc.setQueryData(['contact', vars.id], ctx.prevSingle)
    },
    onSettled: (_data, _err, vars) => {
      qc.invalidateQueries({ queryKey: ['contacts'] })
      qc.invalidateQueries({ queryKey: ['contact', vars.id] })
    },
  })
}

export function useCreateContact() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: ContactCreate) =>
      apiPost<{ id: string; ok: boolean }>('/v1/contacts', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contacts'] }),
  })
}
