import { Badge } from '../../../design-system/Badge'
import { getSuggestion } from '../../../lib/clinical/suggestions'
import type { StayFull } from '../../../lib/supabase/types'

export function TabSugerencias({ stay }: { stay: StayFull }) {
  const s = getSuggestion(stay.diagnosis)
  if (!s) {
    return (
      <p>
        Sin sugerencias para el diagnóstico actual. Las sugerencias se activan al ingresar un
        diagnóstico reconocido (ej.: "shock séptico", "NAC", "politrauma").
      </p>
    )
  }
  return (
    <div>
      <p><Badge tone="proc">Guía: {s.matched}</Badge></p>
      <h3>Antibióticos sugeridos</h3>
      <p>{s.atb}</p>
      <h3>Metas terapéuticas</h3>
      <ul>{s.goals.map(g => <li key={g}>{g}</li>)}</ul>
      <h3>Monitorización</h3>
      <ul>{s.monitor.map(m => <li key={m}>{m}</li>)}</ul>
      <p className="sugerencias-disclaimer">
        Material de apoyo — no reemplaza el juicio clínico del equipo tratante.
      </p>
    </div>
  )
}
