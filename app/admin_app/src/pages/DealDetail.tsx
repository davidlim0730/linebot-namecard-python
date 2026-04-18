import { useParams } from 'react-router-dom'

export default function DealDetail() {
  const { id } = useParams<{ id: string }>()
  return (
    <div className="text-gray-500 text-sm">
      Deal 詳情（Sprint 3 實作）— deal ID: {id}
    </div>
  )
}
