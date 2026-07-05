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
      <h2>Antibióticos sugeridos</h2>
      <p>{s.atb}</p>
      <h2>Metas terapéuticas</h2>
      <ul>{s.goals.map(g => <li key={g}>{g}</li>)}</ul>
      <h2>Monitorización</h2>
      <ul>{s.monitor.map(m => <li key={m}>{m}</li>)}</ul>
      <p className="sugerencias-disclaimer">
        Material de apoyo — no reemplaza el juicio clínico del equipo tratante.
      </p>
    </div>
  )
}
