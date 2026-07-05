import { Badge } from '../../../design-system/Badge'
import { SelectField } from '../../../design-system/Field'
import { NUTRITION_TYPES } from '../../../lib/clinical/constants'
import { useUpsertNutrition } from '../../../lib/supabase/useBoard'
import type { StayFull } from '../../../lib/supabase/types'
import { AutoNumber, AutoText } from '../AutoFields'

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
      <AutoText label="Vía" value={n.via} onSave={v => upd({ via: v })} />
      <AutoNumber label="Calorías meta (kcal)" value={n.cal_meta} max={9999}
        onSave={v => upd({ cal_meta: v })} />
      <AutoNumber label="Calorías reales (kcal)" value={n.cal_real} max={9999}
        onSave={v => upd({ cal_real: v })} />
      <AutoNumber label="Días de nutrición" value={n.dias} onSave={v => upd({ dias: v })} />
      <div>
        {pct !== null && (
          <Badge tone={pct >= 80 ? 'ok' : pct >= 50 ? 'warn' : 'danger'}>
            Cobertura calórica {pct}%
          </Badge>
        )}
      </div>
      <div className="tabgrid__full">
        <AutoText label="Notas de nutrición" multiline value={n.notes}
          onSave={v => upd({ notes: v })} />
      </div>
    </div>
  )
}
