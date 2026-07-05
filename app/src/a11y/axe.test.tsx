import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { axe } from 'vitest-axe'
import * as matchers from 'vitest-axe/matchers'
import { expect, test, vi } from 'vitest'

expect.extend(matchers)

vi.mock('../lib/supabase/client', () => ({
  supabase: { auth: { signInWithPassword: vi.fn() } },
}))

import { LoginPage } from '../features/auth/LoginPage'
import { BoxCard } from '../features/board/BoxCard'
import type { StayFull } from '../lib/supabase/types'

const stay = {
  id: 's1', box_number: 3, active: true, patient_name: 'J. Pérez',
  record_number: '', diagnosis: 'shock septico', alert: 'critical',
  residente: '', destination: '', dias_hosp: 1, dias_vm: 1, vm_mode: 'VCV',
  rcp: 'Sí', alergias: '', prevision: 'Fonasa A', consentimiento: false,
  balance_meta: '', balance_real: '', contacto_nombre: '', contacto_tel: '',
  ultimo_contacto: '', notes: '', enfermera: '', tens: '', kine: '',
  updated_at: '', goals: [], antibiotics: [], accesses: [], nutrition: null,
  sofa_assessments: [], vent_settings: null, blood_gases: [],
  mrc_assessments: [], emr_sessions: [],
} satisfies StayFull

test('LoginPage sin violaciones axe', async () => {
  const { container } = render(<LoginPage />)
  expect(await axe(container)).toHaveNoViolations()
})

test('BoxCard ocupado sin violaciones axe', async () => {
  const { container } = render(
    <MemoryRouter><BoxCard boxNumber={3} stay={stay} /></MemoryRouter>,
  )
  expect(await axe(container)).toHaveNoViolations()
})

test('BoxCard libre sin violaciones axe', async () => {
  const { container } = render(
    <MemoryRouter><BoxCard boxNumber={7} stay={null} /></MemoryRouter>,
  )
  expect(await axe(container)).toHaveNoViolations()
})
