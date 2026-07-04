import { useId } from 'react'

interface BaseProps { label: string }

export function TextField({ label, value, onChange, multiline = false }:
  BaseProps & { value: string; onChange: (v: string) => void; multiline?: boolean }) {
  const id = useId()
  return (
    <div className="ds-field">
      <label htmlFor={id}>{label}</label>
      {multiline
        ? <textarea id={id} rows={3} value={value} onChange={e => onChange(e.target.value)} />
        : <input id={id} type="text" value={value} onChange={e => onChange(e.target.value)} />}
    </div>
  )
}

export function SelectField({ label, value, onChange, options }:
  BaseProps & { value: string; onChange: (v: string) => void; options: readonly string[] }) {
  const id = useId()
  return (
    <div className="ds-field">
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={e => onChange(e.target.value)}>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}

export function NumberField({ label, value, onChange, min = 0, max = 999 }:
  BaseProps & { value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  const id = useId()
  const clamp = (n: number) => Math.min(max, Math.max(min, n))
  return (
    <div className="ds-field">
      <label htmlFor={id}>{label}</label>
      <div className="ds-numfield">
        <button type="button" aria-label={`Disminuir ${label}`} onClick={() => onChange(clamp(value - 1))}>−</button>
        <input id={id} type="number" inputMode="numeric" value={value} min={min} max={max}
          onChange={e => onChange(clamp(Number(e.target.value) || 0))} />
        <button type="button" aria-label={`Aumentar ${label}`} onClick={() => onChange(clamp(value + 1))}>+</button>
      </div>
    </div>
  )
}
