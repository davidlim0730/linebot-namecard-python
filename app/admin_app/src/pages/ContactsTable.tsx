import { useState, useMemo } from 'react'
import { Plus } from 'lucide-react'
import { useContacts, useCreateContact, Contact, ContactCreate } from '../api/contacts'
import ContactTableComponent from '../features/contact/ContactTable'
import ContactDrawer from '../features/contact/ContactDrawer'

function CreateContactModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState<ContactCreate>({ display_name: '', contact_type: 'person' })
  const create = useCreateContact()

  const submit = () => {
    if (!form.display_name.trim()) return
    create.mutate(form, { onSuccess: onClose })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-80 p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-4">新增聯絡人</h2>
        <div className="space-y-3">
          <input
            placeholder="顯示名稱 *"
            value={form.display_name}
            onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-green-400"
            autoFocus
          />
          <select
            value={form.contact_type}
            onChange={e => setForm(f => ({ ...f, contact_type: e.target.value }))}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-green-400"
          >
            <option value="person">個人</option>
            <option value="company">公司</option>
          </select>
        </div>
        <div className="flex gap-3 justify-end mt-5">
          <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5">取消</button>
          <button
            onClick={submit}
            disabled={create.isPending || !form.display_name.trim()}
            className="text-sm bg-green-500 hover:bg-green-600 text-white px-4 py-1.5 rounded-lg disabled:opacity-50 transition-colors"
          >
            新增
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ContactsTable() {
  const { data: contacts = [], isLoading, error } = useContacts()
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'name'>('newest')

  const sortedContacts = useMemo(() => {
    const list = [...contacts]
    if (sortOrder === 'newest') {
      list.sort((a, b) => (b.updated_at ?? b.created_at ?? '') > (a.updated_at ?? a.created_at ?? '') ? 1 : -1)
    } else if (sortOrder === 'oldest') {
      list.sort((a, b) => (a.updated_at ?? a.created_at ?? '') > (b.updated_at ?? b.created_at ?? '') ? 1 : -1)
    } else {
      list.sort((a, b) => a.display_name.localeCompare(b.display_name, 'zh-TW'))
    }
    return list
  }, [contacts, sortOrder])

  if (isLoading) {
    return <div className="flex items-center justify-center h-64 text-gray-400 text-sm">載入中…</div>
  }
  if (error) {
    return <div className="flex items-center justify-center h-64 text-red-400 text-sm">載入失敗，請重新整理</div>
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-4 justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">排序：</span>
          {([
            { key: 'newest', label: '最近更新 ↓' },
            { key: 'oldest', label: '最近更新 ↑' },
            { key: 'name',   label: '名稱 A-Z' },
          ] as const).map(opt => (
            <button
              key={opt.key}
              onClick={() => setSortOrder(opt.key)}
              className={`text-xs px-2.5 py-1 rounded-lg transition-colors ${
                sortOrder === opt.key
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 text-sm bg-green-500 hover:bg-green-600 text-white font-medium px-4 py-2 rounded-xl transition-colors"
        >
          <Plus size={16} /> 新增聯絡人
        </button>
      </div>

      <ContactTableComponent
        contacts={sortedContacts}
        onRowClick={setSelectedContact}
      />

      <ContactDrawer
        contact={selectedContact}
        onClose={() => setSelectedContact(null)}
      />

      {showCreate && <CreateContactModal onClose={() => setShowCreate(false)} />}
    </div>
  )
}
