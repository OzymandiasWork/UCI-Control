# Tablero: expansión inline de box — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar la navegación a `/box/:boxNumber` (página `PatientPage.tsx`) por expansión inline del box dentro de la misma grilla del tablero, en modo acordeón, calcando el dashboard definitivo del Dr. Arteaga.

**Architecture:** `BoardPage.tsx` pasa a dueño de un único estado `expandedBoxNumber: number | null`. `BoxCard.tsx` deja de ser un `<Link>` y se vuelve un `<button>` con dos renders (fila compacta / fila compacta + panel expandido). El panel expandido es un componente nuevo, `ExpandedBox.tsx`, que reutiliza sin cambios los 10 `Tab*.tsx` existentes y el componente `Tabs`. La ruta `/box/:boxNumber` se conserva como deep-link vía un componente `BoxRedirect` que pasa el número de box por `location.state` a `BoardPage`.

**Tech Stack:** React 18, TypeScript, react-router-dom v6, Vitest + Testing Library, CSS con custom properties (`app/src/design-system/tokens.css`).

## Global Constraints

- No se toca el contenido interno de ningún `Tab*.tsx` existente (`TabClinico`, `TabVentilacion`, `TabEquipo`, `TabATB`, `TabNutricion`, `TabSofa`, `TabMetas`, `TabSugerencias`, `TabFuncional`, `TabEMR`).
- No se agrega ningún color hex nuevo — todo estilo usa variables de `app/src/design-system/tokens.css` ya existentes.
- Ningún ícono/texto de "guardar manual" (💾, "Último guardado") — decisión confirmada en el spec.
- `/box/:boxNumber` sigue siendo una URL válida (deep-link), no se elimina.
- Cada paso de test usa Testing Library (`@testing-library/react`) y Vitest, igual que el resto del repo — correr con `cd app && npx vitest run <archivo>`.
- Spec de referencia: `docs/superpowers/specs/2026-07-28-tablero-inline-expand-design.md`.

---

### Task 1: `ExpandedBox.tsx` — panel de detalle reutilizable, sin chrome de página

**Files:**
- Create: `app/src/features/patient/ExpandedBox.tsx`
- Create: `app/src/features/patient/ExpandedBox.test.tsx`
- Modify: `app/src/features/patient/patient.css`

**Interfaces:**
- Consumes: `StayFull` de `app/src/lib/supabase/types.ts`; `Tabs`/`TabDef` de `app/src/design-system/Tabs.tsx` (`Tabs({ tabs: TabDef[], label: string })`); `Badge` de `app/src/design-system/Badge.tsx` (`Badge({ tone: BadgeTone, children })`); `Button` de `app/src/design-system/Button.tsx`; `IngresoEgreso` de `./IngresoEgreso.tsx` (`IngresoEgreso({ boxNumber: number, stay: StayFull | null })`); `ALERT_TYPES` de `app/src/lib/clinical/constants.ts`; los 10 `Tab*.tsx` de `app/src/features/patient/tabs/*.tsx` (todos toman `{ stay: StayFull }`).
- Produces: `ExpandedBox({ stay, boxNumber, onClose }: { stay: StayFull | null; boxNumber: number; onClose: () => void })` — export nombrado, usado por `BoxCard.tsx` en la Task 2.

- [ ] **Step 1: Escribir el test que falla**

```tsx
// app/src/features/patient/ExpandedBox.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { ExpandedBox } from './ExpandedBox'
import { baseStay } from '../../test/fixtures'

test('box libre solo muestra IngresoEgreso, sin tabs', () => {
  render(<ExpandedBox stay={null} boxNumber={7} onClose={() => {}} />)
  expect(screen.getByText(/cama libre/i)).toBeInTheDocument()
  expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
})

test('box ocupado muestra los 10 tabs clínicos', () => {
  render(<ExpandedBox stay={baseStay({ patient_name: 'J. Pérez' })} boxNumber={5} onClose={() => {}} />)
  const tablist = screen.getByRole('tablist', { name: /módulos del paciente del box 5/i })
  expect(tablist).toBeInTheDocument()
  for (const label of ['Clínico', 'Ventilación', 'Equipo', 'ATB', 'Nutrición', 'SOFA', 'Metas', 'Sugerencias', 'Funcional', 'EMR']) {
    expect(screen.getByRole('tab', { name: label })).toBeInTheDocument()
  }
})

test('muestra la sección "Prevención de IAAS" colapsable, vacía por ahora', () => {
  render(<ExpandedBox stay={baseStay({ patient_name: 'J. Pérez' })} boxNumber={5} onClose={() => {}} />)
  expect(screen.getByText(/prevención de iaas/i)).toBeInTheDocument()
})

test('click en "Colapsar" llama onClose', async () => {
  const onClose = vi.fn()
  render(<ExpandedBox stay={baseStay({ patient_name: 'J. Pérez' })} boxNumber={5} onClose={onClose} />)
  await userEvent.click(screen.getByRole('button', { name: /colapsar/i }))
  expect(onClose).toHaveBeenCalledOnce()
})

test('no navega ni usa react-router (no requiere MemoryRouter)', () => {
  expect(() => render(<ExpandedBox stay={null} boxNumber={1} onClose={() => {}} />)).not.toThrow()
})
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `cd app && npx vitest run src/features/patient/ExpandedBox.test.tsx`
Expected: FAIL — `Cannot find module './ExpandedBox'`

- [ ] **Step 3: Crear `ExpandedBox.tsx`**

```tsx
// app/src/features/patient/ExpandedBox.tsx
import { Badge } from '../../design-system/Badge'
import { Button } from '../../design-system/Button'
import { Tabs } from '../../design-system/Tabs'
import { ALERT_TYPES } from '../../lib/clinical/constants'
import type { StayFull } from '../../lib/supabase/types'
import { IngresoEgreso } from './IngresoEgreso'
import { TabClinico } from './tabs/TabClinico'
import { TabVentilacion } from './tabs/TabVentilacion'
import { TabEquipo } from './tabs/TabEquipo'
import { TabATB } from './tabs/TabATB'
import { TabNutricion } from './tabs/TabNutricion'
import { TabSofa } from './tabs/TabSofa'
import { TabMetas } from './tabs/TabMetas'
import { TabSugerencias } from './tabs/TabSugerencias'
import { TabFuncional } from './tabs/TabFuncional'
import { TabEMR } from './tabs/TabEMR'

export function ExpandedBox({ stay, boxNumber, onClose }: {
  stay: StayFull | null; boxNumber: number; onClose: () => void
}) {
  return (
    <div className="expanded-box">
      {stay && (
        <div className="expanded-box__summary">
          <Badge tone={ALERT_TYPES[stay.alert].tone}>{ALERT_TYPES[stay.alert].label}</Badge>
        </div>
      )}

      <IngresoEgreso boxNumber={boxNumber} stay={stay} />

      {stay && (
        <>
          <Tabs
            label={`Módulos del paciente del box ${boxNumber}`}
            tabs={[
              { id: 'clinico', label: 'Clínico', content: <TabClinico stay={stay} /> },
              { id: 'ventilacion', label: 'Ventilación', content: <TabVentilacion stay={stay} /> },
              { id: 'equipo', label: 'Equipo', content: <TabEquipo stay={stay} /> },
              { id: 'atb', label: 'ATB', content: <TabATB stay={stay} /> },
              { id: 'nutricion', label: 'Nutrición', content: <TabNutricion stay={stay} /> },
              { id: 'sofa', label: 'SOFA', content: <TabSofa stay={stay} /> },
              { id: 'metas', label: 'Metas', content: <TabMetas stay={stay} /> },
              { id: 'sugerencias', label: 'Sugerencias', content: <TabSugerencias stay={stay} /> },
              { id: 'funcional', label: 'Funcional', content: <TabFuncional stay={stay} /> },
              { id: 'emr', label: 'EMR', content: <TabEMR stay={stay} /> },
            ]}
          />

          <details className="iaas-stub">
            <summary>🛡 Prevención de IAAS</summary>
            <p className="vent-hint">
              Disponible próximamente — este módulo se está construyendo por separado.
            </p>
          </details>

          <footer className="expanded-box__footer">
            <Button onClick={onClose}>Colapsar</Button>
            <p className="patient__hint">
              Tranquilo: cada cambio se guarda solo, al instante. Este botón simplemente
              colapsa la tarjeta.
            </p>
          </footer>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Agregar estilos nuevos a `patient.css`**

Agregar al final de `app/src/features/patient/patient.css`:

```css
/* ── Panel expandido inline (reemplaza la página PatientPage) ── */
.expanded-box { padding: var(--space-3) 0 0; }
.expanded-box__summary { margin-bottom: var(--space-3); }
.expanded-box__footer {
  margin-top: var(--space-5);
  display: flex; flex-direction: column; align-items: flex-start; gap: var(--space-2);
}
.iaas-stub {
  border: 1px solid var(--border); border-radius: var(--radius-sm);
  margin: var(--space-4) 0; padding: var(--space-2) var(--space-3); background: var(--surface);
}
.iaas-stub summary { cursor: pointer; font-weight: 600; min-height: var(--tap-min); display: flex; align-items: center; }
```

- [ ] **Step 5: Correr el test y verificar que pasa**

Run: `cd app && npx vitest run src/features/patient/ExpandedBox.test.tsx`
Expected: PASS (5 tests)

- [ ] **Step 6: Commit**

```bash
git add app/src/features/patient/ExpandedBox.tsx app/src/features/patient/ExpandedBox.test.tsx app/src/features/patient/patient.css
git commit -m "feat: agregar ExpandedBox, panel de detalle sin chrome de página"
```

---

### Task 2: `BoxCard.tsx` — fila compacta + integración de `ExpandedBox`

**Files:**
- Modify: `app/src/features/board/BoxCard.tsx`
- Modify: `app/src/features/board/BoxCard.test.tsx`
- Modify: `app/src/features/board/board.css`

**Interfaces:**
- Consumes: `ExpandedBox` de `../patient/ExpandedBox.tsx` (Task 1) — `ExpandedBox({ stay, boxNumber, onClose })`; `Badge` de `../../design-system/Badge.tsx`; `ALERT_TYPES` de `../../lib/clinical/constants.ts`.
- Produces: `BoxCard({ boxNumber, stay, expanded, onToggle }: { boxNumber: number; stay: StayFull | null; expanded: boolean; onToggle: () => void })` — export nombrado, usado por `BoardPage.tsx` en la Task 4. **Cambio de firma respecto a hoy**: se agregan `expanded`/`onToggle`, ya no usa `react-router-dom`.

- [ ] **Step 1: Escribir el test que falla**

Reemplazar el contenido completo de `app/src/features/board/BoxCard.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { BoxCard } from './BoxCard'
import type { StayFull } from '../../lib/supabase/types'
import { baseStay } from '../../test/fixtures'

const today = new Date().toISOString().slice(0, 10)

const stay = baseStay({
  box_number: 5, patient_name: 'J. Pérez', record_number: '12345',
  diagnosis: 'shock septico', alert: 'critical', residente: 'jimenez',
  dias_hosp: 3, dias_vm: 2, vm_mode: 'VCV',
  goals: [{ id: 'g1', stay_id: 's1', text: 'meta', done: false, position: 0 }],
  sofa_assessments: [{ id: 'a1', stay_id: 's1', assessed_on: today, resp: 3, coag: 1, liver: 0, cardio: 2, neuro: 0, renal: 1 }],
})

function renderCard(s: StayFull | null, box = 5, expanded = false, onToggle = () => {}) {
  return render(<BoxCard boxNumber={box} stay={s} expanded={expanded} onToggle={onToggle} />)
}

test('box ocupado colapsado muestra nombre, diagnóstico, residente y día — sin navegar', () => {
  renderCard(stay)
  expect(screen.getByText('J. Pérez')).toBeInTheDocument()
  expect(screen.getByText(/shock septico/i)).toBeInTheDocument()
  expect(screen.getByText(/jimenez/i)).toBeInTheDocument()
  expect(screen.getByText(/d3/i)).toBeInTheDocument()
  expect(screen.queryByRole('link')).not.toBeInTheDocument()
})

test('colapsado es un botón accesible que llama onToggle al hacer click', async () => {
  const onToggle = vi.fn()
  renderCard(stay, 5, false, onToggle)
  await userEvent.click(screen.getByRole('button', { name: /box 5/i }))
  expect(onToggle).toHaveBeenCalledOnce()
})

test('box libre colapsado se anuncia como cama libre', () => {
  renderCard(null, 7)
  expect(screen.getByText(/cama libre/i)).toBeInTheDocument()
})

test('expanded=true muestra el panel ExpandedBox con los tabs', () => {
  renderCard(stay, 5, true)
  expect(screen.getByRole('tablist')).toBeInTheDocument()
})

test('expanded=false NO monta el panel ExpandedBox', () => {
  renderCard(stay, 5, false)
  expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
})

test('con destino_tipo marcado, la fila colapsada muestra el badge del destino', () => {
  renderCard(baseStay({ destino_tipo: 'fallecido', patient_name: 'X' }))
  expect(screen.getByText('✝ Fallecido')).toBeInTheDocument()
})

test('sin destino_tipo no hay badge de destino', () => {
  renderCard(baseStay({ patient_name: 'X' }))
  expect(screen.queryByText(/Destino —/)).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `cd app && npx vitest run src/features/board/BoxCard.test.tsx`
Expected: FAIL — `BoxCard` todavía espera estar dentro de un `<MemoryRouter>` y usa `<Link>`; además no acepta `expanded`/`onToggle`.

- [ ] **Step 3: Reescribir `BoxCard.tsx`**

```tsx
// app/src/features/board/BoxCard.tsx
import { Badge } from '../../design-system/Badge'
import { ALERT_TYPES, DESTINO_TIPOS } from '../../lib/clinical/constants'
import type { StayFull } from '../../lib/supabase/types'
import { ExpandedBox } from '../patient/ExpandedBox'

export function BoxCard({ boxNumber, stay, expanded, onToggle }: {
  boxNumber: number; stay: StayFull | null; expanded: boolean; onToggle: () => void
}) {
  if (!stay) {
    return (
      <div className={`boxcard boxcard--free${expanded ? ' boxcard--expanded' : ''}`}>
        <button type="button" className="boxcard__row" onClick={onToggle}
          aria-label={`Box ${boxNumber}: cama libre`} aria-expanded={expanded}>
          <span className="boxcard__num">Box {boxNumber}</span>
          <span className="boxcard__free">Cama libre</span>
          <span className="boxcard__chevron" aria-hidden="true">{expanded ? '▲' : '▼'}</span>
        </button>
        {expanded && <ExpandedBox stay={null} boxNumber={boxNumber} onClose={onToggle} />}
      </div>
    )
  }

  const alert = ALERT_TYPES[stay.alert]
  return (
    <div className={`boxcard boxcard--${alert.tone}${expanded ? ' boxcard--expanded' : ''}`}>
      <button type="button" className="boxcard__row" onClick={onToggle}
        aria-label={`Box ${boxNumber}: ${stay.patient_name || 'sin nombre'}, ${alert.label}`}
        aria-expanded={expanded}>
        <span className="boxcard__num">Box {boxNumber}</span>
        <span className="boxcard__name">{stay.patient_name || '—'}</span>
        <span className="boxcard__dx">{stay.diagnosis || 'Sin diagnóstico'}</span>
        {stay.alert !== 'none' && <Badge tone={alert.tone}>{alert.label}</Badge>}
        {stay.destino_tipo !== '' && <Badge tone="muted">{DESTINO_TIPOS[stay.destino_tipo]}</Badge>}
        <span className="boxcard__meta-text">{stay.residente}</span>
        {stay.dias_hosp > 0 && <span className="boxcard__meta-text">d{stay.dias_hosp}</span>}
        <span className="boxcard__chevron" aria-hidden="true">{expanded ? '▲' : '▼'}</span>
      </button>
      {expanded && <ExpandedBox stay={stay} boxNumber={boxNumber} onClose={onToggle} />}
    </div>
  )
}
```

- [ ] **Step 4: Reescribir los estilos de `.boxcard` en `board.css`**

Reemplazar el bloque completo desde `.boxcard {` hasta el final de las variantes `.boxcard--free` (líneas 23–49 de `app/src/features/board/board.css`) por:

```css
.boxcard {
  border: 1px solid var(--border); border-left: 3px solid var(--border-strong);
  border-radius: var(--radius-sm); background: var(--surface);
}
.boxcard--expanded { grid-column: 1 / -1; }
.boxcard__row {
  display: flex; align-items: center; gap: var(--space-2); width: 100%;
  min-height: var(--tap-min); padding: var(--space-1) var(--space-2);
  background: none; border: none; color: inherit; text-align: left;
  font-size: 0.85rem; cursor: pointer;
}
.boxcard--danger  { border-left-color: var(--danger-border); }
.boxcard--warn    { border-left-color: var(--warn-border); }
.boxcard--ok      { border-left-color: var(--ok-border); }
.boxcard--eol     { border-left-color: var(--eol-border); }
.boxcard--proc    { border-left-color: var(--proc-border); }
.boxcard--trial   { border-left-color: var(--trial-border); }
.boxcard--free .boxcard__row { color: var(--ink-muted); }
.boxcard__num { font-weight: 700; color: var(--ink-secondary); flex-shrink: 0; }
.boxcard__name { font-weight: 600; flex-shrink: 0; }
.boxcard__dx { color: var(--ink-secondary); flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.boxcard__meta-text { color: var(--ink-secondary); flex-shrink: 0; }
.boxcard__free { flex: 1; }
.boxcard__chevron { flex-shrink: 0; color: var(--ink-muted); }
.boxcard > .expanded-box { padding: 0 var(--space-3) var(--space-3); }
```

Esto retira `min-height: 132px`, `box-shadow`, la animación `pulso-critico` y el `@keyframes pulso-critico` (ya no se usan — se puede borrar el bloque `@keyframes pulso-critico { ... }` completo, líneas 33–43 del archivo original).

- [ ] **Step 5: Correr el test y verificar que pasa**

Run: `cd app && npx vitest run src/features/board/BoxCard.test.tsx`
Expected: PASS (7 tests)

- [ ] **Step 6: Commit**

```bash
git add app/src/features/board/BoxCard.tsx app/src/features/board/BoxCard.test.tsx app/src/features/board/board.css
git commit -m "feat: BoxCard se expande inline en vez de navegar a una página"
```

---

### Task 3: `BoardPage.tsx` — estado de expansión, acordeón, deep-link, filtros

**Files:**
- Modify: `app/src/features/board/BoardPage.tsx`
- Create: `app/src/features/board/BoardPage.test.tsx`

**Interfaces:**
- Consumes: `BoxCard` de `./BoxCard.tsx` (Task 2) — `BoxCard({ boxNumber, stay, expanded, onToggle })`; `useLocation` de `react-router-dom`.
- Produces: ninguna nueva (componente hoja de ruta), pero fija el contrato de `location.state.expandBox: number` que `BoxRedirect` (Task 4) deberá enviar.

- [ ] **Step 1: Escribir el test que falla**

```tsx
// app/src/features/board/BoardPage.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import { BoardPage } from './BoardPage'
import { baseStay } from '../../test/fixtures'

const stays = [
  baseStay({ id: 's4', box_number: 4, patient_name: 'Paciente Cuatro', residente: 'jimenez' }),
  baseStay({ id: 's6', box_number: 6, patient_name: 'Paciente Seis', residente: 'saenz' }),
]

vi.mock('../../lib/supabase/useBoard', () => ({
  useBoard: () => ({ data: stays, isLoading: false, isError: false, refetch: vi.fn() }),
}))
vi.mock('../../lib/supabase/client', () => ({
  supabase: { auth: { signOut: vi.fn() } },
}))
vi.mock('./animations', () => ({ animateGridEntrance: vi.fn() }))

function renderBoard(initialEntries = ['/']) {
  return render(<MemoryRouter initialEntries={initialEntries}><BoardPage /></MemoryRouter>)
}

test('ningún box expandido al cargar sin location.state', () => {
  renderBoard()
  expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
})

test('expandir el box 4 y luego el box 6 colapsa el 4 (acordeón)', async () => {
  renderBoard()
  await userEvent.click(screen.getByRole('button', { name: /box 4:/i }))
  expect(screen.getByRole('tablist', { name: /box 4/i })).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: /box 6:/i }))
  expect(screen.queryByRole('tablist', { name: /box 4/i })).not.toBeInTheDocument()
  expect(screen.getByRole('tablist', { name: /box 6/i })).toBeInTheDocument()
})

test('click de nuevo en el mismo box lo colapsa', async () => {
  renderBoard()
  await userEvent.click(screen.getByRole('button', { name: /box 4:/i }))
  expect(screen.getByRole('tablist')).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: /box 4:/i }))
  expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
})

test('con location.state.expandBox, el tablero carga con ese box ya expandido', () => {
  renderBoard([{ pathname: '/', state: { expandBox: 6 } }])
  expect(screen.getByRole('tablist', { name: /box 6/i })).toBeInTheDocument()
})

test('filtrar por residente que excluye el box expandido lo colapsa automáticamente', async () => {
  renderBoard()
  await userEvent.click(screen.getByRole('button', { name: /box 4:/i }))
  expect(screen.getByRole('tablist')).toBeInTheDocument()
  await userEvent.selectOptions(screen.getByLabelText(/filtrar por residente/i), 'saenz')
  expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `cd app && npx vitest run src/features/board/BoardPage.test.tsx`
Expected: FAIL — `BoxCard` todavía requiere `<MemoryRouter>` propio / no acepta `expanded`/`onToggle` desde `BoardPage`, y `BoardPage` no lee `location.state`.

- [ ] **Step 3: Modificar `BoardPage.tsx`**

Cambiar los imports (agregar `useLocation`, quitar el uso de `Link` solo si ya no se usa en otro lado — `Link` se sigue usando para `/turno` y `/ejecutivo`, así que se mantiene) y agregar el estado de expansión:

```tsx
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { SelectField, TextField } from '../../design-system/Field'
import { ThemeToggle } from '../../design-system/ThemeToggle'
import { ALERT_TYPES, BOX_COUNT, RESIDENTES } from '../../lib/clinical/constants'
import { supabase } from '../../lib/supabase/client'
import { useBoard } from '../../lib/supabase/useBoard'
import { AgendaPanel } from './AgendaPanel'
import { animateGridEntrance } from './animations'
import { BoxCard } from './BoxCard'
import './board.css'

const ALERT_FILTERS = ['Todas', ...Object.values(ALERT_TYPES).map(a => a.label)]
const RESIDENTE_FILTERS = ['Todos', ...RESIDENTES]

export function BoardPage() {
  const { data: stays = [], isLoading, isError, refetch } = useBoard()
  const location = useLocation()
  const initialExpand = (location.state as { expandBox?: number } | null)?.expandBox ?? null
  const [expandedBoxNumber, setExpandedBoxNumber] = useState<number | null>(initialExpand)
  const [alertFilter, setAlertFilter] = useState('Todas')
  const [residenteFilter, setResidenteFilter] = useState('Todos')
  const [search, setSearch] = useState('')
  const gridRef = useRef<HTMLUListElement>(null)

  useEffect(() => {
    if (!isLoading && gridRef.current) return animateGridEntrance(gridRef.current)
  }, [isLoading])

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

  useEffect(() => {
    if (expandedBoxNumber === null) return
    if (!visible.some(({ n }) => n === expandedBoxNumber)) setExpandedBoxNumber(null)
  }, [visible, expandedBoxNumber])

  return (
    <div className="board">
      <header className="board__header">
        <h1>UCI Torre Valech</h1>
        <nav aria-label="Principal">
          <Link to="/turno">Turno</Link>
          <Link to="/ejecutivo">Resumen ejecutivo</Link>
          <ThemeToggle />
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
          <ul className="board__grid" ref={gridRef}>
            {visible.map(({ n, stay }) => (
              <li key={n}>
                <BoxCard boxNumber={n} stay={stay} expanded={expandedBoxNumber === n}
                  onToggle={() => setExpandedBoxNumber(cur => cur === n ? null : n)} />
              </li>
            ))}
          </ul>
        </main>
        <AgendaPanel />
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `cd app && npx vitest run src/features/board/BoardPage.test.tsx`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add app/src/features/board/BoardPage.tsx app/src/features/board/BoardPage.test.tsx
git commit -m "feat: BoardPage controla el acordeón de expansión y el deep-link"
```

---

### Task 4: `App.tsx` — `BoxRedirect` reemplaza `PatientPage` como ruta

**Files:**
- Modify: `app/src/App.tsx`
- Delete: `app/src/features/patient/PatientPage.tsx`

**Interfaces:**
- Consumes: `useParams`, `Navigate` de `react-router-dom`.
- Produces: ninguna (componente terminal de ruta).

- [ ] **Step 1: Leer `App.tsx` actual para confirmar el bloque exacto a reemplazar**

Run: `cd app && grep -n "PatientPage\|box/:boxNumber" src/App.tsx`
Expected: muestra el import de `PatientPage` y la línea `<Route path="/box/:boxNumber" element={<Protected><PatientPage /></Protected>} />`.

- [ ] **Step 2: Reemplazar el import y la ruta en `App.tsx`**

Quitar `import { PatientPage } from './features/patient/PatientPage'` y agregar, junto a los demás imports de `react-router-dom` ya existentes (`BrowserRouter, Navigate, Route, Routes`), `useParams`:

```tsx
import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom'
```

Agregar el componente `BoxRedirect` (junto a `LoginRoute`, antes del componente `App`/`default export`):

```tsx
function BoxRedirect() {
  const { boxNumber } = useParams()
  return <Navigate to="/" replace state={{ expandBox: Number(boxNumber) }} />
}
```

Reemplazar:

```tsx
<Route path="/box/:boxNumber" element={<Protected><PatientPage /></Protected>} />
```

por:

```tsx
<Route path="/box/:boxNumber" element={<Protected><BoxRedirect /></Protected>} />
```

- [ ] **Step 3: Borrar `PatientPage.tsx`**

Run: `cd app && rm src/features/patient/PatientPage.tsx`

- [ ] **Step 4: Actualizar `app/src/a11y/axe.test.tsx`**

Hacer esto **antes** de correr `tsc` (Step 5): `BoxCard` ya requiere `expanded`/`onToggle` desde
la Task 2, así que las llamadas viejas en este archivo ya no tipan. Reemplazar el archivo
completo:

```tsx
import { render } from '@testing-library/react'
import { axe } from 'vitest-axe'
import * as matchers from 'vitest-axe/matchers'
import { expect, test, vi } from 'vitest'

expect.extend(matchers)

vi.mock('../lib/supabase/client', () => ({
  supabase: { auth: { signInWithPassword: vi.fn() } },
}))

import { LoginPage } from '../features/auth/LoginPage'
import { BoxCard } from '../features/board/BoxCard'
import { baseStay } from '../test/fixtures'

const stay = baseStay({
  box_number: 3, patient_name: 'J. Pérez', diagnosis: 'shock septico',
  alert: 'critical', dias_hosp: 1, dias_vm: 1, vm_mode: 'VCV',
})

test('LoginPage sin violaciones axe', async () => {
  const { container } = render(<LoginPage />)
  expect(await axe(container)).toHaveNoViolations()
})

test('BoxCard ocupado sin violaciones axe', async () => {
  const { container } = render(
    <BoxCard boxNumber={3} stay={stay} expanded={false} onToggle={() => {}} />,
  )
  expect(await axe(container)).toHaveNoViolations()
})

test('BoxCard libre sin violaciones axe', async () => {
  const { container } = render(
    <BoxCard boxNumber={7} stay={null} expanded={false} onToggle={() => {}} />,
  )
  expect(await axe(container)).toHaveNoViolations()
})

test('BoxCard expandido sin violaciones axe', async () => {
  const { container } = render(
    <BoxCard boxNumber={3} stay={stay} expanded={true} onToggle={() => {}} />,
  )
  expect(await axe(container)).toHaveNoViolations()
})
```

- [ ] **Step 5: Verificar que el build de tipos no tiene referencias rotas**

Run: `cd app && npx tsc --noEmit`
Expected: sin errores (ninguna otra parte del código importa `PatientPage`; `axe.test.tsx` ya
actualizado en el Step 4 tipa correctamente contra el nuevo `BoxCard`).

- [ ] **Step 6: Correr toda la suite de tests**

Run: `cd app && npx vitest run`
Expected: todos los tests pasan (0 fallos).

- [ ] **Step 7: Commit**

```bash
git add app/src/App.tsx app/src/a11y/axe.test.tsx
git rm app/src/features/patient/PatientPage.tsx
git commit -m "feat: /box/:boxNumber redirige al tablero con el box expandido"
```

---

### Task 5: Verificación final, build y deploy a producción

**Files:** ninguno nuevo — solo comandos de verificación y deploy.

- [ ] **Step 1: Correr toda la suite de tests**

Run: `cd app && npx vitest run`
Expected: todos los tests pasan (0 fallos).

- [ ] **Step 2: Build de producción**

Run: `cd app && npm run build`
Expected: `tsc --noEmit` sin errores, `vite build` termina con `✓ built in`.

- [ ] **Step 3: Verificación visual en navegador (dev server)**

Levantar el dev server (`npm --prefix app run dev` o `preview_start` con la config `uci-dev` de `.claude/launch.json`), loguearse, y confirmar en el tablero:
- Los boxes se ven como filas compactas de una línea.
- Click en un box lo expande inline (sin cambiar la URL); click en otro box colapsa el primero.
- Click en "Colapsar" (footer del panel expandido) lo colapsa.
- Navegar directo a `/box/6` abre el tablero con el box 6 ya expandido y la URL vuelve a `/`.
- No quedan íconos 💾 ni texto "Último guardado" en ningún lado.

- [ ] **Step 4: Deploy a producción**

Run: `cd app && npx vercel --prod --yes`
Expected: deploy `READY`, alias a `www.ucicontrol.cl` actualizado.

- [ ] **Step 5: Verificación en producción**

Repetir los chequeos del Step 3 contra `https://www.ucicontrol.cl` (login real).

- [ ] **Step 6: Commit final si hubo ajustes durante la verificación**

Si el Step 3/5 encontró algo que corregir, commitear esos ajustes puntuales antes de cerrar la tarea.
