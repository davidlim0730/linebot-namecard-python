import { useState } from 'react'
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

  if (isLoading) {
    return <div className="flex items-center justify-center h-64 text-gray-400 text-sm">載入中…</div>
  }
  if (error) {
    return <div className="flex items-center justify-center h-64 text-red-400 text-sm">載入失敗，請重新整理</div>
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 text-sm bg-green-500 hover:bg-green-600 text-white font-medium px-4 py-2 rounded-xl transition-colors"
        >
          <Plus size={16} /> 新增聯絡人
        </button>
      </div>

      <ContactTableComponent
        contacts={contacts}
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
