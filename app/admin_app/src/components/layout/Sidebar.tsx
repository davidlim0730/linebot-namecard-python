import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Users, LogOut } from 'lucide-react'
import { useAuthStore } from '../../auth/AuthStore'
import { logout } from '../../api/auth'

const navItems = [
  { to: '/deals',    icon: LayoutDashboard, label: '案件' },
  { to: '/contacts', icon: Users,           label: '聯絡人' },
]

export default function Sidebar() {
  const clear = useAuthStore(s => s.clear)

  const handleLogout = async () => {
    await logout()
    clear()
    window.location.href = '/admin/login'
  }

  return (
    <aside className="w-[220px] min-h-screen bg-white border-r border-gray-100 flex flex-col">
      <div className="h-14 flex items-center px-5 border-b border-gray-100">
        <span className="text-lg font-bold text-gray-800">📊 CRM</span>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-green-50 text-green-700'
                  : 'text-gray-600 hover:bg-gray-50'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="px-3 py-4 border-t border-gray-100">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-50 w-full"
        >
          <LogOut size={18} />
          登出
        </button>
      </div>
    </aside>
  )
}
