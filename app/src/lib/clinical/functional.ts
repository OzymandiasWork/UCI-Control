// Lógica funcional migrada VERBATIM de calcMRC() en el prototipo RYGF_Digital_HUAP_v1
// (línea 1612) — no editar umbrales sin revisión clínica.

export type MrcKey =
  | 'abd_hh_d' | 'flex_hh_d' | 'ext_mu_d'
  | 'abd_hh_i' | 'flex_hh_i' | 'ext_mu_i'
  | 'flex_rod_d' | 'ext_rod_d' | 'dors_pie_d'
  | 'flex_rod_i' | 'ext_rod_i' | 'dors_pie_i'

export type MrcScores = Record<MrcKey, number | null>
export type MrcTone = 'ok' | 'proc' | 'warn' | 'danger' | 'muted'

export const MRC_GROUPS: { key: MrcKey; label: string }[] = [
  { key: 'abd_hh_d', label: 'Abd. HH D' },
  { key: 'flex_hh_d', label: 'Flex. HH D' },
  { key: 'ext_mu_d', label: 'Ext. MU D' },
  { key: 'abd_hh_i', label: 'Abd. HH I' },
  { key: 'flex_hh_i', label: 'Flex. HH I' },
  { key: 'ext_mu_i', label: 'Ext. MU I' },
  { key: 'flex_rod_d', label: 'Flex. Rod D' },
  { key: 'ext_rod_d', label: 'Ext. Rod D' },
  { key: 'dors_pie_d', label: 'Dors. Pie D' },
  { key: 'flex_rod_i', label: 'Flex. Rod I' },
  { key: 'ext_rod_i', label: 'Ext. Rod I' },
  { key: 'dors_pie_i', label: 'Dors. Pie I' },
]

/** Igual de null-safe que calcSofa: si nada se ha evaluado aún, no hay total. */
export function calcMrcTotal(s: MrcScores): number | null {
  const v = Object.values(s)
  if (v.every(x => x === null)) return null
  return v.reduce<number>((a, x) => a + (x ?? 0), 0)
}

export function mrcInterp(total: number | null): { label: string; tone: MrcTone } {
  if (total === null) return { label: '—', tone: 'muted' }
  if (total >= 48) return { label: 'Fuerza normal', tone: 'ok' }
  if (total >= 36) return { label: 'Debilidad adquirida leve', tone: 'proc' }
  if (total >= 24) return { label: 'Debilidad adquirida moderada', tone: 'warn' }
  return { label: 'DAUCI severa', tone: 'danger' }
}
