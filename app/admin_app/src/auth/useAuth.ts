import { useEffect, useState } from 'react'
import { useAuthStore } from './AuthStore'
import { getMe } from '../api/auth'

export function useAuth() {
  const { accessToken, userId, setUser, setBootstrapped, clear, bootstrapped } = useAuthStore()
  const [loading, setLoading] = useState(!accessToken && !bootstrapped)

  useEffect(() => {
    if (accessToken || bootstrapped) { setLoading(false); return }
    setBootstrapped()  // mark before async call to prevent concurrent calls
    getMe()
      .then(({ access_token, user_id }) => setUser(user_id, access_token))
      .catch(() => clear())
      .finally(() => setLoading(false))
  }, [])

  return { accessToken, userId, loading, isAuthenticated: !!accessToken }
}
