import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { SelectField, TextField } from '../../design-system/Field'
import { ALERT_TYPES, BOX_COUNT, RESIDENTES } from '../../lib/clinical/constants'
import { supabase } from '../../lib/supabase/client'
import { useBoard } from '../../lib/supabase/useBoard'
import { AgendaPanel } from './AgendaPanel'
import { BoxCard } from './BoxCard'
import './board.css'

const ALERT_FILTERS = ['Todas', ...Object.values(ALERT_TYPES).map(a => a.label)]
const RESIDENTE_FILTERS = ['Todos', ...RESIDENTES]

export function BoardPage() {
  const { data: stays = [], isLoading, isError, refetch } = useBoard()
  const [alertFilter, setAlertFilter] = useState('Todas')
  const [residenteFilter, setResidenteFilter] = useState('Todos')
  const [search, setSearch] = useState('')

  const byBox = useMemo(() => {
    const m = new Map(stays.map(s => [s.box_number, s]))
    return Array.from({ length: BOX_COUNT }, (_, i) => ({ n: i + 1, stay: m.get(i + 1) ?? null }))
  }, [stays])

  const visible = byBox.filter(({ stay }) => {
    if (alertFilter !== 'Todas') {
      if (!stay || ALERT_TYPES[stay.alert].label !== alertFilter) return false
    }
    if (residenteFilter !== 'Todos') {
      if (!stay || stay.residente !== residenteFilter) return false
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      if (!stay) return false
      return stay.patient_name.toLowerCase().includes(q)
        || stay.diagnosis.toLowerCase().includes(q)
        || stay.residente.toLowerCase().includes(q)
    }
    return true
  })

  return (
    <div className="board">
      <header className="board__header">
        <h1>UCI Torre Valech</h1>
        <nav aria-label="Principal">
          <Link to="/ejecutivo">Resumen ejecutivo</Link>
          <button type="button" className="board__logout" onClick={() => supabase.auth.signOut()}>
            Cerrar sesión
          </button>
        </nav>
      </header>

      <div className="board__filters">
        <TextField label="Buscar paciente, diagnóstico o residente" value={search} onChange={setSearch} />
        <SelectField label="Filtrar por alerta" value={alertFilter}
          onChange={setAlertFilter} options={ALERT_FILTERS} />
        <SelectField label="Filtrar por residente" value={residenteFilter}
          onChange={setResidenteFilter} options={RESIDENTE_FILTERS} />
      </div>

      <div className="board__layout">
        <main aria-label="Tablero de boxes">
          {isLoading && <p role="status">Cargando tablero…</p>}
          {isError && (
            <p role="alert">
              No se pudo cargar el tablero.{' '}
              <button type="button" onClick={() => refetch()}>Reintentar</button>
            </p>
          )}
          <ul className="board__grid">
            {visible.map(({ n, stay }) => (
              <li key={n}><BoxCard boxNumber={n} stay={stay} /></li>
            ))}
          </ul>
        </main>
        <AgendaPanel />
      </div>
    </div>
  )
}
