// Dotación y carga asistencial. Estándar de referencia UCI: 1 enfermera/o
// por cada 2 pacientes críticos (ratio 1:2).
import type { BadgeTone } from '../../design-system/Badge'

export const ROLES_TURNO = ['Médico/a', 'Enfermera/o', 'TENS', 'Kinesiólogo/a', 'Auxiliar'] as const
export type RolTurno = (typeof ROLES_TURNO)[number]

export const TURNOS = ['Día', 'Noche'] as const

export interface NurseLoad {
  ratio: number | null
  label: string
  tone: Extract<BadgeTone, 'ok' | 'warn' | 'danger'>
}

export function nurseLoad(pacientes: number, enfermeras: number): NurseLoad {
  if (pacientes === 0) return { ratio: 0, label: 'Sin pacientes', tone: 'ok' }
  if (enfermeras === 0) return { ratio: null, label: 'Sin enfermeras/os en turno', tone: 'danger' }
  const ratio = pacientes / enfermeras
  const r = Math.round(ratio * 10) / 10
  if (ratio <= 2) return { ratio: r, label: `1:${r} — dentro del estándar (1:2)`, tone: 'ok' }
  if (ratio <= 3) return { ratio: r, label: `1:${r} — sobrecarga moderada`, tone: 'warn' }
  return { ratio: r, label: `1:${r} — sobrecarga crítica`, tone: 'danger' }
}
