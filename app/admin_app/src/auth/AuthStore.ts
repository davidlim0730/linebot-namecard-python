import { create } from 'zustand'

interface AuthState {
  accessToken: string | null
  userId: string | null
  bootstrapped: boolean
  setToken: (token: string) => void
  setUser: (userId: string, token: string) => void
  setBootstrapped: () => void
  clear: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  userId: null,
  bootstrapped: false,
  setToken: (token) => set({ accessToken: token }),
  setUser: (userId, token) => set({ userId, accessToken: token }),
  setBootstrapped: () => set({ bootstrapped: true }),
  clear: () => set({ accessToken: null, userId: null }),
}))
