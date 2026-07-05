import { describe, expect, test } from 'vitest'
import { occupancyProjection, occupancyTone } from './occupancy'

describe('proyección de ocupación a 24h', () => {
  test('proyecta libres = libres actuales + egresables', () => {
    const p = occupancyProjection({ occupied: 20, freeBeds: 4, dischargeable: 3 })
    expect(p.projectedFree).toBe(7)
    expect(p.projectedOccupied).toBe(17)
  })

  test('nunca proyecta más camas libres que el total', () => {
    const p = occupancyProjection({ occupied: 2, freeBeds: 22, dischargeable: 5 })
    expect(p.projectedFree).toBeLessThanOrEqual(24)
  })

  test('porcentaje de ocupación actual', () => {
    const p = occupancyProjection({ occupied: 18, freeBeds: 6, dischargeable: 0 })
    expect(p.pctOccupied).toBe(75)
  })
})

describe('semáforo de ocupación', () => {
  test.each([
    [70, 'ok'],
    [85, 'warn'],
    [92, 'danger'],
    [100, 'danger'],
  ])('%s%% → %s', (pct, tone) => {
    expect(occupancyTone(pct)).toBe(tone)
  })
})
