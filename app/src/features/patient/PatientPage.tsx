import { Link, useNavigate, useParams } from 'react-router-dom'
import { useIsMutating } from '@tanstack/react-query'
import { Badge } from '../../design-system/Badge'
import { Button } from '../../design-system/Button'
import { Tabs } from '../../design-system/Tabs'
import { ThemeToggle } from '../../design-system/ThemeToggle'
import { ALERT_TYPES, BOX_COUNT } from '../../lib/clinical/constants'
import { useBoard } from '../../lib/supabase/useBoard'
import { IngresoEgreso } from './IngresoEgreso'
import { TabClinico } from './tabs/TabClinico'
import { TabVentilacion } from './tabs/TabVentilacion'
import { TabEquipo } from './tabs/TabEquipo'
import { TabATB } from './tabs/TabATB'
import { TabNutricion } from './tabs/TabNutricion'
import { TabSofa } from './tabs/TabSofa'
import { TabMetas } from './tabs/TabMetas'
import { TabSugerencias } from './tabs/TabSugerencias'
import { TabFuncional } from './tabs/TabFuncional'
import { TabEMR } from './tabs/TabEMR'
import './patient.css'

export function PatientPage() {
  const { boxNumber } = useParams()
  const navigate = useNavigate()
  const n = Number(boxNumber)
  const { data: stays = [], isLoading } = useBoard()
  const saving = useIsMutating() > 0
  const stay = stays.find(s => s.box_number === n) ?? null

  if (isLoading) return <p role="status">Cargando…</p>

  return (
    <div className="patient">
      <header className="patient__header">
        <Link to="/" className="patient__back">← Tablero</Link>
        <h1>Box {n}</h1>
        {stay && <Badge tone={ALERT_TYPES[stay.alert].tone}>{ALERT_TYPES[stay.alert].label}</Badge>}
        {stay && (
          <span className={`savestate${saving ? ' savestate--busy' : ''}`} role="status">
            {saving ? 'Guardando…' : '✓ Guardado automático'}
          </span>
        )}
        <nav className="patient__nav" aria-label="Navegar entre boxes">
          {n > 1 && <Link to={`/box/${n - 1}`}>← Box {n - 1}</Link>}
          {n < BOX_COUNT && <Link to={`/box/${n + 1}`}>Box {n + 1} →</Link>}
          <ThemeToggle />
        </nav>
      </header>

      <main aria-label={`Detalle del box ${n}`}>
        <IngresoEgreso boxNumber={n} stay={stay} />

        {stay && (
          <Tabs
            label={`Módulos del paciente del box ${n}`}
            tabs={[
              { id: 'clinico', label: 'Clínico', content: <TabClinico stay={stay} /> },
              { id: 'ventilacion', label: 'Ventilación', content: <TabVentilacion stay={stay} /> },
              { id: 'equipo', label: 'Equipo', content: <TabEquipo stay={stay} /> },
              { id: 'atb', label: 'ATB', content: <TabATB stay={stay} /> },
              { id: 'nutricion', label: 'Nutrición', content: <TabNutricion stay={stay} /> },
              { id: 'sofa', label: 'SOFA', content: <TabSofa stay={stay} /> },
              { id: 'metas', label: 'Metas', content: <TabMetas stay={stay} /> },
              { id: 'sugerencias', label: 'Sugerencias', content: <TabSugerencias stay={stay} /> },
              { id: 'funcional', label: 'Funcional', content: <TabFuncional stay={stay} /> },
              { id: 'emr', label: 'EMR', content: <TabEMR stay={stay} /> },
            ]}
          />
        )}

        {stay && (
          <footer className="patient__footer">
            <Button onClick={() => navigate('/')}>✓ Guardar y volver al tablero</Button>
            <p className="patient__hint">
              Tranquilo: cada cambio se guarda solo, al instante. Este botón simplemente te
              devuelve al tablero.
            </p>
          </footer>
        )}
      </main>
    </div>
  )
}
