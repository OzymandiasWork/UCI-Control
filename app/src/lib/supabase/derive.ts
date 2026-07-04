import { calcSofa } from '../clinical/sofa'
import type { StayFull } from './types'

/** SOFA de hoy; si hoy no está evaluado, el más reciente. */
export function staySofaToday(s: StayFull): number | null {
  const today = new Date().toISOString().slice(0, 10)
  const a = s.sofa_assessments.find(x => x.assessed_on === today)
    ?? s.sofa_assessments[s.sofa_assessments.length - 1]
  if (!a) return null
  return calcSofa({ resp: a.resp, coag: a.coag, liver: a.liver, cardio: a.cardio, neuro: a.neuro, renal: a.renal })
}
