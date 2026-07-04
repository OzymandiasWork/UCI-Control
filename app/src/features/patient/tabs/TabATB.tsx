import { Badge } from '../../../design-system/Badge'
import { Button } from '../../../design-system/Button'
import { NumberField, TextField } from '../../../design-system/Field'
import { useChildRow } from '../../../lib/supabase/useBoard'
import type { StayFull } from '../../../lib/supabase/types'

export function TabATB({ stay }: { stay: StayFull }) {
  const atb = useChildRow('antibiotics')
  return (
    <div>
      {stay.antibiotics.map(a => (
        <div className="tabrow" key={a.id}>
          <TextField label="Antibiótico" value={a.drug}
            onChange={v => atb.update.mutate({ id: a.id, patch: { drug: v } })} />
          <NumberField label="Día de tratamiento" value={a.day}
            onChange={v => atb.update.mutate({ id: a.id, patch: { day: v } })} />
          {a.day >= 7 && <Badge tone="warn">≥7 días — evaluar suspensión</Badge>}
          <Button variant="secondary" aria-label={`Eliminar ${a.drug || 'antibiótico'}`}
            onClick={() => atb.remove.mutate(a.id)}>Eliminar</Button>
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
