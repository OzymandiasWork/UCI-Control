export type SofaDomainKey = 'resp' | 'coag' | 'liver' | 'cardio' | 'neuro' | 'renal'
export type SofaScores = Record<SofaDomainKey, number | null>
export type SofaTone = 'ok' | 'warn' | 'danger' | 'muted'

export interface SofaDomain {
  key: SofaDomainKey
  full: string
  hint: string
  options: { score: number; label: string }[]
}

export const SOFA_DOMAINS: SofaDomain[] = [
  { key: 'resp', full: 'Respiratorio', hint: 'PaO₂/FiO₂ (mmHg)',
    options: [{ score: 0, label: '≥400' }, { score: 1, label: '300–399' }, { score: 2, label: '200–299' }, { score: 3, label: '100–199+VM' }, { score: 4, label: '<100+VM' }] },
  { key: 'coag', full: 'Coagulación', hint: 'Plaquetas ×10³/µL',
    options: [{ score: 0, label: '≥150' }, { score: 1, label: '100–149' }, { score: 2, label: '50–99' }, { score: 3, label: '20–49' }, { score: 4, label: '<20' }] },
  { key: 'liver', full: 'Hepático', hint: 'Bilirrubina mg/dL',
    options: [{ score: 0, label: '<1.2' }, { score: 1, label: '1.2–1.9' }, { score: 2, label: '2.0–5.9' }, { score: 3, label: '6.0–11.9' }, { score: 4, label: '≥12.0' }] },
  { key: 'cardio', full: 'Cardiovascular', hint: 'MAP o vasopresores',
    options: [{ score: 0, label: 'MAP≥70' }, { score: 1, label: 'MAP<70' }, { score: 2, label: 'Dopa≤5/Dobu' }, { score: 3, label: 'Dopa>5/NE≤0.1' }, { score: 4, label: 'Dopa>15/NE>0.1' }] },
  { key: 'neuro', full: 'Neurológico', hint: 'Glasgow Coma Scale',
    options: [{ score: 0, label: '15' }, { score: 1, label: '13–14' }, { score: 2, label: '10–12' }, { score: 3, label: '6–9' }, { score: 4, label: '<6' }] },
  { key: 'renal', full: 'Renal', hint: 'Creat mg/dL / diuresis',
    options: [{ score: 0, label: '<1.2' }, { score: 1, label: '1.2–1.9' }, { score: 2, label: '2.0–3.4' }, { score: 3, label: '3.5–4.9/<500mL' }, { score: 4, label: '≥5.0/<200mL' }] },
]

export const emptySofa = (): SofaScores =>
  ({ resp: null, coag: null, liver: null, cardio: null, neuro: null, renal: null })

export function calcSofa(s: SofaScores): number | null {
  const v = Object.values(s)
  if (v.every(x => x === null)) return null
  return v.reduce<number>((a, x) => a + (x ?? 0), 0)
}

export function sofaRisk(total: number | null): { risk: string; tone: SofaTone } {
  if (total === null) return { risk: '—', tone: 'muted' }
  if (total <= 1) return { risk: 'Mortalidad <10%', tone: 'ok' }
  if (total <= 3) return { risk: 'Mortalidad ~10%', tone: 'ok' }
  if (total <= 5) return { risk: 'Mortalidad ~20%', tone: 'warn' }
  if (total <= 8) return { risk: 'Mortalidad ~40%', tone: 'warn' }
  if (total <= 11) return { risk: 'Mortalidad ~50%', tone: 'danger' }
  return { risk: 'Mortalidad >80%', tone: 'danger' }
}
