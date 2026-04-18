import { apiGet, apiPost } from './client'

export function getMe() {
  return apiGet<{ access_token: string; user_id: string }>('/auth/me')
}

export function logout() {
  return apiPost('/auth/logout')
}
