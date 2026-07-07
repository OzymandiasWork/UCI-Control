# Cambios Arteaga A — Destino estructurado + ajustes de ficha — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Destino estructurado con catálogo (incl. Traslado y Fallecido) conservando el texto libre real como detalle, campo comorbilidades, sección "Otros accesos" (Foley), TQT en modo VM, badge de destino en el tablero y KPIs de traslado/fallecidos en el Ejecutivo.

**Architecture:** Migración 005 agrega 2 columnas con default a `stays` (cero pérdida de datos: el texto libre `destination` no se toca). Catálogo `DESTINO_TIPOS` sigue el patrón clave-en-BD/label-en-UI de `ALERT_TYPES`. Los accesos no cambian de tabla: la UI agrupa por pertenencia del `type` a `ACCESS_TYPES` vs. `OTHER_ACCESS_TYPES`. Antes de tocar tipos, se extrae la fixture `StayFull` duplicada en 8 archivos de test a una factory compartida (deuda señalada por la revisión final de la rama anterior) para que este y futuros cambios de esquema cuesten una línea.

**Tech Stack:** React 18 + TypeScript, Supabase Postgres (migración vía MCP `supabase-uci-control`), Vitest + React Testing Library.

**Spec de referencia:** [`docs/superpowers/specs/2026-07-06-arteaga-a-destino-ajustes-design.md`](../specs/2026-07-06-arteaga-a-destino-ajustes-design.md)

---

## Task 1: Factory compartida de fixtures `StayFull` (refactor puro, sin cambio de comportamiento)

Hoy 8 archivos de test duplican el mismo literal `StayFull` completo; cada columna nueva en `stays` obliga a tocar los 8 (pasó en las últimas 2 features). Este task lo paga una vez.

**Files:**
- Create: `app/src/test/fixtures.ts`
- Modify: `app/src/features/executive/kpis.test.ts`
- Modify: `app/src/features/patient/tabs/TabVentilacion.test.tsx`
- Modify: `app/src/features/patient/tabs/TabNutricion.test.tsx`
- Modify: `app/src/features/patient/tabs/TabSofa.test.tsx`
- Modify: `app/src/features/patient/tabs/TabFuncional.test.tsx`
- Modify: `app/src/features/patient/tabs/TabEMR.test.tsx`
- Modify: `app/src/a11y/axe.test.tsx`
- Modify: `app/src/features/board/BoxCard.test.tsx`

- [ ] **Step 1: Crear la factory**

`app/src/test/fixtures.ts` (vitest no lo recoge como test: no matchea `*.test.*`):

```ts
import type { StayFull } from '../lib/supabase/types'

/**
 * Fixture base compartida para tests que construyen un StayFull completo.
 * Cuando se agregue una columna nueva a stays, actualizar SOLO este archivo
 * (antes había 8 copias de este literal y cada columna nueva las rompía todas).
 */
export function baseStay(over: Partial<StayFull> = {}): StayFull {
  return {
    id: 's1', box_number: 1, active: true, patient_name: '', record_number: '',
    diagnosis: '', alert: 'none', residente: '', destination: '', dias_hosp: 0,
    dias_vm: 0, vm_mode: '—', rcp: 'Sí', alergias: '', prevision: 'Fonasa A',
    consentimiento: false, balance_meta: '', balance_real: '', contacto_nombre: '',
    contacto_tel: '', ultimo_contacto: '', notes: '', enfermera: '', tens: '', kine: '',
    updated_at: '', goals: [], antibiotics: [], accesses: [], sofa_assessments: [],
    vent_settings: null, blood_gases: [], nutrition: null, mrc_assessments: [], emr_sessions: [],
    ...over,
  }
}
```

- [ ] **Step 2: Migrar los 5 tests de pestañas**

En `TabVentilacion.test.tsx`, `TabNutricion.test.tsx`, `TabSofa.test.tsx`, `TabFuncional.test.tsx`, `TabEMR.test.tsx`: borrar el literal local `const base = { ... } satisfies StayFull` completo y reemplazarlo por:

```ts
import { baseStay } from '../../../test/fixtures'

const base = baseStay()
```

Antes de borrar cada literal, compararlo campo a campo contra la factory: si algún archivo usa un valor distinto al default (p. ej. otro `box_number`), conservarlo como override: `baseStay({ box_number: 3 })`. El import de `type { StayFull }` se conserva solo donde el archivo lo siga usando (TabFuncional/TabEMR lo usan para `stayWithHistory`).

- [ ] **Step 3: Migrar `kpis.test.ts`**

Reemplazar el cuerpo del helper local (conservando el nombre `stay` para no tocar los call sites):

```ts
import { baseStay } from '../../test/fixtures'

function stay(over: Partial<StayFull>): StayFull {
  return baseStay(over)
}
```

(El literal viejo usaba `id` aleatorio y `patient_name: 'X'` — ningún test de este archivo depende de esos valores; `boardKpis` no lee ninguno de los dos.)

- [ ] **Step 4: Migrar `axe.test.tsx` y `BoxCard.test.tsx`**

En `app/src/features/board/BoxCard.test.tsx`, reemplazar el literal `const stay = { ... } satisfies StayFull` (líneas 8-20) por (conservando el `const today` de la línea 6, que la fixture de SOFA sigue usando, y el `import type { StayFull }`, que `renderCard` sigue usando):

```ts
import { baseStay } from '../../test/fixtures'

const stay = baseStay({
  box_number: 5, patient_name: 'J. Pérez', record_number: '12345',
  diagnosis: 'shock septico', alert: 'critical', residente: 'jimenez',
  dias_hosp: 3, dias_vm: 2, vm_mode: 'VCV',
  goals: [{ id: 'g1', stay_id: 's1', text: 'meta', done: false, position: 0 }],
  sofa_assessments: [{ id: 'a1', stay_id: 's1', assessed_on: today, resp: 3, coag: 1, liver: 0, cardio: 2, neuro: 0, renal: 1 }],
})
```

En `app/src/a11y/axe.test.tsx`, reemplazar el literal `const stay = { ... } satisfies StayFull` (líneas 17-27) por lo siguiente, y eliminar el `import type { StayFull }` (queda sin uso en este archivo):

```ts
import { baseStay } from '../test/fixtures'

const stay = baseStay({
  box_number: 3, patient_name: 'J. Pérez', diagnosis: 'shock septico',
  alert: 'critical', dias_hosp: 1, dias_vm: 1, vm_mode: 'VCV',
})
```

- [ ] **Step 5: Verificar que es un refactor puro**

Run: `cd app && npm test`
Expected: 141/141 en verde, mismos conteos por archivo que antes.

Run: `cd app && npm run typecheck`
Expected: sin salida (exit 0).

- [ ] **Step 6: Commit**

```bash
git add app/src/test/fixtures.ts app/src/features/executive/kpis.test.ts app/src/features/patient/tabs/TabVentilacion.test.tsx app/src/features/patient/tabs/TabNutricion.test.tsx app/src/features/patient/tabs/TabSofa.test.tsx app/src/features/patient/tabs/TabFuncional.test.tsx app/src/features/patient/tabs/TabEMR.test.tsx app/src/a11y/axe.test.tsx app/src/features/board/BoxCard.test.tsx
git commit -m "refactor: fixture StayFull compartida (baseStay) en vez de 8 literales duplicados"
```

---

## Task 2: Migración 005 (columnas `comorbilidades` y `destino_tipo`)

**Files:**
- Create: `supabase/migrations/005_destino_comorbilidades.sql`

- [ ] **Step 1: Escribir la migración**

```sql
-- UCI Control — Cambios Arteaga sub-proyecto A: destino estructurado + comorbilidades
-- destination (texto libre existente) NO se toca: pasa a ser el "detalle" en la UI.
alter table public.stays
  add column comorbilidades text not null default '',
  add column destino_tipo text not null default '';
```

- [ ] **Step 2: Aplicar al proyecto real vía MCP**

Usar `mcp__supabase-uci-control__apply_migration` con `name: destino_comorbilidades` y el SQL del Step 1. (Este servidor MCP ya apunta al proyecto correcto `zjvkvxaqixztdetwliyp` — configurado el 2026-07-05. Si fallara por token, fallback: pedir al usuario pegarlo en el SQL Editor de Supabase Studio, como se hizo con la 004.)

- [ ] **Step 3: Verificar en vivo**

Usar `mcp__supabase-uci-control__execute_sql` con:
```sql
select column_name, data_type, column_default from information_schema.columns
where table_schema = 'public' and table_name = 'stays'
  and column_name in ('comorbilidades', 'destino_tipo');
```
Expected: 2 filas, ambas `text` con default `''::text`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/005_destino_comorbilidades.sql
git commit -m "feat: columnas destino_tipo y comorbilidades en stays (migración 005)"
```

---

## Task 3: Catálogos y tipos (TDD)

**Files:**
- Create: `app/src/lib/clinical/constants.test.ts`
- Modify: `app/src/lib/clinical/constants.ts`
- Modify: `app/src/lib/supabase/types.ts`
- Modify: `app/src/test/fixtures.ts`

- [ ] **Step 1: Escribir el test (falla porque los catálogos no existen)**

`app/src/lib/clinical/constants.test.ts`:

```ts
import { describe, expect, test } from 'vitest'
import { DESTINO_TIPOS, OTHER_ACCESS_TYPES, VM_MODES } from './constants'

describe('catálogo de destinos', () => {
  test('las 7 opciones exactas: 4 verbatim del prototipo + traslado/fallecido del doc 2026-07-06', () => {
    expect(DESTINO_TIPOS).toEqual({
      '': 'Destino —',
      tac: '→ TAC',
      pabellon: '→ Pabellón',
      egreso: '→ Egreso',
      ingreso: '⬇ Ingreso',
      traslado: '→ Traslado a otro hospital',
      fallecido: '✝ Fallecido',
    })
  })
})

describe('catálogos de ficha', () => {
  test('TQT disponible como modo ventilatorio', () => {
    expect(VM_MODES).toContain('TQT')
  })
  test('otros accesos parte con Sonda urinaria (Foley), lista abierta', () => {
    expect(OTHER_ACCESS_TYPES).toContain('Sonda urinaria (Foley)')
  })
})
```

- [ ] **Step 2: Ejecutar y verificar que falla**

Run: `cd app && npm test -- constants.test`
Expected: FAIL — `DESTINO_TIPOS` no exportado.

- [ ] **Step 3: Implementar los catálogos**

En `app/src/lib/clinical/constants.ts`, cambiar la línea de `VM_MODES`:

```ts
export const VM_MODES = ['—', 'VCV', 'PCV', 'PRVC', 'PSV', 'BIPAP/APRV', 'CPAP', 'HFNC', 'VMni (BiPAP)', 'Ventilación espontánea', 'TQT'] as const
```

y agregar después de `ACCESS_TYPES`:

```ts
// Otros accesos (no vasculares) — lista abierta: drenajes futuros se agregan aquí.
export const OTHER_ACCESS_TYPES = ['Sonda urinaria (Foley)'] as const

export type DestinoKey = '' | 'tac' | 'pabellon' | 'egreso' | 'ingreso' | 'traslado' | 'fallecido'

// Claves tac/pabellon/egreso/ingreso verbatim del prototipo UCI_Dashboard.html (línea 603);
// traslado/fallecido del doc "Resumen de Cambios" (Dr. Arteaga, 2026-07-06).
// En la BD se guarda la CLAVE (como alert), no el label — los KPIs cuentan por clave.
export const DESTINO_TIPOS: Record<DestinoKey, string> = {
  '': 'Destino —',
  tac: '→ TAC',
  pabellon: '→ Pabellón',
  egreso: '→ Egreso',
  ingreso: '⬇ Ingreso',
  traslado: '→ Traslado a otro hospital',
  fallecido: '✝ Fallecido',
}
```

- [ ] **Step 4: Extender `Stay` y la fixture**

En `app/src/lib/supabase/types.ts`, cambiar el import de la línea 1:

```ts
import type { AlertKey, DestinoKey } from '../clinical/constants'
```

y en la interfaz `Stay`, después de `destination: string`, agregar:

```ts
  destino_tipo: DestinoKey
  comorbilidades: string
```

En `app/src/test/fixtures.ts`, en el literal de `baseStay`, después de `destination: '',` agregar:

```ts
    destino_tipo: '', comorbilidades: '',
```

- [ ] **Step 5: Verificar**

Run: `cd app && npm test -- constants.test`
Expected: PASS (3 tests).

Run: `cd app && npm run typecheck`
Expected: sin salida — gracias al Task 1, la fixture compartida absorbe el cambio de tipo en un solo lugar.

Run: `cd app && npm test`
Expected: suite completa en verde (141 + 3 = 144).

- [ ] **Step 6: Commit**

```bash
git add app/src/lib/clinical/constants.ts app/src/lib/clinical/constants.test.ts app/src/lib/supabase/types.ts app/src/test/fixtures.ts
git commit -m "feat: catálogos DESTINO_TIPOS/OTHER_ACCESS_TYPES, TQT en VM_MODES, tipos de Stay"
```

---

## Task 4: KPIs de traslado y fallecidos (TDD)

**Files:**
- Modify: `app/src/features/executive/kpis.test.ts`
- Modify: `app/src/features/executive/kpis.ts`
- Modify: `app/src/features/executive/ExecutivePage.tsx:49-50`

- [ ] **Step 1: Escribir los tests (fallan)**

Agregar al final del `describe('boardKpis', ...)` en `kpis.test.ts`:

```ts
  test('traslados y fallecidos cuentan por destino_tipo', () => {
    const k = boardKpis([
      stay({ destino_tipo: 'traslado' }),
      stay({ box_number: 2, destino_tipo: 'traslado' }),
      stay({ box_number: 3, destino_tipo: 'fallecido' }),
      stay({ box_number: 4 }),
    ])
    expect(k.traslados).toBe(2)
    expect(k.fallecidos).toBe(1)
  })

  test('egresables reconoce el destino estructurado además del texto libre existente', () => {
    const k = boardKpis([
      stay({ destino_tipo: 'egreso' }),
      stay({ box_number: 2, destination: 'Egreso a sala' }),
      stay({ box_number: 3 }),
    ])
    expect(k.dischargeable).toBe(2)
  })
```

(El segundo test cubre una consecuencia necesaria del spec: si el usuario selecciona "→ Egreso" en el selector nuevo, el KPI "Egresables" existente debe contarlo — hoy solo parsea el texto libre. Se mantiene la heurística de texto para los valores reales ya guardados.)

- [ ] **Step 2: Ejecutar y verificar que fallan**

Run: `cd app && npm test -- kpis.test`
Expected: FAIL — `traslados`/`fallecidos` undefined.

- [ ] **Step 3: Implementar**

En `app/src/features/executive/kpis.ts`, reemplazar la línea de `dischargeable` y agregar los dos contadores:

```ts
    dischargeable: stays.filter(s => s.destino_tipo === 'egreso' || s.destination.toLowerCase().includes('egreso')).length,
    traslados: stays.filter(s => s.destino_tipo === 'traslado').length,
    fallecidos: stays.filter(s => s.destino_tipo === 'fallecido').length,
```

- [ ] **Step 4: Verificar que pasan**

Run: `cd app && npm test -- kpis.test`
Expected: PASS (5 tests: 3 previos + 2 nuevos).

- [ ] **Step 5: Renderizar en el Ejecutivo**

En `ExecutivePage.tsx`, después de la línea del KPI "Egresables" (línea 49), agregar:

```tsx
          <div className="kpi"><dt>→ Traslado</dt><dd data-kpi>{k.traslados}</dd></div>
          <div className="kpi"><dt>Fallecidos</dt><dd data-kpi>{k.fallecidos}</dd></div>
```

- [ ] **Step 6: Suite completa + commit**

Run: `cd app && npm test` — Expected: verde (144 + 2 = 146).

```bash
git add app/src/features/executive/kpis.ts app/src/features/executive/kpis.test.ts app/src/features/executive/ExecutivePage.tsx
git commit -m "feat: KPIs de traslado y fallecidos; egresables reconoce destino estructurado"
```

---

## Task 5: Tab Clínico — destino estructurado, comorbilidades, otros accesos (TDD)

**Files:**
- Create: `app/src/features/patient/tabs/TabClinico.test.tsx`
- Modify: `app/src/features/patient/tabs/TabClinico.tsx`

- [ ] **Step 1: Escribir el test (falla — el componente actual no tiene estos elementos)**

`app/src/features/patient/tabs/TabClinico.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, vi } from 'vitest'

const updateStay = vi.fn()
const childRow = { insert: { mutate: vi.fn() }, update: { mutate: vi.fn() }, remove: { mutate: vi.fn() } }
vi.mock('../../../lib/supabase/useBoard', () => ({
  useUpdateStay: () => ({ mutate: updateStay }),
  useChildRow: () => childRow,
}))

import { TabClinico } from './TabClinico'
import { baseStay } from '../../../test/fixtures'

beforeEach(() => {
  updateStay.mockClear()
  childRow.insert.mutate.mockClear()
})

test('cambiar el destino guarda SOLO destino_tipo (patch parcial, anti-clobbering)', async () => {
  render(<TabClinico stay={baseStay()} />)
  await userEvent.selectOptions(screen.getByLabelText('Destino'), '→ Traslado a otro hospital')
  expect(updateStay).toHaveBeenCalledWith({ id: 's1', patch: { destino_tipo: 'traslado' } })
})

test('el hint de sigla del centro aparece solo con destino traslado', () => {
  const { rerender } = render(<TabClinico stay={baseStay()} />)
  expect(screen.queryByText(/Sigla del centro/)).not.toBeInTheDocument()
  rerender(<TabClinico stay={baseStay({ destino_tipo: 'traslado' })} />)
  expect(screen.getByText(/Sigla del centro, ej. HSJD/)).toBeInTheDocument()
})

test('el texto libre existente sigue editable como Detalle destino', () => {
  const stay = baseStay({ destination: 'TC abdomen' })
  render(<TabClinico stay={stay} />)
  const detalle = screen.getByLabelText('Detalle destino (texto libre)')
  expect(detalle).toHaveValue('TC abdomen')
  fireEvent.focus(detalle)
  fireEvent.change(detalle, { target: { value: 'HSJD' } })
  fireEvent.blur(detalle)
  expect(updateStay).toHaveBeenCalledWith({ id: 's1', patch: { destination: 'HSJD' } })
})

test('comorbilidades se guarda como patch parcial', () => {
  render(<TabClinico stay={baseStay()} />)
  const campo = screen.getByLabelText('Enfermedades de base / Comorbilidades')
  fireEvent.focus(campo)
  fireEvent.change(campo, { target: { value: 'DM2, HTA' } })
  fireEvent.blur(campo)
  expect(updateStay).toHaveBeenCalledWith({ id: 's1', patch: { comorbilidades: 'DM2, HTA' } })
})

test('agregar otro acceso inserta con tipo Sonda urinaria (Foley)', async () => {
  render(<TabClinico stay={baseStay()} />)
  await userEvent.click(screen.getByRole('button', { name: '+ Agregar otro acceso' }))
  expect(childRow.insert.mutate).toHaveBeenCalledWith({ stay_id: 's1', type: 'Sonda urinaria (Foley)', day: 0 })
})

test('un acceso Foley se lista bajo Otros accesos y no bajo los vasculares', () => {
  const stay = baseStay({
    accesses: [
      { id: 'a1', stay_id: 's1', type: 'CVC', day: 2 },
      { id: 'a2', stay_id: 's1', type: 'Sonda urinaria (Foley)', day: 5 },
    ],
  })
  render(<TabClinico stay={stay} />)
  expect(screen.getByRole('heading', { name: 'Accesos vasculares' })).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Otros accesos' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Eliminar acceso CVC' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Eliminar acceso Sonda urinaria (Foley)' })).toBeInTheDocument()
})
```

- [ ] **Step 2: Ejecutar y verificar que falla**

Run: `cd app && npm test -- TabClinico.test`
Expected: FAIL — no existe el label "Detalle destino (texto libre)" ni el selector de destino con esas opciones (el componente actual tiene `AutoText label="Destino"`).

- [ ] **Step 3: Implementar los cambios en `TabClinico.tsx`**

3a. Ampliar el import de constants (línea 5):

```ts
import { ACCESS_TYPES, ALERT_TYPES, DESTINO_TIPOS, OTHER_ACCESS_TYPES, PREVISIONES, RESIDENTES, VM_MODES, type AlertKey, type DestinoKey } from '../../../lib/clinical/constants'
```

3b. Dentro del componente, después de `const accesses = useChildRow('accesses')`, agregar la clasificación:

```ts
  // Misma tabla accesses para ambas secciones: se agrupa por catálogo del tipo,
  // así ninguna fila existente se migra ni se mueve.
  const OTROS = OTHER_ACCESS_TYPES as readonly string[]
  const vasculares = stay.accesses.filter(a => !OTROS.includes(a.type))
  const otros = stay.accesses.filter(a => OTROS.includes(a.type))
```

3c. Reemplazar el campo Destino actual (líneas 34-35, el `<AutoText label="Destino" ...>`) por:

```tsx
      <SelectField label="Destino" value={DESTINO_TIPOS[stay.destino_tipo]}
        onChange={v => {
          const key = (Object.keys(DESTINO_TIPOS) as DestinoKey[])
            .find(k => DESTINO_TIPOS[k] === v)
          if (key !== undefined) upd({ destino_tipo: key })
        }}
        options={Object.values(DESTINO_TIPOS)} />
      <div>
        <AutoText label="Detalle destino (texto libre)" value={stay.destination}
          onSave={v => upd({ destination: v })} />
        {stay.destino_tipo === 'traslado' && (
          <p className="vent-hint">Sigla del centro, ej. HSJD</p>
        )}
      </div>
```

3d. Después del campo Alergias (líneas 44-45), agregar:

```tsx
      <AutoText label="Enfermedades de base / Comorbilidades" value={stay.comorbilidades}
        onSave={v => upd({ comorbilidades: v })} />
```

3e. En la sección "Accesos vasculares", cambiar `stay.accesses.map(...)` por `vasculares.map(...)` y el empty-state por `{vasculares.length === 0 && ...}` (mismo contenido). El botón "+ Agregar acceso" queda igual (default `'CVC'`).

3f. Después del cierre de la sección de accesos vasculares (línea 85, `</section>`), agregar la sección nueva:

```tsx
      <section className="tabgrid__full" aria-labelledby="otros-accesos-title">
        <h2 id="otros-accesos-title">Otros accesos</h2>
        {otros.map(a => (
          <div className="tabrow" key={a.id}>
            <SelectField label="Tipo" value={a.type}
              onChange={v => accesses.update.mutate({ id: a.id, patch: { type: v } })}
              options={OTHER_ACCESS_TYPES} />
            <AutoNumber label="Días" value={a.day}
              onSave={v => accesses.update.mutate({ id: a.id, patch: { day: v } })} />
            <ConfirmDeleteButton
              ariaLabel={`Eliminar acceso ${a.type}`}
              confirmText={`¿Eliminar el acceso ${a.type}?`}
              onConfirm={() => accesses.remove.mutate(a.id)} />
          </div>
        ))}
        <Button variant="secondary"
          onClick={() => accesses.insert.mutate({ stay_id: stay.id, type: 'Sonda urinaria (Foley)', day: 0 })}>
          + Agregar otro acceso
        </Button>
        {otros.length === 0 && <p><Badge tone="muted">Sin otros accesos registrados</Badge></p>}
      </section>
```

(TQT no requiere cambio aquí: el selector Modo VM ya itera `VM_MODES`.)

- [ ] **Step 4: Verificar que pasan**

Run: `cd app && npm test -- TabClinico.test`
Expected: PASS (6 tests).

- [ ] **Step 5: Suite completa + commit**

Run: `cd app && npm test` — Expected: verde (146 + 6 = 152). Nota: `axe.test.tsx` NO renderiza TabClinico (solo LoginPage y BoxCard), así que este cambio no lo afecta; la validación de accesibilidad de esta pestaña queda en manos del Lighthouse manual del Task 7.

```bash
git add app/src/features/patient/tabs/TabClinico.tsx app/src/features/patient/tabs/TabClinico.test.tsx
git commit -m "feat: destino estructurado con detalle libre, comorbilidades y sección Otros accesos"
```

---

## Task 6: Badge de destino en la tarjeta del tablero (TDD)

**Files:**
- Modify: `app/src/features/board/BoxCard.test.tsx`
- Modify: `app/src/features/board/BoxCard.tsx`

- [ ] **Step 1: Escribir los tests (fallan)**

Agregar al final de `BoxCard.test.tsx` (el archivo ya tiene el helper `renderCard(s, box = 5)` que envuelve en `MemoryRouter`, y tras el Task 1 ya importa `baseStay`):

```tsx
test('con destino_tipo marcado, la tarjeta muestra el badge del destino', () => {
  renderCard(baseStay({ destino_tipo: 'fallecido', patient_name: 'X' }))
  expect(screen.getByText('✝ Fallecido')).toBeInTheDocument()
})

test('sin destino_tipo no hay badge de destino', () => {
  renderCard(baseStay({ patient_name: 'X' }))
  expect(screen.queryByText(/Destino —/)).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Ejecutar y verificar que fallan**

Run: `cd app && npm test -- BoxCard.test`
Expected: FAIL — `✝ Fallecido` no se renderiza.

- [ ] **Step 3: Implementar**

En `BoxCard.tsx`, ampliar el import (línea 3):

```ts
import { ALERT_TYPES, DESTINO_TIPOS } from '../../lib/clinical/constants'
```

y en el `<div className="boxcard__meta">`, después del badge de Metas, agregar:

```tsx
        {stay.destino_tipo !== '' && <Badge tone="muted">{DESTINO_TIPOS[stay.destino_tipo]}</Badge>}
```

- [ ] **Step 4: Verificar + commit**

Run: `cd app && npm test -- BoxCard.test` — Expected: PASS.
Run: `cd app && npm test` — Expected: verde (152 + 2 = 154).

```bash
git add app/src/features/board/BoxCard.tsx app/src/features/board/BoxCard.test.tsx
git commit -m "feat: badge de destino en la tarjeta del box (visible sin expandir)"
```

---

## Task 7: Build, deploy y verificación en producción

**Files:** ninguno (build, deploy, verificación).

- [ ] **Step 1: Build**

Run: `cd app && npm run build`
Expected: build limpio, sin warnings nuevos.

- [ ] **Step 2: Deploy a producción**

Run: `cd app && npm run vercel -- deploy --prod --yes`
(La CLI ya está autenticada en esta máquina como `windsurfgitano-cmd` y el directorio linkeado al proyecto `uci-control`; si pidiera login, avisar al usuario.)
Expected: alias a `https://www.ucicontrol.cl`.

- [ ] **Step 3: Verificación funcional en vivo (Chrome DevTools MCP)**

En un box con paciente de PRUEBA (Box 1 "PACIENTE PRUEBA" — nunca en boxes con pacientes reales):
1. Tab Clínico: seleccionar destino "→ Traslado a otro hospital" → aparece el hint de sigla; escribir "HSJD" en el detalle; recargar y confirmar que ambos persisten.
2. Confirmar que el badge "→ Traslado a otro hospital" aparece en la tarjeta del tablero y que el KPI "→ Traslado" del Ejecutivo marca 1.
3. Comorbilidades: escribir un valor, recargar, confirmar persistencia.
4. Otros accesos: agregar Sonda urinaria (Foley) con días, confirmar que lista en su sección; borrarla con confirmación.
5. Modo VM: seleccionar TQT, confirmar persistencia; restaurar el valor original.
6. **Restaurar todo al estado previo** (destino a "Destino —", detalle a su valor original, comorbilidades vacío) — el equipo real usa esta base.

Expected: todo funciona sin errores de consola; ningún dato de prueba residual.

- [ ] **Step 4: Lighthouse**

Auditoría de accesibilidad sobre `/box/1` (tab Clínico visible) y `/ejecutivo`.
Expected: 100/100 en ambas.

- [ ] **Step 5: Merge y push** (vía superpowers:finishing-a-development-branch)

Merge de la rama feature a `master`, suite verde post-merge, push a GitHub, limpieza del worktree.

---

## Notas para quien ejecute este plan

- **Anti-clobbering:** todos los guardados de este plan son patches parciales (`{ id, patch: { campo } }` vía `useUpdateStay`, o insert/update de fila propia vía `useChildRow`) — nunca construir un patch esparciendo el objeto `stay` completo.
- **Datos reales en producción:** `destination` tiene valores reales del equipo clínico. Nada en este plan los modifica, migra ni reinterpreta — el selector nuevo escribe a `destino_tipo`, columna aparte.
- **`OTHER_ACCESS_TYPES` es la fuente de verdad del agrupamiento:** un tipo que no esté ahí se muestra como vascular. Al agregar drenajes futuros al catálogo, las filas ya guardadas con ese tipo "se moverán" de sección automáticamente — comportamiento deseado.
- Los conteos de tests esperados (144/146/152/154) asumen partir de 141; si otra rama tocó la suite antes, verificar "sin fallos y sin bajar del conteo previo" en vez del número exacto.
