import { Link } from 'react-router-dom'
import { Badge } from '../../design-system/Badge'
import { ALERT_TYPES } from '../../lib/clinical/constants'
import { sofaRisk } from '../../lib/clinical/sofa'
import { staySofaToday } from '../../lib/supabase/derive'
import { useBoard } from '../../lib/supabase/useBoard'
import { boardKpis } from './kpis'
import './executive.css'

export function ExecutivePage() {
  const { data: stays = [], isLoading } = useBoard()
  if (isLoading) return <p role="status">Cargando…</p>
  const k = boardKpis(stays)
  const now = new Date()
  const alerted = stays.filter(s => s.alert !== 'none')

  return (
    <div className="exec">
      <header className="exec__header">
        <Link to="/" className="exec__back">← Tablero</Link>
        <h1>Resumen Ejecutivo</h1>
        <p className="exec__date">
          {now.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          {' · '}
          {now.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </header>

      <dl className="exec__kpis">
        <div className="kpi"><dt>Ocupación</dt><dd data-kpi>{k.occupied}<span className="kpi__sub">/24</span></dd></div>
        <div className="kpi"><dt>Camas libres</dt><dd data-kpi>{k.freeBeds}</dd></div>
        <div className="kpi"><dt>SOFA promedio</dt><dd>{k.sofaAvg}</dd></div>
        <div className="kpi"><dt>SOFA máximo</dt><dd data-kpi>{k.sofaMax}</dd></div>
        <div className="kpi"><dt>En VM</dt><dd data-kpi>{k.onVM}</dd></div>
        <div className="kpi"><dt>Críticos</dt><dd data-kpi>{k.critical}</dd></div>
        <div className="kpi"><dt>Fin de vida / procuración</dt><dd data-kpi>{k.eol}</dd></div>
        <div className="kpi"><dt>Egresables</dt><dd data-kpi>{k.dischargeable}</dd></div>
      </dl>

      <section aria-labelledby="exec-alerts">
        <h2 id="exec-alerts">Pacientes con alerta</h2>
        {alerted.length === 0 && <p>Sin alertas activas.</p>}
        <ul className="exec__alerts">
          {alerted.map(s => {
            const sofa = staySofaToday(s)
            return (
              <li key={s.id}>
                <Link to={`/box/${s.box_number}`}>
                  <strong>Box {s.box_number}</strong> · {s.patient_name || '—'} · {s.diagnosis || 'sin diagnóstico'}
                </Link>
                <Badge tone={ALERT_TYPES[s.alert].tone}>{ALERT_TYPES[s.alert].label}</Badge>
                <Badge tone={sofaRisk(sofa).tone}>{sofa === null ? 'SOFA —' : `SOFA ${sofa}`}</Badge>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
