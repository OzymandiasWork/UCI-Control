import type { StayFull } from '../lib/supabase/types'

/**
 * Fixture base compartida para tests que construyen un StayFull completo.
 * Cuando se agregue una columna nueva a stays, actualizar SOLO este archivo
 * (antes había 8 copias de este literal y cada columna nueva las rompía todas).
 */
export function baseStay(over: Partial<StayFull> = {}): StayFull {
  return {
    id: 's1', box_number: 1, active: true, patient_name: '', record_number: '',
    diagnosis: '', alert: 'none', residente: '', destination: '',
    destino_tipo: '', comorbilidades: '', dias_hosp: 0,
    dias_vm: 0, vm_mode: '—', rcp: 'Sí', alergias: '', prevision: 'Fonasa A',
    consentimiento: false, balance_meta: '', balance_real: '', contacto_nombre: '',
    contacto_tel: '', ultimo_contacto: '', notes: '', enfermera: '', tens: '', kine: '',
    updated_at: '', goals: [], antibiotics: [], accesses: [], sofa_assessments: [],
    vent_settings: null, blood_gases: [], nutrition: null, mrc_assessments: [], emr_sessions: [],
    ...over,
  }
}
