interface DealStageTabsProps {
  activeTab: 'active' | 'won' | 'lost'
  onChange: (tab: 'active' | 'won' | 'lost') => void
  counts: { active: number; won: number; lost: number }
}

const TABS = [
  { id: 'active' as const, label: '活躍' },
  { id: 'won'    as const, label: '✅ 成交' },
  { id: 'lost'   as const, label: '❌ 失敗' },
]

export default function DealStageTabs({ activeTab, onChange, counts }: DealStageTabsProps) {
  return (
    <div className="flex gap-1 border-b border-gray-200 mb-4">
      {TABS.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
            activeTab === tab.id
              ? 'border-green-500 text-green-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          {tab.label} ({counts[tab.id]})
        </button>
      ))}
    </div>
  )
}
