import { lazy, Suspense, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { LoginPage } from './features/auth/LoginPage'
import { ConnectionBanner } from './features/shared/ConnectionBanner'
import { useSession } from './lib/supabase/useSession'

// Code-splitting por ruta: quien solo ve /login (sin sesión, o mientras
// carga) no debería descargar el tablero, las 8 pestañas del paciente,
// GSAP, etc. Reduce el peso de la primera carga — importa en redes de
// hospital/datos móviles, que es donde vive esta app.
const BoardPage = lazy(() => import('./features/board/BoardPage').then(m => ({ default: m.BoardPage })))
const PatientPage = lazy(() => import('./features/patient/PatientPage').then(m => ({ default: m.PatientPage })))
const ExecutivePage = lazy(() => import('./features/executive/ExecutivePage').then(m => ({ default: m.ExecutivePage })))
const TurnoPage = lazy(() => import('./features/turno/TurnoPage').then(m => ({ default: m.TurnoPage })))

function PageFallback() {
  return <p role="status">Cargando…</p>
}

function Protected({ children }: { children: ReactNode }) {
  const { session, loading } = useSession()
  if (loading) return <PageFallback />
  if (!session) return <Navigate to="/login" replace />
  return <Suspense fallback={<PageFallback />}>{children}</Suspense>
}

/** Con sesión activa, /login redirige al tablero (incluye el instante post-login). */
function LoginRoute() {
  const { session, loading } = useSession()
  if (loading) return <PageFallback />
  if (session) return <Navigate to="/" replace />
  return <LoginPage />
}

export default function App() {
  return (
    <BrowserRouter>
      <ConnectionBanner />
      <Routes>
        <Route path="/login" element={<LoginRoute />} />
        <Route path="/" element={<Protected><BoardPage /></Protected>} />
        <Route path="/box/:boxNumber" element={<Protected><PatientPage /></Protected>} />
        <Route path="/ejecutivo" element={<Protected><ExecutivePage /></Protected>} />
        <Route path="/turno" element={<Protected><TurnoPage /></Protected>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
