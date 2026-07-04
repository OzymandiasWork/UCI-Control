import { describe, expect, test } from 'vitest'
import { SOFA_DOMAINS, calcSofa, emptySofa, sofaRisk } from './sofa'

describe('SOFA', () => {
  test('hay 6 dominios con 5 opciones cada uno (0 a 4)', () => {
    expect(SOFA_DOMAINS).toHaveLength(6)
    for (const d of SOFA_DOMAINS) {
      expect(d.options.map(o => o.score)).toEqual([0, 1, 2, 3, 4])
    }
  })

  test('emptySofa: todos los dominios en null', () => {
    expect(Object.values(emptySofa())).toEqual([null, null, null, null, null, null])
  })

  test('calcSofa: todo null devuelve null (sin evaluar)', () => {
    expect(calcSofa(emptySofa())).toBeNull()
  })

  test('calcSofa: suma tratando null como 0', () => {
    expect(calcSofa({ resp: 3, coag: null, liver: 1, cardio: 0, neuro: null, renal: 2 })).toBe(6)
  })

  test('calcSofa: máximo 24', () => {
    expect(calcSofa({ resp: 4, coag: 4, liver: 4, cardio: 4, neuro: 4, renal: 4 })).toBe(24)
  })

  test.each([
    [null, '—'],
    [0, 'Mortalidad <10%'],
    [1, 'Mortalidad <10%'],
    [2, 'Mortalidad ~10%'],
    [3, 'Mortalidad ~10%'],
    [4, 'Mortalidad ~20%'],
    [5, 'Mortalidad ~20%'],
    [6, 'Mortalidad ~40%'],
    [8, 'Mortalidad ~40%'],
    [9, 'Mortalidad ~50%'],
    [11, 'Mortalidad ~50%'],
    [12, 'Mortalidad >80%'],
    [24, 'Mortalidad >80%'],
  ])('sofaRisk(%s) → riesgo "%s"', (total, risk) => {
    expect(sofaRisk(total as number | null).risk).toBe(risk)
  })

  test('sofaRisk expone un tono para la UI', () => {
    expect(sofaRisk(0).tone).toBe('ok')
    expect(sofaRisk(7).tone).toBe('warn')
    expect(sofaRisk(12).tone).toBe('danger')
    expect(sofaRisk(null).tone).toBe('muted')
  })
})
