import type { AlertKey, DestinoKey } from '../clinical/constants'

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
  destino_tipo: DestinoKey
  comorbilidades: string
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

export interface MrcAssessment {
  id: string
  stay_id: string
  assessed_at: string
  abd_hh_d: number | null
  flex_hh_d: number | null
  ext_mu_d: number | null
  abd_hh_i: number | null
  flex_hh_i: number | null
  ext_mu_i: number | null
  flex_rod_d: number | null
  ext_rod_d: number | null
  dors_pie_d: number | null
  flex_rod_i: number | null
  ext_rod_i: number | null
  dors_pie_i: number | null
  fss_icu: number | null
  ims: number | null
  handgrip_d: number | null
  handgrip_i: number | null
  tiempo_trabajo_min: number | null
  pct_fcr: number | null
  borg_fuerza: number | null
  dolor_ena: number | null
  dva_sesion: boolean
  uma: number | null
  set_min: number | null
}

export interface EmrSession {
  id: string
  stay_id: string
  session_at: string
  session_type: 'fuerza' | 'resistencia'
  carga_pct: number | null
  cmh2o: number | null
  repeticiones: number | null
  series: number | null
  minutos: number | null
  tolerancia: boolean
  borg: number | null
  pim_test: number | null
  pef_test: number | null
  fraccion_acort_pct: number | null
  eco_diaf_esp_mm: number | null
  eco_diaf_ins_mm: number | null
  notas: string
}

export interface ShiftStaff {
  id: string
  shift_date: string
  shift_type: 'Día' | 'Noche'
  role: string
  name: string
  boxes: string
}

export interface OccupancySnapshot {
  snap_date: string
  occupied: number
  free: number
  on_vm: number
  critical: number
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
  mrc_assessments: MrcAssessment[]
  emr_sessions: EmrSession[]
}
