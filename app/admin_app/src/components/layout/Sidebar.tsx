import { NavLink } from 'react-router-dom'
import {
  BriefcaseBusiness,
  CheckSquare,
  LayoutDashboard,
  LogOut,
  Settings,
  Users,
} from 'lucide-react'
import { useAuthStore } from '../../auth/AuthStore'
import { logout } from '../../api/auth'

const navItems = [
  { to: '/deals', icon: LayoutDashboard, label: '案件看板' },
  { to: '/contacts', icon: Users, label: '聯絡人' },
  { to: '/actions', icon: CheckSquare, label: '待辦事項' },
]

const adminItems = [
  { to: '/settings', icon: Settings, label: '團隊設定', disabled: true },
  { to: '/products', icon: BriefcaseBusiness, label: '產品線管理', disabled: true },
]

export default function Sidebar() {
  const clear = useAuthStore(s => s.clear)

  const handleLogout = async () => {
    await logout()
    clear()
    window.location.href = '/admin/login'
  }

  return (
    <aside className="flex min-h-screen w-[232px] shrink-0 flex-col border-r border-[color:var(--color-outline)] bg-[color:var(--color-bg-section)] px-3 py-4">
      <div className="flex items-center gap-3 px-3 pb-6 pt-1">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[color:var(--color-primary)] to-[color:var(--color-primary-dark)] text-base font-extrabold text-white shadow-lg shadow-emerald-500/20">
          M
        </div>
        <div className="min-w-0">
          <div className="display-font text-[15px] font-extrabold text-[color:var(--color-text-primary)]">
            Mingpian CRM
          </div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--color-text-secondary)]/60">
            Sales AI Assistant
          </div>
        </div>
      </div>

      <nav className="flex flex-col gap-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                isActive
                  ? 'bg-[color:var(--color-primary-light)] text-[color:var(--color-primary-dark)]'
                  : 'text-[color:var(--color-text-secondary)] hover:bg-white/60'
              }`
            }
          >
            <Icon size={18} />
            <span className="flex-1">{label}</span>
            {to === '/actions' && (
              <span className="mono rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white">
                3
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="mt-6 border-t border-[color:var(--color-outline)] pt-4">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[color:var(--color-text-secondary)]/55">
          管理員
        </div>
        <div className="flex flex-col gap-1">
          {adminItems.map(({ to, icon: Icon, label, disabled }) => (
            <div
              key={to}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold ${
                disabled ? 'cursor-not-allowed text-[color:var(--color-text-secondary)]/55' : 'text-[color:var(--color-text-secondary)]'
              }`}
            >
              <Icon size={18} />
              <span className="flex-1">{label}</span>
              <span className="rounded-md border border-[color:var(--color-outline)] px-1.5 py-0.5 text-[9px] font-bold tracking-[0.1em]">
                ADMIN
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-auto pt-6">
        <div className="rounded-2xl border border-[color:var(--color-outline)] bg-white p-3 shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-[color:var(--color-primary-light)] text-sm font-bold text-[color:var(--color-primary-dark)]">
              施
              <span className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-[color:var(--color-primary)]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-[color:var(--color-text-primary)]">施威宇</div>
              <div className="truncate text-xs text-[color:var(--color-text-secondary)]/70">威宇工作室 · 管理員</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-[color:var(--color-outline)] px-3 py-2 text-sm font-semibold text-[color:var(--color-text-secondary)] transition hover:bg-[color:var(--color-bg-section)]"
          >
            <LogOut size={15} />
            登出
          </button>
        </div>
      </div>
    </aside>
  )
}
