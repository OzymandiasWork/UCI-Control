import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'

// Mock Supabase hooks and client before anything imports them
vi.mock('../../lib/supabase/useBoard', () => ({
  useAdmitStay: () => ({ mutate: vi.fn(), isPending: false, isError: false }),
  useDischargeStay: () => ({ mutate: vi.fn(), isPending: false, isError: false }),
  useUpdateStay: () => ({ mutate: vi.fn() }),
  useChildRow: () => vi.fn(),
  useVentSettings: () => null,
  useBloodGases: () => [],
  useNutrition: () => null,
  useSofa: () => [],
  useMetas: () => [],
  useSugerencias: () => [],
  useMrc: () => [],
  useEmrSessions: () => [],
  useAntibiotics: () => [],
}))

// ExpandedBox usa useIsMutating() (indicador "Guardando…"/"✓ Guardado automático") directo
// de @tanstack/react-query, sin pasar por useBoard.ts. Como estos tests no envuelven con un
// QueryClientProvider real (mismo enfoque que el resto del repo: mockear el hook, no montar
// el provider), se mockea solo ese export y se conserva el resto del módulo intacto.
vi.mock('@tanstack/react-query', async importOriginal => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>()
  return { ...actual, useIsMutating: () => 0 }
})

// Mock all Tab components
vi.mock('./tabs/TabClinico', () => ({ TabClinico: () => <div>TabClinico</div> }))
vi.mock('./tabs/TabVentilacion', () => ({ TabVentilacion: () => <div>TabVentilacion</div> }))
vi.mock('./tabs/TabEquipo', () => ({ TabEquipo: () => <div>TabEquipo</div> }))
vi.mock('./tabs/TabATB', () => ({ TabATB: () => <div>TabATB</div> }))
vi.mock('./tabs/TabNutricion', () => ({ TabNutricion: () => <div>TabNutricion</div> }))
vi.mock('./tabs/TabSofa', () => ({ TabSofa: () => <div>TabSofa</div> }))
vi.mock('./tabs/TabMetas', () => ({ TabMetas: () => <div>TabMetas</div> }))
vi.mock('./tabs/TabSugerencias', () => ({ TabSugerencias: () => <div>TabSugerencias</div> }))
vi.mock('./tabs/TabFuncional', () => ({ TabFuncional: () => <div>TabFuncional</div> }))
vi.mock('./tabs/TabEMR', () => ({ TabEMR: () => <div>TabEMR</div> }))

import { ExpandedBox } from './ExpandedBox'
import { baseStay } from '../../test/fixtures'

test('box libre solo muestra IngresoEgreso, sin tabs', () => {
  render(<ExpandedBox stay={null} boxNumber={7} onClose={() => {}} />)
  expect(screen.getByText(/cama libre/i)).toBeInTheDocument()
  expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
})

test('box ocupado muestra los 10 tabs clínicos', () => {
  render(<ExpandedBox stay={baseStay({ patient_name: 'J. Pérez' })} boxNumber={5} onClose={() => {}} />)
  const tablist = screen.getByRole('tablist', { name: /módulos del paciente del box 5/i })
  expect(tablist).toBeInTheDocument()
  for (const label of ['Clínico', 'Ventilación', 'Equipo', 'ATB', 'Nutrición', 'SOFA', 'Metas', 'Sugerencias', 'Funcional', 'EMR']) {
    expect(screen.getByRole('tab', { name: label })).toBeInTheDocument()
  }
})

test('muestra el indicador de guardado automático (reemplazo del guardado manual del prototipo)', () => {
  render(<ExpandedBox stay={baseStay({ patient_name: 'J. Pérez' })} boxNumber={5} onClose={() => {}} />)
  expect(screen.getByRole('status')).toHaveTextContent(/guardado automático/i)
})

test('tiene un encabezado que identifica el box, dentro de una región etiquetada', () => {
  render(<ExpandedBox stay={baseStay({ patient_name: 'J. Pérez' })} boxNumber={5} onClose={() => {}} />)
  expect(screen.getByRole('heading', { name: /box 5.*j\. pérez/i })).toBeInTheDocument()
  expect(screen.getByRole('region', { name: /box 5.*j\. pérez/i })).toBeInTheDocument()
})

test('muestra la sección "Prevención de IAAS" colapsable, vacía por ahora', () => {
  render(<ExpandedBox stay={baseStay({ patient_name: 'J. Pérez' })} boxNumber={5} onClose={() => {}} />)
  expect(screen.getByText(/prevención de iaas/i)).toBeInTheDocument()
})

test('click en "Colapsar" llama onClose', async () => {
  const onClose = vi.fn()
  render(<ExpandedBox stay={baseStay({ patient_name: 'J. Pérez' })} boxNumber={5} onClose={onClose} />)
  await userEvent.click(screen.getByRole('button', { name: /colapsar/i }))
  expect(onClose).toHaveBeenCalledOnce()
})

test('no navega ni usa react-router (no requiere MemoryRouter)', () => {
  expect(() => render(<ExpandedBox stay={null} boxNumber={1} onClose={() => {}} />)).not.toThrow()
})
