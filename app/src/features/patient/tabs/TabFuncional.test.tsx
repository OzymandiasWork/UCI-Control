import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, vi } from 'vitest'

const childRow = { insert: { mutate: vi.fn() }, update: { mutate: vi.fn() }, remove: { mutate: vi.fn() } }
vi.mock('../../../lib/supabase/useBoard', () => ({
  useChildRow: () => childRow,
}))

import { TabFuncional } from './TabFuncional'
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

test('guardar evaluación envía los 12 campos MRC-SS y el stay_id, sin depender de un render viejo', async () => {
  render(<TabFuncional stay={base} />)
  fireEvent.change(screen.getByLabelText('Abd. HH D'), { target: { value: '3' } })
  fireEvent.change(screen.getByLabelText('Flex. HH D'), { target: { value: '4' } })
  await userEvent.click(screen.getByRole('button', { name: /guardar evaluación/i }))

  expect(childRow.insert.mutate).toHaveBeenCalledWith(
    expect.objectContaining({ stay_id: 's1', abd_hh_d: 3, flex_hh_d: 4, ext_mu_d: null }),
  )
})

test('el total en vivo se recalcula null-safe mientras se completa el formulario', () => {
  render(<TabFuncional stay={base} />)
  fireEvent.change(screen.getByLabelText('Abd. HH D'), { target: { value: '5' } })
  fireEvent.change(screen.getByLabelText('Flex. HH D'), { target: { value: '5' } })
  expect(screen.getByText(/MRC-SS 10 \/ 60/)).toBeInTheDocument()
})

test('borrar una evaluación del historial pide confirmación antes de llamar a remove', async () => {
  const stayWithHistory: StayFull = {
    ...base,
    mrc_assessments: [{
      id: 'm1', stay_id: 's1', assessed_at: '2026-07-01T10:00:00Z',
      abd_hh_d: 3, flex_hh_d: 3, ext_mu_d: 3, abd_hh_i: 3, flex_hh_i: 3, ext_mu_i: 3,
      flex_rod_d: 3, ext_rod_d: 3, dors_pie_d: 3, flex_rod_i: 3, ext_rod_i: 3, dors_pie_i: 3,
      fss_icu: 14, ims: 4, handgrip_d: null, handgrip_i: null, tiempo_trabajo_min: null,
      pct_fcr: null, borg_fuerza: null, dolor_ena: null, dva_sesion: false, uma: null, set_min: null,
    }],
  }
  render(<TabFuncional stay={stayWithHistory} />)
  await userEvent.click(screen.getByRole('button', { name: 'Eliminar evaluación' }))
  expect(childRow.remove.mutate).not.toHaveBeenCalled()
  await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }))
  expect(childRow.remove.mutate).toHaveBeenCalledWith('m1')
})

test('guardar con solo un campo no-MRC lleno (ej. FSS-ICU) SÍ guarda, no se bloquea', async () => {
  render(<TabFuncional stay={base} />)
  fireEvent.change(screen.getByLabelText('FSS-ICU (/35)'), { target: { value: '14' } })
  await userEvent.click(screen.getByRole('button', { name: /guardar evaluación/i }))
  expect(childRow.insert.mutate).toHaveBeenCalledWith(
    expect.objectContaining({ stay_id: 's1', fss_icu: 14, abd_hh_d: null }),
  )
})

test('el badge muestra cuántos grupos se evaluaron cuando la evaluación está incompleta', () => {
  render(<TabFuncional stay={base} />)
  fireEvent.change(screen.getByLabelText('Abd. HH D'), { target: { value: '5' } })
  fireEvent.change(screen.getByLabelText('Flex. HH D'), { target: { value: '5' } })
  expect(screen.getByText(/2\/12 grupos evaluados/)).toBeInTheDocument()
})

test('el historial muestra el total y la interpretación correctos para una evaluación completa, sin caveat de incompletitud', () => {
  const stayWithHistory: StayFull = {
    ...base,
    mrc_assessments: [{
      id: 'm1', stay_id: 's1', assessed_at: '2026-07-01T10:00:00Z',
      abd_hh_d: 3, flex_hh_d: 3, ext_mu_d: 3, abd_hh_i: 3, flex_hh_i: 3, ext_mu_i: 3,
      flex_rod_d: 3, ext_rod_d: 3, dors_pie_d: 3, flex_rod_i: 3, ext_rod_i: 3, dors_pie_i: 3,
      fss_icu: 14, ims: 4, handgrip_d: null, handgrip_i: null, tiempo_trabajo_min: null,
      pct_fcr: null, borg_fuerza: null, dolor_ena: null, dva_sesion: false, uma: null, set_min: null,
    }],
  }
  render(<TabFuncional stay={stayWithHistory} />)
  expect(screen.getByText(/MRC-SS 36 \/ 60 · Debilidad adquirida leve/)).toBeInTheDocument()
  expect(screen.queryByText(/grupos evaluados/)).not.toBeInTheDocument()
})

test('con el formulario completamente vacío, no se guarda nada', async () => {
  render(<TabFuncional stay={base} />)
  await userEvent.click(screen.getByRole('button', { name: /guardar evaluación/i }))
  expect(childRow.insert.mutate).not.toHaveBeenCalled()
})

test('el historial muestra solo las 5 evaluaciones más recientes (excluye la más antigua)', () => {
  const mk = (id: string, date: string, total: number) => ({
    id, stay_id: 's1', assessed_at: date,
    abd_hh_d: total, flex_hh_d: null, ext_mu_d: null, abd_hh_i: null, flex_hh_i: null, ext_mu_i: null,
    flex_rod_d: null, ext_rod_d: null, dors_pie_d: null, flex_rod_i: null, ext_rod_i: null, dors_pie_i: null,
    fss_icu: null, ims: null, handgrip_d: null, handgrip_i: null, tiempo_trabajo_min: null,
    pct_fcr: null, borg_fuerza: null, dolor_ena: null, dva_sesion: false, uma: null, set_min: null,
  })
  const stayWithHistory: StayFull = {
    ...base,
    mrc_assessments: [
      mk('m0', '2026-07-01T10:00:00Z', 0),
      mk('m1', '2026-07-02T10:00:00Z', 1),
      mk('m2', '2026-07-03T10:00:00Z', 2),
      mk('m3', '2026-07-04T10:00:00Z', 3),
      mk('m4', '2026-07-05T10:00:00Z', 4),
      mk('m5', '2026-07-06T10:00:00Z', 5),
    ],
  }
  render(<TabFuncional stay={stayWithHistory} />)
  expect(screen.getAllByRole('button', { name: 'Eliminar evaluación' })).toHaveLength(5)
  expect(screen.getByText(/MRC-SS 5 \/ 60/)).toBeInTheDocument()
  expect(screen.queryByText(/MRC-SS 0 \/ 60/)).not.toBeInTheDocument()
})
