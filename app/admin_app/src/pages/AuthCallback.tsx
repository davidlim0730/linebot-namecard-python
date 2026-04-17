import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../auth/AuthStore'

export default function AuthCallback() {
  const navigate = useNavigate()
  const setToken = useAuthStore(s => s.setToken)

  useEffect(() => {
    const hash = window.location.hash.slice(1)
    const params = new URLSearchParams(hash)
    const token = params.get('access_token')
    if (token) {
      setToken(token)
      window.history.replaceState(null, '', window.location.pathname)
      navigate('/deals', { replace: true })
    } else {
      navigate('/login', { replace: true })
    }
  }, [])

  return <div className="flex items-center justify-center h-screen text-gray-500">驗證中…</div>
}
