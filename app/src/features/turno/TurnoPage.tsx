import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '../../design-system/Badge'
import { Button } from '../../design-system/Button'
import { SelectField } from '../../design-system/Field'
import { AutoText } from '../patient/AutoFields'
import { ROLES_TURNO, TURNOS, nurseLoad } from '../../lib/clinical/staffing'
import { useBoard } from '../../lib/supabase/useBoard'
import { useTurno, useTurnoMutations } from '../../lib/supabase/useTurno'
import './turno.css'

const hoy = () => new Date().toISOString().slice(0, 10)

export function TurnoPage() {
  const [date, setDate] = useState(hoy())
  const [type, setType] = useState<'Día' | 'Noche'>('Día')
  const { data: staff = [], isLoading } = useTurno(date, type)
  const { add, update, remove } = useTurnoMutations(date, type)
  const { data: stays = [] } = useBoard()

  const enfermeras = staff.filter(s => s.role === 'Enfermera/o').length
  const load = nurseLoad(stays.length, enfermeras)
  const counts = ROLES_TURNO.map(r => ({ role: r, n: staff.filter(s => s.role === r).length }))

  return (
    <div className="turno">
      <header className="turno__header">
        <Link to="/" className="patient__back">← Tablero</Link>
        <h1>Roles del turno</h1>
      </header>

      <div className="turno__filters">
        <div className="ds-field">
          <label htmlFor="turno-fecha">Fecha</label>
          <input id="turno-fecha" type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>
        <SelectField label="Turno" value={type}
          onChange={v => setType(v as 'Día' | 'Noche')} options={TURNOS} />
      </div>

      <section aria-labelledby="turno-carga">
        <h2 id="turno-carga">Carga asistencial</h2>
        <div className="turno__chips">
          <Badge tone="muted">{stays.length} pacientes en la unidad</Badge>
          {counts.filter(c => c.n > 0).map(c => (
            <Badge key={c.role} tone="muted">{c.n} {c.role}</Badge>
          ))}
          <Badge tone={load.tone}>Enfermería {load.label}</Badge>
        </div>
        {load.tone !== 'ok' && (
          <p role="alert" className={`vent-alert vent-alert--${load.tone}`}>
            {load.tone === 'danger' ? '🚨' : '⚠️'} Dotación de enfermería bajo el estándar UCI (1:2).
            Ratio actual: {load.ratio === null ? 'sin enfermeras registradas' : `1 enfermera/o por ${load.ratio} pacientes`}.
          </p>
        )}
      </section>

      <section aria-labelledby="turno-personal">
        <h2 id="turno-personal">Personal del turno</h2>
        {isLoading && <p role="status">Cargando…</p>}
        {staff.map(s => (
          <div className="tabrow" key={s.id}>
            <SelectField label="Rol" value={s.role}
              onChange={v => update.mutate({ id: s.id, patch: { role: v } })}
              options={ROLES_TURNO} />
            <AutoText label="Nombre" value={s.name}
              onSave={v => update.mutate({ id: s.id, patch: { name: v } })} />
            <AutoText label="Boxes asignados" value={s.boxes}
              onSave={v => update.mutate({ id: s.id, patch: { boxes: v } })} />
            <Button variant="secondary" aria-label={`Quitar a ${s.name || 'persona sin nombre'} del turno`}
              onClick={() => remove.mutate(s.id)}>Quitar</Button>
          </div>
        ))}
        {staff.length === 0 && !isLoading && (
          <p className="vent-hint">Sin personal registrado para este turno todavía.</p>
        )}
        <div className="turno__add">
          {ROLES_TURNO.map(r => (
            <Button key={r} variant="secondary" onClick={() => add.mutate(r)}>+ {r}</Button>
          ))}
        </div>
      </section>
    </div>
  )
}
