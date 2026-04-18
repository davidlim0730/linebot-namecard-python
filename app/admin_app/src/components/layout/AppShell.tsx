import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import NluInputModal from '../../features/nlu/NluInputModal'

const pageTitles: Record<string, string> = {
  '/deals':    '案件 Kanban',
  '/contacts': '聯絡人',
}

export default function AppShell() {
  const { pathname } = useLocation()
  const [nluOpen, setNluOpen] = useState(false)

  const title = pageTitles[pathname] ?? 'CRM Admin'
  const showNlu = pathname === '/deals' || pathname === '/contacts'

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-screen">
        <Header title={title} onNluOpen={showNlu ? () => setNluOpen(true) : undefined} />
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
      <NluInputModal open={nluOpen} onClose={() => setNluOpen(false)} />
    </div>
  )
}
