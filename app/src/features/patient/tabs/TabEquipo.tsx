import { TextField } from '../../../design-system/Field'
import { useUpdateStay } from '../../../lib/supabase/useBoard'
import type { StayFull } from '../../../lib/supabase/types'

export function TabEquipo({ stay }: { stay: StayFull }) {
  const { mutate } = useUpdateStay()
  const upd = (patch: Partial<StayFull>) => mutate({ id: stay.id, patch })
  return (
    <div className="tabgrid">
      <TextField label="Enfermera" value={stay.enfermera} onChange={v => upd({ enfermera: v })} />
      <TextField label="TENS" value={stay.tens} onChange={v => upd({ tens: v })} />
      <TextField label="Kinesiólogo/a" value={stay.kine} onChange={v => upd({ kine: v })} />
    </div>
  )
}
