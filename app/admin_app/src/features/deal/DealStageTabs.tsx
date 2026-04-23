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
    <div className="mb-5 flex gap-2">
      {TABS.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            activeTab === tab.id
              ? 'bg-[color:var(--color-primary-light)] text-[color:var(--color-primary-dark)]'
              : 'bg-[color:var(--color-bg-section)] text-[color:var(--color-text-secondary)]'
          }`}
        >
          {tab.label}
          <span className="mono ml-1 text-[11px] opacity-70">{counts[tab.id]}</span>
        </button>
      ))}
    </div>
  )
}
