import { Link, useParams } from 'react-router-dom'
import { Badge } from '../../design-system/Badge'
import { Tabs } from '../../design-system/Tabs'
import { ALERT_TYPES, BOX_COUNT } from '../../lib/clinical/constants'
import { useBoard } from '../../lib/supabase/useBoard'
import { IngresoEgreso } from './IngresoEgreso'
import { TabClinico } from './tabs/TabClinico'
import './patient.css'

export function PatientPage() {
  const { boxNumber } = useParams()
  const n = Number(boxNumber)
  const { data: stays = [], isLoading } = useBoard()
  const stay = stays.find(s => s.box_number === n) ?? null

  if (isLoading) return <p role="status">Cargando…</p>

  return (
    <div className="patient">
      <header className="patient__header">
        <Link to="/" className="patient__back">← Tablero</Link>
        <h1>Box {n}</h1>
        {stay && <Badge tone={ALERT_TYPES[stay.alert].tone}>{ALERT_TYPES[stay.alert].label}</Badge>}
        <nav className="patient__nav" aria-label="Navegar entre boxes">
          {n > 1 && <Link to={`/box/${n - 1}`}>← Box {n - 1}</Link>}
          {n < BOX_COUNT && <Link to={`/box/${n + 1}`}>Box {n + 1} →</Link>}
        </nav>
      </header>

      <IngresoEgreso boxNumber={n} stay={stay} />

      {stay && (
        <Tabs
          label={`Módulos del paciente del box ${n}`}
          tabs={[
            { id: 'clinico', label: 'Clínico', content: <TabClinico stay={stay} /> },
          ]}
        />
      )}
    </div>
  )
}
