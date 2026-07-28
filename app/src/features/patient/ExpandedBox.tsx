import { useIsMutating } from '@tanstack/react-query'
import { Badge } from '../../design-system/Badge'
import { Button } from '../../design-system/Button'
import { Tabs } from '../../design-system/Tabs'
import { ALERT_TYPES } from '../../lib/clinical/constants'
import type { StayFull } from '../../lib/supabase/types'
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

export function ExpandedBox({ stay, boxNumber, onClose }: {
  stay: StayFull | null; boxNumber: number; onClose: () => void
}) {
  const saving = useIsMutating() > 0

  return (
    <div className="expanded-box" id={`expanded-box-${boxNumber}`}
      role="region" aria-labelledby={`expanded-box-${boxNumber}-heading`}>
      <h2 id={`expanded-box-${boxNumber}-heading`} className="expanded-box__heading">
        Box {boxNumber}{stay?.patient_name ? ` — ${stay.patient_name}` : ''}
      </h2>

      {stay && (
        <div className="expanded-box__summary">
          {stay.alert !== 'none' && <Badge tone={ALERT_TYPES[stay.alert].tone}>{ALERT_TYPES[stay.alert].label}</Badge>}
          <span className={`savestate${saving ? ' savestate--busy' : ''}`} role="status">
            {saving ? 'Guardando…' : '✓ Guardado automático'}
          </span>
        </div>
      )}

      <IngresoEgreso boxNumber={boxNumber} stay={stay} />

      {stay && (
        <>
          <Tabs
            label={`Módulos del paciente del box ${boxNumber}`}
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

          <details className="iaas-stub">
            <summary>🛡 Prevención de IAAS</summary>
            <p className="vent-hint">
              Disponible próximamente — este módulo se está construyendo por separado.
            </p>
          </details>

          {/* div, no <footer>: dentro de role="region" un <footer> mapea a un landmark
              "contentinfo" anidado, lo que viola landmark-contentinfo-is-top-level (axe). */}
          <div className="expanded-box__footer">
            <Button onClick={onClose}>Colapsar</Button>
            <p className="patient__hint">
              Tranquilo: cada cambio se guarda solo, al instante. Este botón simplemente
              colapsa la tarjeta.
            </p>
          </div>
        </>
      )}
    </div>
  )
}
