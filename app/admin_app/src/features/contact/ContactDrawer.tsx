import { X, ExternalLink } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { Contact, useContactCrm } from '../../api/contacts'
import { getStage } from '../../constants/stages'

dayjs.extend(relativeTime)

interface Props {
  contact: Contact | null
  onClose: () => void
}

export default function ContactDrawer({ contact, onClose }: Props) {
  const navigate = useNavigate()
  const { data: crm, isLoading } = useContactCrm(contact?.id ?? '')

  if (!contact) return null

  const phone = contact.mobile || contact.phone

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
      />
      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-80 bg-white shadow-xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-gray-800">{contact.display_name}</h2>
            {contact.title && (
              <p className="text-xs text-gray-500 mt-0.5">{contact.title}</p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Basic info */}
          <div className="space-y-2">
            <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${
              contact.contact_type === 'company'
                ? 'bg-blue-50 text-blue-700'
                : 'bg-purple-50 text-purple-700'
            }`}>
              {contact.contact_type === 'company' ? '公司' : '個人'}
            </span>
            {phone && (
              <div className="text-sm text-gray-600">📞 {phone}</div>
            )}
            {contact.email && (
              <div className="text-sm text-gray-600">✉️ {contact.email}</div>
            )}
            {contact.memo && (
              <div className="text-sm text-gray-500 bg-gray-50 rounded p-2">{contact.memo}</div>
            )}
          </div>

          {isLoading && (
            <div className="text-sm text-gray-400 text-center py-4">載入中…</div>
          )}

          {/* Deals */}
          {crm && crm.deals.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-500 mb-2">📊 相關案件 ({crm.deals.length})</h3>
              <div className="space-y-1.5">
                {crm.deals.map(deal => {
                  const stage = getStage(deal.stage)
                  return (
                    <div
                      key={deal.id}
                      className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 cursor-pointer hover:bg-gray-100"
                      onClick={() => { onClose(); navigate(`/deals/${deal.id}`) }}
                    >
                      <div>
                        <p className="text-xs font-medium text-gray-700">{deal.entity_name}</p>
                        {deal.est_value != null && (
                          <p className="text-xs text-gray-400">NT$ {deal.est_value.toLocaleString()}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {stage && (
                          <span
                            className="text-xs px-1.5 py-0.5 rounded text-white"
                            style={{ backgroundColor: stage.color }}
                          >
                            {stage.label}
                          </span>
                        )}
                        <ExternalLink size={12} className="text-gray-300" />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Recent activities */}
          {crm && crm.activities.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-500 mb-2">
                💬 最近互動（{Math.min(crm.activities.length, 5)} / {crm.activities.length}）
              </h3>
              <div className="space-y-2">
                {[...crm.activities]
                  .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
                  .slice(0, 5)
                  .map(act => (
                    <div key={act.id} className="bg-gray-50 rounded p-2">
                      <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">
                        {act.raw_transcript}
                      </p>
                      {act.created_at && (
                        <p className="text-xs text-gray-400 mt-1">{dayjs(act.created_at).fromNow()}</p>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
