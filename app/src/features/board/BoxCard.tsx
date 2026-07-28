// app/src/features/board/BoxCard.tsx
import { Badge } from '../../design-system/Badge'
import { ALERT_TYPES, DESTINO_TIPOS } from '../../lib/clinical/constants'
import type { StayFull } from '../../lib/supabase/types'
import { ExpandedBox } from '../patient/ExpandedBox'

export function BoxCard({ boxNumber, stay, expanded, onToggle }: {
  boxNumber: number; stay: StayFull | null; expanded: boolean; onToggle: () => void
}) {
  if (!stay) {
    return (
      <div className={`boxcard boxcard--free${expanded ? ' boxcard--expanded' : ''}`}>
        <button type="button" className="boxcard__row" onClick={onToggle}
          aria-label={`Box ${boxNumber}: cama libre`} aria-expanded={expanded}>
          <span className="boxcard__num">Box {boxNumber}</span>
          <span className="boxcard__free">Cama libre</span>
          <span className="boxcard__chevron" aria-hidden="true">{expanded ? '▲' : '▼'}</span>
        </button>
        {expanded && <ExpandedBox stay={null} boxNumber={boxNumber} onClose={onToggle} />}
      </div>
    )
  }

  const alert = ALERT_TYPES[stay.alert]
  return (
    <div className={`boxcard boxcard--${alert.tone}${expanded ? ' boxcard--expanded' : ''}`}>
      <button type="button" className="boxcard__row" onClick={onToggle}
        aria-label={`Box ${boxNumber}: ${stay.patient_name || 'sin nombre'}, ${alert.label}`}
        aria-expanded={expanded}>
        <span className="boxcard__num">Box {boxNumber}</span>
        <span className="boxcard__name">{stay.patient_name || '—'}</span>
        <span className="boxcard__dx">{stay.diagnosis || 'Sin diagnóstico'}</span>
        {stay.alert !== 'none' && <Badge tone={alert.tone}>{alert.label}</Badge>}
        {stay.destino_tipo !== '' && <Badge tone="muted">{DESTINO_TIPOS[stay.destino_tipo]}</Badge>}
        <span className="boxcard__meta-text">{stay.residente}</span>
        {stay.dias_hosp > 0 && <span className="boxcard__meta-text">d{stay.dias_hosp}</span>}
        <span className="boxcard__chevron" aria-hidden="true">{expanded ? '▲' : '▼'}</span>
      </button>
      {expanded && <ExpandedBox stay={stay} boxNumber={boxNumber} onClose={onToggle} />}
    </div>
  )
}
