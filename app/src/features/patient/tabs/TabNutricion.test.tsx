import { fireEvent, render, screen } from '@testing-library/react'
import { vi } from 'vitest'

const upsert = vi.fn()
vi.mock('../../../lib/supabase/useBoard', () => ({
  useUpsertNutrition: () => ({ mutate: upsert }),
}))

import { TabNutricion } from './TabNutricion'
import { baseStay } from '../../../test/fixtures'

const base = baseStay()

test('editar dos campos de calorías seguidos NO pisa el otro con un valor viejo (regresión)', () => {
  // Mismo bug que en SOFA/Ventilación: `upd` enviaba `{...n, ...patch}` con un
  // `n` capturado en un closure desactualizado, pisando el campo hermano.
  render(<TabNutricion stay={{ ...base }} />)

  const metaInput = screen.getByLabelText('Calorías meta (kcal)')
  const realInput = screen.getByLabelText('Calorías reales (kcal)')

  fireEvent.focus(metaInput)
  fireEvent.change(metaInput, { target: { value: '1800' } })
  fireEvent.blur(metaInput)

  fireEvent.focus(realInput)
  fireEvent.change(realInput, { target: { value: '1400' } })
  fireEvent.blur(realInput)

  const metaCall = upsert.mock.calls.find(([row]) => 'cal_meta' in row)?.[0]
  const realCall = upsert.mock.calls.find(([row]) => 'cal_real' in row)?.[0]
  expect(metaCall).not.toHaveProperty('cal_real')
  expect(realCall).not.toHaveProperty('cal_meta')
  expect(metaCall).toEqual({ stay_id: 's1', cal_meta: 1800 })
})
