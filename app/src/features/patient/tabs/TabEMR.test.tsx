import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, vi } from 'vitest'

const childRow = { insert: { mutate: vi.fn() }, update: { mutate: vi.fn() }, remove: { mutate: vi.fn() } }
vi.mock('../../../lib/supabase/useBoard', () => ({
  useChildRow: () => childRow,
}))

import { TabEMR } from './TabEMR'
import type { StayFull } from '../../../lib/supabase/types'

const base = {
  id: 's1', box_number: 1, active: true, patient_name: '', record_number: '',
  diagnosis: '', alert: 'none', residente: '', destination: '', dias_hosp: 0,
  dias_vm: 0, vm_mode: '—', rcp: 'Sí', alergias: '', prevision: 'Fonasa A',
  consentimiento: false, balance_meta: '', balance_real: '', contacto_nombre: '',
  contacto_tel: '', ultimo_contacto: '', notes: '', enfermera: '', tens: '', kine: '',
  updated_at: '', goals: [], antibiotics: [], accesses: [], sofa_assessments: [],
  vent_settings: null, blood_gases: [], nutrition: null, mrc_assessments: [], emr_sessions: [],
} satisfies StayFull

beforeEach(() => {
  childRow.insert.mutate.mockClear()
  childRow.remove.mutate.mockClear()
})

test('sesión de Fuerza envía repeticiones y series; minutos queda null', async () => {
  render(<TabEMR stay={base} />)
  fireEvent.change(screen.getByLabelText('Carga (%)'), { target: { value: '30' } })
  fireEvent.change(screen.getByLabelText('cmH₂O'), { target: { value: '8' } })
  fireEvent.change(screen.getByLabelText('Repeticiones'), { target: { value: '10' } })
  fireEvent.change(screen.getByLabelText('Series'), { target: { value: '3' } })
  await userEvent.click(screen.getByRole('button', { name: /registrar sesión/i }))

  expect(childRow.insert.mutate).toHaveBeenCalledWith(
    expect.objectContaining({
      stay_id: 's1', session_type: 'fuerza', carga_pct: 30, cmh2o: 8,
      repeticiones: 10, series: 3, minutos: null,
    }),
  )
})

test('sesión de Resistencia envía minutos; repeticiones y series quedan null', async () => {
  render(<TabEMR stay={base} />)
  await userEvent.selectOptions(screen.getByLabelText('Tipo de sesión'), 'Resistencia')
  fireEvent.change(screen.getByLabelText('Carga (%)'), { target: { value: '20' } })
  fireEvent.change(screen.getByLabelText('cmH₂O'), { target: { value: '5' } })
  fireEvent.change(screen.getByLabelText('Minutos de trabajo'), { target: { value: '15' } })
  await userEvent.click(screen.getByRole('button', { name: /registrar sesión/i }))

  expect(childRow.insert.mutate).toHaveBeenCalledWith(
    expect.objectContaining({
      stay_id: 's1', session_type: 'resistencia', carga_pct: 20, cmh2o: 5,
      minutos: 15, repeticiones: null, series: null,
    }),
  )
})

test('borrar una sesión del historial pide confirmación antes de llamar a remove', async () => {
  const stayWithHistory: StayFull = {
    ...base,
    emr_sessions: [{
      id: 'e1', stay_id: 's1', session_at: '2026-07-01T10:00:00Z', session_type: 'fuerza',
      carga_pct: 30, cmh2o: 8, repeticiones: 10, series: 3, minutos: null,
      tolerancia: true, borg: 4, pim_test: null, pef_test: null,
      fraccion_acort_pct: null, eco_diaf_esp_mm: null, eco_diaf_ins_mm: null, notas: '',
    }],
  }
  render(<TabEMR stay={stayWithHistory} />)
  await userEvent.click(screen.getByRole('button', { name: 'Eliminar sesión' }))
  expect(childRow.remove.mutate).not.toHaveBeenCalled()
  await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }))
  expect(childRow.remove.mutate).toHaveBeenCalledWith('e1')
})
