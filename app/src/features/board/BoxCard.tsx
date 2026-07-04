import { Link } from 'react-router-dom'
import { Badge } from '../../design-system/Badge'
import { ALERT_TYPES } from '../../lib/clinical/constants'
import { sofaRisk } from '../../lib/clinical/sofa'
import { staySofaToday } from '../../lib/supabase/derive'
import type { StayFull } from '../../lib/supabase/types'

export function BoxCard({ boxNumber, stay }: { boxNumber: number; stay: StayFull | null }) {
  if (!stay) {
    return (
      <Link to={`/box/${boxNumber}`} className="boxcard boxcard--free"
        aria-label={`Box ${boxNumber}: cama libre`}>
        <span className="boxcard__num">Box {boxNumber}</span>
        <span className="boxcard__free">Cama libre</span>
      </Link>
    )
  }
  const alert = ALERT_TYPES[stay.alert]
  const sofa = staySofaToday(stay)
  const risk = sofaRisk(sofa)
  const goalsDone = stay.goals.filter(g => g.done).length
  return (
    <Link to={`/box/${boxNumber}`} className={`boxcard boxcard--${alert.tone}`}
      aria-label={`Box ${boxNumber}: ${stay.patient_name || 'sin nombre'}, ${alert.label}`}>
      <div className="boxcard__head">
        <span className="boxcard__num">Box {boxNumber}</span>
        <Badge tone={alert.tone}>{alert.label}</Badge>
      </div>
      <p className="boxcard__name">{stay.patient_name || '—'}</p>
      <p className="boxcard__dx">{stay.diagnosis || 'Sin diagnóstico'}</p>
      <div className="boxcard__meta">
        <Badge tone={risk.tone}>{sofa === null ? 'SOFA —' : `SOFA ${sofa}`}</Badge>
        {stay.dias_vm > 0 && <Badge tone="muted">VM día {stay.dias_vm}</Badge>}
        <Badge tone={stay.goals.length > 0 && goalsDone === stay.goals.length ? 'ok' : 'muted'}>
          Metas {goalsDone}/{stay.goals.length}
        </Badge>
      </div>
    </Link>
  )
}
