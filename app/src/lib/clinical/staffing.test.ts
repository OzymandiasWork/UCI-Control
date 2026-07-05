import { describe, expect, test } from 'vitest'
import { nurseLoad, ROLES_TURNO } from './staffing'

describe('carga asistencial de enfermería (estándar UCI 1:2)', () => {
  test('sin enfermeras y con pacientes → crítico', () => {
    const r = nurseLoad(10, 0)
    expect(r.tone).toBe('danger')
    expect(r.ratio).toBeNull()
  })

  test('ratio ≤2 pacientes por enfermera → ok', () => {
    const r = nurseLoad(8, 4)
    expect(r.ratio).toBe(2)
    expect(r.tone).toBe('ok')
  })

  test('ratio >2 y ≤3 → sobrecarga moderada', () => {
    const r = nurseLoad(9, 3)
    expect(r.ratio).toBe(3)
    expect(r.tone).toBe('warn')
  })

  test('ratio >3 → sobrecarga crítica', () => {
    const r = nurseLoad(13, 3)
    expect(r.ratio).toBeCloseTo(4.3, 1)
    expect(r.tone).toBe('danger')
  })

  test('sin pacientes → ok con ratio 0', () => {
    const r = nurseLoad(0, 2)
    expect(r.ratio).toBe(0)
    expect(r.tone).toBe('ok')
  })

  test('roles del turno definidos', () => {
    expect(ROLES_TURNO).toContain('Enfermera/o')
    expect(ROLES_TURNO).toContain('Kinesiólogo/a')
  })
})
