import { useState } from 'react'
import { Badge } from '../../../design-system/Badge'
import { Button } from '../../../design-system/Button'
import { ConfirmDeleteButton } from '../../../design-system/ConfirmDeleteButton'
import { SelectField, TextField } from '../../../design-system/Field'
import { MRC_GROUPS, calcMrcTotal, mrcInterp, type MrcKey, type MrcScores } from '../../../lib/clinical/functional'
import { useChildRow } from '../../../lib/supabase/useBoard'
import type { StayFull } from '../../../lib/supabase/types'

const num = (s: string) => (s.trim() === '' ? null : Number(s))

type FormKey = MrcKey
  | 'fss_icu' | 'ims' | 'handgrip_d' | 'handgrip_i' | 'tiempo_trabajo_min'
  | 'pct_fcr' | 'borg_fuerza' | 'dolor_ena' | 'uma' | 'set_min'

function emptyForm(): Record<FormKey, string> & { dva_sesion: boolean } {
  return {
    abd_hh_d: '', flex_hh_d: '', ext_mu_d: '', abd_hh_i: '', flex_hh_i: '', ext_mu_i: '',
    flex_rod_d: '', ext_rod_d: '', dors_pie_d: '', flex_rod_i: '', ext_rod_i: '', dors_pie_i: '',
    fss_icu: '', ims: '', handgrip_d: '', handgrip_i: '', tiempo_trabajo_min: '',
    pct_fcr: '', borg_fuerza: '', dolor_ena: '', uma: '', set_min: '',
    dva_sesion: false,
  }
}

export function TabFuncional({ stay }: { stay: StayFull }) {
  const mrc = useChildRow('mrc_assessments')
  const [form, setForm] = useState(emptyForm())
  const set = (k: FormKey, v: string) => setForm(f => ({ ...f, [k]: v }))

  const liveScores: MrcScores = Object.fromEntries(
    MRC_GROUPS.map(g => [g.key, num(form[g.key])]),
  ) as MrcScores
  const liveTotal = calcMrcTotal(liveScores)
  const interp = mrcInterp(liveTotal)

  const save = () => {
    if (MRC_GROUPS.every(g => form[g.key].trim() === '')) return
    mrc.insert.mutate({
      stay_id: stay.id,
      ...Object.fromEntries(MRC_GROUPS.map(g => [g.key, num(form[g.key])])),
      fss_icu: num(form.fss_icu), ims: num(form.ims),
      handgrip_d: num(form.handgrip_d), handgrip_i: num(form.handgrip_i),
      tiempo_trabajo_min: num(form.tiempo_trabajo_min), pct_fcr: num(form.pct_fcr),
      borg_fuerza: num(form.borg_fuerza), dolor_ena: num(form.dolor_ena),
      dva_sesion: form.dva_sesion, uma: num(form.uma), set_min: num(form.set_min),
    })
    setForm(emptyForm())
  }

  return (
    <div>
      <section aria-labelledby="func-mrc">
        <h2 id="func-mrc">💪 MRC-SS (Medical Research Council Sum Score)</h2>
        <div className="mrc-grid">
          {MRC_GROUPS.map(g => (
            <TextField key={g.key} label={g.label} value={form[g.key]} onChange={x => set(g.key, x)} />
          ))}
        </div>
        <div className="vent-indices">
          <Badge tone={interp.tone}>MRC-SS {liveTotal ?? '—'} / 60 · {interp.label}</Badge>
        </div>
      </section>

      <section aria-labelledby="func-indices">
        <h2 id="func-indices">📊 FSS-ICU e IMS</h2>
        <div className="tabrow">
          <TextField label="FSS-ICU (/35)" value={form.fss_icu} onChange={x => set('fss_icu', x)} />
          <TextField label="IMS – Movilidad (/10)" value={form.ims} onChange={x => set('ims', x)} />
        </div>
      </section>

      <section aria-labelledby="func-fuerza">
        <h2 id="func-fuerza">🤝 Fuerza y resistencia</h2>
        <div className="tabgrid">
          <TextField label="Handgrip derecho (kg)" value={form.handgrip_d} onChange={x => set('handgrip_d', x)} />
          <TextField label="Handgrip izquierdo (kg)" value={form.handgrip_i} onChange={x => set('handgrip_i', x)} />
          <TextField label="Tiempo de trabajo (min)" value={form.tiempo_trabajo_min} onChange={x => set('tiempo_trabajo_min', x)} />
          <TextField label="% FCR" value={form.pct_fcr} onChange={x => set('pct_fcr', x)} />
          <TextField label="Borg fuerza (/10)" value={form.borg_fuerza} onChange={x => set('borg_fuerza', x)} />
          <TextField label="Dolor ENA (/10)" value={form.dolor_ena} onChange={x => set('dolor_ena', x)} />
          <SelectField label="DVA usada en sesión" value={form.dva_sesion ? 'Sí' : 'No'}
            onChange={x => setForm(f => ({ ...f, dva_sesion: x === 'Sí' }))} options={['No', 'Sí']} />
        </div>
      </section>

      <section aria-labelledby="func-set">
        <h2 id="func-set">🏃 SET / UMA</h2>
        <div className="tabrow">
          <TextField label="UMA (MET)" value={form.uma} onChange={x => set('uma', x)} />
          <TextField label="SET – tiempo de ejercicio (min)" value={form.set_min} onChange={x => set('set_min', x)} />
        </div>
      </section>

      <Button onClick={save}>+ Guardar evaluación</Button>

      <section aria-labelledby="func-historial">
        <h2 id="func-historial">🕑 Historial de evaluaciones</h2>
        <ul className="vent-gases">
          {[...stay.mrc_assessments]
            .sort((a, b) => b.assessed_at.localeCompare(a.assessed_at))
            .slice(0, 5)
            .map(a => {
              const total = calcMrcTotal(a)
              const i = mrcInterp(total)
              return (
                <li key={a.id}>
                  <div className="vent-gas-head">
                    <strong>
                      {new Date(a.assessed_at).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </strong>
                    <Badge tone={i.tone}>MRC-SS {total ?? '—'} / 60 · {i.label}</Badge>
                    <ConfirmDeleteButton
                      ariaLabel="Eliminar evaluación"
                      confirmText="¿Eliminar esta evaluación MRC-SS?"
                      idleLabel="✕"
                      idleClassName="agenda__del"
                      onConfirm={() => mrc.remove.mutate(a.id)} />
                  </div>
                </li>
              )
            })}
          {stay.mrc_assessments.length === 0 && <li className="vent-hint">Sin evaluaciones registradas.</li>}
        </ul>
      </section>

      <p className="sugerencias-disclaimer">
        Material de apoyo clínico (RYGF · UPC HUAP) — no reemplaza el juicio del equipo tratante.
      </p>
    </div>
  )
}
