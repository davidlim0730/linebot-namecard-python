import { create } from 'zustand'

interface AuthState {
  accessToken: string | null
  userId: string | null
  setToken: (token: string) => void
  setUser: (userId: string, token: string) => void
  clear: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  userId: null,
  setToken: (token) => set({ accessToken: token }),
  setUser: (userId, token) => set({ userId, accessToken: token }),
  clear: () => set({ accessToken: null, userId: null }),
}))
