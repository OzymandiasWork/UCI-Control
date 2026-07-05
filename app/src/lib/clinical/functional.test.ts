import { describe, expect, test } from 'vitest'
import { MRC_GROUPS, calcMrcTotal, mrcInterp, type MrcScores } from './functional'

const emptyScores = (): MrcScores =>
  Object.fromEntries(MRC_GROUPS.map(g => [g.key, null])) as MrcScores

describe('MRC-SS: doce grupos musculares', () => {
  test('hay exactamente 12 grupos, con las etiquetas del prototipo RYGF', () => {
    expect(MRC_GROUPS).toHaveLength(12)
    expect(MRC_GROUPS.map(g => g.label)).toEqual([
      'Abd. HH D', 'Flex. HH D', 'Ext. MU D',
      'Abd. HH I', 'Flex. HH I', 'Ext. MU I',
      'Flex. Rod D', 'Ext. Rod D', 'Dors. Pie D',
      'Flex. Rod I', 'Ext. Rod I', 'Dors. Pie I',
    ])
  })
})

describe('calcMrcTotal', () => {
  test('todos los grupos sin evaluar (null) → total null', () => {
    expect(calcMrcTotal(emptyScores())).toBeNull()
  })

  test('suma null-safe: los grupos sin evaluar cuentan como 0', () => {
    const s = { ...emptyScores(), abd_hh_d: 3, flex_hh_d: 3, ext_mu_d: 3 }
    expect(calcMrcTotal(s)).toBe(9)
  })

  test('los 12 grupos en 5 puntos suman 60 (máximo posible)', () => {
    const s = Object.fromEntries(MRC_GROUPS.map(g => [g.key, 5])) as MrcScores
    expect(calcMrcTotal(s)).toBe(60)
  })
})

describe('mrcInterp', () => {
  test('total null → "—" (muted)', () => {
    expect(mrcInterp(null)).toEqual({ label: '—', tone: 'muted' })
  })

  test.each([
    [60, 'Fuerza normal', 'ok'],
    [48, 'Fuerza normal', 'ok'],
    [47, 'Debilidad adquirida leve', 'proc'],
    [36, 'Debilidad adquirida leve', 'proc'],
    [35, 'Debilidad adquirida moderada', 'warn'],
    [24, 'Debilidad adquirida moderada', 'warn'],
    [23, 'DAUCI severa', 'danger'],
    [0, 'DAUCI severa', 'danger'],
  ])('total %s → %s (%s)', (total, label, tone) => {
    const r = mrcInterp(total)
    expect(r.label).toBe(label)
    expect(r.tone).toBe(tone)
  })
})
