import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import NluInputModal from '../../features/nlu/NluInputModal'

const pageTitles: Record<string, string> = {
  '/deals':    '案件 Kanban',
  '/contacts': '聯絡人',
  '/actions':  '待辦事項',
}

export default function AppShell() {
  const { pathname } = useLocation()
  const [nluOpen, setNluOpen] = useState(false)

  const title = pageTitles[pathname] ?? 'CRM Admin'
  const showNlu = pathname === '/deals' || pathname === '/contacts' || pathname === '/actions'

  return (
    <div className="flex min-h-screen bg-[color:var(--color-bg-base)]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-screen">
        <Header title={title} onNluOpen={showNlu ? () => setNluOpen(true) : undefined} />
        <main className="flex-1 overflow-auto px-6 py-6 lg:px-8">
          <Outlet />
        </main>
      </div>
      <NluInputModal open={nluOpen} onClose={() => setNluOpen(false)} />
    </div>
  )
}
