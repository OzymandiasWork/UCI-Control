// Lógica ventilatoria migrada VERBATIM del prototipo RYGF_Digital_HUAP_v1
// (validado por el equipo de la UPC — no editar umbrales sin revisión clínica).
import type { BadgeTone } from '../../design-system/Badge'

export type VentTone = Extract<BadgeTone, 'ok' | 'warn' | 'danger' | 'proc' | 'muted'>

// ── Índices ventilatorios ──────────────────────────────────────

export function pafi(pao2: number, fio2Pct: number): number {
  return Math.round(pao2 / (fio2Pct / 100))
}

export function pafiClass(value: number): { label: string; tone: VentTone } {
  if (value < 100) return { label: 'SDRA severo', tone: 'danger' }
  if (value < 200) return { label: 'SDRA moderado', tone: 'warn' }
  if (value < 300) return { label: 'Hipoxemia moderada', tone: 'warn' }
  if (value < 400) return { label: 'Hipoxemia leve', tone: 'proc' }
  return { label: 'Normal', tone: 'ok' }
}

/** Límite protector ΔP ≤15 cmH₂O (ARMA / Amato 2015). */
export function drivingPressure(pplat: number, peep: number): { value: number; safe: boolean } {
  const value = Math.round(pplat - peep)
  return { value, safe: value <= 15 }
}

export function iox(fio2Pct: number, peep: number, pao2: number): string {
  return ((fio2Pct / 100) * peep / pao2 * 100).toFixed(1)
}

// ── Peso ideal y VT protector (ARDSnet) ────────────────────────

export function ibw(sexo: 'h' | 'm', tallaCm: number): string {
  const base = sexo === 'h' ? 50 : 45.5
  return (base + 0.91 * (tallaCm - 152.4)).toFixed(1)
}

export function vtRange(ibwKg: number): { vt4: number; vt6: number; vt8: number } {
  return { vt4: Math.round(ibwKg * 4), vt6: Math.round(ibwKg * 6), vt8: Math.round(ibwKg * 8) }
}

// ── Gases arteriales ───────────────────────────────────────────

export function interpretGas(ph: number, pco2: number): { texto: string; accion: string } {
  if (ph < 7.35 && pco2 > 45) return { texto: 'Acidemia respiratoria. PaCO₂ elevada con pH bajo. Evaluar ajuste ventilatorio.', accion: '⚠ Verificar modo y FR programada.' }
  if (ph < 7.35 && pco2 < 35) return { texto: 'Acidemia metabólica con compensación respiratoria (hiperventilación).', accion: 'Buscar causa metabólica subyacente.' }
  if (ph > 7.45 && pco2 < 35) return { texto: 'Alcalemia respiratoria. PaCO₂ baja. Revisar FR o VT — posible hiperventilación.', accion: '⚠ Reducir FR o VT si clínicamente tolerable.' }
  if (ph > 7.45 && pco2 > 45) return { texto: 'Alcalemia metabólica. Evaluar causa (cloro, pérdidas GI, corticoides).', accion: '' }
  return { texto: 'Equilibrio ácido-base dentro de rangos normales. Sin alteración primaria identificada.', accion: '' }
}

export function lactateHigh(lactato: number): boolean {
  return lactato >= 2
}

// ── ROX index (predictor fallo VNI/CNAF) ───────────────────────

export function rox(spo2: number, fio2Pct: number, fr: number): string {
  return ((spo2 / fio2Pct) / fr * 100).toFixed(2)
}

export function roxClass(value: number): { texto: string; tone: VentTone } {
  if (value >= 4.88) return { texto: 'Bajo riesgo de intubación. Continuar CNAF/VNI y reevaluar a las 2h, 6h y 12h.', tone: 'ok' }
  if (value >= 3.85) return { texto: 'Riesgo intermedio. Vigilancia estrecha. Preparar equipo de intubación.', tone: 'warn' }
  return { texto: 'Alto riesgo de fallo VNI/CNAF. Considerar intubación precoz. No diferir si hay deterioro.', tone: 'danger' }
}

// ── HACOR (predictor fallo VNI, Duan et al. 2017; versión del prototipo, máx 7) ──

export const HACOR_ITEMS = [
  { key: 'fc', label: 'FC > 120 lpm', options: [{ pts: 0, label: 'No (0 pts)' }, { pts: 1, label: 'Sí (1 pt)' }] },
  { key: 'ph', label: 'Acidosis (pH < 7.25)', options: [{ pts: 0, label: 'No (0 pts)' }, { pts: 2, label: 'Sí (2 pts)' }] },
  { key: 'gcs', label: 'Consciencia alterada (GCS < 11)', options: [{ pts: 0, label: 'No (0 pts)' }, { pts: 2, label: 'Sí (2 pts)' }] },
  { key: 'pafi', label: 'Oxigenación: PAFI a 1h VNI', options: [{ pts: 0, label: '≥ 201 (0 pts)' }, { pts: 1, label: '101–200 (1 pt)' }, { pts: 2, label: '≤ 100 (2 pts)' }] },
  { key: 'fr', label: 'FR > 30 resp/min', options: [{ pts: 0, label: 'No (0 pts)' }, { pts: 1, label: 'Sí (1 pt)' }] },
] as const

export function hacorClass(total: number): { texto: string; tone: VentTone } {
  if (total >= 7) return { texto: 'Score ≥ 7: Alto riesgo fallo VNI. Intubación precoz — no diferir.', tone: 'danger' }
  if (total >= 5) return { texto: 'Score 5-6: Riesgo intermedio. Preparar equipo intubación. Reevaluar oxigenación urgente.', tone: 'warn' }
  return { texto: 'Score < 5: Bajo riesgo. Continuar VNI con monitorización. Reevaluar a 1h, 2h y 6h.', tone: 'ok' }
}

// ── Criterios Berlín (SDRA) ────────────────────────────────────

export type BerlinPafi = '0' | 'leve' | 'mod' | 'sev'

export function berlin(inicioAgudo: boolean, rxBilateral: boolean, noCardiogenico: boolean, pafiCat: BerlinPafi):
  { label: string; texto: string; tone: VentTone } {
  if (!inicioAgudo || !rxBilateral || !noCardiogenico) {
    return { label: 'No SDRA', texto: 'No se cumplen los 3 primeros criterios. Sin diagnóstico de SDRA.', tone: 'muted' }
  }
  if (pafiCat === '0') return { label: 'No SDRA', texto: 'Criterios estructurales cumplidos, pero PAFI ≥ 400 con soporte. No cumple umbral Berlín.', tone: 'muted' }
  if (pafiCat === 'leve') return { label: 'SDRA Leve', texto: 'PAFI 200-400. Mortalidad ~27%. Ventilación protectora, optimizar PEEP.', tone: 'warn' }
  if (pafiCat === 'mod') return { label: 'SDRA Moderado', texto: 'PAFI 100-199. Mortalidad ~32%. Ventilación protectora estricta. Considerar prono si PAFI < 150 persistente.', tone: 'warn' }
  return { label: 'SDRA Severo', texto: 'PAFI < 100. Mortalidad ~45%. Prono precoz, bloqueo neuromuscular 48h. Discutir ECMO si refractario.', tone: 'danger' }
}

// ── Weaning / SBT ──────────────────────────────────────────────

export interface SbtInputs {
  irrs: number
  pim: number
  pef: number
  rass: number
  camNeg: boolean
  sat: number
  secOk: boolean
}

export interface SbtResult {
  criterios: { ok: boolean; label: string; val: string }[]
  cumplidos: number
  veredicto: 'candidato' | 'condicionado' | 'no'
  texto: string
}

export function sbtEval(i: SbtInputs): SbtResult {
  const criterios = [
    { ok: i.irrs < 80, label: 'IRRS <80', val: `${i.irrs} resp/min/L` },
    { ok: i.pim <= -20, label: 'PIM ≤-20', val: `${i.pim} cmH₂O` },
    { ok: i.pef >= 60, label: 'PEF ≥60', val: `${i.pef} L/min` },
    { ok: i.rass >= -1 && i.rass <= 0, label: 'RASS -1 a 0', val: String(i.rass) },
    { ok: i.camNeg, label: 'CAM-ICU neg', val: i.camNeg ? 'Negativo' : 'Positivo' },
    { ok: i.sat >= 94, label: 'SpO₂ ≥94%', val: `${i.sat}%` },
  ]
  const cumplidos = criterios.filter(c => c.ok).length

  if (cumplidos >= 5 && i.secOk) {
    return { criterios, cumplidos, veredicto: 'candidato', texto: `Criterios SBT cumplidos (${cumplidos}/6) — Paciente candidato a prueba de ventilación espontánea hoy. Confirmar con equipo tratante.` }
  }
  if (cumplidos >= 4) {
    return { criterios, cumplidos, veredicto: 'condicionado', texto: `Weaning posible — condicionado (${cumplidos}/6) — ${i.secOk ? '' : 'Optimizar secreciones. '}Reevaluar criterios faltantes antes del SBT.` }
  }
  return { criterios, cumplidos, veredicto: 'no', texto: `No candidato a SBT hoy (${cumplidos}/6) — Continuar VMI y rehabilitación respiratoria. Reevaluar mañana.` }
}
