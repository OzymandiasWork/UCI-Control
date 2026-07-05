// Botón de borrado con confirmación inline en dos pasos, siguiendo el mismo
// patrón de IngresoEgreso ("Egresar paciente…" → confirmar/cancelar).
// Evita borrados accidentales de datos clínicos con un solo clic (ATB,
// accesos, metas, gases, personal de turno) — sin depender de window.confirm.
import { useEffect, useState } from 'react'
import { Button } from './Button'

interface ConfirmDeleteButtonProps {
  /** Nombre accesible del botón inicial, ej. "Eliminar Pip/Tazo" */
  ariaLabel: string
  /** Texto de la pregunta de confirmación, ej. "¿Eliminar Pip/Tazo?" */
  confirmText: string
  onConfirm: () => void
  /** Contenido visible del botón inicial. Por defecto "Eliminar". */
  idleLabel?: string
  /** Clase CSS del botón inicial, para variantes compactas (ej. "agenda__del"). */
  idleClassName?: string
}

export function ConfirmDeleteButton({
  ariaLabel, confirmText, onConfirm, idleLabel = 'Eliminar', idleClassName,
}: ConfirmDeleteButtonProps) {
  const [confirming, setConfirming] = useState(false)

  // Listener global: el foco no queda dentro del grupo tras el clic
  // (el botón "Eliminar" se desmonta), así que Escape se escucha en document.
  useEffect(() => {
    if (!confirming) return
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') setConfirming(false) }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [confirming])

  if (!confirming) {
    return idleClassName ? (
      <button type="button" className={idleClassName} aria-label={ariaLabel}
        onClick={() => setConfirming(true)}>{idleLabel}</button>
    ) : (
      <Button variant="secondary" aria-label={ariaLabel} onClick={() => setConfirming(true)}>
        {idleLabel}
      </Button>
    )
  }

  return (
    <div role="group" aria-label={confirmText} className="confirm-delete">
      <span>{confirmText}</span>
      <Button variant="danger" onClick={() => { setConfirming(false); onConfirm() }}>
        Confirmar
      </Button>
      <Button variant="secondary" onClick={() => setConfirming(false)}>Cancelar</Button>
    </div>
  )
}
