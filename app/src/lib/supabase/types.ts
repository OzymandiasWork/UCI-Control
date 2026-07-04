import type { AlertKey } from '../clinical/constants'

export interface Stay {
  id: string
  box_number: number
  active: boolean
  patient_name: string
  record_number: string
  diagnosis: string
  alert: AlertKey
  residente: string
  destination: string
  dias_hosp: number
  dias_vm: number
  vm_mode: string
  rcp: string
  alergias: string
  prevision: string
  consentimiento: boolean
  balance_meta: string
  balance_real: string
  contacto_nombre: string
  contacto_tel: string
  ultimo_contacto: string
  notes: string
  enfermera: string
  tens: string
  kine: string
  updated_at: string
}

export interface SofaAssessment {
  id: string
  stay_id: string
  assessed_on: string
  resp: number | null
  coag: number | null
  liver: number | null
  cardio: number | null
  neuro: number | null
  renal: number | null
}

export interface Goal { id: string; stay_id: string; text: string; done: boolean; position: number }
export interface Antibiotic { id: string; stay_id: string; drug: string; day: number }
export interface Access { id: string; stay_id: string; type: string; day: number }
export interface Nutrition {
  stay_id: string; nutri_type: string; via: string
  cal_meta: number; cal_real: number; dias: number; notes: string
}
export interface UnitEvent { id: string; time: string; label: string; event_date: string }

/** Stay con sus hijos, como lo devuelve la query del tablero */
export interface StayFull extends Stay {
  goals: Goal[]
  antibiotics: Antibiotic[]
  accesses: Access[]
  nutrition: Nutrition | null
  sofa_assessments: SofaAssessment[]
}
