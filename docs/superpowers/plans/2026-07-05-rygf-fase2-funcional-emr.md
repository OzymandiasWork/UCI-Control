# RYGF Fase 2, parte 1 — Evaluación Funcional + EMR — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar dos pestañas nuevas al detalle de paciente — "Funcional" (evaluación MRC-SS/FSS-ICU/IMS con historial fechado) y "EMR" (sesiones de entrenamiento muscular respiratorio) — persistidas en Supabase, migrando la lógica y umbrales clínicos verbatim del prototipo RYGF.

**Architecture:** Dos tablas hijas nuevas (`mrc_assessments`, `emr_sessions`) siguiendo el patrón ya existente de `blood_gases` (historial con fecha vía INSERT, no upsert de fila compartida). Se reutiliza el hook genérico `useChildRow` (extendiendo su union type), el componente `ConfirmDeleteButton`, y los campos `TextField`/`SelectField` del design system. La lógica de cálculo (suma MRC-SS null-safe + interpretación) vive en un módulo puro nuevo `lib/clinical/functional.ts`, testeado con TDD como los demás módulos clínicos (`sofa.ts`, `vent.ts`).

**Tech Stack:** React 18 + TypeScript, @tanstack/react-query (vía `useChildRow`), Supabase Postgres, Vitest + React Testing Library.

**Spec de referencia:** [`docs/superpowers/specs/2026-07-05-rygf-fase2-funcional-emr-design.md`](../specs/2026-07-05-rygf-fase2-funcional-emr-design.md)

---

## Task 1: Migración de esquema (tablas `mrc_assessments` y `emr_sessions`)

**Files:**
- Create: `supabase/migrations/004_funcional_emr.sql`

- [ ] **Step 1: Escribir la migración**

```sql
-- UCI Control — RYGF Fase 2, parte 1: Evaluación Funcional (MRC-SS/FSS-ICU/IMS) + EMR

create table public.mrc_assessments (
  id uuid primary key default gen_random_uuid(),
  stay_id uuid not null references public.stays on delete cascade,
  assessed_at timestamptz not null default now(),
  -- MRC-SS: 12 grupos musculares, 0-5 cada uno (nullable = grupo no evaluado)
  abd_hh_d int check (abd_hh_d between 0 and 5),
  flex_hh_d int check (flex_hh_d between 0 and 5),
  ext_mu_d int check (ext_mu_d between 0 and 5),
  abd_hh_i int check (abd_hh_i between 0 and 5),
  flex_hh_i int check (flex_hh_i between 0 and 5),
  ext_mu_i int check (ext_mu_i between 0 and 5),
  flex_rod_d int check (flex_rod_d between 0 and 5),
  ext_rod_d int check (ext_rod_d between 0 and 5),
  dors_pie_d int check (dors_pie_d between 0 and 5),
  flex_rod_i int check (flex_rod_i between 0 and 5),
  ext_rod_i int check (ext_rod_i between 0 and 5),
  dors_pie_i int check (dors_pie_i between 0 and 5),
  -- Índices de función/movilidad
  fss_icu int check (fss_icu between 0 and 35),
  ims int check (ims between 0 and 10),
  -- Fuerza y resistencia
  handgrip_d numeric,
  handgrip_i numeric,
  tiempo_trabajo_min int,
  pct_fcr int,
  borg_fuerza int check (borg_fuerza between 0 and 10),
  dolor_ena int check (dolor_ena between 0 and 10),
  dva_sesion boolean not null default false,
  uma numeric,
  set_min int,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users
);

create table public.emr_sessions (
  id uuid primary key default gen_random_uuid(),
  stay_id uuid not null references public.stays on delete cascade,
  session_at timestamptz not null default now(),
  session_type text not null default 'fuerza' check (session_type in ('fuerza','resistencia')),
  carga_pct int,
  cmh2o int,
  repeticiones int,
  series int,
  minutos int,
  tolerancia boolean not null default true,
  borg int check (borg between 0 and 10),
  pim_test int,
  pef_test int,
  fraccion_acort_pct numeric,
  eco_diaf_esp_mm numeric,
  eco_diaf_ins_mm numeric,
  notas text not null default '',
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users
);

do $$
declare t text;
begin
  foreach t in array array['mrc_assessments','emr_sessions']
  loop
    execute format('create trigger touch before insert or update on public.%I
                    for each row execute function public.touch_row()', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "authenticated all" on public.%I
                    for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

alter publication supabase_realtime add table public.mrc_assessments, public.emr_sessions;
```

- [ ] **Step 2: Aplicar la migración al proyecto Supabase real**

Usar la herramienta MCP `mcp__plugin_supabase_supabase__apply_migration` con:
- `project_id`: `zjvkvxaqixztdetwliyp`
- `name`: `funcional_emr`
- `query`: el SQL completo del Step 1

- [ ] **Step 3: Verificar que las tablas existen**

Llamar a `mcp__plugin_supabase_supabase__list_tables` con `project_id: zjvkvxaqixztdetwliyp`, `schemas: ['public']`.
Expected: la lista incluye `mrc_assessments` y `emr_sessions`, ambas con `rls_enabled: true`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/004_funcional_emr.sql
git commit -m "feat: migración de mrc_assessments y emr_sessions (RYGF Fase 2)"
```

---

## Task 2: Capa de datos (tipos + hooks)

**Files:**
- Modify: `app/src/lib/supabase/types.ts`
- Modify: `app/src/lib/supabase/useBoard.ts:12` (select de `fetchBoard`)
- Modify: `app/src/lib/supabase/useBoard.ts:85` (union type de `useChildRow`)

- [ ] **Step 1: Agregar los tipos `MrcAssessment` y `EmrSession`, y extender `StayFull`**

En `app/src/lib/supabase/types.ts`, agregar después de la interfaz `BloodGas` (línea 94) y antes de `ShiftStaff`:

```ts
export interface MrcAssessment {
  id: string
  stay_id: string
  assessed_at: string
  abd_hh_d: number | null
  flex_hh_d: number | null
  ext_mu_d: number | null
  abd_hh_i: number | null
  flex_hh_i: number | null
  ext_mu_i: number | null
  flex_rod_d: number | null
  ext_rod_d: number | null
  dors_pie_d: number | null
  flex_rod_i: number | null
  ext_rod_i: number | null
  dors_pie_i: number | null
  fss_icu: number | null
  ims: number | null
  handgrip_d: number | null
  handgrip_i: number | null
  tiempo_trabajo_min: number | null
  pct_fcr: number | null
  borg_fuerza: number | null
  dolor_ena: number | null
  dva_sesion: boolean
  uma: number | null
  set_min: number | null
}

export interface EmrSession {
  id: string
  stay_id: string
  session_at: string
  session_type: 'fuerza' | 'resistencia'
  carga_pct: number | null
  cmh2o: number | null
  repeticiones: number | null
  series: number | null
  minutos: number | null
  tolerancia: boolean
  borg: number | null
  pim_test: number | null
  pef_test: number | null
  fraccion_acort_pct: number | null
  eco_diaf_esp_mm: number | null
  eco_diaf_ins_mm: number | null
  notas: string
}
```

Y modificar `StayFull` (líneas 114-122) para agregar los dos arrays nuevos:

```ts
/** Stay con sus hijos, como lo devuelve la query del tablero */
export interface StayFull extends Stay {
  goals: Goal[]
  antibiotics: Antibiotic[]
  accesses: Access[]
  nutrition: Nutrition | null
  sofa_assessments: SofaAssessment[]
  vent_settings: VentSettings | null
  blood_gases: BloodGas[]
  mrc_assessments: MrcAssessment[]
  emr_sessions: EmrSession[]
}
```

- [ ] **Step 2: Incluir las tablas nuevas en la query del tablero**

En `app/src/lib/supabase/useBoard.ts:12`, cambiar:

```ts
    .select('*, goals(*), antibiotics(*), accesses(*), nutrition(*), sofa_assessments(*), vent_settings(*), blood_gases(*)')
```

por:

```ts
    .select('*, goals(*), antibiotics(*), accesses(*), nutrition(*), sofa_assessments(*), vent_settings(*), blood_gases(*), mrc_assessments(*), emr_sessions(*)')
```

- [ ] **Step 3: Extender `useChildRow` para las tablas nuevas**

En `app/src/lib/supabase/useBoard.ts:85`, cambiar:

```ts
export function useChildRow(table: 'goals' | 'antibiotics' | 'accesses' | 'blood_gases') {
```

por:

```ts
export function useChildRow(table: 'goals' | 'antibiotics' | 'accesses' | 'blood_gases' | 'mrc_assessments' | 'emr_sessions') {
```

- [ ] **Step 4: Verificar que compila sin errores de tipo**

Run: `cd app && npm run typecheck`
Expected: sin salida (exit 0). Fallará hasta este punto porque `StayFull` ahora exige `mrc_assessments`/`emr_sessions` en todo objeto que lo satisfaga — los fixtures de test de las pestañas existentes (`TabVentilacion.test.tsx`, `TabNutricion.test.tsx`, `TabSofa.test.tsx`) van a necesitar los 2 campos nuevos.

- [ ] **Step 5: Agregar los campos nuevos a los fixtures `base` existentes**

En `app/src/features/patient/tabs/TabVentilacion.test.tsx`, `TabNutricion.test.tsx` y `TabSofa.test.tsx`, en el objeto `base` (el que tiene `vent_settings: null, blood_gases: [], nutrition: null,` u orden similar), agregar `mrc_assessments: [], emr_sessions: [],` al final de la lista de campos hijos.

- [ ] **Step 6: Verificar que compila y los tests existentes siguen pasando**

Run: `cd app && npm run typecheck`
Expected: sin salida (exit 0).

Run: `cd app && npm test`
Expected: todos los tests existentes en verde (114/114 antes de esta rama).

- [ ] **Step 7: Commit**

```bash
git add app/src/lib/supabase/types.ts app/src/lib/supabase/useBoard.ts app/src/features/patient/tabs/TabVentilacion.test.tsx app/src/features/patient/tabs/TabNutricion.test.tsx app/src/features/patient/tabs/TabSofa.test.tsx
git commit -m "feat: tipos y hooks de datos para mrc_assessments y emr_sessions"
```

---

## Task 3: Lógica clínica — `lib/clinical/functional.ts` (TDD)

**Files:**
- Create: `app/src/lib/clinical/functional.ts`
- Test: `app/src/lib/clinical/functional.test.ts`

- [ ] **Step 1: Escribir el test (falla porque `functional.ts` no existe)**

```ts
import { describe, expect, test } from 'vitest'
import { MRC_GROUPS, calcMrcTotal, mrcInterp, type MrcScores } from './functional'

const emptyScores = (): MrcScores =>
  Object.fromEntries(MRC_GROUPS.map(g => [g.key, null])) as MrcScores

describe('MRC-SS: doce grupos musculares', () => {
  test('hay exactamente 12 grupos, con las etiquetas del prototipo RYGF', () => {
    expect(MRC_GROUPS).toHaveLength(12)
    expect(MRC_GROUPS.map(g => g.label)).toEqual([
      'Abd. HH D', 'Flex. HH D', 'Ext. MU D',
      'Abd. HH I', 'Flex. HH I', 'Ext. MU I',
      'Flex. Rod D', 'Ext. Rod D', 'Dors. Pie D',
      'Flex. Rod I', 'Ext. Rod I', 'Dors. Pie I',
    ])
  })
})

describe('calcMrcTotal', () => {
  test('todos los grupos sin evaluar (null) → total null', () => {
    expect(calcMrcTotal(emptyScores())).toBeNull()
  })

  test('suma null-safe: los grupos sin evaluar cuentan como 0', () => {
    const s = { ...emptyScores(), abd_hh_d: 3, flex_hh_d: 3, ext_mu_d: 3 }
    expect(calcMrcTotal(s)).toBe(9)
  })

  test('los 12 grupos en 5 puntos suman 60 (máximo posible)', () => {
    const s = Object.fromEntries(MRC_GROUPS.map(g => [g.key, 5])) as MrcScores
    expect(calcMrcTotal(s)).toBe(60)
  })
})

describe('mrcInterp', () => {
  test('total null → "—" (muted)', () => {
    expect(mrcInterp(null)).toEqual({ label: '—', tone: 'muted' })
  })

  test.each([
    [60, 'Fuerza normal', 'ok'],
    [48, 'Fuerza normal', 'ok'],
    [47, 'Debilidad adquirida leve', 'proc'],
    [36, 'Debilidad adquirida leve', 'proc'],
    [35, 'Debilidad adquirida moderada', 'warn'],
    [24, 'Debilidad adquirida moderada', 'warn'],
    [23, 'DAUCI severa', 'danger'],
    [0, 'DAUCI severa', 'danger'],
  ])('total %s → %s (%s)', (total, label, tone) => {
    const r = mrcInterp(total)
    expect(r.label).toBe(label)
    expect(r.tone).toBe(tone)
  })
})
```

- [ ] **Step 2: Ejecutar el test y verificar que falla**

Run: `cd app && npm test -- functional.test`
Expected: FAIL — `Cannot find module './functional'` (o equivalente de resolución de módulo).

- [ ] **Step 3: Implementar `functional.ts`**

```ts
// Lógica funcional migrada VERBATIM de calcMRC() en el prototipo RYGF_Digital_HUAP_v1
// (línea 1612) — no editar umbrales sin revisión clínica.

export type MrcKey =
  | 'abd_hh_d' | 'flex_hh_d' | 'ext_mu_d'
  | 'abd_hh_i' | 'flex_hh_i' | 'ext_mu_i'
  | 'flex_rod_d' | 'ext_rod_d' | 'dors_pie_d'
  | 'flex_rod_i' | 'ext_rod_i' | 'dors_pie_i'

export type MrcScores = Record<MrcKey, number | null>
export type MrcTone = 'ok' | 'proc' | 'warn' | 'danger' | 'muted'

export const MRC_GROUPS: { key: MrcKey; label: string }[] = [
  { key: 'abd_hh_d', label: 'Abd. HH D' },
  { key: 'flex_hh_d', label: 'Flex. HH D' },
  { key: 'ext_mu_d', label: 'Ext. MU D' },
  { key: 'abd_hh_i', label: 'Abd. HH I' },
  { key: 'flex_hh_i', label: 'Flex. HH I' },
  { key: 'ext_mu_i', label: 'Ext. MU I' },
  { key: 'flex_rod_d', label: 'Flex. Rod D' },
  { key: 'ext_rod_d', label: 'Ext. Rod D' },
  { key: 'dors_pie_d', label: 'Dors. Pie D' },
  { key: 'flex_rod_i', label: 'Flex. Rod I' },
  { key: 'ext_rod_i', label: 'Ext. Rod I' },
  { key: 'dors_pie_i', label: 'Dors. Pie I' },
]

/** Igual de null-safe que calcSofa: si nada se ha evaluado aún, no hay total. */
export function calcMrcTotal(s: MrcScores): number | null {
  const v = Object.values(s)
  if (v.every(x => x === null)) return null
  return v.reduce<number>((a, x) => a + (x ?? 0), 0)
}

export function mrcInterp(total: number | null): { label: string; tone: MrcTone } {
  if (total === null) return { label: '—', tone: 'muted' }
  if (total >= 48) return { label: 'Fuerza normal', tone: 'ok' }
  if (total >= 36) return { label: 'Debilidad adquirida leve', tone: 'proc' }
  if (total >= 24) return { label: 'Debilidad adquirida moderada', tone: 'warn' }
  return { label: 'DAUCI severa', tone: 'danger' }
}
```

- [ ] **Step 4: Ejecutar el test y verificar que pasa**

Run: `cd app && npm test -- functional.test`
Expected: PASS, todos los tests en verde.

- [ ] **Step 5: Commit**

```bash
git add app/src/lib/clinical/functional.ts app/src/lib/clinical/functional.test.ts
git commit -m "feat: lógica clínica MRC-SS null-safe (functional.ts) con TDD"
```

---

## Task 4: Estilos — grilla MRC-SS

**Files:**
- Modify: `app/src/features/patient/patient.css:19`

- [ ] **Step 1: Agregar `.mrc-grid` después de `.tabgrid__full`**

En `app/src/features/patient/patient.css`, cambiar:

```css
.tabgrid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: var(--space-3); }
.tabgrid__full { grid-column: 1 / -1; }
```

por:

```css
.tabgrid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: var(--space-3); }
.tabgrid__full { grid-column: 1 / -1; }
.mrc-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: var(--space-2); margin-bottom: var(--space-3); }
```

- [ ] **Step 2: Commit**

```bash
git add app/src/features/patient/patient.css
git commit -m "style: grilla compacta para los 12 campos MRC-SS"
```

---

## Task 5: Pestaña "Funcional" — `TabFuncional.tsx` (TDD)

**Files:**
- Create: `app/src/features/patient/tabs/TabFuncional.tsx`
- Test: `app/src/features/patient/tabs/TabFuncional.test.tsx`

- [ ] **Step 1: Escribir el test (falla porque el componente no existe)**

```tsx
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, vi } from 'vitest'

const childRow = { insert: { mutate: vi.fn() }, update: { mutate: vi.fn() }, remove: { mutate: vi.fn() } }
vi.mock('../../../lib/supabase/useBoard', () => ({
  useChildRow: () => childRow,
}))

import { TabFuncional } from './TabFuncional'
import type { StayFull } from '../../../lib/supabase/types'

const base = {
  id: 's1', box_number: 1, active: true, patient_name: '', record_number: '',
  diagnosis: '', alert: 'none', residente: '', destination: '', dias_hosp: 0,
  dias_vm: 0, vm_mode: '—', rcp: 'Sí', alergias: '', prevision: 'Fonasa A',
  consentimiento: false, balance_meta: '', balance_real: '', contacto_nombre: '',
  contacto_tel: '', ultimo_contacto: '', notes: '', enfermera: '', tens: '', kine: '',
  updated_at: '', goals: [], antibiotics: [], accesses: [], sofa_assessments: [],
  vent_settings: null, blood_gases: [], nutrition: null, mrc_assessments: [], emr_sessions: [],
} satisfies StayFull

beforeEach(() => {
  childRow.insert.mutate.mockClear()
  childRow.remove.mutate.mockClear()
})

test('guardar evaluación envía los 12 campos MRC-SS y el stay_id, sin depender de un render viejo', async () => {
  render(<TabFuncional stay={base} />)
  fireEvent.change(screen.getByLabelText('Abd. HH D'), { target: { value: '3' } })
  fireEvent.change(screen.getByLabelText('Flex. HH D'), { target: { value: '4' } })
  await userEvent.click(screen.getByRole('button', { name: /guardar evaluación/i }))

  expect(childRow.insert.mutate).toHaveBeenCalledWith(
    expect.objectContaining({ stay_id: 's1', abd_hh_d: 3, flex_hh_d: 4, ext_mu_d: null }),
  )
})

test('el total en vivo se recalcula null-safe mientras se completa el formulario', () => {
  render(<TabFuncional stay={base} />)
  fireEvent.change(screen.getByLabelText('Abd. HH D'), { target: { value: '5' } })
  fireEvent.change(screen.getByLabelText('Flex. HH D'), { target: { value: '5' } })
  expect(screen.getByText(/MRC-SS 10 \/ 60/)).toBeInTheDocument()
})

test('borrar una evaluación del historial pide confirmación antes de llamar a remove', async () => {
  const stayWithHistory: StayFull = {
    ...base,
    mrc_assessments: [{
      id: 'm1', stay_id: 's1', assessed_at: '2026-07-01T10:00:00Z',
      abd_hh_d: 3, flex_hh_d: 3, ext_mu_d: 3, abd_hh_i: 3, flex_hh_i: 3, ext_mu_i: 3,
      flex_rod_d: 3, ext_rod_d: 3, dors_pie_d: 3, flex_rod_i: 3, ext_rod_i: 3, dors_pie_i: 3,
      fss_icu: 14, ims: 4, handgrip_d: null, handgrip_i: null, tiempo_trabajo_min: null,
      pct_fcr: null, borg_fuerza: null, dolor_ena: null, dva_sesion: false, uma: null, set_min: null,
    }],
  }
  render(<TabFuncional stay={stayWithHistory} />)
  await userEvent.click(screen.getByRole('button', { name: 'Eliminar evaluación' }))
  expect(childRow.remove.mutate).not.toHaveBeenCalled()
  await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }))
  expect(childRow.remove.mutate).toHaveBeenCalledWith('m1')
})
```

- [ ] **Step 2: Ejecutar el test y verificar que falla**

Run: `cd app && npm test -- TabFuncional.test`
Expected: FAIL — `Cannot find module './TabFuncional'`.

- [ ] **Step 3: Implementar `TabFuncional.tsx`**

```tsx
import { useState } from 'react'
import { Badge } from '../../../design-system/Badge'
import { Button } from '../../../design-system/Button'
import { ConfirmDeleteButton } from '../../../design-system/ConfirmDeleteButton'
import { SelectField, TextField } from '../../../design-system/Field'
import { MRC_GROUPS, calcMrcTotal, mrcInterp, type MrcKey, type MrcScores } from '../../../lib/clinical/functional'
import { useChildRow } from '../../../lib/supabase/useBoard'
import type { StayFull } from '../../../lib/supabase/types'

const num = (s: string) => (s.trim() === '' ? null : Number(s))

type FormKey = MrcKey
  | 'fss_icu' | 'ims' | 'handgrip_d' | 'handgrip_i' | 'tiempo_trabajo_min'
  | 'pct_fcr' | 'borg_fuerza' | 'dolor_ena' | 'uma' | 'set_min'

function emptyForm(): Record<FormKey, string> & { dva_sesion: boolean } {
  return {
    abd_hh_d: '', flex_hh_d: '', ext_mu_d: '', abd_hh_i: '', flex_hh_i: '', ext_mu_i: '',
    flex_rod_d: '', ext_rod_d: '', dors_pie_d: '', flex_rod_i: '', ext_rod_i: '', dors_pie_i: '',
    fss_icu: '', ims: '', handgrip_d: '', handgrip_i: '', tiempo_trabajo_min: '',
    pct_fcr: '', borg_fuerza: '', dolor_ena: '', uma: '', set_min: '',
    dva_sesion: false,
  }
}

export function TabFuncional({ stay }: { stay: StayFull }) {
  const mrc = useChildRow('mrc_assessments')
  const [form, setForm] = useState(emptyForm())
  const set = (k: FormKey, v: string) => setForm(f => ({ ...f, [k]: v }))

  const liveScores: MrcScores = Object.fromEntries(
    MRC_GROUPS.map(g => [g.key, num(form[g.key])]),
  ) as MrcScores
  const liveTotal = calcMrcTotal(liveScores)
  const interp = mrcInterp(liveTotal)

  const save = () => {
    if (MRC_GROUPS.every(g => form[g.key].trim() === '')) return
    mrc.insert.mutate({
      stay_id: stay.id,
      ...Object.fromEntries(MRC_GROUPS.map(g => [g.key, num(form[g.key])])),
      fss_icu: num(form.fss_icu), ims: num(form.ims),
      handgrip_d: num(form.handgrip_d), handgrip_i: num(form.handgrip_i),
      tiempo_trabajo_min: num(form.tiempo_trabajo_min), pct_fcr: num(form.pct_fcr),
      borg_fuerza: num(form.borg_fuerza), dolor_ena: num(form.dolor_ena),
      dva_sesion: form.dva_sesion, uma: num(form.uma), set_min: num(form.set_min),
    })
    setForm(emptyForm())
  }

  return (
    <div>
      <section aria-labelledby="func-mrc">
        <h2 id="func-mrc">💪 MRC-SS (Medical Research Council Sum Score)</h2>
        <div className="mrc-grid">
          {MRC_GROUPS.map(g => (
            <TextField key={g.key} label={g.label} value={form[g.key]} onChange={x => set(g.key, x)} />
          ))}
        </div>
        <div className="vent-indices">
          <Badge tone={interp.tone}>MRC-SS {liveTotal ?? '—'} / 60 · {interp.label}</Badge>
        </div>
      </section>

      <section aria-labelledby="func-indices">
        <h2 id="func-indices">📊 FSS-ICU e IMS</h2>
        <div className="tabrow">
          <TextField label="FSS-ICU (/35)" value={form.fss_icu} onChange={x => set('fss_icu', x)} />
          <TextField label="IMS – Movilidad (/10)" value={form.ims} onChange={x => set('ims', x)} />
        </div>
      </section>

      <section aria-labelledby="func-fuerza">
        <h2 id="func-fuerza">🤝 Fuerza y resistencia</h2>
        <div className="tabgrid">
          <TextField label="Handgrip derecho (kg)" value={form.handgrip_d} onChange={x => set('handgrip_d', x)} />
          <TextField label="Handgrip izquierdo (kg)" value={form.handgrip_i} onChange={x => set('handgrip_i', x)} />
          <TextField label="Tiempo de trabajo (min)" value={form.tiempo_trabajo_min} onChange={x => set('tiempo_trabajo_min', x)} />
          <TextField label="% FCR" value={form.pct_fcr} onChange={x => set('pct_fcr', x)} />
          <TextField label="Borg fuerza (/10)" value={form.borg_fuerza} onChange={x => set('borg_fuerza', x)} />
          <TextField label="Dolor ENA (/10)" value={form.dolor_ena} onChange={x => set('dolor_ena', x)} />
          <SelectField label="DVA usada en sesión" value={form.dva_sesion ? 'Sí' : 'No'}
            onChange={x => setForm(f => ({ ...f, dva_sesion: x === 'Sí' }))} options={['No', 'Sí']} />
        </div>
      </section>

      <section aria-labelledby="func-set">
        <h2 id="func-set">🏃 SET / UMA</h2>
        <div className="tabrow">
          <TextField label="UMA (MET)" value={form.uma} onChange={x => set('uma', x)} />
          <TextField label="SET – tiempo de ejercicio (min)" value={form.set_min} onChange={x => set('set_min', x)} />
        </div>
      </section>

      <Button onClick={save}>+ Guardar evaluación</Button>

      <section aria-labelledby="func-historial">
        <h2 id="func-historial">🕑 Historial de evaluaciones</h2>
        <ul className="vent-gases">
          {[...stay.mrc_assessments]
            .sort((a, b) => b.assessed_at.localeCompare(a.assessed_at))
            .slice(0, 5)
            .map(a => {
              const total = calcMrcTotal(a)
              const i = mrcInterp(total)
              return (
                <li key={a.id}>
                  <div className="vent-gas-head">
                    <strong>
                      {new Date(a.assessed_at).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </strong>
                    <Badge tone={i.tone}>MRC-SS {total ?? '—'} / 60 · {i.label}</Badge>
                    <ConfirmDeleteButton
                      ariaLabel="Eliminar evaluación"
                      confirmText="¿Eliminar esta evaluación MRC-SS?"
                      idleLabel="✕"
                      idleClassName="agenda__del"
                      onConfirm={() => mrc.remove.mutate(a.id)} />
                  </div>
                </li>
              )
            })}
          {stay.mrc_assessments.length === 0 && <li className="vent-hint">Sin evaluaciones registradas.</li>}
        </ul>
      </section>

      <p className="sugerencias-disclaimer">
        Material de apoyo clínico (RYGF · UPC HUAP) — no reemplaza el juicio del equipo tratante.
      </p>
    </div>
  )
}
```

- [ ] **Step 4: Ejecutar el test y verificar que pasa**

Run: `cd app && npm test -- TabFuncional.test`
Expected: PASS, los 3 tests en verde.

- [ ] **Step 5: Commit**

```bash
git add app/src/features/patient/tabs/TabFuncional.tsx app/src/features/patient/tabs/TabFuncional.test.tsx
git commit -m "feat: pestaña Funcional (MRC-SS/FSS-ICU/IMS) con TDD"
```

---

## Task 6: Pestaña "EMR" — `TabEMR.tsx` (TDD)

**Files:**
- Create: `app/src/features/patient/tabs/TabEMR.tsx`
- Test: `app/src/features/patient/tabs/TabEMR.test.tsx`

- [ ] **Step 1: Escribir el test (falla porque el componente no existe)**

```tsx
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, vi } from 'vitest'

const childRow = { insert: { mutate: vi.fn() }, update: { mutate: vi.fn() }, remove: { mutate: vi.fn() } }
vi.mock('../../../lib/supabase/useBoard', () => ({
  useChildRow: () => childRow,
}))

import { TabEMR } from './TabEMR'
import type { StayFull } from '../../../lib/supabase/types'

const base = {
  id: 's1', box_number: 1, active: true, patient_name: '', record_number: '',
  diagnosis: '', alert: 'none', residente: '', destination: '', dias_hosp: 0,
  dias_vm: 0, vm_mode: '—', rcp: 'Sí', alergias: '', prevision: 'Fonasa A',
  consentimiento: false, balance_meta: '', balance_real: '', contacto_nombre: '',
  contacto_tel: '', ultimo_contacto: '', notes: '', enfermera: '', tens: '', kine: '',
  updated_at: '', goals: [], antibiotics: [], accesses: [], sofa_assessments: [],
  vent_settings: null, blood_gases: [], nutrition: null, mrc_assessments: [], emr_sessions: [],
} satisfies StayFull

beforeEach(() => {
  childRow.insert.mutate.mockClear()
  childRow.remove.mutate.mockClear()
})

test('sesión de Fuerza envía repeticiones y series; minutos queda null', async () => {
  render(<TabEMR stay={base} />)
  fireEvent.change(screen.getByLabelText('Carga (%)'), { target: { value: '30' } })
  fireEvent.change(screen.getByLabelText('cmH₂O'), { target: { value: '8' } })
  fireEvent.change(screen.getByLabelText('Repeticiones'), { target: { value: '10' } })
  fireEvent.change(screen.getByLabelText('Series'), { target: { value: '3' } })
  await userEvent.click(screen.getByRole('button', { name: /registrar sesión/i }))

  expect(childRow.insert.mutate).toHaveBeenCalledWith(
    expect.objectContaining({
      stay_id: 's1', session_type: 'fuerza', carga_pct: 30, cmh2o: 8,
      repeticiones: 10, series: 3, minutos: null,
    }),
  )
})

test('sesión de Resistencia envía minutos; repeticiones y series quedan null', async () => {
  render(<TabEMR stay={base} />)
  await userEvent.selectOptions(screen.getByLabelText('Tipo de sesión'), 'Resistencia')
  fireEvent.change(screen.getByLabelText('Carga (%)'), { target: { value: '20' } })
  fireEvent.change(screen.getByLabelText('cmH₂O'), { target: { value: '5' } })
  fireEvent.change(screen.getByLabelText('Minutos de trabajo'), { target: { value: '15' } })
  await userEvent.click(screen.getByRole('button', { name: /registrar sesión/i }))

  expect(childRow.insert.mutate).toHaveBeenCalledWith(
    expect.objectContaining({
      stay_id: 's1', session_type: 'resistencia', carga_pct: 20, cmh2o: 5,
      minutos: 15, repeticiones: null, series: null,
    }),
  )
})

test('borrar una sesión del historial pide confirmación antes de llamar a remove', async () => {
  const stayWithHistory: StayFull = {
    ...base,
    emr_sessions: [{
      id: 'e1', stay_id: 's1', session_at: '2026-07-01T10:00:00Z', session_type: 'fuerza',
      carga_pct: 30, cmh2o: 8, repeticiones: 10, series: 3, minutos: null,
      tolerancia: true, borg: 4, pim_test: null, pef_test: null,
      fraccion_acort_pct: null, eco_diaf_esp_mm: null, eco_diaf_ins_mm: null, notas: '',
    }],
  }
  render(<TabEMR stay={stayWithHistory} />)
  await userEvent.click(screen.getByRole('button', { name: 'Eliminar sesión' }))
  expect(childRow.remove.mutate).not.toHaveBeenCalled()
  await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }))
  expect(childRow.remove.mutate).toHaveBeenCalledWith('e1')
})
```

- [ ] **Step 2: Ejecutar el test y verificar que falla**

Run: `cd app && npm test -- TabEMR.test`
Expected: FAIL — `Cannot find module './TabEMR'`.

- [ ] **Step 3: Implementar `TabEMR.tsx`**

```tsx
import { useState } from 'react'
import { Button } from '../../../design-system/Button'
import { ConfirmDeleteButton } from '../../../design-system/ConfirmDeleteButton'
import { SelectField, TextField } from '../../../design-system/Field'
import { useChildRow } from '../../../lib/supabase/useBoard'
import type { StayFull } from '../../../lib/supabase/types'

const num = (s: string) => (s.trim() === '' ? null : Number(s))

function emptyForm() {
  return {
    session_type: 'fuerza' as 'fuerza' | 'resistencia',
    carga_pct: '', cmh2o: '', repeticiones: '', series: '', minutos: '',
    tolerancia: true, borg: '',
    pim_test: '', pef_test: '', fraccion_acort_pct: '', eco_diaf_esp_mm: '', eco_diaf_ins_mm: '',
    notas: '',
  }
}
type Form = ReturnType<typeof emptyForm>

export function TabEMR({ stay }: { stay: StayFull }) {
  const emr = useChildRow('emr_sessions')
  const [form, setForm] = useState<Form>(emptyForm())
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm(f => ({ ...f, [k]: v }))

  const save = () => {
    if (form.carga_pct.trim() === '' && form.cmh2o.trim() === '') return
    emr.insert.mutate({
      stay_id: stay.id,
      session_type: form.session_type,
      carga_pct: num(form.carga_pct),
      cmh2o: num(form.cmh2o),
      repeticiones: form.session_type === 'fuerza' ? num(form.repeticiones) : null,
      series: form.session_type === 'fuerza' ? num(form.series) : null,
      minutos: form.session_type === 'resistencia' ? num(form.minutos) : null,
      tolerancia: form.tolerancia,
      borg: num(form.borg),
      pim_test: num(form.pim_test),
      pef_test: num(form.pef_test),
      fraccion_acort_pct: num(form.fraccion_acort_pct),
      eco_diaf_esp_mm: num(form.eco_diaf_esp_mm),
      eco_diaf_ins_mm: num(form.eco_diaf_ins_mm),
      notas: form.notas,
    })
    setForm(emptyForm())
  }

  return (
    <div>
      <section aria-labelledby="emr-nueva">
        <h2 id="emr-nueva">🏋️ Registrar sesión de entrenamiento muscular respiratorio</h2>
        <div className="tabgrid">
          <SelectField label="Tipo de sesión"
            value={form.session_type === 'fuerza' ? 'Fuerza' : 'Resistencia'}
            onChange={x => set('session_type', x === 'Fuerza' ? 'fuerza' : 'resistencia')}
            options={['Fuerza', 'Resistencia']} />
          <TextField label="Carga (%)" value={form.carga_pct} onChange={x => set('carga_pct', x)} />
          <TextField label="cmH₂O" value={form.cmh2o} onChange={x => set('cmh2o', x)} />
          {form.session_type === 'fuerza' ? (
            <>
              <TextField label="Repeticiones" value={form.repeticiones} onChange={x => set('repeticiones', x)} />
              <TextField label="Series" value={form.series} onChange={x => set('series', x)} />
            </>
          ) : (
            <TextField label="Minutos de trabajo" value={form.minutos} onChange={x => set('minutos', x)} />
          )}
          <SelectField label="Tolerancia" value={form.tolerancia ? 'Sí' : 'No'}
            onChange={x => set('tolerancia', x === 'Sí')} options={['Sí', 'No']} />
          <TextField label="Borg (/10)" value={form.borg} onChange={x => set('borg', x)} />
        </div>

        <details className="vent-calc">
          <summary>🔬 Chequeo basal (opcional, remedición periódica)</summary>
          <div className="tabgrid">
            <TextField label="PIM (cmH₂O)" value={form.pim_test} onChange={x => set('pim_test', x)} />
            <TextField label="PEF (L/min)" value={form.pef_test} onChange={x => set('pef_test', x)} />
            <TextField label="Fracción acort. (%)" value={form.fraccion_acort_pct} onChange={x => set('fraccion_acort_pct', x)} />
            <TextField label="Eco Diaf. esp. (mm)" value={form.eco_diaf_esp_mm} onChange={x => set('eco_diaf_esp_mm', x)} />
            <TextField label="Eco Diaf. ins. (mm)" value={form.eco_diaf_ins_mm} onChange={x => set('eco_diaf_ins_mm', x)} />
          </div>
        </details>

        <div className="tabgrid__full">
          <TextField label="Notas de la sesión" multiline value={form.notas} onChange={x => set('notas', x)} />
        </div>

        <Button onClick={save}>+ Registrar sesión</Button>
      </section>

      <section aria-labelledby="emr-historial">
        <h2 id="emr-historial">🕑 Historial de sesiones</h2>
        <ul className="vent-gases">
          {[...stay.emr_sessions]
            .sort((a, b) => b.session_at.localeCompare(a.session_at))
            .slice(0, 5)
            .map(s => (
              <li key={s.id}>
                <div className="vent-gas-head">
                  <strong>
                    {new Date(s.session_at).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </strong>
                  <span>
                    {s.session_type === 'fuerza' ? 'Fuerza' : 'Resistencia'} · Carga {s.carga_pct ?? '—'}% · {s.cmh2o ?? '—'} cmH₂O
                    {s.session_type === 'fuerza'
                      ? ` · ${s.repeticiones ?? '—'}×${s.series ?? '—'}`
                      : ` · ${s.minutos ?? '—'} min`}
                    {' '}· Borg {s.borg ?? '—'} · {s.tolerancia ? 'Toleró' : 'No toleró'}
                  </span>
                  <ConfirmDeleteButton
                    ariaLabel="Eliminar sesión"
                    confirmText="¿Eliminar esta sesión de EMR?"
                    idleLabel="✕"
                    idleClassName="agenda__del"
                    onConfirm={() => emr.remove.mutate(s.id)} />
                </div>
                {s.notas && <p className="vent-hint">{s.notas}</p>}
              </li>
            ))}
          {stay.emr_sessions.length === 0 && <li className="vent-hint">Sin sesiones registradas.</li>}
        </ul>
      </section>
    </div>
  )
}
```

- [ ] **Step 4: Ejecutar el test y verificar que pasa**

Run: `cd app && npm test -- TabEMR.test`
Expected: PASS, los 3 tests en verde.

- [ ] **Step 5: Commit**

```bash
git add app/src/features/patient/tabs/TabEMR.tsx app/src/features/patient/tabs/TabEMR.test.tsx
git commit -m "feat: pestaña EMR (entrenamiento muscular respiratorio) con TDD"
```

---

## Task 7: Integrar las pestañas nuevas en `PatientPage.tsx`

**Files:**
- Modify: `app/src/features/patient/PatientPage.tsx`

- [ ] **Step 1: Importar los componentes nuevos**

En `app/src/features/patient/PatientPage.tsx`, después de la línea `import { TabSugerencias } from './tabs/TabSugerencias'` (línea 16), agregar:

```tsx
import { TabFuncional } from './tabs/TabFuncional'
import { TabEMR } from './tabs/TabEMR'
```

- [ ] **Step 2: Agregar las pestañas al arreglo `tabs`, después de "Sugerencias"**

Cambiar:

```tsx
              { id: 'sugerencias', label: 'Sugerencias', content: <TabSugerencias stay={stay} /> },
            ]}
```

por:

```tsx
              { id: 'sugerencias', label: 'Sugerencias', content: <TabSugerencias stay={stay} /> },
              { id: 'funcional', label: 'Funcional', content: <TabFuncional stay={stay} /> },
              { id: 'emr', label: 'EMR', content: <TabEMR stay={stay} /> },
            ]}
```

- [ ] **Step 3: Verificar tipos y suite completa**

Run: `cd app && npm run typecheck`
Expected: sin salida (exit 0).

Run: `cd app && npm test`
Expected: todos los tests en verde — sin fallos ni regresiones respecto a los 114 anteriores (el total sube con los tests nuevos de `functional.test.ts`, `TabFuncional.test.tsx` y `TabEMR.test.tsx`).

- [ ] **Step 4: Commit**

```bash
git add app/src/features/patient/PatientPage.tsx
git commit -m "feat: integrar pestañas Funcional y EMR en el detalle de paciente"
```

---

## Task 8: Extender la verificación de esquema en vivo

**Files:**
- Modify: `scripts/check-schema.mjs`

- [ ] **Step 1: Agregar las tablas nuevas a la lista verificada**

En `scripts/check-schema.mjs:4`, cambiar:

```js
const tables = ['stays', 'sofa_assessments', 'goals', 'antibiotics', 'accesses', 'nutrition', 'unit_events', 'profiles', 'vent_settings', 'blood_gases']
```

por:

```js
const tables = ['stays', 'sofa_assessments', 'goals', 'antibiotics', 'accesses', 'nutrition', 'unit_events', 'profiles', 'vent_settings', 'blood_gases', 'mrc_assessments', 'emr_sessions']
```

- [ ] **Step 2: Ejecutar contra el proyecto real y verificar que las tablas responden 200**

Run: `npm run verify:schema` (desde `app/`, o `node scripts/check-schema.mjs` desde la raíz del repo)
Expected: todas las líneas terminan en `HTTP 200 OK (tabla existe, RLS activa)`, incluidas `mrc_assessments` y `emr_sessions`.

- [ ] **Step 3: Commit**

```bash
git add scripts/check-schema.mjs
git commit -m "test: incluir mrc_assessments y emr_sessions en la verificación de esquema"
```

---

## Task 9: Build, deploy y verificación en producción

**Files:** ninguno (solo build, deploy y verificación).

- [ ] **Step 1: Build de producción**

Run: `cd app && npm run build`
Expected: build exitoso, sin warnings de tamaño de bundle nuevos causados por esta rama.

- [ ] **Step 2: Deploy a producción**

Run: `cd app && npm run vercel -- deploy --prod --yes --token <TOKEN>`
(usar el token de Vercel vigente; si se rotó desde la última sesión, pedir el nuevo al usuario)
Expected: URL de deploy `https://ucicontrol.cl` respondiendo (HTTP 200).

- [ ] **Step 3: Verificación funcional en vivo (Chrome DevTools MCP)**

Con una sesión autenticada real:
1. Navegar a un box con paciente activo → pestaña "Funcional".
2. Completar los 12 campos MRC-SS con valores de prueba, confirmar que el Badge de total/interpretación se actualiza en vivo.
3. Guardar la evaluación, confirmar que aparece en el historial con la fecha correcta.
4. Repetir un flujo equivalente en "EMR": registrar una sesión de Fuerza y una de Resistencia, confirmar que ambas aparecen en el historial con los campos correctos.
5. Borrar la evaluación/sesión de prueba usando `ConfirmDeleteButton` (Confirmar, no Cancelar) para no dejar basura de prueba en producción.

Expected: los 4 flujos funcionan sin errores de consola, y no queda ningún dato de prueba en la base al finalizar.

- [ ] **Step 4: Lighthouse de accesibilidad en la página de paciente**

Ejecutar `mcp__plugin_chrome-devtools-mcp_chrome-devtools__lighthouse_audit` sobre `/box/:n` con las pestañas nuevas visibles.
Expected: 100/100 en accesibilidad, igual que el resto de la app.

- [ ] **Step 5: Push a GitHub**

```bash
git push origin master
```

---

## Notas para quien ejecute este plan

- El anti-patrón de este proyecto (clobbering por `mutate({ ...objetoViejo, ...patch })`) **no aplica aquí**: cada guardado es un `insert` de una fila nueva, no un `upsert`/`update` de una fila compartida — por diseño, no hay snapshot viejo que pueda pisar nada.
- Todos los campos numéricos opcionales en los formularios usan el mismo patrón que "Registrar gas nuevo" en `TabVentilacion.tsx`: `TextField` (string) + función `num()` que convierte `''` a `null`. Esto es intencional: a diferencia de `NumberField`, permite dejar un campo genuinamente vacío en vez de forzar un `0` que podría confundirse con un valor clínico real (ej. MRC 0 = parálisis total).
- No se migran los valores de ejemplo del prototipo (ej. "Abd. HH D = 3" precargado) como valores por defecto — cada formulario nuevo empieza vacío. Cargar valores de ejemplo en un formulario clínico real invita a guardarlos sin querer.
