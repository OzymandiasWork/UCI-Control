import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'

const upsert = vi.fn()
vi.mock('../../../lib/supabase/useBoard', () => ({
  useUpsertSofaToday: () => ({ mutate: upsert }),
}))

import userEvent from '@testing-library/user-event'
import { TabSofa } from './TabSofa'
import { baseStay } from '../../../test/fixtures'

const today = new Date().toISOString().slice(0, 10)
const base = baseStay()

test('muestra total y riesgo de la evaluación de hoy', () => {
  render(<TabSofa stay={{
    ...base,
    sofa_assessments: [{ id: 'a1', stay_id: 's1', assessed_on: today, resp: 3, coag: 1, liver: 0, cardio: 2, neuro: 0, renal: 1 }],
  }} />)
  expect(screen.getByText(/SOFA total: 7/)).toBeInTheDocument()
  expect(screen.getByText(/Mortalidad ~40%/)).toBeInTheDocument()
})

test('seleccionar un puntaje llama al upsert de hoy', async () => {
  render(<TabSofa stay={{ ...base, sofa_assessments: [] }} />)
  await userEvent.click(screen.getByRole('radio', { name: /respiratorio.*≥400/i }))
  expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ stay_id: 's1', resp: 0 }))
})

test('marcar dos dominios seguidos NO pisa el otro con un valor viejo (regresión)', async () => {
  // Bug real reproducido en producción: enviar el objeto `scores` completo
  // (capturado en un closure desactualizado) en cada upsert hacía que el
  // segundo guardado revirtiera el dominio recién marcado por el primero.
  render(<TabSofa stay={{ ...base, sofa_assessments: [] }} />)
  await userEvent.click(screen.getByRole('radio', { name: /respiratorio.*≥400/i }))
  await userEvent.click(screen.getByRole('radio', { name: /coagulación.*≥150/i }))

  const respCall = upsert.mock.calls.find(([row]) => 'resp' in row)?.[0]
  const coagCall = upsert.mock.calls.find(([row]) => 'coag' in row)?.[0]
  expect(respCall).not.toHaveProperty('coag')
  expect(coagCall).not.toHaveProperty('resp')
})
