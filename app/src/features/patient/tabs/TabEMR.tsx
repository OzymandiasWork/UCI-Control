import { useState } from 'react'
import { Button } from '../../../design-system/Button'
import { ConfirmDeleteButton } from '../../../design-system/ConfirmDeleteButton'
import { SelectField, TextField } from '../../../design-system/Field'
import { useChildRow } from '../../../lib/supabase/useBoard'
import type { StayFull } from '../../../lib/supabase/types'

const num = (s: string) => (s.trim() === '' ? null : Number(s))

function emptyForm() {
  return {
    session_type: 'fuerza' as 'fuerza' | 'resistencia',
    carga_pct: '', cmh2o: '', repeticiones: '', series: '', minutos: '',
    tolerancia: true, borg: '',
    pim_test: '', pef_test: '', fraccion_acort_pct: '', eco_diaf_esp_mm: '', eco_diaf_ins_mm: '',
    notas: '',
  }
}
type Form = ReturnType<typeof emptyForm>

export function TabEMR({ stay }: { stay: StayFull }) {
  const emr = useChildRow('emr_sessions')
  const [form, setForm] = useState<Form>(emptyForm())
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm(f => ({ ...f, [k]: v }))

  const save = () => {
    if (form.carga_pct.trim() === '' && form.cmh2o.trim() === '') return
    emr.insert.mutate({
      stay_id: stay.id,
      session_type: form.session_type,
      carga_pct: num(form.carga_pct),
      cmh2o: num(form.cmh2o),
      repeticiones: form.session_type === 'fuerza' ? num(form.repeticiones) : null,
      series: form.session_type === 'fuerza' ? num(form.series) : null,
      minutos: form.session_type === 'resistencia' ? num(form.minutos) : null,
      tolerancia: form.tolerancia,
      borg: num(form.borg),
      pim_test: num(form.pim_test),
      pef_test: num(form.pef_test),
      fraccion_acort_pct: num(form.fraccion_acort_pct),
      eco_diaf_esp_mm: num(form.eco_diaf_esp_mm),
      eco_diaf_ins_mm: num(form.eco_diaf_ins_mm),
      notas: form.notas,
    })
    setForm(emptyForm())
  }

  return (
    <div>
      <section aria-labelledby="emr-nueva">
        <h2 id="emr-nueva">🏋️ Registrar sesión de entrenamiento muscular respiratorio</h2>
        <div className="tabgrid">
          <SelectField label="Tipo de sesión"
            value={form.session_type === 'fuerza' ? 'Fuerza' : 'Resistencia'}
            onChange={x => set('session_type', x === 'Fuerza' ? 'fuerza' : 'resistencia')}
            options={['Fuerza', 'Resistencia']} />
          <TextField label="Carga (%)" value={form.carga_pct} onChange={x => set('carga_pct', x)} />
          <TextField label="cmH₂O" value={form.cmh2o} onChange={x => set('cmh2o', x)} />
          {form.session_type === 'fuerza' ? (
            <>
              <TextField label="Repeticiones" value={form.repeticiones} onChange={x => set('repeticiones', x)} />
              <TextField label="Series" value={form.series} onChange={x => set('series', x)} />
            </>
          ) : (
            <TextField label="Minutos de trabajo" value={form.minutos} onChange={x => set('minutos', x)} />
          )}
          <SelectField label="Tolerancia" value={form.tolerancia ? 'Sí' : 'No'}
            onChange={x => set('tolerancia', x === 'Sí')} options={['Sí', 'No']} />
          <TextField label="Borg (/10)" value={form.borg} onChange={x => set('borg', x)} />
        </div>

        <details className="vent-calc">
          <summary>🔬 Chequeo basal (opcional, remedición periódica)</summary>
          <div className="tabgrid">
            <TextField label="PIM (cmH₂O)" value={form.pim_test} onChange={x => set('pim_test', x)} />
            <TextField label="PEF (L/min)" value={form.pef_test} onChange={x => set('pef_test', x)} />
            <TextField label="Fracción acort. (%)" value={form.fraccion_acort_pct} onChange={x => set('fraccion_acort_pct', x)} />
            <TextField label="Eco Diaf. esp. (mm)" value={form.eco_diaf_esp_mm} onChange={x => set('eco_diaf_esp_mm', x)} />
            <TextField label="Eco Diaf. ins. (mm)" value={form.eco_diaf_ins_mm} onChange={x => set('eco_diaf_ins_mm', x)} />
          </div>
        </details>

        <div className="tabgrid__full">
          <TextField label="Notas de la sesión" multiline value={form.notas} onChange={x => set('notas', x)} />
        </div>

        <Button onClick={save}>+ Registrar sesión</Button>
      </section>

      <section aria-labelledby="emr-historial">
        <h2 id="emr-historial">🕑 Historial de sesiones</h2>
        <ul className="vent-gases">
          {[...stay.emr_sessions]
            .sort((a, b) => b.session_at.localeCompare(a.session_at))
            .slice(0, 5)
            .map(s => (
              <li key={s.id}>
                <div className="vent-gas-head">
                  <strong>
                    {new Date(s.session_at).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </strong>
                  <span>
                    {s.session_type === 'fuerza' ? 'Fuerza' : 'Resistencia'} · Carga {s.carga_pct ?? '—'}% · {s.cmh2o ?? '—'} cmH₂O
                    {s.session_type === 'fuerza'
                      ? ` · ${s.repeticiones ?? '—'}×${s.series ?? '—'}`
                      : ` · ${s.minutos ?? '—'} min`}
                    {' '}· Borg {s.borg ?? '—'} · {s.tolerancia ? 'Toleró' : 'No toleró'}
                  </span>
                  <ConfirmDeleteButton
                    ariaLabel="Eliminar sesión"
                    confirmText="¿Eliminar esta sesión de EMR?"
                    idleLabel="✕"
                    idleClassName="agenda__del"
                    onConfirm={() => emr.remove.mutate(s.id)} />
                </div>
                {s.notas && <p className="vent-hint">{s.notas}</p>}
              </li>
            ))}
          {stay.emr_sessions.length === 0 && <li className="vent-hint">Sin sesiones registradas.</li>}
        </ul>
      </section>
    </div>
  )
}
