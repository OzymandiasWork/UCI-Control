import { useState } from 'react'
import { Button } from '../../design-system/Button'
import { useAdmitStay, useDischargeStay } from '../../lib/supabase/useBoard'
import type { StayFull } from '../../lib/supabase/types'

export function IngresoEgreso({ boxNumber, stay }: { boxNumber: number; stay: StayFull | null }) {
  const admit = useAdmitStay()
  const discharge = useDischargeStay()
  const [confirming, setConfirming] = useState(false)

  if (!stay) {
    return (
      <div className="ingreso">
        <p>Cama libre.</p>
        <Button onClick={() => admit.mutate(boxNumber)} disabled={admit.isPending}>
          Ingresar paciente
        </Button>
        {admit.isError && <p role="alert">No se pudo ingresar. Reintenta.</p>}
      </div>
    )
  }
  return (
    <div className="ingreso">
      {!confirming
        ? <Button variant="secondary" onClick={() => setConfirming(true)}>Egresar paciente…</Button>
        : (
          <div role="group" aria-label="Confirmar egreso">
            <span>¿Egresar al paciente del box {boxNumber}? Sus datos quedan archivados.</span>
            <Button variant="danger" onClick={() => discharge.mutate(stay.id)}
              disabled={discharge.isPending}>Confirmar egreso</Button>
            <Button variant="secondary" onClick={() => setConfirming(false)}>Cancelar</Button>
          </div>
        )}
      {discharge.isError && <p role="alert">No se pudo egresar. Reintenta.</p>}
    </div>
  )
}
