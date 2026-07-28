import type { ComponentProps } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import { BoardPage } from './BoardPage'
import { baseStay } from '../../test/fixtures'

const stays = [
  baseStay({ id: 's4', box_number: 4, patient_name: 'Paciente Cuatro', residente: 'jimenez' }),
  baseStay({ id: 's6', box_number: 6, patient_name: 'Paciente Seis', residente: 'saenz' }),
]

vi.mock('../../lib/supabase/useBoard', () => ({
  useBoard: () => ({ data: stays, isLoading: false, isError: false, refetch: vi.fn() }),
  // Expanding a box mounts ExpandedBox -> IngresoEgreso + the default "Clínico" tab,
  // which also pull mutations from this module. Stubbed so expansion is mountable.
  useAdmitStay: () => ({ mutate: vi.fn(), isPending: false, isError: false }),
  useDischargeStay: () => ({ mutate: vi.fn(), isPending: false, isError: false }),
  useUpdateStay: () => ({ mutate: vi.fn() }),
  useChildRow: () => ({
    insert: { mutate: vi.fn() },
    update: { mutate: vi.fn() },
    remove: { mutate: vi.fn() },
  }),
}))
vi.mock('../../lib/supabase/client', () => ({
  supabase: { auth: { signOut: vi.fn() } },
}))
vi.mock('./animations', () => ({ animateGridEntrance: vi.fn() }))
// AgendaPanel (rendered unconditionally by BoardPage, out of scope for this task) calls
// useEvents/useEventMutations, which need a QueryClientProvider. Mocked here so BoardPage's
// own accordion/deep-link behavior can be exercised without wiring up react-query.
vi.mock('../../lib/supabase/useEvents', () => ({
  useEvents: () => ({ data: [] }),
  useEventMutations: () => ({ add: { mutate: vi.fn() }, remove: { mutate: vi.fn() } }),
}))

function renderBoard(initialEntries: ComponentProps<typeof MemoryRouter>['initialEntries'] = ['/']) {
  return render(<MemoryRouter initialEntries={initialEntries}><BoardPage /></MemoryRouter>)
}

test('ningún box expandido al cargar sin location.state', () => {
  renderBoard()
  expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
})

test('expandir el box 4 y luego el box 6 colapsa el 4 (acordeón)', async () => {
  renderBoard()
  await userEvent.click(screen.getByRole('button', { name: /box 4:/i }))
  expect(screen.getByRole('tablist', { name: /box 4/i })).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: /box 6:/i }))
  expect(screen.queryByRole('tablist', { name: /box 4/i })).not.toBeInTheDocument()
  expect(screen.getByRole('tablist', { name: /box 6/i })).toBeInTheDocument()
})

test('click de nuevo en el mismo box lo colapsa', async () => {
  renderBoard()
  await userEvent.click(screen.getByRole('button', { name: /box 4:/i }))
  expect(screen.getByRole('tablist')).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: /box 4:/i }))
  expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
})

test('con location.state.expandBox, el tablero carga con ese box ya expandido', () => {
  renderBoard([{ pathname: '/', state: { expandBox: 6 } }])
  expect(screen.getByRole('tablist', { name: /box 6/i })).toBeInTheDocument()
})

test('filtrar por residente que excluye el box expandido lo colapsa automáticamente', async () => {
  renderBoard()
  await userEvent.click(screen.getByRole('button', { name: /box 4:/i }))
  expect(screen.getByRole('tablist')).toBeInTheDocument()
  await userEvent.selectOptions(screen.getByLabelText(/filtrar por residente/i), 'saenz')
  expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
})
