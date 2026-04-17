import { useAuthStore } from '../auth/AuthStore'

const BASE = '/api'

async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = useAuthStore.getState().accessToken
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE}${path}`, { ...init, headers })

  if (res.status === 401) {
    try {
      const refreshRes = await fetch(`${BASE}/auth/refresh`, { method: 'POST' })
      if (refreshRes.ok) {
        const { access_token } = await refreshRes.json()
        useAuthStore.getState().setToken(access_token)
        headers['Authorization'] = `Bearer ${access_token}`
        return fetch(`${BASE}${path}`, { ...init, headers })
      }
    } catch {}
    useAuthStore.getState().clear()
    window.location.href = '/admin/login'
  }
  return res
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await apiFetch(path)
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}`)
  return res.json()
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const res = await apiFetch(path, { method: 'POST', body: JSON.stringify(body) })
  if (!res.ok) throw new Error(`POST ${path} → ${res.status}`)
  return res.json()
}

export async function apiPut<T>(path: string, body?: unknown): Promise<T> {
  const res = await apiFetch(path, { method: 'PUT', body: JSON.stringify(body) })
  if (!res.ok) throw new Error(`PUT ${path} → ${res.status}`)
  return res.json()
}
