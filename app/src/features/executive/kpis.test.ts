import { describe, expect, test } from 'vitest'
import { boardKpis } from './kpis'
import type { StayFull } from '../../lib/supabase/types'

const today = new Date().toISOString().slice(0, 10)

function stay(over: Partial<StayFull>): StayFull {
  return {
    id: Math.random().toString(), box_number: 1, active: true, patient_name: 'X',
    record_number: '', diagnosis: '', alert: 'none', residente: '', destination: '',
    dias_hosp: 0, dias_vm: 0, vm_mode: '—', rcp: 'Sí', alergias: '',
    prevision: 'Fonasa A', consentimiento: false, balance_meta: '', balance_real: '',
    contacto_nombre: '', contacto_tel: '', ultimo_contacto: '', notes: '',
    enfermera: '', tens: '', kine: '', updated_at: '',
    goals: [], antibiotics: [], accesses: [], nutrition: null, sofa_assessments: [],
    ...over,
  }
}

function withSofa(scores: number[]): StayFull['sofa_assessments'] {
  const [resp, coag, liver, cardio, neuro, renal] = scores
  return [{ id: 'a', stay_id: 's', assessed_on: today, resp, coag, liver, cardio, neuro, renal }]
}

describe('boardKpis', () => {
  test('censo y camas libres', () => {
    const k = boardKpis([stay({ box_number: 1 }), stay({ box_number: 2 })])
    expect(k.occupied).toBe(2)
    expect(k.freeBeds).toBe(22)
  })

  test('SOFA promedio y máximo ignoran no evaluados', () => {
    const k = boardKpis([
      stay({ sofa_assessments: withSofa([1, 1, 0, 0, 0, 0]) }),
      stay({ box_number: 2, sofa_assessments: withSofa([4, 4, 0, 0, 0, 0]) }),
      stay({ box_number: 3 }),
    ])
    expect(k.sofaAvg).toBe('5.0')
    expect(k.sofaMax).toBe(8)
  })

  test('en VM, críticos, fin de vida y egresables', () => {
    const k = boardKpis([
      stay({ dias_vm: 2, alert: 'critical' }),
      stay({ box_number: 2, alert: 'eol' }),
      stay({ box_number: 3, alert: 'procurement' }),
      stay({ box_number: 4, destination: 'Egreso a sala' }),
    ])
    expect(k.onVM).toBe(1)
    expect(k.critical).toBe(1)
    expect(k.eol).toBe(2)
    expect(k.dischargeable).toBe(1)
  })
})
