import { Plus } from 'lucide-react'

interface HeaderProps {
  title: string
  onNluOpen?: () => void
}

export default function Header({ title, onNluOpen }: HeaderProps) {
  return (
    <header className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-6">
      <h1 className="text-base font-semibold text-gray-800">{title}</h1>
      {onNluOpen && (
        <button
          onClick={onNluOpen}
          className="flex items-center gap-2 bg-[#06C755] hover:bg-[#05a847] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={16} />
          意識流輸入
        </button>
      )}
    </header>
  )
}
