import { describe, expect, test } from 'vitest'
import { SUGGESTIONS, getSuggestion } from './suggestions'

describe('getSuggestion', () => {
  test('devuelve null sin diagnóstico', () => {
    expect(getSuggestion('')).toBeNull()
    expect(getSuggestion(undefined)).toBeNull()
    expect(getSuggestion(null)).toBeNull()
  })

  test('matchea por substring, sin distinguir mayúsculas', () => {
    const s = getSuggestion('Paciente con SHOCK SEPTICO foco pulmonar')
    expect(s?.matched).toBe('shock septico')
  })

  test('diagnóstico sin match devuelve null', () => {
    expect(getSuggestion('fractura de tobillo')).toBeNull()
  })

  test('cada sugerencia tiene atb, goals y monitor no vacíos', () => {
    for (const [key, s] of Object.entries(SUGGESTIONS)) {
      expect(s.atb, key).toBeTruthy()
      expect(s.goals.length, key).toBeGreaterThan(0)
      expect(s.monitor.length, key).toBeGreaterThan(0)
    }
  })

  test('el catálogo cubre los 13 cuadros del prototipo', () => {
    expect(Object.keys(SUGGESTIONS)).toHaveLength(13)
    expect(SUGGESTIONS).toHaveProperty('nac')
    expect(SUGGESTIONS).toHaveProperty('politrauma')
  })
})
