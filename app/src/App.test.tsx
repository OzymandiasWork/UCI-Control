import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { vi } from 'vitest'

vi.mock('./lib/supabase/client', () => ({
  supabase: { auth: { signInWithPassword: vi.fn(), signOut: vi.fn() } },
}))

import { LoginPage } from './features/auth/LoginPage'

test('login muestra campos accesibles', () => {
  render(<LoginPage />)
  expect(screen.getByLabelText('Email')).toBeInTheDocument()
  expect(screen.getByLabelText('Contraseña')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /ingresar/i })).toBeInTheDocument()
})

// BoxRedirect es el componente real que monta la ruta "/box/:boxNumber" (ver App.tsx). Antes
// de este test, solo estaba cubierto el lado receptor (BoardPage.test.tsx construye
// location.state a mano) — nada probaba que la ruta real produjera ese state al visitar una
// URL /box/N de verdad. Se monta un router mínimo con las dos rutas involucradas (sin
// `Protected`/useSession, que son ortogonales a lo que se quiere probar aquí) usando el mismo
// BoxRedirect exportado por App.tsx.
import { baseStay } from './test/fixtures'

const stays = [
  baseStay({ id: 's7', box_number: 7, patient_name: 'Paciente Siete', residente: 'jimenez' }),
]

vi.mock('./lib/supabase/useBoard', () => ({
  useBoard: () => ({ data: stays, isLoading: false, isError: false, refetch: vi.fn() }),
  useAdmitStay: () => ({ mutate: vi.fn(), isPending: false, isError: false }),
  useDischargeStay: () => ({ mutate: vi.fn(), isPending: false, isError: false }),
  useUpdateStay: () => ({ mutate: vi.fn() }),
  useChildRow: () => ({
    insert: { mutate: vi.fn() },
    update: { mutate: vi.fn() },
    remove: { mutate: vi.fn() },
  }),
}))
vi.mock('./features/board/animations', () => ({ animateGridEntrance: vi.fn() }))
vi.mock('./lib/supabase/useEvents', () => ({
  useEvents: () => ({ data: [] }),
  useEventMutations: () => ({ add: { mutate: vi.fn() }, remove: { mutate: vi.fn() } }),
}))
vi.mock('@tanstack/react-query', async importOriginal => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>()
  return { ...actual, useIsMutating: () => 0 }
})

import { BoxRedirect } from './App'
import { BoardPage } from './features/board/BoardPage'

test('visitar /box/7 redirige al tablero con el box 7 ya expandido', () => {
  render(
    <MemoryRouter initialEntries={['/box/7']}>
      <Routes>
        <Route path="/box/:boxNumber" element={<BoxRedirect />} />
        <Route path="/" element={<BoardPage />} />
      </Routes>
    </MemoryRouter>,
  )
  expect(screen.getByRole('tablist', { name: /box 7/i })).toBeInTheDocument()
})
