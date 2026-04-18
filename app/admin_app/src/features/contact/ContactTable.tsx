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
import { Search } from 'lucide-react'
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
    const props = {
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
    return multiline
      ? <textarea {...props} rows={2} />
      : <input {...props} />
  }

  return (
    <span
      onClick={e => { e.stopPropagation(); setDraft(value ?? ''); setEditing(true) }}
      className="block w-full text-sm text-gray-700 cursor-pointer hover:bg-gray-50 rounded px-1 py-0.5 min-h-[1.5rem]"
    >
      {value ?? <span className="text-gray-300">—</span>}
    </span>
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
        (c.legal_name ?? '').toLowerCase().includes(q) ||
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
          {info.row.original.title && (
            <span className="text-xs text-gray-400">{info.row.original.title}</span>
          )}
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
    colHelper.accessor('title', {
      header: '職稱',
      cell: info => (
        <InlineCell
          value={info.getValue() as string | null}
          field="title"
          contactId={info.row.original.id}
        />
      ),
    }),
    colHelper.accessor(row => row.mobile || row.phone, {
      id: 'phone',
      header: '電話',
      cell: info => (
        <InlineCell
          value={info.getValue() as string | null}
          field="mobile"
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
  ], [])

  const table = useReactTable({
    data: filtered,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={globalFilter}
            onChange={e => setGlobalFilter(e.target.value)}
            placeholder="搜尋名稱 / email / 電話…"
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-green-400"
          />
        </div>
        <div className="flex gap-1">
          {(['all', 'company', 'person'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                typeFilter === t
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t === 'all' ? '全部' : t === 'company' ? '公司' : '個人'}
            </button>
          ))}
        </div>
        <span className="text-xs text-gray-400 ml-auto">{filtered.length} 筆</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl overflow-hidden border border-gray-100">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map(hg => (
              <tr key={hg.id} className="border-b border-gray-100 bg-gray-50">
                {hg.headers.map(header => (
                  <th
                    key={header.id}
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-500"
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
                <td colSpan={columns.length} className="px-4 py-12 text-center text-gray-400 text-sm">
                  {globalFilter || typeFilter !== 'all' ? '無符合條件的聯絡人' : '尚無聯絡人'}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map(row => (
                <tr
                  key={row.id}
                  className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer"
                  onClick={e => {
                    // Don't open drawer when clicking inline edit cell
                    if ((e.target as HTMLElement).tagName !== 'INPUT' &&
                        (e.target as HTMLElement).tagName !== 'TEXTAREA') {
                      onRowClick(row.original)
                    }
                  }}
                >
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="px-4 py-3">
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
