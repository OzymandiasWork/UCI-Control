import { useState } from 'react'
import { Badge } from '../../../design-system/Badge'
import { Button } from '../../../design-system/Button'
import { NumberField, SelectField, TextField } from '../../../design-system/Field'
import {
  pafi, pafiClass, drivingPressure, iox, ibw, vtRange,
  interpretGas, lactateHigh, rox, roxClass, HACOR_ITEMS, hacorClass,
  berlin, sbtEval, type BerlinPafi,
} from '../../../lib/clinical/vent'
import { useChildRow, useUpsertVent } from '../../../lib/supabase/useBoard'
import type { StayFull, VentSettings } from '../../../lib/supabase/types'
import { AutoNumber, AutoText } from '../AutoFields'

const MODOS_SV = ['VCV-AC', 'PCV-AC', 'PRVC', 'PS (VSP)', 'CPAP', 'SIMV'] as const

const emptyVent = (stayId: string): VentSettings => ({
  stay_id: stayId, modo_sv: 'VCV-AC', fio2: 50, spo2: 0, pao2: 0, peep: 0, peep_i: 0,
  vt: 0, pc_ps: 0, vol_min: 0, fr_prog: '', pplat: 0, etco2: 0, vd_vt: 0,
  fuga_cuff: 0, rva: 0, cest: 0, sexo: 'h', talla_cm: 0, peso_real: 0,
  irrs: 0, pim: 0, pef: 0, rass: 0, cam_icu: 'neg', sat_ps: 0, secreciones: 'ok',
})

export function TabVentilacion({ stay }: { stay: StayFull }) {
  const { mutate } = useUpsertVent()
  const gases = useChildRow('blood_gases')
  const v = stay.vent_settings ?? emptyVent(stay.id)
  // Solo se envía el campo que cambió (no todo `v`): con 12+ AutoNumber en este
  // formulario, un upsert de fila completa pisaría campos que otro AutoNumber
  // guardó casi al mismo tiempo, porque cada uno captura su propio snapshot
  // desactualizado de `v` (bug reproducido: PaO₂ se perdía al editar FiO₂ justo después).
  const upd = (patch: Partial<VentSettings>) => mutate({ stay_id: stay.id, ...patch })

  // Índices automáticos (solo con datos suficientes)
  const pafiVal = v.pao2 > 0 && v.fio2 >= 21 ? pafi(v.pao2, v.fio2) : null
  const pafiC = pafiVal !== null ? pafiClass(pafiVal) : null
  const dp = v.pplat > 0 ? drivingPressure(v.pplat, v.peep) : null
  const ioxVal = v.pao2 > 0 && v.peep > 0 ? iox(v.fio2, v.peep, v.pao2) : null

  // IBW / VT protector
  const ibwVal = v.talla_cm > 0 ? Number(ibw(v.sexo, v.talla_cm)) : null
  const vts = ibwVal ? vtRange(ibwVal) : null
  const mlKg = ibwVal && v.vt > 0 ? (v.vt / ibwVal).toFixed(1) : null

  // Weaning
  const sbt = sbtEval({
    irrs: v.irrs, pim: v.pim, pef: v.pef, rass: v.rass,
    camNeg: v.cam_icu === 'neg', sat: v.sat_ps, secOk: v.secreciones === 'ok',
  })
  const sbtTone = sbt.veredicto === 'candidato' ? 'ok' : sbt.veredicto === 'condicionado' ? 'warn' : 'danger'

  // Registro de gas nuevo
  const [gas, setGas] = useState({ ph: '', pco2: '', po2: '', hco3: '', lactato: '', sat: '' })
  const num = (s: string) => (s.trim() === '' ? null : Number(s))

  // Calculadoras locales
  const [roxIn, setRoxIn] = useState({ spo2: 96, fio2: 50, fr: 22 })
  const roxVal = Number(rox(roxIn.spo2, roxIn.fio2, roxIn.fr))
  const roxC = roxClass(roxVal)

  const [hacorPts, setHacorPts] = useState<number[]>(HACOR_ITEMS.map(() => 0))
  const hacorTotal = hacorPts.reduce((a, b) => a + b, 0)
  const hacorC = hacorClass(hacorTotal)

  const [berlinIn, setBerlinIn] = useState({ inicio: false, rx: false, edema: false, pafi: '0' as BerlinPafi })
  const berlinR = berlin(berlinIn.inicio, berlinIn.rx, berlinIn.edema, berlinIn.pafi)

  return (
    <div>
      <section aria-labelledby="vent-params">
        <h2 id="vent-params">🫁 Parámetros ventilatorios</h2>
        <div className="tabgrid">
          <SelectField label="Modo SV" value={v.modo_sv} onChange={x => upd({ modo_sv: x })} options={MODOS_SV} />
          <AutoNumber label="FiO₂ (%)" value={v.fio2} min={21} max={100} onSave={x => upd({ fio2: x })} />
          <AutoNumber label="SpO₂ (%)" value={v.spo2} max={100} onSave={x => upd({ spo2: x })} />
          <AutoNumber label="PaO₂ (mmHg)" value={v.pao2} onSave={x => upd({ pao2: x })} />
          <AutoNumber label="PEEP extrínseco (cmH₂O)" value={v.peep} max={40} onSave={x => upd({ peep: x })} />
          <AutoNumber label="PEEP intrínseco (cmH₂O)" value={v.peep_i} max={40} onSave={x => upd({ peep_i: x })} />
          <AutoNumber label="VT / Vti (mL)" value={v.vt} max={2000} onSave={x => upd({ vt: x })} />
          <AutoNumber label="PC / PS (cmH₂O)" value={v.pc_ps} max={60} onSave={x => upd({ pc_ps: x })} />
          <AutoNumber label="P. Plateau (cmH₂O)" value={v.pplat} max={60} onSave={x => upd({ pplat: x })} />
          <AutoNumber label="EtCO₂ (mmHg)" value={v.etco2} max={150} onSave={x => upd({ etco2: x })} />
          <AutoText label="FR prog / total" value={v.fr_prog} onSave={x => upd({ fr_prog: x })} />
          <AutoNumber label="Compliancia Cest (mL/cmH₂O)" value={v.cest} max={200} onSave={x => upd({ cest: x })} />
        </div>
      </section>

      <section aria-labelledby="vent-indices">
        <h2 id="vent-indices">📊 Índices automáticos</h2>
        <div className="vent-indices">
          <Badge tone={pafiC?.tone ?? 'muted'}>
            PAFI {pafiVal ?? '—'}{pafiC ? ` · ${pafiC.label}` : ''}
          </Badge>
          <Badge tone={dp ? (dp.safe ? 'ok' : 'danger') : 'muted'}>
            ΔP {dp?.value ?? '—'} {dp ? (dp.safe ? '· ≤15 seguro' : '· sobre límite') : ''}
          </Badge>
          <Badge tone="muted">IOX {ioxVal ?? '—'}</Badge>
        </div>
        {dp && !dp.safe && (
          <p role="alert" className="vent-alert vent-alert--warn">
            ⚠️ Driving Pressure elevado (ΔP ≥15 cmH₂O). Considerar reducir VT o aumentar PEEP.
            Límite protector: ≤15 cmH₂O (ARMA/Amato 2015).
          </p>
        )}
        {pafiVal !== null && pafiVal < 150 && (
          <p role="alert" className="vent-alert vent-alert--danger">
            🚨 SDRA severo — PAFI &lt;150. Evaluar decúbito prono y optimización de PEEP.
          </p>
        )}
      </section>

      <section aria-labelledby="vent-ibw">
        <h2 id="vent-ibw">⚖️ Peso predicho y VT protector (ARDSnet)</h2>
        <div className="tabrow">
          <SelectField label="Sexo" value={v.sexo === 'h' ? 'Hombre' : 'Mujer'}
            onChange={x => upd({ sexo: x === 'Hombre' ? 'h' : 'm' })} options={['Hombre', 'Mujer']} />
          <AutoNumber label="Talla (cm)" value={v.talla_cm} max={230} onSave={x => upd({ talla_cm: x })} />
          <AutoNumber label="Peso real (kg)" value={v.peso_real} max={300} onSave={x => upd({ peso_real: x })} />
        </div>
        {ibwVal && vts ? (
          <div className="vent-indices">
            <Badge tone="proc">IBW {ibwVal} kg</Badge>
            <Badge tone="muted">4 mL/kg → {vts.vt4} mL</Badge>
            <Badge tone="ok">6 mL/kg → {vts.vt6} mL</Badge>
            <Badge tone="muted">8 mL/kg → {vts.vt8} mL</Badge>
            {mlKg && (
              <Badge tone={Number(mlKg) > 8 ? 'danger' : Number(mlKg) > 6 ? 'warn' : 'ok'}>
                VT actual: {mlKg} mL/kg
              </Badge>
            )}
          </div>
        ) : <p className="vent-hint">Ingresa la talla para calcular el peso predicho y el VT protector.</p>}
      </section>

      <section aria-labelledby="vent-gases">
        <h2 id="vent-gases">🧪 Gases arteriales</h2>
        <div className="tabrow">
          {(['ph', 'pco2', 'po2', 'hco3', 'lactato', 'sat'] as const).map(k => (
            <TextField key={k} label={{ ph: 'pH', pco2: 'PaCO₂', po2: 'PaO₂', hco3: 'HCO₃', lactato: 'Láctico', sat: 'SatO₂ (%)' }[k]}
              value={gas[k]} onChange={x => setGas(g => ({ ...g, [k]: x }))} />
          ))}
          <Button variant="secondary" onClick={() => {
            if (gas.ph.trim() === '' && gas.pco2.trim() === '') return
            gases.insert.mutate({
              stay_id: stay.id, ph: num(gas.ph), pco2: num(gas.pco2), po2: num(gas.po2),
              hco3: num(gas.hco3), lactato: num(gas.lactato), sat: num(gas.sat),
            })
            setGas({ ph: '', pco2: '', po2: '', hco3: '', lactato: '', sat: '' })
          }}>+ Registrar gas</Button>
        </div>
        <ul className="vent-gases">
          {[...stay.blood_gases]
            .sort((a, b) => b.drawn_at.localeCompare(a.drawn_at))
            .slice(0, 5)
            .map(g => {
              const interp = g.ph !== null && g.pco2 !== null ? interpretGas(g.ph, g.pco2) : null
              return (
                <li key={g.id}>
                  <div className="vent-gas-head">
                    <strong>{new Date(g.drawn_at).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</strong>
                    <span>pH {g.ph ?? '—'} · PaCO₂ {g.pco2 ?? '—'} · PaO₂ {g.po2 ?? '—'} · HCO₃ {g.hco3 ?? '—'} · Láctico {g.lactato ?? '—'}</span>
                    <button type="button" className="agenda__del" aria-label="Eliminar gas"
                      onClick={() => gases.remove.mutate(g.id)}>✕</button>
                  </div>
                  {interp && <p className="vent-hint">{interp.texto} {interp.accion}</p>}
                  {g.lactato !== null && lactateHigh(g.lactato) && (
                    <p role="alert" className="vent-alert vent-alert--warn">
                      ⚠️ Hiperlactatemia (≥2 mmol/L) — Láctico {g.lactato} mmol/L. Evaluar perfusión, vasopresores y causa metabólica.
                    </p>
                  )}
                </li>
              )
            })}
          {stay.blood_gases.length === 0 && <li className="vent-hint">Sin gases registrados.</li>}
        </ul>
      </section>

      <section aria-labelledby="vent-weaning">
        <h2 id="vent-weaning">📈 Weaning / Prueba de ventilación espontánea (SBT)</h2>
        <div className="tabgrid">
          <AutoNumber label="IRRS (resp/min/L)" value={v.irrs} max={300} onSave={x => upd({ irrs: x })} />
          <AutoNumber label="PIM (cmH₂O)" value={v.pim} min={-120} max={0} onSave={x => upd({ pim: x })} />
          <AutoNumber label="PEF (L/min)" value={v.pef} max={999} onSave={x => upd({ pef: x })} />
          <AutoNumber label="RASS" value={v.rass} min={-5} max={4} onSave={x => upd({ rass: x })} />
          <SelectField label="CAM-ICU" value={v.cam_icu === 'neg' ? 'Negativo' : 'Positivo'}
            onChange={x => upd({ cam_icu: x === 'Negativo' ? 'neg' : 'pos' })} options={['Negativo', 'Positivo']} />
          <AutoNumber label="SpO₂ en PS (%)" value={v.sat_ps} max={100} onSave={x => upd({ sat_ps: x })} />
          <SelectField label="Secreciones" value={v.secreciones === 'ok' ? 'Manejables' : 'Abundantes'}
            onChange={x => upd({ secreciones: x === 'Manejables' ? 'ok' : 'abund' })} options={['Manejables', 'Abundantes']} />
        </div>
        <div className="vent-indices">
          {sbt.criterios.map(c => (
            <Badge key={c.label} tone={c.ok ? 'ok' : 'danger'}>{c.ok ? '✓' : '✗'} {c.label}</Badge>
          ))}
        </div>
        <p role="status" className={`vent-alert vent-alert--${sbtTone}`}>{sbt.texto}</p>
      </section>

      <section aria-labelledby="vent-calcs">
        <h2 id="vent-calcs">🧮 Calculadoras de referencia</h2>

        <details className="vent-calc">
          <summary>📐 ROX Index — predictor fallo VNI / CNAF</summary>
          <div className="tabrow">
            <NumberField label="SpO₂ (%)" value={roxIn.spo2} max={100} onChange={x => setRoxIn(r => ({ ...r, spo2: x }))} />
            <NumberField label="FiO₂ (%)" value={roxIn.fio2} min={21} max={100} onChange={x => setRoxIn(r => ({ ...r, fio2: x }))} />
            <NumberField label="FR (resp/min)" value={roxIn.fr} min={1} max={80} onChange={x => setRoxIn(r => ({ ...r, fr: x }))} />
          </div>
          <p className={`vent-alert vent-alert--${roxC.tone}`}>ROX {roxVal.toFixed(2)} — {roxC.texto}</p>
        </details>

        <details className="vent-calc">
          <summary>😮‍💨 HACOR — predictor fallo VNI (evaluar a la 1ª hora)</summary>
          {HACOR_ITEMS.map((item, i) => (
            <div className="tabrow" key={item.key}>
              <SelectField label={item.label}
                value={item.options.find(o => o.pts === hacorPts[i])?.label ?? item.options[0].label}
                onChange={x => {
                  const pts = item.options.find(o => o.label === x)?.pts ?? 0
                  setHacorPts(p => p.map((v2, j) => (j === i ? pts : v2)))
                }}
                options={item.options.map(o => o.label)} />
            </div>
          ))}
          <p className={`vent-alert vent-alert--${hacorC.tone}`}>HACOR {hacorTotal}/7 — {hacorC.texto}</p>
        </details>

        <details className="vent-calc">
          <summary>🫁 Criterios Berlín — diagnóstico SDRA</summary>
          {([
            ['inicio', 'Inicio agudo (<1 semana)'],
            ['rx', 'Opacidades bilaterales en RX/TC'],
            ['edema', 'No explicado por falla cardíaca / sobrecarga'],
          ] as const).map(([k, label]) => (
            <div className="tabrow" key={k}>
              <SelectField label={label} value={berlinIn[k] ? 'Sí' : 'No'}
                onChange={x => setBerlinIn(b => ({ ...b, [k]: x === 'Sí' }))} options={['No', 'Sí']} />
            </div>
          ))}
          <div className="tabrow">
            <SelectField label="PAFI (con PEEP ≥5)"
              value={{ '0': '≥400 (no cumple)', leve: '200–400 (leve)', mod: '100–199 (moderado)', sev: '<100 (severo)' }[berlinIn.pafi]}
              onChange={x => {
                const map: Record<string, BerlinPafi> = {
                  '≥400 (no cumple)': '0', '200–400 (leve)': 'leve',
                  '100–199 (moderado)': 'mod', '<100 (severo)': 'sev',
                }
                setBerlinIn(b => ({ ...b, pafi: map[x] ?? '0' }))
              }}
              options={['≥400 (no cumple)', '200–400 (leve)', '100–199 (moderado)', '<100 (severo)']} />
          </div>
          <p className={`vent-alert vent-alert--${berlinR.tone === 'muted' ? 'ok' : berlinR.tone}`}>
            <strong>{berlinR.label}</strong> — {berlinR.texto}
          </p>
        </details>
      </section>

      <p className="sugerencias-disclaimer">
        Material de apoyo clínico (RYGF · UPC HUAP) — no reemplaza el juicio del equipo tratante.
      </p>
    </div>
  )
}
