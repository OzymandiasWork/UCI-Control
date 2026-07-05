import { describe, expect, test } from 'vitest'
import {
  pafi, pafiClass, drivingPressure, iox, ibw, vtRange,
  interpretGas, lactateHigh, rox, roxClass, hacorClass, berlin, sbtEval,
} from './vent'

describe('índices ventilatorios', () => {
  test('PAFI = PaO2 / (FiO2/100), redondeado', () => {
    expect(pafi(105, 50)).toBe(210)
    expect(pafi(80, 80)).toBe(100)
  })

  test.each([
    [90, 'SDRA severo', 'danger'],
    [150, 'SDRA moderado', 'warn'],
    [250, 'Hipoxemia moderada', 'warn'],
    [350, 'Hipoxemia leve', 'proc'],
    [420, 'Normal', 'ok'],
  ])('clasificación PAFI %s → %s', (v, label, tone) => {
    const c = pafiClass(v)
    expect(c.label).toBe(label)
    expect(c.tone).toBe(tone)
  })

  test('driving pressure y umbral protector ≤15', () => {
    expect(drivingPressure(24, 8)).toEqual({ value: 16, safe: false })
    expect(drivingPressure(22, 8)).toEqual({ value: 14, safe: true })
  })

  test('IOX = FiO2fracción×PEEP/PaO2×100, 1 decimal', () => {
    expect(iox(50, 8, 105)).toBe('3.8')
  })
})

describe('peso ideal y VT protector (ARDSnet)', () => {
  test('IBW hombre 170 cm', () => {
    expect(ibw('h', 170)).toBe('66.0')
  })
  test('IBW mujer 160 cm', () => {
    expect(ibw('m', 160)).toBe('52.4')
  })
  test('rango VT 4/6/8 mL/kg', () => {
    expect(vtRange(66)).toEqual({ vt4: 264, vt6: 396, vt8: 528 })
  })
})

describe('gases arteriales', () => {
  test('acidemia respiratoria', () => {
    expect(interpretGas(7.30, 50).texto).toMatch(/Acidemia respiratoria/)
  })
  test('acidemia metabólica compensada', () => {
    expect(interpretGas(7.30, 30).texto).toMatch(/Acidemia metabólica/)
  })
  test('alcalemia respiratoria', () => {
    expect(interpretGas(7.50, 30).texto).toMatch(/Alcalemia respiratoria/)
  })
  test('alcalemia metabólica', () => {
    expect(interpretGas(7.50, 50).texto).toMatch(/Alcalemia metabólica/)
  })
  test('normal', () => {
    expect(interpretGas(7.40, 40).texto).toMatch(/dentro de rangos normales/)
  })
  test('láctico ≥2 es hiperlactatemia', () => {
    expect(lactateHigh(2)).toBe(true)
    expect(lactateHigh(1.4)).toBe(false)
  })
})

describe('ROX index', () => {
  test('fórmula del prototipo', () => {
    expect(rox(96, 50, 22)).toBe('8.73')
  })
  test.each([
    [5.0, 'ok'], [4.0, 'warn'], [3.0, 'danger'],
  ])('clasificación ROX %s → %s', (v, tone) => {
    expect(roxClass(v).tone).toBe(tone)
  })
})

describe('HACOR', () => {
  test.each([
    [4, 'ok'], [5, 'warn'], [6, 'warn'], [7, 'danger'],
  ])('total %s → %s', (total, tone) => {
    expect(hacorClass(total).tone).toBe(tone)
  })
})

describe('criterios Berlín SDRA', () => {
  test('sin los 3 criterios estructurales no hay SDRA', () => {
    expect(berlin(false, true, true, 'leve').label).toBe('No SDRA')
  })
  test('PAFI ≥400 no cumple umbral', () => {
    expect(berlin(true, true, true, '0').label).toBe('No SDRA')
  })
  test('leve / moderado / severo', () => {
    expect(berlin(true, true, true, 'leve').label).toBe('SDRA Leve')
    expect(berlin(true, true, true, 'mod').label).toBe('SDRA Moderado')
    expect(berlin(true, true, true, 'sev').label).toBe('SDRA Severo')
  })
})

describe('weaning / SBT', () => {
  const base = { irrs: 52, pim: -28, pef: 60, rass: -1, camNeg: true, sat: 96, secOk: true }

  test('6/6 con secreciones ok → candidato', () => {
    const r = sbtEval(base)
    expect(r.cumplidos).toBe(6)
    expect(r.veredicto).toBe('candidato')
  })

  test('4/6 → condicionado', () => {
    const r = sbtEval({ ...base, irrs: 90, pim: -10 })
    expect(r.cumplidos).toBe(4)
    expect(r.veredicto).toBe('condicionado')
  })

  test('menos de 4 → no candidato', () => {
    const r = sbtEval({ ...base, irrs: 90, pim: -10, sat: 90 })
    expect(r.veredicto).toBe('no')
  })

  test('5/6 pero secreciones abundantes → condicionado', () => {
    const r = sbtEval({ ...base, camNeg: false, secOk: false })
    expect(r.cumplidos).toBe(5)
    expect(r.veredicto).toBe('condicionado')
  })

  test('criterios individuales correctos', () => {
    const r = sbtEval({ ...base, rass: 1 })
    const rassCrit = r.criterios.find(c => c.label.includes('RASS'))
    expect(rassCrit?.ok).toBe(false)
  })
})
