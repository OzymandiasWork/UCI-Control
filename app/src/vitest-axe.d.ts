import 'vitest'
import type { AxeMatchers } from 'vitest-axe/matchers'

declare module 'vitest' {
  interface Assertion<T = unknown> extends AxeMatchers {
    __t?: T
  }
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}
