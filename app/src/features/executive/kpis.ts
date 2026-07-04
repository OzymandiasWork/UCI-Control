import { BOX_COUNT } from '../../lib/clinical/constants'
import { staySofaToday } from '../../lib/supabase/derive'
import type { StayFull } from '../../lib/supabase/types'

export function boardKpis(stays: StayFull[]) {
  const sofas = stays.map(staySofaToday).filter((x): x is number => x !== null)
  return {
    occupied: stays.length,
    freeBeds: BOX_COUNT - stays.length,
    sofaAvg: sofas.length ? (sofas.reduce((a, b) => a + b, 0) / sofas.length).toFixed(1) : '—',
    sofaMax: sofas.length ? Math.max(...sofas) : ('—' as const),
    onVM: stays.filter(s => s.dias_vm > 0).length,
    critical: stays.filter(s => s.alert === 'critical').length,
    eol: stays.filter(s => s.alert === 'eol' || s.alert === 'procurement').length,
    dischargeable: stays.filter(s => s.destination.toLowerCase().includes('egreso')).length,
  }
}
