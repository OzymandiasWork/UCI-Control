import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '../../design-system/Badge'
import { ALERT_TYPES } from '../../lib/clinical/constants'
import { sofaRisk } from '../../lib/clinical/sofa'
import { staySofaToday } from '../../lib/supabase/derive'
import { useBoard } from '../../lib/supabase/useBoard'
import { useOccupancyTrend } from '../../lib/supabase/useTurno'
import { occupancyProjection, occupancyTone } from '../../lib/clinical/occupancy'
import { animateKpis } from '../board/animations'
import { boardKpis } from './kpis'
import './executive.css'

export function ExecutivePage() {
  const { data: stays = [], isLoading } = useBoard()
  const { data: trend = [] } = useOccupancyTrend()
  const kpisRef = useRef<HTMLDListElement>(null)

  useEffect(() => {
    if (!isLoading && kpisRef.current) return animateKpis(kpisRef.current)
  }, [isLoading])

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

      <main aria-label="Resumen ejecutivo">
        <dl className="exec__kpis" ref={kpisRef}>
          <div className="kpi"><dt>Ocupación</dt><dd data-kpi>{k.occupied}<span className="kpi__sub">/24</span></dd></div>
          <div className="kpi"><dt>Camas libres</dt><dd data-kpi>{k.freeBeds}</dd></div>
          <div className="kpi"><dt>SOFA promedio</dt><dd>{k.sofaAvg}</dd></div>
          <div className="kpi"><dt>SOFA máximo</dt><dd data-kpi>{k.sofaMax}</dd></div>
          <div className="kpi"><dt>En VM</dt><dd data-kpi>{k.onVM}</dd></div>
          <div className="kpi"><dt>Críticos</dt><dd data-kpi>{k.critical}</dd></div>
          <div className="kpi"><dt>Fin de vida / procuración</dt><dd data-kpi>{k.eol}</dd></div>
          <div className="kpi"><dt>Egresables</dt><dd data-kpi>{k.dischargeable}</dd></div>
          <div className="kpi"><dt>→ Traslado</dt><dd data-kpi>{k.traslados}</dd></div>
          <div className="kpi"><dt>Fallecidos</dt><dd data-kpi>{k.fallecidos}</dd></div>
        </dl>

        <section aria-labelledby="exec-camas">
          <h2 id="exec-camas">Camas y proyección 24 h</h2>
          {(() => {
            const p = occupancyProjection({ occupied: k.occupied, freeBeds: k.freeBeds, dischargeable: k.dischargeable })
            return (
              <div className="exec__proyeccion">
                <Badge tone={occupancyTone(p.pctOccupied)}>Ocupación {p.pctOccupied}%</Badge>
                <Badge tone="muted">{k.freeBeds} libres ahora</Badge>
                <Badge tone="muted">{k.dischargeable} egresables</Badge>
                <Badge tone={p.projectedFree >= 2 ? 'ok' : 'danger'}>
                  Proyección 24 h: {p.projectedFree} camas libres
                </Badge>
              </div>
            )
          })()}
          {trend.length > 1 ? (
            <div className="exec__trend" role="img"
              aria-label={`Tendencia de ocupación: ${trend.map(t => `${t.snap_date.slice(5)}: ${t.occupied} ocupadas`).join(', ')}`}>
              {trend.map(t => (
                <div key={t.snap_date} className="exec__bar-wrap" title={`${t.snap_date}: ${t.occupied}/24`}>
                  <div className="exec__bar" style={{ height: `${Math.max(4, (t.occupied / 24) * 100)}%` }} />
                  <span className="exec__bar-label">{t.snap_date.slice(8)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="vent-hint">
              La tendencia histórica se construye sola: cada día a las 08:00 se guarda una foto de la
              ocupación. En unos días verás la curva aquí.
            </p>
          )}
        </section>

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
      </main>
    </div>
  )
}
