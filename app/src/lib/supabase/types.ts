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

export interface VentSettings {
  stay_id: string
  modo_sv: string
  fio2: number
  spo2: number
  pao2: number
  peep: number
  peep_i: number
  vt: number
  pc_ps: number
  vol_min: number
  fr_prog: string
  pplat: number
  etco2: number
  vd_vt: number
  fuga_cuff: number
  rva: number
  cest: number
  sexo: 'h' | 'm'
  talla_cm: number
  peso_real: number
  irrs: number
  pim: number
  pef: number
  rass: number
  cam_icu: 'neg' | 'pos'
  sat_ps: number
  secreciones: 'ok' | 'abund'
}

export interface BloodGas {
  id: string
  stay_id: string
  drawn_at: string
  ph: number | null
  pco2: number | null
  po2: number | null
  hco3: number | null
  be: number | null
  sat: number | null
  lactato: number | null
}

/** Stay con sus hijos, como lo devuelve la query del tablero */
export interface StayFull extends Stay {
  goals: Goal[]
  antibiotics: Antibiotic[]
  accesses: Access[]
  nutrition: Nutrition | null
  sofa_assessments: SofaAssessment[]
  vent_settings: VentSettings | null
  blood_gases: BloodGas[]
}
