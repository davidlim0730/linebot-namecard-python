import { useState, useMemo } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { Search, Edit2 } from 'lucide-react'
import { Contact, ContactUpdate, useUpdateContact } from '../../api/contacts'

dayjs.extend(relativeTime)

const TYPE_LABELS: Record<string, string> = {
  company: '公司',
  person: '個人',
}

interface InlineCellProps {
  value: string | null
  field: keyof ContactUpdate
  contactId: string
  multiline?: boolean
}

function InlineCell({ value, field, contactId, multiline = false }: InlineCellProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value ?? '')
  const update = useUpdateContact()

  const save = () => {
    if (draft !== (value ?? '')) {
      update.mutate({ id: contactId, update: { [field]: draft || null } as ContactUpdate })
    }
    setEditing(false)
  }

  if (editing) {
    const sharedProps = {
      value: draft,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraft(e.target.value),
      onBlur: save,
      onKeyDown: (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !multiline) save()
        if (e.key === 'Escape') setEditing(false)
      },
      autoFocus: true,
      className: 'w-full text-sm border border-green-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-green-400',
    }
    return multiline ? <textarea {...sharedProps} rows={2} /> : <input {...sharedProps} />
  }

  return (
    <div className="flex items-center gap-1 group/cell">
      <span className="text-sm text-gray-700 flex-1 min-h-[1.5rem]">
        {value ?? <span className="text-gray-300">—</span>}
      </span>
      <button
        onClick={e => { e.stopPropagation(); setDraft(value ?? ''); setEditing(true) }}
        className="opacity-0 group-hover/cell:opacity-100 text-gray-300 hover:text-gray-500 transition-opacity shrink-0"
      >
        <Edit2 size={12} />
      </button>
    </div>
  )
}

interface Props {
  contacts: Contact[]
  onRowClick: (contact: Contact) => void
}

const colHelper = createColumnHelper<Contact>()

export default function ContactTable({ contacts, onRowClick }: Props) {
  const [globalFilter, setGlobalFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'company' | 'person'>('all')
  const memberCountMap = useMemo(() => {
    const map: Record<string, number> = {}
    contacts.forEach(contact => {
      if (contact.parent_company_id) {
        map[contact.parent_company_id] = (map[contact.parent_company_id] ?? 0) + 1
      }
    })
    return map
  }, [contacts])

  const filtered = useMemo(() => {
    let list = contacts
    if (typeFilter !== 'all') list = list.filter(c => c.contact_type === typeFilter)
    if (globalFilter.trim()) {
      const q = globalFilter.toLowerCase()
      list = list.filter(c =>
        c.display_name.toLowerCase().includes(q) ||
        (c.email ?? '').toLowerCase().includes(q) ||
        (c.phone ?? '').toLowerCase().includes(q) ||
        (c.mobile ?? '').toLowerCase().includes(q) ||
        (c.work_phone ?? '').toLowerCase().includes(q) ||
        (c.company_name ?? '').toLowerCase().includes(q) ||
        (c.legal_name ?? '').toLowerCase().includes(q) ||
        (c.industry ?? '').toLowerCase().includes(q) ||
        (c.department ?? '').toLowerCase().includes(q) ||
        c.aliases.some(a => a.toLowerCase().includes(q))
      )
    }
    return list
  }, [contacts, globalFilter, typeFilter])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const columns = useMemo<any[]>(() => [
    colHelper.accessor('display_name', {
      header: '顯示名稱',
      cell: info => (
        <div>
          <InlineCell
            value={info.getValue() as string}
            field="display_name"
            contactId={info.row.original.id}
          />
          <div className="mt-1 text-xs text-gray-400">
            {info.row.original.contact_type === 'company'
              ? [info.row.original.industry, `${memberCountMap[info.row.original.id] ?? 0} 位聯絡人`].filter(Boolean).join(' · ')
              : [info.row.original.title, info.row.original.company_name].filter(Boolean).join(' · ')}
          </div>
        </div>
      ),
    }),
    colHelper.accessor('contact_type', {
      header: '類型',
      cell: info => (
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
          info.getValue() === 'company'
            ? 'bg-blue-50 text-blue-700'
            : 'bg-purple-50 text-purple-700'
        }`}>
          {TYPE_LABELS[info.getValue() as string] ?? info.getValue() as string}
        </span>
      ),
    }),
    colHelper.display({
      id: 'relationship',
      header: '關聯',
      cell: info => (
        <div className="text-sm text-[color:var(--color-text-secondary)]">
          {info.row.original.contact_type === 'company'
            ? (info.row.original.website || info.row.original.legal_name || '—')
            : (info.row.original.department || info.row.original.company_name || '—')}
        </div>
      ),
    }),
    colHelper.accessor(row => row.mobile || row.work_phone || row.phone, {
      id: 'phone',
      header: '電話',
      cell: info => (
        <InlineCell
          value={info.getValue() as string | null}
          field={info.row.original.contact_type === 'company' ? 'phone' : 'mobile'}
          contactId={info.row.original.id}
        />
      ),
    }),
    colHelper.accessor('email', {
      header: 'Email',
      cell: info => (
        <InlineCell
          value={info.getValue() as string | null}
          field="email"
          contactId={info.row.original.id}
        />
      ),
    }),
    colHelper.accessor(row => row.updated_at || row.created_at, {
      id: 'updated_at',
      header: '更新',
      cell: info => (
        <span className="text-xs text-gray-400">
          {info.getValue() ? dayjs(info.getValue() as string).fromNow() : '—'}
        </span>
      ),
    }),
  ], [memberCountMap])

  const table = useReactTable({
    data: filtered,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-3 border-b border-[color:var(--color-outline)] px-5 py-4">
        <div className="relative max-w-sm flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={globalFilter}
            onChange={e => setGlobalFilter(e.target.value)}
            placeholder="搜尋名稱 / email / 電話…"
            className="w-full rounded-xl bg-[color:var(--color-bg-input)] py-2 pl-9 pr-3 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[color:var(--color-primary)]/30"
          />
        </div>
        <div className="flex gap-1">
          {(['all', 'company', 'person'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                typeFilter === t
                  ? 'bg-[color:var(--color-primary-light)] text-[color:var(--color-primary-dark)]'
                  : 'bg-[color:var(--color-bg-section)] text-[color:var(--color-text-secondary)]'
              }`}
            >
              {t === 'all' ? '全部' : t === 'company' ? '公司' : '個人'}
            </button>
          ))}
        </div>
        <span className="mono ml-auto text-xs text-[color:var(--color-text-secondary)]/60">{filtered.length} 筆</span>
      </div>

      {/* Table */}
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map(hg => (
              <tr key={hg.id} className="border-b border-[color:var(--color-outline)] bg-[color:var(--color-bg-base)]">
                {hg.headers.map(header => (
                  <th
                    key={header.id}
                    className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-[0.08em] text-[color:var(--color-text-secondary)]/60"
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-sm text-[color:var(--color-text-secondary)]/60">
                  {globalFilter || typeFilter !== 'all' ? '無符合條件的聯絡人' : '尚無聯絡人'}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map(row => (
                <tr
                  key={row.id}
                  className="cursor-pointer border-b border-[color:var(--color-outline)]/30 bg-white transition hover:bg-[color:var(--color-primary-light)]/40"
                  onClick={e => {
                    // Don't open drawer when clicking inline edit cell
                    if ((e.target as HTMLElement).tagName !== 'INPUT' &&
                        (e.target as HTMLElement).tagName !== 'TEXTAREA') {
                      onRowClick(row.original)
                    }
                  }}
                >
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="px-5 py-4 align-top">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
