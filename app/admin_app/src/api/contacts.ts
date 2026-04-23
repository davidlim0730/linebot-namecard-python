import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, apiPut } from './client'
import type { Activity } from './dealDetail'
import type { Action } from './dealDetail'
import type { Deal } from './deals'

export interface Contact {
  id: string
  contact_type: string        // 'person' | 'company'
  display_name: string
  legal_name: string | null
  aliases: string[]
  parent_company_id: string | null
  company_name: string | null
  title: string | null
  phone: string | null
  mobile: string | null
  email: string | null
  line_id: string | null
  address: string | null
  memo: string | null
  tags: string[]
  source: string | null
  industry: string | null
  website: string | null
  employee_count: number | null
  department: string | null
  work_phone: string | null
  added_by: string
  created_at: string
  updated_at?: string | null
}

export interface ContactUpdate {
  display_name?: string
  legal_name?: string | null
  contact_type?: string
  parent_company_id?: string | null
  company_name?: string | null
  title?: string
  phone?: string
  mobile?: string
  email?: string
  line_id?: string | null
  address?: string | null
  memo?: string
  industry?: string | null
  website?: string | null
  employee_count?: number | null
  department?: string | null
  work_phone?: string | null
}

export interface ContactCreate {
  display_name: string
  contact_type: string
  legal_name?: string
  parent_company_id?: string | null
  company_name?: string | null
  title?: string
  phone?: string
  mobile?: string
  email?: string
  line_id?: string
  address?: string
  memo?: string
  industry?: string
  website?: string
  employee_count?: number | null
  department?: string
  work_phone?: string
}

export interface ContactCrm {
  contact: Contact
  company_contact?: Contact | null
  members: Contact[]
  deals: Deal[]
  activities: Activity[]
  actions: Action[]
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
      await qc.cancelQueries({ queryKey: ['contact-crm', id] })
      const previous = qc.getQueryData<Contact[]>(['contacts'])
      qc.setQueryData<Contact[]>(['contacts'], old =>
        old?.map(c => c.id === id ? { ...c, ...update } : c) ?? []
      )
      const prevSingle = qc.getQueryData<Contact>(['contact', id])
      qc.setQueryData<Contact>(['contact', id], old => old ? { ...old, ...update } : old)
      const prevCrm = qc.getQueryData<ContactCrm>(['contact-crm', id])
      qc.setQueryData<ContactCrm>(['contact-crm', id], old =>
        old ? { ...old, contact: { ...old.contact, ...update } } : old
      )
      return { previous, prevSingle, prevCrm }
    },
    onError: (_err, vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(['contacts'], ctx.previous)
      if (ctx?.prevSingle) qc.setQueryData(['contact', vars.id], ctx.prevSingle)
      if (ctx?.prevCrm) qc.setQueryData(['contact-crm', vars.id], ctx.prevCrm)
    },
    onSettled: (_data, _err, vars) => {
      qc.invalidateQueries({ queryKey: ['contacts'] })
      qc.invalidateQueries({ queryKey: ['contact', vars.id] })
      qc.invalidateQueries({ queryKey: ['contact-crm', vars.id] })
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
