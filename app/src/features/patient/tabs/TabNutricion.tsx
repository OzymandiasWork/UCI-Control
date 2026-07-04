import { Badge } from '../../../design-system/Badge'
import { NumberField, SelectField, TextField } from '../../../design-system/Field'
import { NUTRITION_TYPES } from '../../../lib/clinical/constants'
import { useUpsertNutrition } from '../../../lib/supabase/useBoard'
import type { StayFull } from '../../../lib/supabase/types'

export function TabNutricion({ stay }: { stay: StayFull }) {
  const { mutate } = useUpsertNutrition()
  const n = stay.nutrition ?? {
    stay_id: stay.id, nutri_type: 'Ayuno', via: '', cal_meta: 0, cal_real: 0, dias: 0, notes: '',
  }
  const upd = (patch: Partial<typeof n>) => mutate({ ...n, ...patch, stay_id: stay.id })
  const pct = n.cal_meta > 0 ? Math.round((n.cal_real / n.cal_meta) * 100) : null

  return (
    <div className="tabgrid">
      <SelectField label="Tipo de nutrición" value={n.nutri_type}
        onChange={v => upd({ nutri_type: v })} options={NUTRITION_TYPES} />
      <TextField label="Vía" value={n.via} onChange={v => upd({ via: v })} />
      <NumberField label="Calorías meta (kcal)" value={n.cal_meta} max={9999}
        onChange={v => upd({ cal_meta: v })} />
      <NumberField label="Calorías reales (kcal)" value={n.cal_real} max={9999}
        onChange={v => upd({ cal_real: v })} />
      <NumberField label="Días de nutrición" value={n.dias} onChange={v => upd({ dias: v })} />
      <div>
        {pct !== null && (
          <Badge tone={pct >= 80 ? 'ok' : pct >= 50 ? 'warn' : 'danger'}>
            Cobertura calórica {pct}%
          </Badge>
        )}
      </div>
      <div className="tabgrid__full">
        <TextField label="Notas de nutrición" multiline value={n.notes}
          onChange={v => upd({ notes: v })} />
      </div>
    </div>
  )
}
