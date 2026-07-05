import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'

const admit = { mutate: vi.fn(), isPending: false, isError: false }
const discharge = { mutate: vi.fn(), isPending: false, isError: false }
vi.mock('../../lib/supabase/useBoard', () => ({
  useAdmitStay: () => admit,
  useDischargeStay: () => discharge,
}))

import { IngresoEgreso } from './IngresoEgreso'
import type { StayFull } from '../../lib/supabase/types'

const stay = { id: 's1' } as StayFull

test('cama libre: botón de ingresar, sin confirmación adicional', () => {
  render(<IngresoEgreso boxNumber={3} stay={null} />)
  expect(screen.getByRole('button', { name: 'Ingresar paciente' })).toBeInTheDocument()
})

test('egresar: el clic no borra de inmediato, muestra confirmación', async () => {
  render(<IngresoEgreso boxNumber={3} stay={stay} />)
  await userEvent.click(screen.getByRole('button', { name: /egresar paciente/i }))
  expect(screen.getByText(/¿Egresar al paciente del box 3/)).toBeInTheDocument()
  expect(discharge.mutate).not.toHaveBeenCalled()
})

test('al confirmar aparecer, el foco va a "Cancelar" (opción segura por defecto)', async () => {
  render(<IngresoEgreso boxNumber={3} stay={stay} />)
  await userEvent.click(screen.getByRole('button', { name: /egresar paciente/i }))
  expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus()
})

test('Escape cancela sin egresar', async () => {
  render(<IngresoEgreso boxNumber={3} stay={stay} />)
  await userEvent.click(screen.getByRole('button', { name: /egresar paciente/i }))
  await userEvent.keyboard('{Escape}')
  expect(screen.queryByText(/¿Egresar al paciente/)).not.toBeInTheDocument()
  expect(discharge.mutate).not.toHaveBeenCalled()
})

test('confirmar egreso llama a discharge.mutate con el id del stay', async () => {
  render(<IngresoEgreso boxNumber={3} stay={stay} />)
  await userEvent.click(screen.getByRole('button', { name: /egresar paciente/i }))
  await userEvent.click(screen.getByRole('button', { name: 'Confirmar egreso' }))
  expect(discharge.mutate).toHaveBeenCalledWith('s1')
})
