import { render } from '@testing-library/react'
import { axe } from 'vitest-axe'
import * as matchers from 'vitest-axe/matchers'
import { expect, test, vi } from 'vitest'

expect.extend(matchers)

vi.mock('../lib/supabase/client', () => ({
  supabase: { auth: { signInWithPassword: vi.fn() } },
}))
// Expanding a box mounts ExpandedBox -> IngresoEgreso + the default "Clínico" tab,
// which pull mutations from this module. Stubbed so expansion is mountable without a
// QueryClientProvider (same pattern as BoardPage.test.tsx / ExpandedBox.test.tsx).
vi.mock('../lib/supabase/useBoard', () => ({
  useAdmitStay: () => ({ mutate: vi.fn(), isPending: false, isError: false }),
  useDischargeStay: () => ({ mutate: vi.fn(), isPending: false, isError: false }),
  useUpdateStay: () => ({ mutate: vi.fn() }),
  useChildRow: () => ({
    insert: { mutate: vi.fn() },
    update: { mutate: vi.fn() },
    remove: { mutate: vi.fn() },
  }),
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
    <BoxCard boxNumber={3} stay={stay} expanded={false} onToggle={() => {}} />,
  )
  expect(await axe(container)).toHaveNoViolations()
})

test('BoxCard libre sin violaciones axe', async () => {
  const { container } = render(
    <BoxCard boxNumber={7} stay={null} expanded={false} onToggle={() => {}} />,
  )
  expect(await axe(container)).toHaveNoViolations()
})

test('BoxCard expandido sin violaciones axe', async () => {
  const { container } = render(
    <BoxCard boxNumber={3} stay={stay} expanded={true} onToggle={() => {}} />,
  )
  expect(await axe(container)).toHaveNoViolations()
})
