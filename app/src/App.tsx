import type { ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { LoginPage } from './features/auth/LoginPage'
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
        <Route path="/" element={<Protected><h1>Tablero (en construcción)</h1></Protected>} />
        <Route path="/box/:boxNumber" element={<Protected><h1>Box (en construcción)</h1></Protected>} />
        <Route path="/ejecutivo" element={<Protected><h1>Ejecutivo (en construcción)</h1></Protected>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
