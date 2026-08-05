import type { ComponentProps } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import { BoardPage } from './BoardPage'
import { useBoard } from '../../lib/supabase/useBoard'
import { baseStay } from '../../test/fixtures'

const stays = [
  baseStay({ id: 's4', box_number: 4, patient_name: 'Paciente Cuatro', residente: 'jimenez' }),
  baseStay({ id: 's6', box_number: 6, patient_name: 'Paciente Seis', residente: 'saenz' }),
]

vi.mock('../../lib/supabase/useBoard', () => ({
  useBoard: vi.fn(() => ({ data: stays, isLoading: false, isError: false, refetch: vi.fn() })),
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
// ExpandedBox usa useIsMutating() directo de @tanstack/react-query (indicador de guardado
// automático) sin pasar por useBoard.ts. Se mockea solo ese export, igual que en
// ExpandedBox.test.tsx, para no requerir un QueryClientProvider real en estos tests.
vi.mock('@tanstack/react-query', async importOriginal => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>()
  return { ...actual, useIsMutating: () => 0 }
})

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

test('mientras isLoading es true, ningún box (ocupado o no) es expandible', () => {
  // BoardPage solo lee { data, isLoading, isError, refetch } de este hook — el resto de las
  // propiedades del UseQueryResult real de react-query no le importan, así que se castea el
  // literal simplificado en vez de construir la unión discriminada completa.
  vi.mocked(useBoard).mockReturnValueOnce(
    { data: [], isLoading: true, isError: false, refetch: vi.fn() } as unknown as ReturnType<typeof useBoard>,
  )
  renderBoard([{ pathname: '/', state: { expandBox: 4 } }])
  // Con data:[] y isLoading:true, el box 4 (que en el fixture real tiene paciente)
  // no debe mostrarse como "Cama libre" expandible ni montar ExpandedBox: el gate
  // `!isLoading && expandedBoxNumber === n` en BoardPage evita ambos.
  expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /ingresar paciente/i })).not.toBeInTheDocument()
})
