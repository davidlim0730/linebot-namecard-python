import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AuthGuard from './auth/AuthGuard'
import AppShell from './components/layout/AppShell'
import Login from './pages/Login'
import AuthCallback from './pages/AuthCallback'
import DealsKanban from './pages/DealsKanban'
import DealDetail from './pages/DealDetail'
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
          <Route path="deals/:id" element={<DealDetail />} />
          <Route path="contacts" element={<ContactsTable />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
