import { Badge } from '../../../design-system/Badge'
import { Button } from '../../../design-system/Button'
import { NumberField, SelectField, TextField } from '../../../design-system/Field'
import { ACCESS_TYPES, ALERT_TYPES, PREVISIONES, RESIDENTES, VM_MODES, type AlertKey } from '../../../lib/clinical/constants'
import { useChildRow, useUpdateStay } from '../../../lib/supabase/useBoard'
import type { StayFull } from '../../../lib/supabase/types'

const ALERT_LABELS = Object.values(ALERT_TYPES).map(a => a.label)

export function TabClinico({ stay }: { stay: StayFull }) {
  const { mutate } = useUpdateStay()
  const upd = (patch: Partial<StayFull>) => mutate({ id: stay.id, patch })
  const accesses = useChildRow('accesses')

  return (
    <div className="tabgrid">
      <TextField label="Nombre del paciente" value={stay.patient_name}
        onChange={v => upd({ patient_name: v })} />
      <TextField label="N° de ficha" value={stay.record_number}
        onChange={v => upd({ record_number: v })} />
      <TextField label="Diagnóstico" value={stay.diagnosis}
        onChange={v => upd({ diagnosis: v })} />
      <SelectField label="Alerta" value={ALERT_TYPES[stay.alert].label}
        onChange={v => {
          const key = (Object.keys(ALERT_TYPES) as AlertKey[])
            .find(k => ALERT_TYPES[k].label === v)
          if (key) upd({ alert: key })
        }}
        options={ALERT_LABELS} />
      <SelectField label="Residente" value={stay.residente || RESIDENTES[0]}
        onChange={v => upd({ residente: v })} options={RESIDENTES} />
      <TextField label="Destino" value={stay.destination}
        onChange={v => upd({ destination: v })} />
      <NumberField label="Días hospitalización" value={stay.dias_hosp}
        onChange={v => upd({ dias_hosp: v })} />
      <NumberField label="Días VM" value={stay.dias_vm}
        onChange={v => upd({ dias_vm: v })} />
      <SelectField label="Modo VM" value={stay.vm_mode}
        onChange={v => upd({ vm_mode: v })} options={VM_MODES} />
      <SelectField label="RCP" value={stay.rcp}
        onChange={v => upd({ rcp: v })} options={['Sí', 'No']} />
      <TextField label="Alergias" value={stay.alergias}
        onChange={v => upd({ alergias: v })} />
      <SelectField label="Previsión" value={stay.prevision}
        onChange={v => upd({ prevision: v })} options={PREVISIONES} />
      <SelectField label="Consentimiento informado" value={stay.consentimiento ? 'Sí' : 'No'}
        onChange={v => upd({ consentimiento: v === 'Sí' })} options={['No', 'Sí']} />
      <TextField label="Balance meta" value={stay.balance_meta}
        onChange={v => upd({ balance_meta: v })} />
      <TextField label="Balance real" value={stay.balance_real}
        onChange={v => upd({ balance_real: v })} />
      <TextField label="Contacto familiar (nombre)" value={stay.contacto_nombre}
        onChange={v => upd({ contacto_nombre: v })} />
      <TextField label="Contacto familiar (teléfono)" value={stay.contacto_tel}
        onChange={v => upd({ contacto_tel: v })} />
      <TextField label="Último contacto" value={stay.ultimo_contacto}
        onChange={v => upd({ ultimo_contacto: v })} />
      <div className="tabgrid__full">
        <TextField label="Notas" multiline value={stay.notes}
          onChange={v => upd({ notes: v })} />
      </div>

      <section className="tabgrid__full" aria-labelledby="accesos-title">
        <h3 id="accesos-title">Accesos vasculares</h3>
        {stay.accesses.map(a => (
          <div className="tabrow" key={a.id}>
            <SelectField label="Tipo" value={a.type}
              onChange={v => accesses.update.mutate({ id: a.id, patch: { type: v } })}
              options={ACCESS_TYPES} />
            <NumberField label="Días" value={a.day}
              onChange={v => accesses.update.mutate({ id: a.id, patch: { day: v } })} />
            <Button variant="secondary" aria-label={`Eliminar acceso ${a.type}`}
              onClick={() => accesses.remove.mutate(a.id)}>Eliminar</Button>
          </div>
        ))}
        <Button variant="secondary"
          onClick={() => accesses.insert.mutate({ stay_id: stay.id, type: 'CVC', day: 0 })}>
          + Agregar acceso
        </Button>
        {stay.accesses.length === 0 && <p><Badge tone="muted">Sin accesos registrados</Badge></p>}
      </section>
    </div>
  )
}
