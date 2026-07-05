import { Button } from '../../../design-system/Button'
import { useChildRow } from '../../../lib/supabase/useBoard'
import type { StayFull } from '../../../lib/supabase/types'
import { AutoText } from '../AutoFields'

export function TabMetas({ stay }: { stay: StayFull }) {
  const goals = useChildRow('goals')
  const sorted = [...stay.goals].sort((a, b) => a.position - b.position)
  return (
    <div>
      <ul className="metas">
        {sorted.map((g, i) => (
          <li key={g.id} className="tabrow">
            <input type="checkbox" checked={g.done} id={`goal-${g.id}`}
              onChange={e => goals.update.mutate({ id: g.id, patch: { done: e.target.checked } })}
              aria-label={`Meta cumplida: ${g.text || 'sin texto'}`} />
            <AutoText label={`Meta ${i + 1}`} value={g.text}
              onSave={v => goals.update.mutate({ id: g.id, patch: { text: v } })} />
            <Button variant="secondary" aria-label={`Eliminar meta ${g.text || 'sin texto'}`}
              onClick={() => goals.remove.mutate(g.id)}>Eliminar</Button>
          </li>
        ))}
      </ul>
      <Button variant="secondary"
        onClick={() => goals.insert.mutate({ stay_id: stay.id, text: '', done: false, position: stay.goals.length })}>
        + Agregar meta del día
      </Button>
    </div>
  )
}
