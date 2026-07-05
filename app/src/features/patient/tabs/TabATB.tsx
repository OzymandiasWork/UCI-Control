import { Badge } from '../../../design-system/Badge'
import { Button } from '../../../design-system/Button'
import { ConfirmDeleteButton } from '../../../design-system/ConfirmDeleteButton'
import { useChildRow } from '../../../lib/supabase/useBoard'
import type { StayFull } from '../../../lib/supabase/types'
import { AutoNumber, AutoText } from '../AutoFields'

export function TabATB({ stay }: { stay: StayFull }) {
  const atb = useChildRow('antibiotics')
  return (
    <div>
      {stay.antibiotics.map(a => (
        <div className="tabrow" key={a.id}>
          <AutoText label="Antibiótico" value={a.drug}
            onSave={v => atb.update.mutate({ id: a.id, patch: { drug: v } })} />
          <AutoNumber label="Día de tratamiento" value={a.day}
            onSave={v => atb.update.mutate({ id: a.id, patch: { day: v } })} />
          {a.day >= 7 && <Badge tone="warn">≥7 días — evaluar suspensión</Badge>}
          <ConfirmDeleteButton
            ariaLabel={`Eliminar ${a.drug || 'antibiótico'}`}
            confirmText={`¿Eliminar ${a.drug || 'este antibiótico'}?`}
            onConfirm={() => atb.remove.mutate(a.id)} />
        </div>
      ))}
      {stay.antibiotics.length === 0 && <p>Sin antibióticos registrados.</p>}
      <Button variant="secondary"
        onClick={() => atb.insert.mutate({ stay_id: stay.id, drug: '', day: 0 })}>
        + Agregar ATB
      </Button>
    </div>
  )
}
