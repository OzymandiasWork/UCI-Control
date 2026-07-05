// Ocupación y proyección de camas a 24 h.
// Proyección simple e interpretable: libres proyectadas = libres + egresables.
// (Cuando haya historial suficiente en occupancy_snapshots se podrá modelar
// demanda al estilo patientflow/UCL — ver docs/plataforma-referencias.md.)
import { BOX_COUNT } from './constants'
import type { BadgeTone } from '../../design-system/Badge'

export interface OccupancyInput {
  occupied: number
  freeBeds: number
  dischargeable: number
}

export function occupancyProjection(i: OccupancyInput) {
  const projectedFree = Math.min(BOX_COUNT, i.freeBeds + i.dischargeable)
  return {
    projectedFree,
    projectedOccupied: BOX_COUNT - projectedFree,
    pctOccupied: Math.round((i.occupied / BOX_COUNT) * 100),
  }
}

export function occupancyTone(pct: number): Extract<BadgeTone, 'ok' | 'warn' | 'danger'> {
  if (pct >= 90) return 'danger'
  if (pct >= 80) return 'warn'
  return 'ok'
}
