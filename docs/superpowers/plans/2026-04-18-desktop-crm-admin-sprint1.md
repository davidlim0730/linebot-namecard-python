# Desktop CRM Admin — Sprint 1 Plan

**Goal:** Vite+React+TS 骨架 + LINE Login OAuth + AppShell + Sidebar + Header
**Branch:** `feature/desktop-crm-admin`
**Worktree:** `.worktrees/feature/desktop-crm-admin`
**Spec:** `docs/superpowers/specs/2026-04-17-desktop-crm-admin-design.md`

---

## Context

- Python/FastAPI backend 已有 `/api/v1/*` CRM endpoints
- 目標：在同一 Cloud Run 服務新增 `/admin/` React SPA + `/api/auth/line-login/*` OAuth
- Tech: Vite 5 + React 18 + TypeScript + Tailwind CSS v3 + React Router v6 + TanStack Query v5 + Zustand
- 所有新前端檔案在 `app/admin_app/`，build output 在 `app/admin_app/dist/`
- FastAPI 掛 `/admin/` → `app/admin_app/dist/`，加 catch-all 回 index.html
- JWT secret 與 LIFF 共用（`app/services/auth_service.py` 中的 `JWT_SECRET`）
- LINE Login Channel（與 LIFF Channel 不同）需要的 env vars：`LINE_LOGIN_CHANNEL_ID`、`LINE_LOGIN_CHANNEL_SECRET`

---

## Task 1: Vite + React + TypeScript 骨架

**Files to create:**
- `app/admin_app/package.json`
- `app/admin_app/vite.config.ts`
- `app/admin_app/tsconfig.json`
- `app/admin_app/tailwind.config.js`
- `app/admin_app/postcss.config.js`
- `app/admin_app/index.html`
- `app/admin_app/src/main.tsx`
- `app/admin_app/src/App.tsx` (placeholder router with Login route only)
- `app/admin_app/src/index.css` (Tailwind directives)
- `app/admin_app/src/constants/stages.ts`

### Spec

**`package.json`:**
```json
{
  "name": "linebot-namecard-admin",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.26.2",
    "@tanstack/react-query": "^5.56.2",
    "zustand": "^5.0.0",
    "@tanstack/react-table": "^8.20.5",
    "@hello-pangea/dnd": "^17.0.0",
    "react-hook-form": "^7.53.0",
    "zod": "^3.23.8",
    "dayjs": "^1.11.13",
    "lucide-react": "^0.446.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.5",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.47",
    "tailwindcss": "^3.4.13",
    "typescript": "^5.5.3",
    "vite": "^5.4.8"
  }
}
```

**`vite.config.ts`:**
```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/admin/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
})
```

**`tsconfig.json`:**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
```

**`tailwind.config.js`:**
```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#06C755',
        'primary-dark': '#006E2B',
        deal: '#0084FF',
        activity: '#31A24C',
        action: '#FF6B00',
      },
    },
  },
  plugins: [],
}
```

**`postcss.config.js`:**
```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

**`index.html`:**
```html
<!DOCTYPE html>
<html lang="zh-TW">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>CRM Admin</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

**`src/index.css`:**
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**`src/main.tsx`:**
```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
)
```

**`src/App.tsx`** (placeholder — will be replaced in Task 4):
```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import AuthCallback from './pages/AuthCallback'

export default function App() {
  return (
    <BrowserRouter basename="/admin">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/auth-callback" element={<AuthCallback />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
```

**`src/constants/stages.ts`:**
```ts
export const PIPELINE_STAGES = [
  { id: 'inquiry',    label: '洽詢',  color: '#6B7280' },
  { id: 'quote',      label: '報價',  color: '#3B82F6' },
  { id: 'proposal',   label: '提案',  color: '#8B5CF6' },
  { id: 'evaluation', label: '評估',  color: '#F59E0B' },
  { id: 'negotiation',label: '談判',  color: '#EF4444' },
  { id: 'decision',   label: '決策',  color: '#EC4899' },
  { id: 'contract',   label: '簽約',  color: '#10B981' },
] as const

export const TERMINAL_STAGES = [
  { id: 'won',  label: '成交', color: '#06C755' },
  { id: 'lost', label: '失敗', color: '#9CA3AF' },
] as const

export type PipelineStageId = typeof PIPELINE_STAGES[number]['id']
export type TerminalStageId = typeof TERMINAL_STAGES[number]['id']
export type StageId = PipelineStageId | TerminalStageId

export const ALL_STAGES = [...PIPELINE_STAGES, ...TERMINAL_STAGES]

export function getStage(id: string) {
  return ALL_STAGES.find(s => s.id === id)
}
```

### Steps
- [ ] Create all files listed above with exact content
- [ ] Run `npm install` in `app/admin_app/`
- [ ] Run `npm run build` — should succeed (even with placeholder App.tsx, need Login/AuthCallback stubs)
- [ ] Commit: `feat(admin): scaffold Vite+React+TS admin app`

### Notes
- Task 1 should create stub `src/pages/Login.tsx` and `src/pages/AuthCallback.tsx` so `App.tsx` can import them and build passes
- Login stub: just renders `<div>Login</div>`
- AuthCallback stub: just renders `<div>Auth Callback</div>`
- Do NOT install node_modules in the worktree root — install inside `app/admin_app/`

---

## Task 2: FastAPI auth endpoints + /admin/ static mount

**Files to create/modify:**
- Create: `app/api/auth.py`
- Create: `app/services/auth_service.py` (or extend existing if present)
- Modify: `app/main.py` (mount /admin/, catch-all, include auth router)
- Modify: `app/config.py` (add LINE_LOGIN_CHANNEL_ID, LINE_LOGIN_CHANNEL_SECRET)

### Spec

**`app/config.py` additions:**
```python
LINE_LOGIN_CHANNEL_ID: str = os.environ.get("LINE_LOGIN_CHANNEL_ID", "")
LINE_LOGIN_CHANNEL_SECRET: str = os.environ.get("LINE_LOGIN_CHANNEL_SECRET", "")
ADMIN_JWT_SECRET: str = os.environ.get("JWT_SECRET", "dev-secret-change-in-prod")
ADMIN_ACCESS_TTL_HOURS: int = 2
ADMIN_REFRESH_TTL_DAYS: int = 30
```

**`app/services/auth_service.py`** (new file):
```python
import jwt
import secrets
from datetime import datetime, timedelta, timezone
from app.config import ADMIN_JWT_SECRET, ADMIN_ACCESS_TTL_HOURS, ADMIN_REFRESH_TTL_DAYS

ALGORITHM = "HS256"

def create_access_token(user_id: str, org_id: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "org_id": org_id,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=ADMIN_ACCESS_TTL_HOURS),
        "type": "access",
    }
    return jwt.encode(payload, ADMIN_JWT_SECRET, algorithm=ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=ADMIN_REFRESH_TTL_DAYS),
        "jti": secrets.token_urlsafe(16),
        "type": "refresh",
    }
    return jwt.encode(payload, ADMIN_JWT_SECRET, algorithm=ALGORITHM)

def verify_token(token: str, token_type: str = "access") -> dict:
    payload = jwt.decode(token, ADMIN_JWT_SECRET, algorithms=[ALGORITHM])
    if payload.get("type") != token_type:
        raise jwt.InvalidTokenError("Wrong token type")
    return payload
```

**`app/api/auth.py`** (new file, full implementation):
```python
import secrets
import httpx
from fastapi import APIRouter, Cookie, HTTPException, Request, Response
from fastapi.responses import RedirectResponse
from app.config import LINE_LOGIN_CHANNEL_ID, LINE_LOGIN_CHANNEL_SECRET
from app.services.auth_service import create_access_token, create_refresh_token, verify_token
from app.firebase_utils import ensure_user_org
import jwt

router = APIRouter(prefix="/api/auth", tags=["auth"])

LINE_AUTHORIZE_URL = "https://access.line.me/oauth2/v2.1/authorize"
LINE_TOKEN_URL = "https://api.line.me/oauth2/v2.1/token"
LINE_VERIFY_URL = "https://api.line.me/oauth2/v2.1/verify"

def _get_callback_url(request: Request) -> str:
    base = str(request.base_url).rstrip("/")
    return f"{base}/api/auth/line-login/callback"

@router.get("/line-login/authorize")
async def authorize(request: Request, response: Response):
    state = secrets.token_urlsafe(32)
    response.set_cookie(
        "line_login_state", state,
        httponly=True, secure=True, samesite="lax",
        max_age=300
    )
    callback_url = _get_callback_url(request)
    params = (
        f"response_type=code"
        f"&client_id={LINE_LOGIN_CHANNEL_ID}"
        f"&redirect_uri={callback_url}"
        f"&state={state}"
        f"&scope=profile+openid"
    )
    return RedirectResponse(f"{LINE_AUTHORIZE_URL}?{params}")

@router.get("/line-login/callback")
async def callback(
    request: Request,
    response: Response,
    code: str = "",
    state: str = "",
    line_login_state: str = Cookie(default=""),
):
    if not line_login_state or state != line_login_state:
        raise HTTPException(status_code=400, detail="CSRF state mismatch")

    response.delete_cookie("line_login_state")

    if not code:
        raise HTTPException(status_code=400, detail="Missing authorization code")

    callback_url = _get_callback_url(request)
    async with httpx.AsyncClient() as client:
        token_resp = await client.post(LINE_TOKEN_URL, data={
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": callback_url,
            "client_id": LINE_LOGIN_CHANNEL_ID,
            "client_secret": LINE_LOGIN_CHANNEL_SECRET,
        })
    if token_resp.status_code != 200:
        raise HTTPException(status_code=502, detail="Failed to exchange LINE token")

    token_data = token_resp.json()
    id_token = token_data.get("id_token")
    if not id_token:
        raise HTTPException(status_code=502, detail="No id_token from LINE")

    # Verify id_token via LINE API
    async with httpx.AsyncClient() as client:
        verify_resp = await client.post(LINE_VERIFY_URL, data={
            "id_token": id_token,
            "client_id": LINE_LOGIN_CHANNEL_ID,
        })
    if verify_resp.status_code != 200:
        raise HTTPException(status_code=502, detail="id_token verification failed")

    claims = verify_resp.json()
    user_id = claims.get("sub")
    display_name = claims.get("name", "")

    if not user_id:
        raise HTTPException(status_code=502, detail="No user_id in LINE token")

    org_id = await ensure_user_org(user_id, display_name)
    role = "admin"  # simplified: first user is admin

    access_token = create_access_token(user_id, org_id, role)
    refresh_token = create_refresh_token(user_id)

    redirect = RedirectResponse(f"/admin/auth-callback#access_token={access_token}", status_code=302)
    redirect.set_cookie(
        "admin_refresh", refresh_token,
        httponly=True, secure=True, samesite="lax",
        max_age=30 * 24 * 3600
    )
    return redirect

@router.get("/me")
async def me(admin_refresh: str = Cookie(default="")):
    if not admin_refresh:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = verify_token(admin_refresh, token_type="refresh")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    user_id = payload["sub"]
    from app.firebase_utils import get_user_org
    org_id = await get_user_org(user_id)
    if not org_id:
        raise HTTPException(status_code=401, detail="User org not found")

    access_token = create_access_token(user_id, org_id, "admin")
    return {"access_token": access_token, "user_id": user_id}

@router.post("/refresh")
async def refresh(admin_refresh: str = Cookie(default="")):
    if not admin_refresh:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = verify_token(admin_refresh, token_type="refresh")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    user_id = payload["sub"]
    from app.firebase_utils import get_user_org
    org_id = await get_user_org(user_id)
    access_token = create_access_token(user_id, org_id, "admin")
    return {"access_token": access_token}

@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie("admin_refresh")
    return {"ok": True}
```

**`app/main.py` additions:**
1. Import: `from app.api import auth as auth_router`
2. Include router: `app.include_router(auth_router.router)` (before existing routers)
3. Static mount for /admin/ (after existing /liff/ mount):
   ```python
   from pathlib import Path
   from fastapi.responses import FileResponse
   admin_dist = Path("app/admin_app/dist")
   if admin_dist.exists():
       app.mount("/admin", StaticFiles(directory=str(admin_dist), html=True), name="admin")
   ```
4. Add SPA catch-all route **before** any `@app.get("/{path:path}")` wildcard:
   ```python
   @app.get("/admin/{full_path:path}")
   async def admin_spa_catchall(full_path: str):
       file = Path("app/admin_app/dist") / full_path
       if file.is_file():
           return FileResponse(str(file))
       index = Path("app/admin_app/dist/index.html")
       if index.exists():
           return FileResponse(str(index))
       return {"detail": "Admin app not built"}
   ```

### Steps
- [ ] Check `app/firebase_utils.py` for `ensure_user_org` and `get_user_org` function signatures
- [ ] Check `app/config.py` current content before adding
- [ ] Check `app/main.py` current structure (where to add router + static)
- [ ] Create `app/services/auth_service.py`
- [ ] Create `app/api/auth.py`
- [ ] Update `app/config.py`
- [ ] Update `app/main.py`
- [ ] Run `pytest tests/ -q` — must pass (no new tests needed for auth, the logic depends on LINE API calls which can't be unit tested without mocks)
- [ ] Commit: `feat(admin): LINE Login OAuth endpoints + /admin/ static mount`

### Notes
- `ensure_user_org` in `firebase_utils.py` currently has signature `ensure_user_org(user_id)` — check if it accepts `display_name` or not. If not, call it without display_name.
- `get_user_org` may not exist — check. If not, use `firebase_utils.get_user_org_id(user_id)` or read from `user_org_map/{user_id}` directly.
- `httpx` is likely already in requirements.txt — check before adding.
- The catch-all route must be added AFTER the `/admin/` static mount but as a fallback.

---

## Task 3: React auth flow

**Files to create:**
- `app/admin_app/src/api/client.ts`
- `app/admin_app/src/api/auth.ts`
- `app/admin_app/src/auth/AuthStore.ts`
- `app/admin_app/src/auth/useAuth.ts`
- `app/admin_app/src/auth/AuthGuard.tsx`
- `app/admin_app/src/pages/Login.tsx` (replace stub)
- `app/admin_app/src/pages/AuthCallback.tsx` (replace stub)

### Spec

**`src/api/client.ts`:**
```ts
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
    // Try silent refresh
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
```

**`src/api/auth.ts`:**
```ts
import { apiGet, apiPost } from './client'

export function getMe() {
  return apiGet<{ access_token: string; user_id: string }>('/auth/me')
}

export function logout() {
  return apiPost('/auth/logout')
}
```

**`src/auth/AuthStore.ts`:**
```ts
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
```

**`src/auth/useAuth.ts`:**
```ts
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
```

**`src/auth/AuthGuard.tsx`:**
```tsx
import { Navigate } from 'react-router-dom'
import { useAuth } from './useAuth'

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center h-screen text-gray-500">載入中…</div>
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}
```

**`src/pages/Login.tsx`:**
```tsx
export default function Login() {
  const handleLogin = () => {
    window.location.href = '/api/auth/line-login/authorize'
  }
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-md p-10 w-80 text-center">
        <div className="text-4xl mb-4">📊</div>
        <h1 className="text-xl font-bold text-gray-800 mb-2">CRM Admin</h1>
        <p className="text-sm text-gray-500 mb-8">業務團隊管理後台</p>
        <button
          onClick={handleLogin}
          className="w-full bg-[#06C755] hover:bg-[#05a847] text-white font-semibold py-3 px-6 rounded-xl transition-colors"
        >
          以 LINE 登入
        </button>
      </div>
    </div>
  )
}
```

**`src/pages/AuthCallback.tsx`:**
```tsx
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
```

### Steps
- [ ] Create all files above
- [ ] Run `npm run build` in `app/admin_app/` — must succeed
- [ ] Commit: `feat(admin): React auth flow (AuthStore, AuthGuard, Login, AuthCallback)`

---

## Task 4: AppShell + Sidebar + Header

**Files to create/modify:**
- `app/admin_app/src/components/layout/AppShell.tsx`
- `app/admin_app/src/components/layout/Sidebar.tsx`
- `app/admin_app/src/components/layout/Header.tsx`
- `app/admin_app/src/pages/DealsKanban.tsx` (stub)
- `app/admin_app/src/pages/ContactsTable.tsx` (stub)
- `app/admin_app/src/pages/NotFound.tsx` (stub)
- Modify: `app/admin_app/src/App.tsx` (full router with AuthGuard + AppShell)

### Spec

**`src/components/layout/Sidebar.tsx`:**
```tsx
import { NavLink } from 'react-router-dom'
import { LayoutKanban, Users, Settings, LogOut } from 'lucide-react'
import { useAuthStore } from '../../auth/AuthStore'
import { logout } from '../../api/auth'

const navItems = [
  { to: '/deals',    icon: LayoutKanban, label: '案件' },
  { to: '/contacts', icon: Users,        label: '聯絡人' },
]

export default function Sidebar() {
  const clear = useAuthStore(s => s.clear)

  const handleLogout = async () => {
    await logout()
    clear()
    window.location.href = '/admin/login'
  }

  return (
    <aside className="w-[220px] min-h-screen bg-white border-r border-gray-100 flex flex-col">
      <div className="h-14 flex items-center px-5 border-b border-gray-100">
        <span className="text-lg font-bold text-gray-800">📊 CRM</span>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-green-50 text-green-700'
                  : 'text-gray-600 hover:bg-gray-50'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="px-3 py-4 border-t border-gray-100 space-y-1">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-50 w-full"
        >
          <LogOut size={18} />
          登出
        </button>
      </div>
    </aside>
  )
}
```

**`src/components/layout/Header.tsx`:**
```tsx
import { Plus } from 'lucide-react'

interface HeaderProps {
  title: string
  onNluOpen?: () => void
}

export default function Header({ title, onNluOpen }: HeaderProps) {
  return (
    <header className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-6">
      <h1 className="text-base font-semibold text-gray-800">{title}</h1>
      {onNluOpen && (
        <button
          onClick={onNluOpen}
          className="flex items-center gap-2 bg-[#06C755] hover:bg-[#05a847] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={16} />
          意識流輸入
        </button>
      )}
    </header>
  )
}
```

**`src/components/layout/AppShell.tsx`:**
```tsx
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'

const pageTitles: Record<string, string> = {
  '/deals': '案件 Kanban',
  '/contacts': '聯絡人',
}

export default function AppShell() {
  const { pathname } = useLocation()
  const title = pageTitles[pathname] ?? 'CRM Admin'
  const showNlu = pathname === '/deals' || pathname === '/contacts'

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-screen">
        <Header title={title} onNluOpen={showNlu ? () => {} : undefined} />
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
```

**Stub pages:**

`src/pages/DealsKanban.tsx`:
```tsx
export default function DealsKanban() {
  return <div className="text-gray-500">案件 Kanban（Sprint 2 實作）</div>
}
```

`src/pages/ContactsTable.tsx`:
```tsx
export default function ContactsTable() {
  return <div className="text-gray-500">聯絡人（Sprint 4 實作）</div>
}
```

`src/pages/NotFound.tsx`:
```tsx
export default function NotFound() {
  return <div className="text-center py-20 text-gray-400">404 — 找不到頁面</div>
}
```

**`src/App.tsx`** (final):
```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AuthGuard from './auth/AuthGuard'
import AppShell from './components/layout/AppShell'
import Login from './pages/Login'
import AuthCallback from './pages/AuthCallback'
import DealsKanban from './pages/DealsKanban'
import ContactsTable from './pages/ContactsTable'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <BrowserRouter basename="/admin">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/auth-callback" element={<AuthCallback />} />
        <Route
          path="/"
          element={
            <AuthGuard>
              <AppShell />
            </AuthGuard>
          }
        >
          <Route index element={<Navigate to="/deals" replace />} />
          <Route path="deals" element={<DealsKanban />} />
          <Route path="contacts" element={<ContactsTable />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
```

### Steps
- [ ] Create all layout components and stub pages
- [ ] Update `src/App.tsx` to full router
- [ ] Run `npm run build` in `app/admin_app/` — must succeed
- [ ] Run `pytest tests/ -q` in worktree root — must still pass
- [ ] Commit: `feat(admin): AppShell + Sidebar + Header layout`

---

## Summary

| Task | Files | Commit message |
|------|-------|----------------|
| 1 | `app/admin_app/` scaffold | `feat(admin): scaffold Vite+React+TS admin app` |
| 2 | `app/api/auth.py`, `app/services/auth_service.py`, `app/main.py`, `app/config.py` | `feat(admin): LINE Login OAuth endpoints + /admin/ static mount` |
| 3 | `src/api/`, `src/auth/`, `src/pages/Login.tsx`, `src/pages/AuthCallback.tsx` | `feat(admin): React auth flow (AuthStore, AuthGuard, Login, AuthCallback)` |
| 4 | `src/components/layout/`, stub pages, `src/App.tsx` | `feat(admin): AppShell + Sidebar + Header layout` |
