import { useState } from 'react'
import { Button } from '../../design-system/Button'
import { ConfirmDeleteButton } from '../../design-system/ConfirmDeleteButton'
import { TextField } from '../../design-system/Field'
import { useEventMutations, useEvents } from '../../lib/supabase/useEvents'

export function AgendaPanel() {
  const { data: events = [] } = useEvents()
  const { add, remove } = useEventMutations()
  const [time, setTime] = useState('')
  const [label, setLabel] = useState('')

  return (
    <section className="agenda" aria-labelledby="agenda-title">
      <h2 id="agenda-title">Agenda del día</h2>
      <ul className="agenda__list">
        {events.map(e => (
          <li key={e.id}>
            <span className="agenda__time">{e.time}</span>
            <span className="agenda__label">{e.label}</span>
            <ConfirmDeleteButton
              ariaLabel={`Eliminar evento ${e.label}`}
              confirmText={`¿Eliminar "${e.label}"?`}
              idleLabel="✕"
              idleClassName="agenda__del"
              onConfirm={() => remove.mutate(e.id)} />
          </li>
        ))}
        {events.length === 0 && <li className="agenda__empty">Sin eventos hoy</li>}
      </ul>
      <form className="agenda__form" onSubmit={e => {
        e.preventDefault()
        if (!label.trim()) return
        add.mutate({ time, label })
        setTime('')
        setLabel('')
      }}>
        <TextField label="Hora" value={time} onChange={setTime} />
        <TextField label="Evento" value={label} onChange={setLabel} />
        <Button type="submit" variant="secondary">Agregar</Button>
      </form>
    </section>
  )
}
