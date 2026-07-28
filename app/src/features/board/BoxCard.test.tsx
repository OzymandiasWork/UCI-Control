import { useState } from 'react'
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

// ExpandedBox usa useIsMutating() directo de @tanstack/react-query (indicador de guardado
// automático) sin pasar por useBoard.ts. Se mockea solo ese export para no requerir un
// QueryClientProvider real en estos tests.
vi.mock('@tanstack/react-query', async importOriginal => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>()
  return { ...actual, useIsMutating: () => 0 }
})

// Mock all Tab components to avoid loading them
vi.mock('../patient/tabs/TabClinico', () => ({ TabClinico: () => <div>TabClinico</div> }))
vi.mock('../patient/tabs/TabVentilacion', () => ({ TabVentilacion: () => <div>TabVentilacion</div> }))
vi.mock('../patient/tabs/TabEquipo', () => ({ TabEquipo: () => <div>TabEquipo</div> }))
vi.mock('../patient/tabs/TabATB', () => ({ TabATB: () => <div>TabATB</div> }))
vi.mock('../patient/tabs/TabNutricion', () => ({ TabNutricion: () => <div>TabNutricion</div> }))
vi.mock('../patient/tabs/TabSofa', () => ({ TabSofa: () => <div>TabSofa</div> }))
vi.mock('../patient/tabs/TabMetas', () => ({ TabMetas: () => <div>TabMetas</div> }))
vi.mock('../patient/tabs/TabSugerencias', () => ({ TabSugerencias: () => <div>TabSugerencias</div> }))
vi.mock('../patient/tabs/TabFuncional', () => ({ TabFuncional: () => <div>TabFuncional</div> }))
vi.mock('../patient/tabs/TabEMR', () => ({ TabEMR: () => <div>TabEMR</div> }))

import { BoxCard } from './BoxCard'
import type { StayFull } from '../../lib/supabase/types'
import { baseStay } from '../../test/fixtures'

const today = new Date().toISOString().slice(0, 10)

const stay = baseStay({
  box_number: 5, patient_name: 'J. Pérez', record_number: '12345',
  diagnosis: 'shock septico', alert: 'critical', residente: 'jimenez',
  dias_hosp: 3, dias_vm: 2, vm_mode: 'VCV',
  goals: [{ id: 'g1', stay_id: 's1', text: 'meta', done: false, position: 0 }],
  sofa_assessments: [{ id: 'a1', stay_id: 's1', assessed_on: today, resp: 3, coag: 1, liver: 0, cardio: 2, neuro: 0, renal: 1 }],
})

function renderCard(s: StayFull | null, box = 5, expanded = false, onToggle = () => {}) {
  return render(<BoxCard boxNumber={box} stay={s} expanded={expanded} onToggle={onToggle} />)
}

test('box ocupado colapsado muestra nombre, diagnóstico, residente y día — sin navegar', () => {
  renderCard(stay)
  expect(screen.getByText('J. Pérez')).toBeInTheDocument()
  expect(screen.getByText(/shock septico/i)).toBeInTheDocument()
  expect(screen.getByText(/jimenez/i)).toBeInTheDocument()
  expect(screen.getByText(/d3/i)).toBeInTheDocument()
  expect(screen.queryByRole('link')).not.toBeInTheDocument()
})

test('colapsado es un botón accesible que llama onToggle al hacer click', async () => {
  const onToggle = vi.fn()
  renderCard(stay, 5, false, onToggle)
  await userEvent.click(screen.getByRole('button', { name: /box 5/i }))
  expect(onToggle).toHaveBeenCalledOnce()
})

test('box libre colapsado se anuncia como cama libre', () => {
  renderCard(null, 7)
  expect(screen.getByText(/cama libre/i)).toBeInTheDocument()
})

test('expanded=true muestra el panel ExpandedBox con los tabs', () => {
  renderCard(stay, 5, true)
  expect(screen.getByRole('tablist')).toBeInTheDocument()
})

test('expanded=false NO monta el panel ExpandedBox', () => {
  renderCard(stay, 5, false)
  expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
})

test('con destino_tipo marcado, la fila colapsada muestra el badge del destino', () => {
  renderCard(baseStay({ destino_tipo: 'fallecido', patient_name: 'X' }))
  expect(screen.getByText('✝ Fallecido')).toBeInTheDocument()
})

test('sin destino_tipo no hay badge de destino', () => {
  renderCard(baseStay({ patient_name: 'X' }))
  expect(screen.queryByText(/Destino —/)).not.toBeInTheDocument()
})

test('al colapsar desde "Colapsar" (dentro del panel), el foco vuelve a la fila del box y no se pierde en <body>', async () => {
  function Wrapper() {
    const [expanded, setExpanded] = useState(true)
    return <BoxCard boxNumber={5} stay={stay} expanded={expanded} onToggle={() => setExpanded(e => !e)} />
  }
  render(<Wrapper />)
  await userEvent.click(screen.getByRole('button', { name: /colapsar/i }))
  expect(screen.getByRole('button', { name: /box 5:/i })).toHaveFocus()
})

test('expandido, la fila tiene aria-controls apuntando al panel expandido', () => {
  renderCard(stay, 5, true)
  const row = screen.getByRole('button', { name: /box 5:/i })
  expect(row).toHaveAttribute('aria-controls', 'expanded-box-5')
  expect(document.getElementById('expanded-box-5')).toBeInTheDocument()
})
