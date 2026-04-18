import { Navigate } from 'react-router-dom'
import { useAuth } from './useAuth'

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center h-screen text-gray-500">載入中…</div>
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}
