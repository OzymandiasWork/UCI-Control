import { useUpdateStay } from '../../../lib/supabase/useBoard'
import type { StayFull } from '../../../lib/supabase/types'
import { AutoText } from '../AutoFields'

export function TabEquipo({ stay }: { stay: StayFull }) {
  const { mutate } = useUpdateStay()
  const upd = (patch: Partial<StayFull>) => mutate({ id: stay.id, patch })
  return (
    <div className="tabgrid">
      <AutoText label="Enfermera" value={stay.enfermera} onSave={v => upd({ enfermera: v })} />
      <AutoText label="TENS" value={stay.tens} onSave={v => upd({ tens: v })} />
      <AutoText label="Kinesiólogo/a" value={stay.kine} onSave={v => upd({ kine: v })} />
    </div>
  )
}
