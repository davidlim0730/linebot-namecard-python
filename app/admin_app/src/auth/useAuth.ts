import { useEffect, useState } from 'react'
import { useAuthStore } from './AuthStore'
import { getMe } from '../api/auth'

export function useAuth() {
  const { accessToken, userId, setUser, clear } = useAuthStore()
  const [loading, setLoading] = useState(!accessToken)

  useEffect(() => {
    if (accessToken) { setLoading(false); return }
    getMe()
      .then(({ access_token, user_id }) => setUser(user_id, access_token))
      .catch(() => clear())
      .finally(() => setLoading(false))
  }, [])

  return { accessToken, userId, loading, isAuthenticated: !!accessToken }
}
