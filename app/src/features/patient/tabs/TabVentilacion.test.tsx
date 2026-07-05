import { fireEvent, render, screen } from '@testing-library/react'
import { vi } from 'vitest'

const upsertVent = vi.fn()
const childRow = { insert: { mutate: vi.fn() }, update: { mutate: vi.fn() }, remove: { mutate: vi.fn() } }
vi.mock('../../../lib/supabase/useBoard', () => ({
  useUpsertVent: () => ({ mutate: upsertVent }),
  useChildRow: () => childRow,
}))

import { TabVentilacion } from './TabVentilacion'
import type { StayFull } from '../../../lib/supabase/types'

const base = {
  id: 's1', box_number: 1, active: true, patient_name: '', record_number: '',
  diagnosis: '', alert: 'none', residente: '', destination: '', dias_hosp: 0,
  dias_vm: 0, vm_mode: '—', rcp: 'Sí', alergias: '', prevision: 'Fonasa A',
  consentimiento: false, balance_meta: '', balance_real: '', contacto_nombre: '',
  contacto_tel: '', ultimo_contacto: '', notes: '', enfermera: '', tens: '', kine: '',
  updated_at: '', goals: [], antibiotics: [], accesses: [], sofa_assessments: [],
  vent_settings: null, blood_gases: [], nutrition: null,
  mrc_assessments: [], emr_sessions: [],
} satisfies StayFull

test('editar PaO₂ y FiO₂ seguidos NO pisa el otro con un valor viejo (bug real reproducido en producción)', () => {
  render(<TabVentilacion stay={{ ...base }} />)

  // "FiO₂ (%)" se repite (también existe en la calculadora ROX más abajo);
  // el primero es el del formulario principal de parámetros ventilatorios.
  const pao2 = screen.getByLabelText('PaO₂ (mmHg)')
  const fio2 = screen.getAllByLabelText('FiO₂ (%)')[0]

  fireEvent.focus(pao2)
  fireEvent.change(pao2, { target: { value: '90' } })
  fireEvent.blur(pao2)

  fireEvent.focus(fio2)
  fireEvent.change(fio2, { target: { value: '60' } })
  fireEvent.blur(fio2)

  const pao2Call = upsertVent.mock.calls.find(([row]) => 'pao2' in row)?.[0]
  const fio2Call = upsertVent.mock.calls.find(([row]) => 'fio2' in row)?.[0]
  expect(pao2Call).not.toHaveProperty('fio2')
  expect(fio2Call).not.toHaveProperty('pao2')
  expect(pao2Call).toEqual({ stay_id: 's1', pao2: 90 })
})
