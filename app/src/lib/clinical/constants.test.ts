import { describe, expect, test } from 'vitest'
import { DESTINO_TIPOS, OTHER_ACCESS_TYPES, VM_MODES } from './constants'

describe('catálogo de destinos', () => {
  test('las 9 opciones exactas: unión de ambos catálogos (producción + dashboard definitivo)', () => {
    expect(DESTINO_TIPOS).toEqual({
      '': 'Destino —',
      tac: '→ TAC',
      pabellon: '→ Pabellón',
      pabellon_angio: '→ Pabellón angio/intervencional',
      egreso: '→ Egreso',
      egreso_sala: '→ Egreso a sala',
      ingreso: '⬇ Ingreso',
      traslado: '→ Traslado a otro hospital',
      fallecido: '✝ Fallecido',
    })
  })
})

describe('catálogos de ficha', () => {
  test('TQT disponible como modo ventilatorio', () => {
    expect(VM_MODES).toContain('TQT')
  })
  test('otros accesos parte con Sonda urinaria (Foley), lista abierta', () => {
    expect(OTHER_ACCESS_TYPES).toContain('Sonda urinaria (Foley)')
  })
})
