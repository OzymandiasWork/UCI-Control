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
import { baseStay } from '../test/fixtures'

const stay = baseStay({
  box_number: 3, patient_name: 'J. Pérez', diagnosis: 'shock septico',
  alert: 'critical', dias_hosp: 1, dias_vm: 1, vm_mode: 'VCV',
})

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
