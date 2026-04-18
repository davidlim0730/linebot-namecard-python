import DealKanban from '../features/deal/DealKanban'
import { useDeals } from '../api/deals'

export default function DealsKanban() {
  const { data: deals, isLoading, error } = useDeals()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        載入中…
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-400 text-sm">
        載入失敗，請重新整理
      </div>
    )
  }

  return <DealKanban deals={deals ?? []} />
}
