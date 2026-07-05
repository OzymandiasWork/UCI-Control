import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { BoxCard } from './BoxCard'
import type { StayFull } from '../../lib/supabase/types'

const today = new Date().toISOString().slice(0, 10)

const stay = {
  id: 's1', box_number: 5, active: true, patient_name: 'J. Pérez',
  record_number: '12345', diagnosis: 'shock septico', alert: 'critical',
  residente: 'jimenez', destination: '', dias_hosp: 3, dias_vm: 2, vm_mode: 'VCV',
  rcp: 'Sí', alergias: '', prevision: 'Fonasa A', consentimiento: false,
  balance_meta: '', balance_real: '', contacto_nombre: '', contacto_tel: '',
  ultimo_contacto: '', notes: '', enfermera: '', tens: '', kine: '',
  updated_at: '', goals: [{ id: 'g1', stay_id: 's1', text: 'meta', done: false, position: 0 }],
  antibiotics: [], accesses: [], nutrition: null,
  sofa_assessments: [{ id: 'a1', stay_id: 's1', assessed_on: today, resp: 3, coag: 1, liver: 0, cardio: 2, neuro: 0, renal: 1 }],
  vent_settings: null, blood_gases: [],
  mrc_assessments: [], emr_sessions: [],
} satisfies StayFull

function renderCard(s: StayFull | null, box = 5) {
  return render(<MemoryRouter><BoxCard boxNumber={box} stay={s} /></MemoryRouter>)
}

test('box ocupado muestra paciente, alerta con texto y SOFA', () => {
  renderCard(stay)
  expect(screen.getByText('J. Pérez')).toBeInTheDocument()
  expect(screen.getByText('Crítico')).toBeInTheDocument()
  expect(screen.getByText(/SOFA 7/)).toBeInTheDocument()
})

test('es un link accesible al detalle del box', () => {
  renderCard(stay)
  expect(screen.getByRole('link', { name: /box 5/i })).toHaveAttribute('href', '/box/5')
})

test('box libre se anuncia como cama libre', () => {
  renderCard(null, 7)
  expect(screen.getByText(/cama libre/i)).toBeInTheDocument()
})
