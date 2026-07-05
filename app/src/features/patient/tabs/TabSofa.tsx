import { Badge } from '../../../design-system/Badge'
import { SOFA_DOMAINS, calcSofa, sofaRisk, type SofaScores } from '../../../lib/clinical/sofa'
import { useUpsertSofaToday } from '../../../lib/supabase/useBoard'
import type { StayFull } from '../../../lib/supabase/types'

export function TabSofa({ stay }: { stay: StayFull }) {
  const { mutate } = useUpsertSofaToday()
  const today = new Date().toISOString().slice(0, 10)
  const a = stay.sofa_assessments.find(x => x.assessed_on === today)
  const scores: SofaScores = {
    resp: a?.resp ?? null, coag: a?.coag ?? null, liver: a?.liver ?? null,
    cardio: a?.cardio ?? null, neuro: a?.neuro ?? null, renal: a?.renal ?? null,
  }
  const total = calcSofa(scores)
  const risk = sofaRisk(total)

  // Solo se envía el dominio que cambió (no todo `scores`): si el usuario marca
  // dos dominios seguidos antes de que el primer guardado vuelva del servidor,
  // un upsert de fila completa pisaría el dominio recién guardado con el valor
  // viejo capturado en este closure.
  function setScore(key: keyof SofaScores, score: number) {
    mutate({ stay_id: stay.id, [key]: score })
  }

  return (
    <div>
      <p>
        <strong>SOFA total: {total ?? '—'}</strong>{' '}
        <Badge tone={risk.tone}>{risk.risk}</Badge>
      </p>
      {SOFA_DOMAINS.map(d => (
        <fieldset key={d.key} className="sofa-domain">
          <legend>{d.full} <span className="sofa-hint">({d.hint})</span></legend>
          <div className="tabrow" role="radiogroup" aria-label={d.full}>
            {d.options.map(o => (
              <label key={o.score} className="sofa-option">
                <input type="radio" name={`sofa-${stay.id}-${d.key}`}
                  checked={scores[d.key] === o.score}
                  onChange={() => setScore(d.key, o.score)}
                  aria-label={`${d.full}: ${o.label} (${o.score} puntos)`} />
                <span>{o.score} · {o.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ))}
    </div>
  )
}
