import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, vi } from 'vitest'

const updateStay = vi.fn()
const childRow = { insert: { mutate: vi.fn() }, update: { mutate: vi.fn() }, remove: { mutate: vi.fn() } }
vi.mock('../../../lib/supabase/useBoard', () => ({
  useUpdateStay: () => ({ mutate: updateStay }),
  useChildRow: () => childRow,
}))

import { TabClinico } from './TabClinico'
import { baseStay } from '../../../test/fixtures'

beforeEach(() => {
  updateStay.mockClear()
  childRow.insert.mutate.mockClear()
})

test('cambiar el destino guarda SOLO destino_tipo (patch parcial, anti-clobbering)', async () => {
  render(<TabClinico stay={baseStay()} />)
  await userEvent.selectOptions(screen.getByLabelText('Destino'), '→ Traslado a otro hospital')
  expect(updateStay).toHaveBeenCalledWith({ id: 's1', patch: { destino_tipo: 'traslado' } })
})

test('el hint de sigla del centro aparece solo con destino traslado', () => {
  const { rerender } = render(<TabClinico stay={baseStay()} />)
  expect(screen.queryByText(/Sigla del centro/)).not.toBeInTheDocument()
  rerender(<TabClinico stay={baseStay({ destino_tipo: 'traslado' })} />)
  expect(screen.getByText(/Sigla del centro, ej. HSJD/)).toBeInTheDocument()
})

test('el texto libre existente sigue editable como Detalle destino', () => {
  const stay = baseStay({ destination: 'TC abdomen' })
  render(<TabClinico stay={stay} />)
  const detalle = screen.getByLabelText('Detalle destino (texto libre)')
  expect(detalle).toHaveValue('TC abdomen')
  fireEvent.focus(detalle)
  fireEvent.change(detalle, { target: { value: 'HSJD' } })
  fireEvent.blur(detalle)
  expect(updateStay).toHaveBeenCalledWith({ id: 's1', patch: { destination: 'HSJD' } })
})

test('comorbilidades se guarda como patch parcial', () => {
  render(<TabClinico stay={baseStay()} />)
  const campo = screen.getByLabelText('Enfermedades de base / Comorbilidades')
  fireEvent.focus(campo)
  fireEvent.change(campo, { target: { value: 'DM2, HTA' } })
  fireEvent.blur(campo)
  expect(updateStay).toHaveBeenCalledWith({ id: 's1', patch: { comorbilidades: 'DM2, HTA' } })
})

test('agregar otro acceso inserta con tipo Sonda urinaria (Foley)', async () => {
  render(<TabClinico stay={baseStay()} />)
  await userEvent.click(screen.getByRole('button', { name: '+ Agregar otro acceso' }))
  expect(childRow.insert.mutate).toHaveBeenCalledWith({ stay_id: 's1', type: 'Sonda urinaria (Foley)', day: 0 })
})

test('un acceso Foley se lista bajo Otros accesos y no bajo los vasculares', () => {
  const stay = baseStay({
    accesses: [
      { id: 'a1', stay_id: 's1', type: 'CVC', day: 2 },
      { id: 'a2', stay_id: 's1', type: 'Sonda urinaria (Foley)', day: 5 },
    ],
  })
  render(<TabClinico stay={stay} />)
  expect(screen.getByRole('heading', { name: 'Accesos vasculares' })).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Otros accesos' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Eliminar acceso CVC' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Eliminar acceso Sonda urinaria (Foley)' })).toBeInTheDocument()
})
