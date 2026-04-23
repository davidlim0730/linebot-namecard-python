import { Bell, Plus, Search, Sparkles } from 'lucide-react'
import { useLocation } from 'react-router-dom'

interface HeaderProps {
  title: string
  onNluOpen?: () => void
}

const subtitles: Record<string, string> = {
  '/deals': '拖曳卡片調整階段，快速掌握整體 pipeline',
  '/contacts': '名單、互動、案件與待辦在同一視角整合查看',
  '/actions': '集中處理今日到期與逾期待辦',
}

export default function Header({ title, onNluOpen }: HeaderProps) {
  const { pathname } = useLocation()
  const subtitle = subtitles[pathname] ?? '業務員的隨身 AI 助理'

  return (
    <header className="sticky top-0 z-20 flex min-h-[72px] items-center gap-5 border-b border-[color:var(--color-outline)] bg-white/92 px-8 py-4 backdrop-blur">
      <div className="min-w-0 flex-1">
        <h1 className="display-font text-[24px] font-bold leading-tight text-[color:var(--color-text-primary)]">
          {title}
        </h1>
        <p className="mt-1 text-xs font-medium text-[color:var(--color-text-secondary)]/70">
          {subtitle}
        </p>
      </div>

      <div className="flex w-[280px] items-center gap-2 rounded-[var(--radius-input)] bg-[color:var(--color-bg-input)] px-3 text-[color:var(--color-text-secondary)] focus-within:bg-white focus-within:outline focus-within:outline-2 focus-within:outline-[color:var(--color-primary)]">
        <Search size={16} />
        <input
          placeholder="全域搜尋…"
          className="h-10 w-full bg-transparent text-sm outline-none placeholder:text-[color:var(--color-text-secondary)]/50"
        />
      </div>

      {onNluOpen && (
        <button
          onClick={onNluOpen}
          className="inline-flex h-10 items-center gap-2 rounded-[var(--radius-button)] border border-emerald-200 bg-gradient-to-r from-emerald-50 to-sky-50 px-4 text-sm font-semibold text-[color:var(--color-primary-dark)] transition hover:-translate-y-0.5"
        >
          <Sparkles size={14} />
          AI 記錄
          <span className="mono rounded bg-black/5 px-1.5 py-0.5 text-[10px]">⌘K</span>
        </button>
      )}

      <button className="relative flex h-10 w-10 items-center justify-center rounded-[var(--radius-button)] text-[color:var(--color-text-secondary)] transition hover:bg-[color:var(--color-bg-section)]">
        <Bell size={18} />
        <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[color:var(--color-danger)]" />
      </button>

      <button className="inline-flex h-10 items-center gap-2 rounded-[var(--radius-button)] bg-[color:var(--color-primary)] px-4 text-sm font-semibold text-white transition hover:bg-[color:var(--color-primary-dark)]">
        <Plus size={14} />
        新增
      </button>
    </header>
  )
}
