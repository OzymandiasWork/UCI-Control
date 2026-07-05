import { useEffect, useRef, useState } from 'react'
import { Button } from '../../design-system/Button'
import { useAdmitStay, useDischargeStay } from '../../lib/supabase/useBoard'
import type { StayFull } from '../../lib/supabase/types'

export function IngresoEgreso({ boxNumber, stay }: { boxNumber: number; stay: StayFull | null }) {
  const admit = useAdmitStay()
  const discharge = useDischargeStay()
  const [confirming, setConfirming] = useState(false)
  const idleRef = useRef<HTMLButtonElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)

  // Gestión de foco (WCAG 2.4.3) + Escape para cancelar: mismo patrón que
  // ConfirmDeleteButton — egresar a un paciente es la acción más delicada
  // de la app, así que merece al menos la misma protección.
  useEffect(() => {
    if (confirming) cancelRef.current?.focus()
    else idleRef.current?.focus()
  }, [confirming])

  useEffect(() => {
    if (!confirming) return
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') setConfirming(false) }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [confirming])

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
        ? <Button ref={idleRef} variant="secondary" onClick={() => setConfirming(true)}>Egresar paciente…</Button>
        : (
          <div role="group" aria-label="Confirmar egreso">
            <span>¿Egresar al paciente del box {boxNumber}? Sus datos quedan archivados.</span>
            <Button variant="danger" onClick={() => { setConfirming(false); discharge.mutate(stay.id) }}
              disabled={discharge.isPending}>Confirmar egreso</Button>
            <Button ref={cancelRef} variant="secondary" onClick={() => setConfirming(false)}>Cancelar</Button>
          </div>
        )}
      {discharge.isError && <p role="alert">No se pudo egresar. Reintenta.</p>}
    </div>
  )
}
