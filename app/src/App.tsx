import type { ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { LoginPage } from './features/auth/LoginPage'
import { BoardPage } from './features/board/BoardPage'
import { PatientPage } from './features/patient/PatientPage'
import { ExecutivePage } from './features/executive/ExecutivePage'
import { useSession } from './lib/supabase/useSession'

function Protected({ children }: { children: ReactNode }) {
  const { session, loading } = useSession()
  if (loading) return <p role="status">Cargando…</p>
  if (!session) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<Protected><BoardPage /></Protected>} />
        <Route path="/box/:boxNumber" element={<Protected><PatientPage /></Protected>} />
        <Route path="/ejecutivo" element={<Protected><ExecutivePage /></Protected>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
