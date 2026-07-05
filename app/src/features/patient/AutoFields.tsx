// Campos con guardado automático SEGURO: buffer local + debounce + flush al salir.
// Corrigen la carrera "una mutación por tecla" que revertía texto y perdía
// caracteres con latencia alta (celular): mientras el campo está sucio o
// enfocado, los ecos del servidor no pisan lo que el usuario escribe.
import { useEffect, useRef, useState } from 'react'
import { NumberField, TextField } from '../../design-system/Field'

const DEBOUNCE_MS = 600

function useDraft<T>(server: T, onSave: (v: T) => void) {
  const [draft, setDraft] = useState<T>(server)
  const dirty = useRef(false)
  const focused = useRef(false)
  const timer = useRef<number | undefined>(undefined)
  const latest = useRef<T>(server)
  const saveRef = useRef(onSave)
  saveRef.current = onSave

  // Sincronizar desde el servidor SOLO si el usuario no está editando
  useEffect(() => {
    if (!dirty.current && !focused.current) {
      setDraft(server)
      latest.current = server
    }
  }, [server])

  const flush = () => {
    window.clearTimeout(timer.current)
    if (dirty.current) {
      dirty.current = false
      saveRef.current(latest.current)
    }
  }

  // Al desmontar (cambio de pestaña/página) se guarda lo pendiente
  useEffect(() => flush, [])

  const change = (v: T) => {
    dirty.current = true
    latest.current = v
    setDraft(v)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(flush, DEBOUNCE_MS)
  }

  return {
    draft,
    change,
    onFocus: () => { focused.current = true },
    onBlur: () => { focused.current = false; flush() },
  }
}

interface AutoTextProps {
  label: string
  value: string
  onSave: (v: string) => void
  multiline?: boolean
}

export function AutoText({ label, value, onSave, multiline }: AutoTextProps) {
  const d = useDraft(value, onSave)
  return (
    <div onFocus={d.onFocus} onBlur={d.onBlur}>
      <TextField label={label} value={d.draft} onChange={d.change} multiline={multiline} />
    </div>
  )
}

interface AutoNumberProps {
  label: string
  value: number
  onSave: (v: number) => void
  min?: number
  max?: number
}

export function AutoNumber({ label, value, onSave, min, max }: AutoNumberProps) {
  const d = useDraft(value, onSave)
  return (
    <div onFocus={d.onFocus} onBlur={d.onBlur}>
      <NumberField label={label} value={d.draft} onChange={d.change} min={min} max={max} />
    </div>
  )
}
