import { useRef } from 'react'
import { Badge } from '../../design-system/Badge'
import { ALERT_TYPES, DESTINO_TIPOS } from '../../lib/clinical/constants'
import type { StayFull } from '../../lib/supabase/types'
import { ExpandedBox } from '../patient/ExpandedBox'

export function BoxCard({ boxNumber, stay, expanded, onToggle }: {
  boxNumber: number; stay: StayFull | null; expanded: boolean; onToggle: () => void
}) {
  const rowRef = useRef<HTMLButtonElement>(null)
  const expandedBoxId = `expanded-box-${boxNumber}`

  // Al colapsar (por click en la fila o por "Colapsar" dentro de ExpandedBox), el
  // elemento que tenía el foco puede desmontarse (ej. el botón "Colapsar" del panel).
  // Movemos el foco a la fila del box síncronamente, antes de disparar el toggle, para
  // que no caiga en <body> — mantiene la posición del usuario en la grilla de 24 boxes.
  function handleToggle() {
    if (expanded) rowRef.current?.focus()
    onToggle()
  }

  if (!stay) {
    return (
      <div className="boxcard boxcard--free">
        <button ref={rowRef} type="button" className="boxcard__row" onClick={handleToggle}
          aria-label={`Box ${boxNumber}: cama libre`} aria-expanded={expanded}
          aria-controls={expanded ? expandedBoxId : undefined}>
          <span className="boxcard__num">Box {boxNumber}</span>
          <span className="boxcard__free">Cama libre</span>
          <span className="boxcard__chevron" aria-hidden="true">{expanded ? '▲' : '▼'}</span>
        </button>
        {expanded && <ExpandedBox stay={null} boxNumber={boxNumber} onClose={handleToggle} />}
      </div>
    )
  }

  const alert = ALERT_TYPES[stay.alert]
  return (
    <div className={`boxcard boxcard--${alert.tone}`}>
      <button ref={rowRef} type="button" className="boxcard__row" onClick={handleToggle}
        aria-label={`Box ${boxNumber}: ${stay.patient_name || 'sin nombre'}, ${alert.label}`}
        aria-expanded={expanded}
        aria-controls={expanded ? expandedBoxId : undefined}>
        <span className="boxcard__num">Box {boxNumber}</span>
        <span className="boxcard__name">{stay.patient_name || '—'}</span>
        <span className="boxcard__dx">{stay.diagnosis || 'Sin diagnóstico'}</span>
        {stay.alert !== 'none' && <Badge tone={alert.tone}>{alert.label}</Badge>}
        {stay.destino_tipo !== '' && <Badge tone="muted">{DESTINO_TIPOS[stay.destino_tipo]}</Badge>}
        <span className="boxcard__meta-text">{stay.residente}</span>
        {stay.dias_hosp > 0 && <span className="boxcard__meta-text">d{stay.dias_hosp}</span>}
        <span className="boxcard__chevron" aria-hidden="true">{expanded ? '▲' : '▼'}</span>
      </button>
      {expanded && <ExpandedBox stay={stay} boxNumber={boxNumber} onClose={handleToggle} />}
    </div>
  )
}
