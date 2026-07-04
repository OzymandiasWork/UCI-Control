# UCI Control v1 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir la app UCI Control v1: tablero de 24 boxes + resumen ejecutivo, datos compartidos en tiempo real (Supabase), tema claro estilo Claude, GSAP, WCAG 2.2 AA, lista para empaquetar con Capacitor.

**Architecture:** SPA React + Vite + TypeScript en `app/`, sin servidor propio: Supabase provee Postgres + Auth + Realtime. Estado de servidor con TanStack Query invalidado por suscripciones Realtime. Lógica clínica en funciones puras (`src/lib/clinical`), UI compuesta desde un design system propio con tokens claros.

**Tech Stack:** React 18, Vite 5, TypeScript, react-router-dom v6, @supabase/supabase-js v2, @tanstack/react-query v5, GSAP, Vitest + Testing Library + vitest-axe, Capacitor 6.

**Spec:** `docs/superpowers/specs/2026-07-03-uci-control-app-design.md`
**Prototipos de referencia (solo lectura):**
- `UCI_Dashboard_Completo/UCI_Dashboard_Completo/uci_dashboard.jsx` (tablero; en adelante **PROTO-DASH**)
- `UCI_Dashboard_Completo/UCI_Dashboard_Completo/uci_executive.jsx` (ejecutivo; en adelante **PROTO-EXEC**)

**Convenciones para el ejecutor:**
- Directorio de trabajo de la app: `app/` (todos los comandos `npm`/`npx` se corren ahí salvo que se indique otra cosa).
- Commits desde la raíz del repo (`UCI CONTROL/`). Mensajes en inglés, convencionales (`feat:`, `test:`, `chore:`).
- Shell en Windows: usar Git Bash (herramienta Bash) para los comandos tal como están escritos.
- TDD: nunca escribir implementación antes de ver el test fallar.

---

## File Structure (mapa completo)

```
app/
  package.json, vite.config.ts, tsconfig.json, index.html, .env.local (no se commitea)
  capacitor.config.ts
  src/
    main.tsx                      # bootstrap: QueryClient + Router + estilos
    App.tsx                       # rutas + guard de sesión
    design-system/
      tokens.css                  # variables CSS (colores, tipografía, espaciado, foco)
      global.css                  # reset, base, utilidades
      Badge.tsx                   # etiqueta de estado (texto + color, nunca solo color)
      Button.tsx
      Field.tsx                   # Label + Input/Select/Textarea/Number accesibles
      Tabs.tsx                    # patrón WAI-ARIA tabs
      __tests__/design-system.test.tsx
    lib/
      clinical/
        sofa.ts                   # dominios, calcSofa, sofaRisk
        sofa.test.ts
        suggestions.ts            # SUGGESTIONS + getSuggestion
        suggestions.test.ts
        constants.ts              # alertas, nutrición, VM, accesos, previsiones
      supabase/
        client.ts                 # createClient
        types.ts                  # tipos de filas (Stay, Goal, ...)
        useSession.ts
        useBoard.ts               # query tablero + realtime + mutaciones
        useEvents.ts              # agenda del día
    features/
      auth/LoginPage.tsx
      board/BoardPage.tsx         # grid 24 boxes + filtros + agenda
      board/BoxCard.tsx           # tarjeta resumen de un box
      board/BoxCard.test.tsx
      board/AgendaPanel.tsx
      board/animations.ts         # GSAP del tablero
      patient/PatientPage.tsx     # detalle de box: shell + tabs
      patient/IngresoEgreso.tsx   # ingresar/egresar paciente
      patient/tabs/TabClinico.tsx
      patient/tabs/TabEquipo.tsx
      patient/tabs/TabATB.tsx
      patient/tabs/TabNutricion.tsx
      patient/tabs/TabSofa.tsx
      patient/tabs/TabSofa.test.tsx
      patient/tabs/TabMetas.tsx
      patient/tabs/TabSugerencias.tsx
      executive/ExecutivePage.tsx
      executive/kpis.ts           # agregados puros desde los datos del tablero
      executive/kpis.test.ts
      shared/ConnectionBanner.tsx
    a11y/axe.test.tsx             # smoke axe de pantallas principales
supabase/
  migrations/001_schema.sql       # esquema completo + RLS + triggers + realtime
```

Responsabilidades: `lib/clinical` y `executive/kpis.ts` son funciones puras sin UI ni red; `design-system` no conoce el dominio clínico; `lib/supabase` es el único módulo que habla con la red; las `features` componen todo.

---

### Task 1: Repo + scaffold Vite

**Files:**
- Create: `app/` (scaffold Vite), `app/.gitignore`, `.gitignore` (raíz)

- [ ] **Step 1: Git init y commit del spec (si aún no está commiteado)**

```bash
cd "/c/Users/Ozymandias/Downloads/UCI CONTROL"
git init 2>/dev/null; git rev-parse --git-dir
printf 'node_modules/\ndist/\n.env.local\n*.log\n' > .gitignore
git add .gitignore docs/
git commit -m "chore: init repo with design spec"
```
Expected: commit creado (o "nothing to commit" si el spec ya estaba commiteado — en ese caso commitear solo `.gitignore`).

- [ ] **Step 2: Scaffold**

```bash
cd "/c/Users/Ozymandias/Downloads/UCI CONTROL"
npm create vite@latest app -- --template react-ts
cd app && npm install
```
Expected: carpeta `app/` con plantilla react-ts, `npm install` sin errores.

- [ ] **Step 3: Dependencias**

```bash
cd app
npm i @supabase/supabase-js @tanstack/react-query @tanstack/react-query-persist-client @tanstack/query-sync-storage-persister react-router-dom gsap @fontsource-variable/inter @fontsource-variable/source-serif-4
npm i -D vitest jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom vitest-axe @types/node
```
Expected: instala sin errores (warnings de peer deps son aceptables).

- [ ] **Step 4: Configurar Vitest**

Reemplazar `app/vite.config.ts`:

```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test-setup.ts',
    css: false,
  },
})
```

Crear `app/src/test-setup.ts`:

```ts
import '@testing-library/jest-dom/vitest'
```

- [ ] **Step 5: Limpiar plantilla y smoke test**

Borrar `app/src/App.css` y `app/src/assets/react.svg`. Reemplazar `app/src/App.tsx`:

```tsx
export default function App() {
  return <h1>UCI Control</h1>
}
```

Reemplazar `app/src/main.tsx`:

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

Borrar `app/src/index.css` y quitar su import de `main.tsx` (ya quitado arriba). Crear `app/src/App.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import App from './App'

test('renderiza el título', () => {
  render(<App />)
  expect(screen.getByRole('heading', { name: /uci control/i })).toBeInTheDocument()
})
```

- [ ] **Step 6: Verificar**

```bash
cd app && npx vitest run && npx tsc --noEmit && npm run build
```
Expected: 1 test PASS, tsc sin errores, build genera `dist/`.

- [ ] **Step 7: Commit**

```bash
cd "/c/Users/Ozymandias/Downloads/UCI CONTROL"
git add app && git commit -m "chore: scaffold Vite react-ts app with vitest"
```

---

### Task 2: Design tokens y estilos base

**Files:**
- Create: `app/src/design-system/tokens.css`, `app/src/design-system/global.css`
- Modify: `app/src/main.tsx`, `app/index.html`

- [ ] **Step 1: Crear `app/src/design-system/tokens.css`**

Paleta clara estilo Claude. Los pares de estado (texto sobre tinte) están elegidos para contraste ≥ 4.5:1; el terracota `--accent` se usa para gráficos/bordes/foco (≥3:1) y `--accent-strong` para texto interactivo.

```css
:root {
  /* Superficie */
  --bg: #FAF9F5;
  --surface: #FFFFFF;
  --surface-raised: #FFFFFF;
  --border: #E8E6DE;
  --border-strong: #D5D2C6;

  /* Tinta */
  --ink: #1A1915;
  --ink-secondary: #5E5B52;
  --ink-muted: #77746A;

  /* Acento Claude */
  --accent: #D97757;          /* gráficos, bordes, foco (3:1 sobre --bg) */
  --accent-strong: #A8452C;   /* texto interactivo y botones (AA sobre claro) */
  --accent-tint: #FBEDE7;

  /* Estados clínicos: texto AA sobre su tinte */
  --ok-text: #1A7F37;      --ok-tint: #DAFBE1;      --ok-border: #1A7F37;
  --warn-text: #9A6700;    --warn-tint: #FFF8C5;    --warn-border: #9A6700;
  --danger-text: #A40E26;  --danger-tint: #FFEBE9;  --danger-border: #A40E26;
  --eol-text: #6639BA;     --eol-tint: #FBEFFF;     --eol-border: #6639BA;
  --proc-text: #0550AE;    --proc-tint: #DDF4FF;    --proc-border: #0550AE;
  --trial-text: #116964;   --trial-tint: #D5F5F0;   --trial-border: #116964;

  /* Tipografía */
  --font-ui: 'Inter Variable', system-ui, sans-serif;
  --font-display: 'Source Serif 4 Variable', Georgia, serif;

  /* Métrica */
  --radius: 10px;
  --radius-sm: 6px;
  --shadow: 0 1px 3px rgba(26, 25, 21, 0.07), 0 1px 2px rgba(26, 25, 21, 0.04);
  --shadow-raised: 0 4px 16px rgba(26, 25, 21, 0.10);
  --space-1: 4px; --space-2: 8px; --space-3: 12px; --space-4: 16px;
  --space-5: 24px; --space-6: 32px;
  --tap-min: 24px; /* WCAG 2.2 — 2.5.8 target size */

  /* Foco */
  --focus-ring: 2px solid var(--accent);
  --focus-offset: 2px;
}
```

- [ ] **Step 2: Crear `app/src/design-system/global.css`**

```css
*, *::before, *::after { box-sizing: border-box; }

html { -webkit-text-size-adjust: 100%; }

body {
  margin: 0;
  background: var(--bg);
  color: var(--ink);
  font-family: var(--font-ui);
  font-size: 16px;
  line-height: 1.5;
}

h1, h2, h3 { font-family: var(--font-display); font-weight: 600; margin: 0; }

:focus-visible {
  outline: var(--focus-ring);
  outline-offset: var(--focus-offset);
  border-radius: var(--radius-sm);
}

button, input, select, textarea { font: inherit; color: inherit; }

button { cursor: pointer; min-width: var(--tap-min); min-height: var(--tap-min); }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}

.visually-hidden {
  position: absolute; width: 1px; height: 1px;
  clip-path: inset(50%); overflow: hidden; white-space: nowrap;
}
```

- [ ] **Step 3: Importar fuentes y estilos en `app/src/main.tsx`** (antes del import de `App`):

```tsx
import '@fontsource-variable/inter'
import '@fontsource-variable/source-serif-4'
import './design-system/tokens.css'
import './design-system/global.css'
```

- [ ] **Step 4: `app/index.html`** — dejar `<html lang="es">`, `<title>UCI Control — HUAP Torre Valech</title>` y agregar `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />` (viewport-fit para safe areas de Capacitor).

- [ ] **Step 5: Verificar y commit**

```bash
cd app && npx vitest run && npm run build
cd .. && git add app && git commit -m "feat: light Claude-style design tokens and base styles"
```
Expected: tests PASS, build OK.

---

### Task 3: Lógica clínica — SOFA (TDD)

**Files:**
- Create: `app/src/lib/clinical/sofa.ts`, `app/src/lib/clinical/sofa.test.ts`

- [ ] **Step 1: Test que falla — `app/src/lib/clinical/sofa.test.ts`**

```ts
import { describe, expect, test } from 'vitest'
import { SOFA_DOMAINS, calcSofa, emptySofa, sofaRisk } from './sofa'

describe('SOFA', () => {
  test('hay 6 dominios con 5 opciones cada uno (0 a 4)', () => {
    expect(SOFA_DOMAINS).toHaveLength(6)
    for (const d of SOFA_DOMAINS) {
      expect(d.options.map(o => o.score)).toEqual([0, 1, 2, 3, 4])
    }
  })

  test('emptySofa: todos los dominios en null', () => {
    expect(Object.values(emptySofa())).toEqual([null, null, null, null, null, null])
  })

  test('calcSofa: todo null devuelve null (sin evaluar)', () => {
    expect(calcSofa(emptySofa())).toBeNull()
  })

  test('calcSofa: suma tratando null como 0', () => {
    expect(calcSofa({ resp: 3, coag: null, liver: 1, cardio: 0, neuro: null, renal: 2 })).toBe(6)
  })

  test('calcSofa: máximo 24', () => {
    expect(calcSofa({ resp: 4, coag: 4, liver: 4, cardio: 4, neuro: 4, renal: 4 })).toBe(24)
  })

  test.each([
    [null, '—'],
    [0, 'Mortalidad <10%'],
    [1, 'Mortalidad <10%'],
    [2, 'Mortalidad ~10%'],
    [3, 'Mortalidad ~10%'],
    [4, 'Mortalidad ~20%'],
    [5, 'Mortalidad ~20%'],
    [6, 'Mortalidad ~40%'],
    [8, 'Mortalidad ~40%'],
    [9, 'Mortalidad ~50%'],
    [11, 'Mortalidad ~50%'],
    [12, 'Mortalidad >80%'],
    [24, 'Mortalidad >80%'],
  ])('sofaRisk(%s) → riesgo "%s"', (total, risk) => {
    expect(sofaRisk(total as number | null).risk).toBe(risk)
  })

  test('sofaRisk expone un tono para la UI', () => {
    expect(sofaRisk(0).tone).toBe('ok')
    expect(sofaRisk(7).tone).toBe('warn')
    expect(sofaRisk(12).tone).toBe('danger')
    expect(sofaRisk(null).tone).toBe('muted')
  })
})
```

- [ ] **Step 2: Verificar que falla**

```bash
cd app && npx vitest run src/lib/clinical/sofa.test.ts
```
Expected: FAIL — "Cannot find module './sofa'".

- [ ] **Step 3: Implementar `app/src/lib/clinical/sofa.ts`**

Los dominios y umbrales se migran de **PROTO-DASH** líneas 23-47 (`SOFA_DOMAINS`, `emptySofa`, `calcSofa`, `sofaColor`). Copiar los datos textuales de `SOFA_DOMAINS` (labels/hints/options) **verbatim** desde ahí; la estructura TypeScript es esta:

```ts
export type SofaDomainKey = 'resp' | 'coag' | 'liver' | 'cardio' | 'neuro' | 'renal'
export type SofaScores = Record<SofaDomainKey, number | null>
export type SofaTone = 'ok' | 'warn' | 'danger' | 'muted'

export interface SofaDomain {
  key: SofaDomainKey
  full: string
  hint: string
  options: { score: number; label: string }[]
}

export const SOFA_DOMAINS: SofaDomain[] = [
  // ← copiar las 6 entradas verbatim de PROTO-DASH líneas 24-35
]

export const emptySofa = (): SofaScores =>
  ({ resp: null, coag: null, liver: null, cardio: null, neuro: null, renal: null })

export function calcSofa(s: SofaScores): number | null {
  const v = Object.values(s)
  if (v.every(x => x === null)) return null
  return v.reduce<number>((a, x) => a + (x ?? 0), 0)
}

export function sofaRisk(total: number | null): { risk: string; tone: SofaTone } {
  if (total === null) return { risk: '—', tone: 'muted' }
  if (total <= 1) return { risk: 'Mortalidad <10%', tone: 'ok' }
  if (total <= 3) return { risk: 'Mortalidad ~10%', tone: 'ok' }
  if (total <= 5) return { risk: 'Mortalidad ~20%', tone: 'warn' }
  if (total <= 8) return { risk: 'Mortalidad ~40%', tone: 'warn' }
  if (total <= 11) return { risk: 'Mortalidad ~50%', tone: 'danger' }
  return { risk: 'Mortalidad >80%', tone: 'danger' }
}
```

Nota: los colores hex del prototipo NO se migran — la UI mapea `tone` a los tokens (`--ok-*`, `--warn-*`, `--danger-*`).

- [ ] **Step 4: Verificar que pasa**

```bash
cd app && npx vitest run src/lib/clinical/sofa.test.ts
```
Expected: PASS (todos los tests).

- [ ] **Step 5: Commit**

```bash
cd "/c/Users/Ozymandias/Downloads/UCI CONTROL"
git add app/src/lib/clinical && git commit -m "feat: SOFA scoring domain logic with tests"
```

---

### Task 4: Lógica clínica — sugerencias de tratamiento (TDD)

**Files:**
- Create: `app/src/lib/clinical/suggestions.ts`, `app/src/lib/clinical/suggestions.test.ts`

- [ ] **Step 1: Test que falla — `app/src/lib/clinical/suggestions.test.ts`**

```ts
import { describe, expect, test } from 'vitest'
import { SUGGESTIONS, getSuggestion } from './suggestions'

describe('getSuggestion', () => {
  test('devuelve null sin diagnóstico', () => {
    expect(getSuggestion('')).toBeNull()
    expect(getSuggestion(undefined)).toBeNull()
  })

  test('matchea por substring, sin distinguir mayúsculas', () => {
    const s = getSuggestion('Paciente con SHOCK SEPTICO foco pulmonar')
    expect(s?.matched).toBe('shock septico')
  })

  test('diagnóstico sin match devuelve null', () => {
    expect(getSuggestion('fractura de tobillo')).toBeNull()
  })

  test('cada sugerencia tiene atb, goals y monitor no vacíos', () => {
    for (const [key, s] of Object.entries(SUGGESTIONS)) {
      expect(s.atb, key).toBeTruthy()
      expect(s.goals.length, key).toBeGreaterThan(0)
      expect(s.monitor.length, key).toBeGreaterThan(0)
    }
  })

  test('el catálogo cubre los 13 cuadros del prototipo', () => {
    expect(Object.keys(SUGGESTIONS)).toHaveLength(13)
    expect(SUGGESTIONS).toHaveProperty('nac')
    expect(SUGGESTIONS).toHaveProperty('politrauma')
  })
})
```

- [ ] **Step 2: Verificar que falla**

```bash
cd app && npx vitest run src/lib/clinical/suggestions.test.ts
```
Expected: FAIL — "Cannot find module './suggestions'".

- [ ] **Step 3: Implementar `app/src/lib/clinical/suggestions.ts`**

El catálogo clínico se copia **verbatim** de **PROTO-DASH** líneas 52-66 (objeto `SUGGESTIONS` completo, 13 entradas: shock septico, shock distributivo, shock hemorragico, falla respiratoria, nac, neumonia, acv, pcr recuperado, ira, politrauma, perforacion viscera hueca, trauma raquimedular, sd convulsivo). No parafrasear ni "mejorar" el contenido clínico — es material validado por el médico autor. Estructura:

```ts
export interface Suggestion {
  atb: string
  goals: string[]
  monitor: string[]
}

export const SUGGESTIONS: Record<string, Suggestion> = {
  // ← copiar las 13 entradas verbatim de PROTO-DASH líneas 53-65
}

export function getSuggestion(diagnosis: string | undefined | null):
  ({ matched: string } & Suggestion) | null {
  if (!diagnosis) return null
  const key = diagnosis.toLowerCase().trim()
  for (const [k, v] of Object.entries(SUGGESTIONS)) {
    if (key.includes(k)) return { matched: k, ...v }
  }
  return null
}
```

- [ ] **Step 4: Verificar que pasa**

```bash
cd app && npx vitest run src/lib/clinical/suggestions.test.ts
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd "/c/Users/Ozymandias/Downloads/UCI CONTROL"
git add app/src/lib/clinical && git commit -m "feat: treatment suggestion catalog with tests"
```

---

### Task 5: Lógica clínica — constantes de dominio

**Files:**
- Create: `app/src/lib/clinical/constants.ts`

- [ ] **Step 1: Crear `app/src/lib/clinical/constants.ts`**

Valores migrados de **PROTO-DASH** líneas 80-92. Las listas textuales (`NUTRITION_TYPES`, `VM_MODES`, `ACCESS_TYPES`, `PREVISIONES`) se copian verbatim de ahí. Las alertas cambian: el prototipo traía hex de tema oscuro; aquí cada alerta lleva un `tone` que la UI mapea a tokens claros.

```ts
export type AlertKey = 'none' | 'moderate' | 'critical' | 'eol' | 'procurement' | 'trial'
export type AlertTone = 'ok' | 'warn' | 'danger' | 'eol' | 'proc' | 'trial'

export const ALERT_TYPES: Record<AlertKey, { label: string; tone: AlertTone }> = {
  none:        { label: 'Sin alerta',   tone: 'ok' },
  moderate:    { label: 'Moderado',     tone: 'warn' },
  critical:    { label: 'Crítico',      tone: 'danger' },
  eol:         { label: 'Fin de vida',  tone: 'eol' },
  procurement: { label: 'Procuración',  tone: 'proc' },
  trial:       { label: 'UCI Trial',    tone: 'trial' },
}

export const RESIDENTES = ['jimenez', 'saenz', 'razazi', 'rodriguez'] as const

export const NUTRITION_TYPES = [/* ← verbatim PROTO-DASH línea 89 (10 ítems) */] as const
export const VM_MODES = [/* ← verbatim PROTO-DASH línea 90 (10 ítems) */] as const
export const ACCESS_TYPES = [/* ← verbatim PROTO-DASH línea 91 (7 ítems) */] as const
export const PREVISIONES = [/* ← verbatim PROTO-DASH línea 92 (8 ítems) */] as const

export const BOX_COUNT = 24
```

- [ ] **Step 2: Verificar compilación y commit**

```bash
cd app && npx tsc --noEmit
cd .. && git add app/src/lib/clinical && git commit -m "feat: clinical domain constants"
```
Expected: tsc sin errores.

---

### Task 6: Supabase — proyecto, esquema, cliente y tipos

**Files:**
- Create: `supabase/migrations/001_schema.sql`, `app/src/lib/supabase/client.ts`, `app/src/lib/supabase/types.ts`, `app/.env.local`

- [ ] **Step 1: Crear u obtener el proyecto Supabase**

Preferir el MCP de Supabase si está disponible en la sesión: `list_projects` → si no hay proyecto para esto, `create_project` (nombre `uci-control`, plan free; requiere `confirm_cost` antes). Alternativa manual: crearlo en https://supabase.com/dashboard. Obtener URL y publishable/anon key (`get_project_url` + `get_publishable_keys` vía MCP, o Settings → API en el dashboard).

- [ ] **Step 2: Crear `app/.env.local`** (NO se commitea; ya está en `.gitignore` raíz — verificar que ignore `app/.env.local`, si no, agregar la línea):

```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-or-publishable-key>
```

- [ ] **Step 3: Escribir la migración `supabase/migrations/001_schema.sql`**

```sql
-- UCI Control v1 — esquema inicial
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text not null default '',
  created_at timestamptz not null default now()
);

create table public.stays (
  id uuid primary key default gen_random_uuid(),
  box_number int not null check (box_number between 1 and 24),
  active boolean not null default true,
  patient_name text not null default '',
  record_number text not null default '',
  diagnosis text not null default '',
  alert text not null default 'none'
    check (alert in ('none','moderate','critical','eol','procurement','trial')),
  residente text not null default '',
  destination text not null default '',
  dias_hosp int not null default 0,
  dias_vm int not null default 0,
  vm_mode text not null default '—',
  rcp text not null default 'Sí',
  alergias text not null default '',
  prevision text not null default 'Fonasa A',
  consentimiento boolean not null default false,
  balance_meta text not null default '',
  balance_real text not null default '',
  contacto_nombre text not null default '',
  contacto_tel text not null default '',
  ultimo_contacto text not null default '',
  notes text not null default '',
  enfermera text not null default '',
  tens text not null default '',
  kine text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users
);
-- un solo paciente activo por box
create unique index stays_one_active_per_box on public.stays (box_number) where active;

create table public.sofa_assessments (
  id uuid primary key default gen_random_uuid(),
  stay_id uuid not null references public.stays on delete cascade,
  assessed_on date not null default current_date,
  resp int check (resp between 0 and 4),
  coag int check (coag between 0 and 4),
  liver int check (liver between 0 and 4),
  cardio int check (cardio between 0 and 4),
  neuro int check (neuro between 0 and 4),
  renal int check (renal between 0 and 4),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users,
  unique (stay_id, assessed_on)
);

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  stay_id uuid not null references public.stays on delete cascade,
  text text not null default '',
  done boolean not null default false,
  position int not null default 0,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users
);

create table public.antibiotics (
  id uuid primary key default gen_random_uuid(),
  stay_id uuid not null references public.stays on delete cascade,
  drug text not null default '',
  day int not null default 0,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users
);

create table public.accesses (
  id uuid primary key default gen_random_uuid(),
  stay_id uuid not null references public.stays on delete cascade,
  type text not null default 'CVC',
  day int not null default 0,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users
);

create table public.nutrition (
  stay_id uuid primary key references public.stays on delete cascade,
  nutri_type text not null default 'Ayuno',
  via text not null default '',
  cal_meta int not null default 0,
  cal_real int not null default 0,
  dias int not null default 0,
  notes text not null default '',
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users
);

create table public.unit_events (
  id uuid primary key default gen_random_uuid(),
  time text not null default '',
  label text not null default '',
  event_date date not null default current_date,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users
);

-- trigger de auditoría
create or replace function public.touch_row() returns trigger
language plpgsql security definer as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['stays','sofa_assessments','goals','antibiotics','accesses','nutrition','unit_events']
  loop
    execute format('create trigger touch before insert or update on public.%I
                    for each row execute function public.touch_row()', t);
  end loop;
end $$;

-- RLS: solo usuarios autenticados, acceso total (v1 sin roles)
do $$
declare t text;
begin
  foreach t in array array['profiles','stays','sofa_assessments','goals','antibiotics','accesses','nutrition','unit_events']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "authenticated all" on public.%I
                    for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- Realtime
alter publication supabase_realtime add table
  public.stays, public.sofa_assessments, public.goals,
  public.antibiotics, public.accesses, public.nutrition, public.unit_events;
```

- [ ] **Step 4: Aplicar la migración**

Vía MCP: `apply_migration` con nombre `001_schema` y el SQL anterior. Alternativa: pegarlo en el SQL Editor del dashboard. Verificar con `list_tables`: deben existir las 8 tablas.

- [ ] **Step 5: Crear usuarios de prueba**

En el dashboard de Supabase (Authentication → Users → Add user), crear al menos 2 usuarios con email/contraseña (p. ej. `test1@ucicontrol.local`, `test2@ucicontrol.local`) con contraseñas seguras y "Auto Confirm User" activado. (v1 no tiene registro abierto por diseño.)

- [ ] **Step 6: Crear `app/src/lib/supabase/client.ts`**

```ts
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
)
```

- [ ] **Step 7: Crear `app/src/lib/supabase/types.ts`** (tipos de fila, espejo del SQL):

```ts
import type { AlertKey } from '../clinical/constants'

export interface Stay {
  id: string
  box_number: number
  active: boolean
  patient_name: string
  record_number: string
  diagnosis: string
  alert: AlertKey
  residente: string
  destination: string
  dias_hosp: number
  dias_vm: number
  vm_mode: string
  rcp: string
  alergias: string
  prevision: string
  consentimiento: boolean
  balance_meta: string
  balance_real: string
  contacto_nombre: string
  contacto_tel: string
  ultimo_contacto: string
  notes: string
  enfermera: string
  tens: string
  kine: string
  updated_at: string
}

export interface SofaAssessment {
  id: string
  stay_id: string
  assessed_on: string
  resp: number | null
  coag: number | null
  liver: number | null
  cardio: number | null
  neuro: number | null
  renal: number | null
}

export interface Goal { id: string; stay_id: string; text: string; done: boolean; position: number }
export interface Antibiotic { id: string; stay_id: string; drug: string; day: number }
export interface Access { id: string; stay_id: string; type: string; day: number }
export interface Nutrition {
  stay_id: string; nutri_type: string; via: string
  cal_meta: number; cal_real: number; dias: number; notes: string
}
export interface UnitEvent { id: string; time: string; label: string; event_date: string }

/** Stay con sus hijos, como lo devuelve la query del tablero */
export interface StayFull extends Stay {
  goals: Goal[]
  antibiotics: Antibiotic[]
  accesses: Access[]
  nutrition: Nutrition | null
  sofa_assessments: SofaAssessment[]
}
```

- [ ] **Step 8: Verificar y commit**

```bash
cd app && npx tsc --noEmit
cd .. && git add supabase app/src/lib/supabase && git commit -m "feat: supabase schema, client and row types"
```
Expected: tsc sin errores. (El `.env.local` no debe aparecer en `git status`.)

---

### Task 7: Design system — componentes base (TDD)

**Files:**
- Create: `app/src/design-system/Badge.tsx`, `Button.tsx`, `Field.tsx`, `Tabs.tsx`, `app/src/design-system/design-system.css`, `app/src/design-system/__tests__/design-system.test.tsx`

- [ ] **Step 1: Test que falla — `app/src/design-system/__tests__/design-system.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { Badge } from '../Badge'
import { Button } from '../Button'
import { TextField, SelectField, NumberField } from '../Field'
import { Tabs } from '../Tabs'

test('Badge muestra el texto del estado (no solo color)', () => {
  render(<Badge tone="danger">Crítico</Badge>)
  expect(screen.getByText('Crítico')).toBeInTheDocument()
})

test('Button expone su nombre accesible', () => {
  render(<Button onClick={() => {}}>Guardar</Button>)
  expect(screen.getByRole('button', { name: 'Guardar' })).toBeInTheDocument()
})

test('TextField asocia label e input', () => {
  render(<TextField label="Diagnóstico" value="" onChange={() => {}} />)
  expect(screen.getByLabelText('Diagnóstico')).toBeInTheDocument()
})

test('SelectField asocia label y opciones', async () => {
  const onChange = vi.fn()
  render(
    <SelectField label="Previsión" value="Fonasa A" onChange={onChange}
      options={['Fonasa A', 'Isapre']} />,
  )
  await userEvent.selectOptions(screen.getByLabelText('Previsión'), 'Isapre')
  expect(onChange).toHaveBeenCalledWith('Isapre')
})

test('NumberField incrementa y decrementa con nombre accesible', async () => {
  function Wrap() {
    const [v, setV] = useState(2)
    return <NumberField label="Días VM" value={v} onChange={setV} />
  }
  render(<Wrap />)
  await userEvent.click(screen.getByRole('button', { name: /aumentar días vm/i }))
  expect(screen.getByLabelText('Días VM')).toHaveValue(3)
})

test('Tabs implementa el patrón WAI-ARIA y cambia de panel', async () => {
  render(
    <Tabs
      label="Módulos del paciente"
      tabs={[
        { id: 'a', label: 'Clínico', content: <p>panel clínico</p> },
        { id: 'b', label: 'SOFA', content: <p>panel sofa</p> },
      ]}
    />,
  )
  expect(screen.getByRole('tablist', { name: 'Módulos del paciente' })).toBeInTheDocument()
  expect(screen.getByText('panel clínico')).toBeInTheDocument()
  await userEvent.click(screen.getByRole('tab', { name: 'SOFA' }))
  expect(screen.getByText('panel sofa')).toBeInTheDocument()
  expect(screen.getByRole('tab', { name: 'SOFA' })).toHaveAttribute('aria-selected', 'true')
})
```

- [ ] **Step 2: Verificar que falla**

```bash
cd app && npx vitest run src/design-system
```
Expected: FAIL — módulos inexistentes.

- [ ] **Step 3: Crear `app/src/design-system/design-system.css`**

```css
.ds-badge {
  display: inline-flex; align-items: center; gap: var(--space-1);
  padding: 2px var(--space-2);
  border: 1px solid; border-radius: 999px;
  font-size: 0.8rem; font-weight: 600; line-height: 1.4;
}
.ds-badge--ok     { color: var(--ok-text);     background: var(--ok-tint);     border-color: var(--ok-border); }
.ds-badge--warn   { color: var(--warn-text);   background: var(--warn-tint);   border-color: var(--warn-border); }
.ds-badge--danger { color: var(--danger-text); background: var(--danger-tint); border-color: var(--danger-border); }
.ds-badge--eol    { color: var(--eol-text);    background: var(--eol-tint);    border-color: var(--eol-border); }
.ds-badge--proc   { color: var(--proc-text);   background: var(--proc-tint);   border-color: var(--proc-border); }
.ds-badge--trial  { color: var(--trial-text);  background: var(--trial-tint);  border-color: var(--trial-border); }
.ds-badge--muted  { color: var(--ink-secondary); background: var(--bg); border-color: var(--border-strong); }

.ds-button {
  display: inline-flex; align-items: center; justify-content: center; gap: var(--space-2);
  min-height: 40px; padding: var(--space-2) var(--space-4);
  border: 1px solid var(--accent-strong); border-radius: var(--radius-sm);
  background: var(--accent-strong); color: #fff; font-weight: 600;
}
.ds-button:hover { filter: brightness(1.08); }
.ds-button--secondary { background: var(--surface); color: var(--accent-strong); }
.ds-button--danger { background: var(--danger-text); border-color: var(--danger-text); }

.ds-field { display: flex; flex-direction: column; gap: var(--space-1); }
.ds-field > label { font-size: 0.8rem; font-weight: 600; color: var(--ink-secondary); }
.ds-field input, .ds-field select, .ds-field textarea {
  min-height: 40px; padding: var(--space-2) var(--space-3);
  border: 1px solid var(--border-strong); border-radius: var(--radius-sm);
  background: var(--surface);
}
.ds-numfield { display: flex; align-items: center; gap: var(--space-2); }
.ds-numfield input { width: 72px; text-align: center; }
.ds-numfield button {
  min-width: 32px; min-height: 32px;
  border: 1px solid var(--border-strong); border-radius: var(--radius-sm);
  background: var(--surface); font-weight: 700;
}

.ds-tabs [role='tablist'] {
  display: flex; gap: var(--space-1); flex-wrap: wrap;
  border-bottom: 1px solid var(--border);
}
.ds-tabs [role='tab'] {
  border: none; background: none; padding: var(--space-2) var(--space-3);
  color: var(--ink-secondary); font-weight: 600;
  border-bottom: 2px solid transparent; border-radius: 0;
}
.ds-tabs [role='tab'][aria-selected='true'] {
  color: var(--accent-strong); border-bottom-color: var(--accent);
}
.ds-tabs [role='tabpanel'] { padding: var(--space-4) 0; }
```

Importarlo en `app/src/main.tsx` después de `global.css`: `import './design-system/design-system.css'`.

- [ ] **Step 4: Implementar los componentes**

`app/src/design-system/Badge.tsx`:

```tsx
import type { ReactNode } from 'react'

export type BadgeTone = 'ok' | 'warn' | 'danger' | 'eol' | 'proc' | 'trial' | 'muted'

export function Badge({ tone, children }: { tone: BadgeTone; children: ReactNode }) {
  return <span className={`ds-badge ds-badge--${tone}`}>{children}</span>
}
```

`app/src/design-system/Button.tsx`:

```tsx
import type { ButtonHTMLAttributes } from 'react'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger'
}

export function Button({ variant = 'primary', className, ...rest }: Props) {
  const mod = variant === 'primary' ? '' : ` ds-button--${variant}`
  return <button type="button" className={`ds-button${mod}${className ? ` ${className}` : ''}`} {...rest} />
}
```

`app/src/design-system/Field.tsx`:

```tsx
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
```

`app/src/design-system/Tabs.tsx` (patrón WAI-ARIA con flechas):

```tsx
import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react'

export interface TabDef { id: string; label: string; content: ReactNode }

export function Tabs({ tabs, label }: { tabs: TabDef[]; label: string }) {
  const [active, setActive] = useState(tabs[0]?.id)
  const refs = useRef<Record<string, HTMLButtonElement | null>>({})

  function onKeyDown(e: KeyboardEvent, idx: number) {
    const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!dir) return
    e.preventDefault()
    const next = tabs[(idx + dir + tabs.length) % tabs.length]
    setActive(next.id)
    refs.current[next.id]?.focus()
  }

  return (
    <div className="ds-tabs">
      <div role="tablist" aria-label={label}>
        {tabs.map((t, i) => (
          <button
            key={t.id} role="tab" id={`tab-${t.id}`}
            ref={el => { refs.current[t.id] = el }}
            aria-selected={active === t.id}
            aria-controls={`panel-${t.id}`}
            tabIndex={active === t.id ? 0 : -1}
            onClick={() => setActive(t.id)}
            onKeyDown={e => onKeyDown(e, i)}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tabs.map(t => (
        <div key={t.id} role="tabpanel" id={`panel-${t.id}`}
          aria-labelledby={`tab-${t.id}`} hidden={active !== t.id}>
          {active === t.id && t.content}
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 5: Verificar que pasa**

```bash
cd app && npx vitest run src/design-system
```
Expected: PASS (6 tests).

- [ ] **Step 6: Commit**

```bash
cd "/c/Users/Ozymandias/Downloads/UCI CONTROL"
git add app/src/design-system app/src/main.tsx && git commit -m "feat: accessible design system components"
```

---

### Task 8: Autenticación y shell de rutas

**Files:**
- Create: `app/src/lib/supabase/useSession.ts`, `app/src/features/auth/LoginPage.tsx`, `app/src/features/auth/auth.css`
- Modify: `app/src/App.tsx`, `app/src/main.tsx`, `app/src/App.test.tsx`

- [ ] **Step 1: Crear `app/src/lib/supabase/useSession.ts`**

```ts
import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './client'

export function useSession() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  return { session, loading }
}
```

- [ ] **Step 2: Crear `app/src/features/auth/LoginPage.tsx`**

```tsx
import { useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase/client'
import { Button } from '../../design-system/Button'
import { TextField } from '../../design-system/Field'
import './auth.css'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true); setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (error) setError('Credenciales incorrectas. Revisa email y contraseña.')
  }

  return (
    <main className="login">
      <form className="login__card" onSubmit={onSubmit}>
        <h1>UCI Control</h1>
        <p className="login__unit">UCI Torre Valech · HUAP</p>
        <TextField label="Email" value={email} onChange={setEmail} />
        <div className="ds-field">
          <label htmlFor="login-pass">Contraseña</label>
          <input id="login-pass" type="password" value={password}
            onChange={e => setPassword(e.target.value)} autoComplete="current-password" />
        </div>
        {error && <p role="alert" className="login__error">{error}</p>}
        <Button disabled={busy} onClick={() => {}} {...{ type: 'submit' as const }}>
          {busy ? 'Ingresando…' : 'Ingresar'}
        </Button>
      </form>
    </main>
  )
}
```

Nota: `Button` fija `type="button"`; el spread posterior lo sobreescribe a `submit` — mantenerlo así o agregar prop `type` a `Button` si queda más claro.

`app/src/features/auth/auth.css`:

```css
.login { min-height: 100dvh; display: grid; place-items: center; padding: var(--space-4); }
.login__card {
  width: min(380px, 100%); display: flex; flex-direction: column; gap: var(--space-4);
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius); box-shadow: var(--shadow); padding: var(--space-6);
}
.login__unit { color: var(--ink-secondary); margin: 0; }
.login__error { color: var(--danger-text); margin: 0; font-weight: 600; }
```

- [ ] **Step 3: Rutas en `app/src/App.tsx`**

```tsx
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { LoginPage } from './features/auth/LoginPage'
import { useSession } from './lib/supabase/useSession'

function Protected({ children }: { children: React.ReactNode }) {
  const { session, loading } = useSession()
  if (loading) return <p role="status">Cargando…</p>
  if (!session) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<Protected><h1>Tablero (Task 10)</h1></Protected>} />
        <Route path="/box/:boxNumber" element={<Protected><h1>Box (Task 11)</h1></Protected>} />
        <Route path="/ejecutivo" element={<Protected><h1>Ejecutivo (Task 15)</h1></Protected>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
```

- [ ] **Step 4: Actualizar `app/src/App.test.tsx`** (la app ahora exige red para sesión; el test unitario de App se reemplaza por el smoke de LoginPage sin red):

```tsx
import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'

vi.mock('./lib/supabase/client', () => ({
  supabase: { auth: { signInWithPassword: vi.fn() } },
}))

import { LoginPage } from './features/auth/LoginPage'

test('login muestra campos accesibles', () => {
  render(<LoginPage />)
  expect(screen.getByLabelText('Email')).toBeInTheDocument()
  expect(screen.getByLabelText('Contraseña')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /ingresar/i })).toBeInTheDocument()
})
```

- [ ] **Step 5: Verificación manual**

```bash
cd app && npx vitest run && npm run dev
```
Abrir http://localhost:5173 → redirige a `/login`; ingresar con el usuario de prueba de Task 6 → llega a "Tablero (Task 10)". Cerrar dev server.

- [ ] **Step 6: Commit**

```bash
cd "/c/Users/Ozymandias/Downloads/UCI CONTROL"
git add app/src && git commit -m "feat: supabase auth with protected routes"
```

---

### Task 9: Capa de datos — tablero en tiempo real

**Files:**
- Create: `app/src/lib/supabase/useBoard.ts`, `app/src/lib/supabase/useEvents.ts`
- Modify: `app/src/main.tsx`

- [ ] **Step 1: QueryClient con persistencia offline en `app/src/main.tsx`**

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import '@fontsource-variable/inter'
import '@fontsource-variable/source-serif-4'
import './design-system/tokens.css'
import './design-system/global.css'
import './design-system/design-system.css'
import App from './App'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, gcTime: 24 * 60 * 60 * 1000 } },
})
const persister = createSyncStoragePersister({ storage: window.localStorage })

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PersistQueryClientProvider client={queryClient} persistOptions={{ persister }}>
      <App />
    </PersistQueryClientProvider>
  </React.StrictMode>,
)
```

- [ ] **Step 2: Crear `app/src/lib/supabase/useBoard.ts`**

```ts
import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from './client'
import type { Stay, StayFull } from './types'

const BOARD_KEY = ['board']

async function fetchBoard(): Promise<StayFull[]> {
  const { data, error } = await supabase
    .from('stays')
    .select('*, goals(*), antibiotics(*), accesses(*), nutrition(*), sofa_assessments(*)')
    .eq('active', true)
    .order('box_number')
  if (error) throw error
  return data as StayFull[]
}

export function useBoard() {
  const qc = useQueryClient()

  // Realtime: cualquier cambio en las tablas del tablero refresca la query
  useEffect(() => {
    const channel = supabase
      .channel('board-changes')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => {
        qc.invalidateQueries({ queryKey: BOARD_KEY })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [qc])

  return useQuery({ queryKey: BOARD_KEY, queryFn: fetchBoard })
}

/** Actualización optimista de campos escalares del stay */
export function useUpdateStay() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Stay> }) => {
      const { error } = await supabase.from('stays').update(patch).eq('id', id)
      if (error) throw error
    },
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: BOARD_KEY })
      const prev = qc.getQueryData<StayFull[]>(BOARD_KEY)
      qc.setQueryData<StayFull[]>(BOARD_KEY, old =>
        old?.map(s => (s.id === id ? { ...s, ...patch } : s)),
      )
      return { prev }
    },
    onError: (_e, _v, ctx) => { if (ctx?.prev) qc.setQueryData(BOARD_KEY, ctx.prev) },
    onSettled: () => qc.invalidateQueries({ queryKey: BOARD_KEY }),
  })
}

/** Ingreso de paciente a un box libre */
export function useAdmitStay() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (boxNumber: number) => {
      const { error } = await supabase.from('stays').insert({ box_number: boxNumber })
      if (error) throw error
    },
    onSettled: () => qc.invalidateQueries({ queryKey: BOARD_KEY }),
  })
}

/** Egreso: el stay deja de estar activo (el box queda libre) */
export function useDischargeStay() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('stays').update({ active: false }).eq('id', id)
      if (error) throw error
    },
    onSettled: () => qc.invalidateQueries({ queryKey: BOARD_KEY }),
  })
}

/** CRUD genérico de tablas hijas (goals, antibiotics, accesses) */
export function useChildRow(table: 'goals' | 'antibiotics' | 'accesses') {
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: BOARD_KEY })
  return {
    insert: useMutation({
      mutationFn: async (row: Record<string, unknown>) => {
        const { error } = await supabase.from(table).insert(row)
        if (error) throw error
      },
      onSettled: invalidate,
    }),
    update: useMutation({
      mutationFn: async ({ id, patch }: { id: string; patch: Record<string, unknown> }) => {
        const { error } = await supabase.from(table).update(patch).eq('id', id)
        if (error) throw error
      },
      onSettled: invalidate,
    }),
    remove: useMutation({
      mutationFn: async (id: string) => {
        const { error } = await supabase.from(table).delete().eq('id', id)
        if (error) throw error
      },
      onSettled: invalidate,
    }),
  }
}

/** Nutrición (1:1) y SOFA de hoy usan upsert */
export function useUpsertNutrition() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (row: { stay_id: string } & Record<string, unknown>) => {
      const { error } = await supabase.from('nutrition').upsert(row)
      if (error) throw error
    },
    onSettled: () => qc.invalidateQueries({ queryKey: BOARD_KEY }),
  })
}

export function useUpsertSofaToday() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (row: { stay_id: string } & Record<string, number | null | string>) => {
      const today = new Date().toISOString().slice(0, 10)
      const { error } = await supabase
        .from('sofa_assessments')
        .upsert({ ...row, assessed_on: today }, { onConflict: 'stay_id,assessed_on' })
      if (error) throw error
    },
    onSettled: () => qc.invalidateQueries({ queryKey: BOARD_KEY }),
  })
}
```

- [ ] **Step 3: Crear `app/src/lib/supabase/useEvents.ts`**

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from './client'
import type { UnitEvent } from './types'

const EVENTS_KEY = ['events']

export function useEvents() {
  return useQuery({
    queryKey: EVENTS_KEY,
    queryFn: async (): Promise<UnitEvent[]> => {
      const today = new Date().toISOString().slice(0, 10)
      const { data, error } = await supabase
        .from('unit_events').select('*').eq('event_date', today).order('time')
      if (error) throw error
      return data
    },
  })
}

export function useEventMutations() {
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: EVENTS_KEY })
  return {
    add: useMutation({
      mutationFn: async (row: { time: string; label: string }) => {
        const { error } = await supabase.from('unit_events').insert(row)
        if (error) throw error
      },
      onSettled: invalidate,
    }),
    remove: useMutation({
      mutationFn: async (id: string) => {
        const { error } = await supabase.from('unit_events').delete().eq('id', id)
        if (error) throw error
      },
      onSettled: invalidate,
    }),
  }
}
```

Nota: la invalidación de eventos por Realtime ya está cubierta — el canal de `useBoard` escucha `schema: 'public'` completo; agregar ahí `qc.invalidateQueries({ queryKey: ['events'] })` junto a la invalidación del tablero.

- [ ] **Step 4: Verificar y commit**

```bash
cd app && npx tsc --noEmit && npx vitest run
cd .. && git add app/src && git commit -m "feat: realtime board data layer with optimistic updates"
```
Expected: tsc y tests PASS.

---

### Task 10: Tablero — BoxCard y grid (TDD en BoxCard)

**Files:**
- Create: `app/src/features/board/BoxCard.tsx`, `BoxCard.test.tsx`, `BoardPage.tsx`, `AgendaPanel.tsx`, `board.css`
- Modify: `app/src/App.tsx` (ruta `/`)

- [ ] **Step 1: Test que falla — `app/src/features/board/BoxCard.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { BoxCard } from './BoxCard'
import type { StayFull } from '../../lib/supabase/types'

const stay = {
  id: 's1', box_number: 5, active: true, patient_name: 'J. Pérez',
  record_number: '12345', diagnosis: 'shock septico', alert: 'critical',
  residente: 'jimenez', destination: '', dias_hosp: 3, dias_vm: 2, vm_mode: 'VCV',
  rcp: 'Sí', alergias: '', prevision: 'Fonasa A', consentimiento: false,
  balance_meta: '', balance_real: '', contacto_nombre: '', contacto_tel: '',
  ultimo_contacto: '', notes: '', enfermera: '', tens: '', kine: '',
  updated_at: '', goals: [{ id: 'g1', stay_id: 's1', text: 'meta', done: false, position: 0 }],
  antibiotics: [], accesses: [], nutrition: null,
  sofa_assessments: [{ id: 'a1', stay_id: 's1', assessed_on: '2026-07-03', resp: 3, coag: 1, liver: 0, cardio: 2, neuro: 0, renal: 1 }],
} satisfies StayFull

function renderCard(s: StayFull | null, box = 5) {
  return render(<MemoryRouter><BoxCard boxNumber={box} stay={s} /></MemoryRouter>)
}

test('box ocupado muestra paciente, alerta con texto y SOFA', () => {
  renderCard(stay)
  expect(screen.getByText('J. Pérez')).toBeInTheDocument()
  expect(screen.getByText('Crítico')).toBeInTheDocument()
  expect(screen.getByText(/SOFA 7/)).toBeInTheDocument()
})

test('es un link accesible al detalle del box', () => {
  renderCard(stay)
  expect(screen.getByRole('link', { name: /box 5/i })).toHaveAttribute('href', '/box/5')
})

test('box libre se anuncia como cama libre', () => {
  renderCard(null, 7)
  expect(screen.getByText(/cama libre/i)).toBeInTheDocument()
})
```

- [ ] **Step 2: Verificar que falla**

```bash
cd app && npx vitest run src/features/board
```
Expected: FAIL — módulo inexistente.

- [ ] **Step 3: Implementar derive.ts y BoxCard**

Primero crear `app/src/lib/supabase/derive.ts` (derivados de los datos; lo comparten BoxCard y el ejecutivo de Task 15):

```ts
import { calcSofa } from '../clinical/sofa'
import type { StayFull } from './types'

/** SOFA de hoy; si hoy no está evaluado, el más reciente. */
export function staySofaToday(s: StayFull): number | null {
  const today = new Date().toISOString().slice(0, 10)
  const a = s.sofa_assessments.find(x => x.assessed_on === today)
    ?? s.sofa_assessments[s.sofa_assessments.length - 1]
  if (!a) return null
  return calcSofa({ resp: a.resp, coag: a.coag, liver: a.liver, cardio: a.cardio, neuro: a.neuro, renal: a.renal })
}
```

Luego `app/src/features/board/BoxCard.tsx`:

```tsx
import { Link } from 'react-router-dom'
import { Badge } from '../../design-system/Badge'
import { ALERT_TYPES } from '../../lib/clinical/constants'
import { sofaRisk } from '../../lib/clinical/sofa'
import { staySofaToday } from '../../lib/supabase/derive'
import type { StayFull } from '../../lib/supabase/types'

export function BoxCard({ boxNumber, stay }: { boxNumber: number; stay: StayFull | null }) {
  if (!stay) {
    return (
      <Link to={`/box/${boxNumber}`} className="boxcard boxcard--free"
        aria-label={`Box ${boxNumber}: cama libre`}>
        <span className="boxcard__num">Box {boxNumber}</span>
        <span className="boxcard__free">Cama libre</span>
      </Link>
    )
  }
  const alert = ALERT_TYPES[stay.alert]
  const sofa = staySofaToday(stay)
  const risk = sofaRisk(sofa)
  const goalsDone = stay.goals.filter(g => g.done).length
  return (
    <Link to={`/box/${boxNumber}`} className={`boxcard boxcard--${alert.tone}`}
      aria-label={`Box ${boxNumber}: ${stay.patient_name || 'sin nombre'}, ${alert.label}`}>
      <div className="boxcard__head">
        <span className="boxcard__num">Box {boxNumber}</span>
        <Badge tone={alert.tone}>{alert.label}</Badge>
      </div>
      <p className="boxcard__name">{stay.patient_name || '—'}</p>
      <p className="boxcard__dx">{stay.diagnosis || 'Sin diagnóstico'}</p>
      <div className="boxcard__meta">
        <Badge tone={risk.tone}>{sofa === null ? 'SOFA —' : `SOFA ${sofa}`}</Badge>
        {stay.dias_vm > 0 && <Badge tone="muted">VM día {stay.dias_vm}</Badge>}
        <Badge tone={stay.goals.length > 0 && goalsDone === stay.goals.length ? 'ok' : 'muted'}>
          Metas {goalsDone}/{stay.goals.length}
        </Badge>
      </div>
    </Link>
  )
}
```

- [ ] **Step 4: Verificar que pasa**

```bash
cd app && npx vitest run src/features/board
```
Expected: PASS (3 tests).

- [ ] **Step 5: Crear `app/src/features/board/AgendaPanel.tsx`**

```tsx
import { useState } from 'react'
import { Button } from '../../design-system/Button'
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
            <button type="button" className="agenda__del"
              aria-label={`Eliminar evento ${e.label}`}
              onClick={() => remove.mutate(e.id)}>✕</button>
          </li>
        ))}
        {events.length === 0 && <li className="agenda__empty">Sin eventos hoy</li>}
      </ul>
      <form className="agenda__form" onSubmit={e => {
        e.preventDefault()
        if (!label.trim()) return
        add.mutate({ time, label })
        setTime(''); setLabel('')
      }}>
        <TextField label="Hora" value={time} onChange={setTime} />
        <TextField label="Evento" value={label} onChange={setLabel} />
        <Button variant="secondary" {...{ type: 'submit' as const }}>Agregar</Button>
      </form>
    </section>
  )
}
```

- [ ] **Step 6: Crear `app/src/features/board/BoardPage.tsx`**

```tsx
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
```

- [ ] **Step 7: Crear `app/src/features/board/board.css`**

```css
.board { max-width: 1440px; margin: 0 auto; padding: var(--space-4); }
.board__header {
  display: flex; align-items: center; justify-content: space-between;
  gap: var(--space-4); flex-wrap: wrap; margin-bottom: var(--space-4);
}
.board__header nav { display: flex; align-items: center; gap: var(--space-4); }
.board__header a { color: var(--accent-strong); font-weight: 600; }
.board__logout { background: none; border: none; color: var(--ink-secondary); font-weight: 600; }

.board__filters {
  display: grid; grid-template-columns: 2fr 1fr 1fr; gap: var(--space-3);
  margin-bottom: var(--space-4);
}

.board__layout { display: grid; grid-template-columns: 1fr 280px; gap: var(--space-5); }

.board__grid {
  list-style: none; margin: 0; padding: 0;
  display: grid; gap: var(--space-3);
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
}

.boxcard {
  display: flex; flex-direction: column; gap: var(--space-2);
  min-height: 132px; padding: var(--space-3);
  background: var(--surface); border: 1px solid var(--border);
  border-left: 4px solid var(--border-strong);
  border-radius: var(--radius); box-shadow: var(--shadow);
  color: inherit; text-decoration: none;
}
.boxcard:hover { box-shadow: var(--shadow-raised); }
.boxcard--danger { border-left-color: var(--danger-border); }
.boxcard--warn   { border-left-color: var(--warn-border); }
.boxcard--ok     { border-left-color: var(--ok-border); }
.boxcard--eol    { border-left-color: var(--eol-border); }
.boxcard--proc   { border-left-color: var(--proc-border); }
.boxcard--trial  { border-left-color: var(--trial-border); }
.boxcard--free   { justify-content: center; align-items: center; border-style: dashed; }
.boxcard__head { display: flex; justify-content: space-between; align-items: center; }
.boxcard__num { font-weight: 700; color: var(--ink-secondary); font-size: 0.85rem; }
.boxcard__name { margin: 0; font-weight: 600; }
.boxcard__dx { margin: 0; color: var(--ink-secondary); font-size: 0.9rem; }
.boxcard__meta { display: flex; gap: var(--space-1); flex-wrap: wrap; margin-top: auto; }
.boxcard__free { color: var(--ink-muted); font-weight: 600; }

.agenda {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius); padding: var(--space-4); align-self: start;
}
.agenda__list { list-style: none; margin: var(--space-3) 0; padding: 0; display: flex; flex-direction: column; gap: var(--space-2); }
.agenda__list li { display: flex; gap: var(--space-2); align-items: center; }
.agenda__time { font-weight: 700; font-variant-numeric: tabular-nums; }
.agenda__label { flex: 1; }
.agenda__del { background: none; border: none; color: var(--ink-muted); }
.agenda__empty { color: var(--ink-muted); }
.agenda__form { display: flex; flex-direction: column; gap: var(--space-2); }

@media (max-width: 900px) {
  .board__layout { grid-template-columns: 1fr; }
  .board__filters { grid-template-columns: 1fr; }
}
```

- [ ] **Step 8: Conectar la ruta `/` en `app/src/App.tsx`** — reemplazar el placeholder por `<BoardPage />` (import `{ BoardPage } from './features/board/BoardPage'`).

- [ ] **Step 9: Verificación manual**

```bash
cd app && npx vitest run && npm run dev
```
Con sesión iniciada: se ven 24 boxes libres (aún sin pacientes), la agenda permite agregar/eliminar eventos, y con dos pestañas del navegador abiertas el evento agregado en una aparece en la otra sin refrescar (Realtime OK).

- [ ] **Step 10: Commit**

```bash
cd "/c/Users/Ozymandias/Downloads/UCI CONTROL"
git add app/src && git commit -m "feat: board page with 24 box cards, filters and realtime agenda"
```

---

### Task 11: Detalle de box — shell, ingreso/egreso y Tab Clínico

**Files:**
- Create: `app/src/features/patient/PatientPage.tsx`, `IngresoEgreso.tsx`, `patient.css`, `app/src/features/patient/tabs/TabClinico.tsx`
- Modify: `app/src/App.tsx` (ruta `/box/:boxNumber`)

La UI de las pestañas replica los módulos de **PROTO-DASH** (TabClinico línea 217, TabEquipo 266, TabATB 289, TabNutricion 323, TabSofa 357, TabMetas 400, TabSugerencias 423) adaptados a: TypeScript, componentes del design system, tema claro y persistencia vía hooks de Task 9 (en lugar de estado local).

- [ ] **Step 1: Crear `app/src/features/patient/PatientPage.tsx`**

```tsx
import { Link, useParams } from 'react-router-dom'
import { Tabs } from '../../design-system/Tabs'
import { Badge } from '../../design-system/Badge'
import { ALERT_TYPES } from '../../lib/clinical/constants'
import { useBoard } from '../../lib/supabase/useBoard'
import { IngresoEgreso } from './IngresoEgreso'
import { TabClinico } from './tabs/TabClinico'
import { TabEquipo } from './tabs/TabEquipo'
import { TabATB } from './tabs/TabATB'
import { TabNutricion } from './tabs/TabNutricion'
import { TabSofa } from './tabs/TabSofa'
import { TabMetas } from './tabs/TabMetas'
import { TabSugerencias } from './tabs/TabSugerencias'
import './patient.css'

export function PatientPage() {
  const { boxNumber } = useParams()
  const n = Number(boxNumber)
  const { data: stays = [], isLoading } = useBoard()
  const stay = stays.find(s => s.box_number === n) ?? null

  if (isLoading) return <p role="status">Cargando…</p>

  return (
    <div className="patient">
      <header className="patient__header">
        <Link to="/" className="patient__back">← Tablero</Link>
        <h1>Box {n}</h1>
        {stay && <Badge tone={ALERT_TYPES[stay.alert].tone}>{ALERT_TYPES[stay.alert].label}</Badge>}
        <nav className="patient__nav" aria-label="Navegar entre boxes">
          {n > 1 && <Link to={`/box/${n - 1}`}>← Box {n - 1}</Link>}
          {n < 24 && <Link to={`/box/${n + 1}`}>Box {n + 1} →</Link>}
        </nav>
      </header>

      <IngresoEgreso boxNumber={n} stay={stay} />

      {stay && (
        <Tabs
          label={`Módulos del paciente del box ${n}`}
          tabs={[
            { id: 'clinico', label: 'Clínico', content: <TabClinico stay={stay} /> },
            { id: 'equipo', label: 'Equipo', content: <TabEquipo stay={stay} /> },
            { id: 'atb', label: 'ATB', content: <TabATB stay={stay} /> },
            { id: 'nutricion', label: 'Nutrición', content: <TabNutricion stay={stay} /> },
            { id: 'sofa', label: 'SOFA', content: <TabSofa stay={stay} /> },
            { id: 'metas', label: 'Metas', content: <TabMetas stay={stay} /> },
            { id: 'sugerencias', label: 'Sugerencias', content: <TabSugerencias stay={stay} /> },
          ]}
        />
      )}
    </div>
  )
}
```

Nota de orden de ejecución: hasta que existan todos los tabs (Tasks 11-14), dejar en `PatientPage` solo los tabs ya implementados e ir agregándolos; el archivo final queda como arriba.

- [ ] **Step 2: Crear `app/src/features/patient/IngresoEgreso.tsx`**

```tsx
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
```

- [ ] **Step 3: Crear `app/src/features/patient/patient.css`**

```css
.patient { max-width: 960px; margin: 0 auto; padding: var(--space-4); }
.patient__header {
  display: flex; align-items: center; gap: var(--space-3);
  flex-wrap: wrap; margin-bottom: var(--space-4);
}
.patient__back { color: var(--accent-strong); font-weight: 600; }
.patient__nav { margin-left: auto; display: flex; gap: var(--space-3); }
.patient__nav a { color: var(--accent-strong); font-weight: 600; }
.ingreso {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius); padding: var(--space-4); margin-bottom: var(--space-4);
  display: flex; align-items: center; gap: var(--space-3); flex-wrap: wrap;
}
.ingreso [role='group'] { display: flex; align-items: center; gap: var(--space-3); flex-wrap: wrap; }
.tabgrid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: var(--space-3); }
.tabrow { display: flex; gap: var(--space-2); align-items: end; flex-wrap: wrap; }
.tabrow > .ds-field { flex: 1; min-width: 160px; }
```

- [ ] **Step 4: Crear `app/src/features/patient/tabs/TabClinico.tsx`**

Campos según **PROTO-DASH** TabClinico (línea 217): diagnóstico, alerta, residente, destino, días hosp/VM, modo VM, RCP, alergias, previsión, consentimiento, balance, contacto, notas + accesos. Cada cambio persiste con `useUpdateStay` (optimista, Task 9):

```tsx
import { Badge } from '../../../design-system/Badge'
import { NumberField, SelectField, TextField } from '../../../design-system/Field'
import { Button } from '../../../design-system/Button'
import { ACCESS_TYPES, ALERT_TYPES, PREVISIONES, RESIDENTES, VM_MODES, type AlertKey } from '../../../lib/clinical/constants'
import { useChildRow, useUpdateStay } from '../../../lib/supabase/useBoard'
import type { StayFull } from '../../../lib/supabase/types'

export function TabClinico({ stay }: { stay: StayFull }) {
  const { mutate } = useUpdateStay()
  const upd = (patch: Partial<StayFull>) => mutate({ id: stay.id, patch })
  const accesses = useChildRow('accesses')

  return (
    <div className="tabgrid">
      <TextField label="Nombre del paciente" value={stay.patient_name}
        onChange={v => upd({ patient_name: v })} />
      <TextField label="N° de ficha" value={stay.record_number}
        onChange={v => upd({ record_number: v })} />
      <TextField label="Diagnóstico" value={stay.diagnosis}
        onChange={v => upd({ diagnosis: v })} />
      <SelectField label="Alerta" value={ALERT_TYPES[stay.alert].label}
        onChange={v => {
          const key = (Object.keys(ALERT_TYPES) as AlertKey[])
            .find(k => ALERT_TYPES[k].label === v)
          if (key) upd({ alert: key })
        }}
        options={Object.values(ALERT_TYPES).map(a => a.label)} />
      <SelectField label="Residente" value={stay.residente || RESIDENTES[0]}
        onChange={v => upd({ residente: v })} options={RESIDENTES} />
      <TextField label="Destino" value={stay.destination}
        onChange={v => upd({ destination: v })} />
      <NumberField label="Días hospitalización" value={stay.dias_hosp}
        onChange={v => upd({ dias_hosp: v })} />
      <NumberField label="Días VM" value={stay.dias_vm}
        onChange={v => upd({ dias_vm: v })} />
      <SelectField label="Modo VM" value={stay.vm_mode}
        onChange={v => upd({ vm_mode: v })} options={VM_MODES} />
      <SelectField label="RCP" value={stay.rcp}
        onChange={v => upd({ rcp: v })} options={['Sí', 'No']} />
      <TextField label="Alergias" value={stay.alergias}
        onChange={v => upd({ alergias: v })} />
      <SelectField label="Previsión" value={stay.prevision}
        onChange={v => upd({ prevision: v })} options={PREVISIONES} />
      <SelectField label="Consentimiento informado" value={stay.consentimiento ? 'Sí' : 'No'}
        onChange={v => upd({ consentimiento: v === 'Sí' })} options={['No', 'Sí']} />
      <TextField label="Balance meta" value={stay.balance_meta}
        onChange={v => upd({ balance_meta: v })} />
      <TextField label="Balance real" value={stay.balance_real}
        onChange={v => upd({ balance_real: v })} />
      <TextField label="Contacto familiar (nombre)" value={stay.contacto_nombre}
        onChange={v => upd({ contacto_nombre: v })} />
      <TextField label="Contacto familiar (teléfono)" value={stay.contacto_tel}
        onChange={v => upd({ contacto_tel: v })} />
      <TextField label="Último contacto" value={stay.ultimo_contacto}
        onChange={v => upd({ ultimo_contacto: v })} />
      <div style={{ gridColumn: '1 / -1' }}>
        <TextField label="Notas" multiline value={stay.notes}
          onChange={v => upd({ notes: v })} />
      </div>

      <section style={{ gridColumn: '1 / -1' }} aria-labelledby="accesos-title">
        <h3 id="accesos-title">Accesos vasculares</h3>
        {stay.accesses.map(a => (
          <div className="tabrow" key={a.id}>
            <SelectField label="Tipo" value={a.type}
              onChange={v => accesses.update.mutate({ id: a.id, patch: { type: v } })}
              options={ACCESS_TYPES} />
            <NumberField label="Días" value={a.day}
              onChange={v => accesses.update.mutate({ id: a.id, patch: { day: v } })} />
            <Button variant="secondary" aria-label={`Eliminar acceso ${a.type}`}
              onClick={() => accesses.remove.mutate(a.id)}>Eliminar</Button>
          </div>
        ))}
        <Button variant="secondary"
          onClick={() => accesses.insert.mutate({ stay_id: stay.id, type: 'CVC', day: 0 })}>
          + Agregar acceso
        </Button>
        {stay.accesses.length === 0 && <Badge tone="muted">Sin accesos registrados</Badge>}
      </section>
    </div>
  )
}
```

Nota de rendimiento: `useUpdateStay` dispara una mutación por tecla en campos de texto. Agregar un debounce simple dentro de `TextField`-consumo NO — en su lugar, en `useUpdateStay` está bien para v1 (la actualización optimista evita parpadeo y Supabase soporta el volumen de una unidad). Si en verificación manual se siente lento, envolver `upd` con un debounce de 400 ms usando `useRef<number>` + `setTimeout` en `TabClinico` (patrón estándar), manteniendo el valor local en un `useState` espejo.

- [ ] **Step 5: Conectar ruta y verificar manualmente**

En `App.tsx`, ruta `/box/:boxNumber` → `<PatientPage />` (con solo TabClinico en `tabs` por ahora). Luego:

```bash
cd app && npx vitest run && npm run dev
```
Manual: ingresar un paciente en el box 1, llenar diagnóstico "shock septico", refrescar la página → los datos persisten. Abrir el box en otra pestaña → cambios se reflejan.

- [ ] **Step 6: Commit**

```bash
cd "/c/Users/Ozymandias/Downloads/UCI CONTROL"
git add app/src && git commit -m "feat: patient detail shell with admit/discharge and clinical tab"
```

---

### Task 12: Tabs Equipo y ATB

**Files:**
- Create: `app/src/features/patient/tabs/TabEquipo.tsx`, `app/src/features/patient/tabs/TabATB.tsx`
- Modify: `app/src/features/patient/PatientPage.tsx` (agregar los tabs)

- [ ] **Step 1: Crear `app/src/features/patient/tabs/TabEquipo.tsx`** (PROTO-DASH línea 266)

```tsx
import { TextField } from '../../../design-system/Field'
import { useUpdateStay } from '../../../lib/supabase/useBoard'
import type { StayFull } from '../../../lib/supabase/types'

export function TabEquipo({ stay }: { stay: StayFull }) {
  const { mutate } = useUpdateStay()
  const upd = (patch: Partial<StayFull>) => mutate({ id: stay.id, patch })
  return (
    <div className="tabgrid">
      <TextField label="Enfermera" value={stay.enfermera} onChange={v => upd({ enfermera: v })} />
      <TextField label="TENS" value={stay.tens} onChange={v => upd({ tens: v })} />
      <TextField label="Kinesiólogo/a" value={stay.kine} onChange={v => upd({ kine: v })} />
    </div>
  )
}
```

- [ ] **Step 2: Crear `app/src/features/patient/tabs/TabATB.tsx`** (PROTO-DASH línea 289)

```tsx
import { Badge } from '../../../design-system/Badge'
import { Button } from '../../../design-system/Button'
import { NumberField, TextField } from '../../../design-system/Field'
import { useChildRow } from '../../../lib/supabase/useBoard'
import type { StayFull } from '../../../lib/supabase/types'

export function TabATB({ stay }: { stay: StayFull }) {
  const atb = useChildRow('antibiotics')
  return (
    <div>
      {stay.antibiotics.map(a => (
        <div className="tabrow" key={a.id}>
          <TextField label="Antibiótico" value={a.drug}
            onChange={v => atb.update.mutate({ id: a.id, patch: { drug: v } })} />
          <NumberField label="Día de tratamiento" value={a.day}
            onChange={v => atb.update.mutate({ id: a.id, patch: { day: v } })} />
          {a.day >= 7 && <Badge tone="warn">≥7 días — evaluar suspensión</Badge>}
          <Button variant="secondary" aria-label={`Eliminar ${a.drug || 'antibiótico'}`}
            onClick={() => atb.remove.mutate(a.id)}>Eliminar</Button>
        </div>
      ))}
      {stay.antibiotics.length === 0 && <p>Sin antibióticos registrados.</p>}
      <Button variant="secondary"
        onClick={() => atb.insert.mutate({ stay_id: stay.id, drug: '', day: 0 })}>
        + Agregar ATB
      </Button>
    </div>
  )
}
```

- [ ] **Step 3: Agregar ambos tabs a `PatientPage.tsx`, verificar y commit**

```bash
cd app && npx vitest run && npx tsc --noEmit
cd .. && git add app/src && git commit -m "feat: team and antibiotics tabs"
```
Expected: tests y tsc PASS. Manual rápido: ATB agregado en una pestaña aparece en otra.

---

### Task 13: Tabs Nutrición y SOFA (TDD en SOFA)

**Files:**
- Create: `app/src/features/patient/tabs/TabNutricion.tsx`, `TabSofa.tsx`, `TabSofa.test.tsx`
- Modify: `app/src/features/patient/PatientPage.tsx`

- [ ] **Step 1: Crear `app/src/features/patient/tabs/TabNutricion.tsx`** (PROTO-DASH línea 323)

```tsx
import { Badge } from '../../../design-system/Badge'
import { NumberField, SelectField, TextField } from '../../../design-system/Field'
import { NUTRITION_TYPES } from '../../../lib/clinical/constants'
import { useUpsertNutrition } from '../../../lib/supabase/useBoard'
import type { StayFull } from '../../../lib/supabase/types'

export function TabNutricion({ stay }: { stay: StayFull }) {
  const { mutate } = useUpsertNutrition()
  const n = stay.nutrition ?? {
    stay_id: stay.id, nutri_type: 'Ayuno', via: '', cal_meta: 0, cal_real: 0, dias: 0, notes: '',
  }
  const upd = (patch: Partial<typeof n>) => mutate({ ...n, ...patch, stay_id: stay.id })
  const pct = n.cal_meta > 0 ? Math.round((n.cal_real / n.cal_meta) * 100) : null

  return (
    <div className="tabgrid">
      <SelectField label="Tipo de nutrición" value={n.nutri_type}
        onChange={v => upd({ nutri_type: v })} options={NUTRITION_TYPES} />
      <TextField label="Vía" value={n.via} onChange={v => upd({ via: v })} />
      <NumberField label="Calorías meta (kcal)" value={n.cal_meta} max={9999}
        onChange={v => upd({ cal_meta: v })} />
      <NumberField label="Calorías reales (kcal)" value={n.cal_real} max={9999}
        onChange={v => upd({ cal_real: v })} />
      <NumberField label="Días de nutrición" value={n.dias} onChange={v => upd({ dias: v })} />
      <div>
        {pct !== null && (
          <Badge tone={pct >= 80 ? 'ok' : pct >= 50 ? 'warn' : 'danger'}>
            Cobertura calórica {pct}%
          </Badge>
        )}
      </div>
      <div style={{ gridColumn: '1 / -1' }}>
        <TextField label="Notas de nutrición" multiline value={n.notes}
          onChange={v => upd({ notes: v })} />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Test que falla — `app/src/features/patient/tabs/TabSofa.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'

const upsert = vi.fn()
vi.mock('../../../lib/supabase/useBoard', () => ({
  useUpsertSofaToday: () => ({ mutate: upsert }),
}))

import userEvent from '@testing-library/user-event'
import { TabSofa } from './TabSofa'
import type { StayFull } from '../../../lib/supabase/types'

const today = new Date().toISOString().slice(0, 10)
const base = {
  id: 's1', box_number: 1, active: true, patient_name: '', record_number: '',
  diagnosis: '', alert: 'none', residente: '', destination: '', dias_hosp: 0,
  dias_vm: 0, vm_mode: '—', rcp: 'Sí', alergias: '', prevision: 'Fonasa A',
  consentimiento: false, balance_meta: '', balance_real: '', contacto_nombre: '',
  contacto_tel: '', ultimo_contacto: '', notes: '', enfermera: '', tens: '', kine: '',
  updated_at: '', goals: [], antibiotics: [], accesses: [], nutrition: null,
} satisfies Omit<StayFull, 'sofa_assessments'>

test('muestra total y riesgo de la evaluación de hoy', () => {
  render(<TabSofa stay={{
    ...base,
    sofa_assessments: [{ id: 'a1', stay_id: 's1', assessed_on: today, resp: 3, coag: 1, liver: 0, cardio: 2, neuro: 0, renal: 1 }],
  }} />)
  expect(screen.getByText(/SOFA total: 7/)).toBeInTheDocument()
  expect(screen.getByText(/Mortalidad ~40%/)).toBeInTheDocument()
})

test('seleccionar un puntaje llama al upsert de hoy', async () => {
  render(<TabSofa stay={{ ...base, sofa_assessments: [] }} />)
  await userEvent.click(screen.getByRole('radio', { name: /respiratorio.*≥400/i }))
  expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ stay_id: 's1', resp: 0 }))
})
```

- [ ] **Step 3: Verificar que falla**

```bash
cd app && npx vitest run src/features/patient/tabs/TabSofa.test.tsx
```
Expected: FAIL — módulo inexistente.

- [ ] **Step 4: Implementar `app/src/features/patient/tabs/TabSofa.tsx`** (PROTO-DASH línea 357; radiogroups por dominio)

```tsx
import { Badge } from '../../../design-system/Badge'
import { SOFA_DOMAINS, calcSofa, sofaRisk, type SofaScores } from '../../../lib/clinical/sofa'
import { useUpsertSofaToday } from '../../../lib/supabase/useBoard'
import type { StayFull } from '../../../lib/supabase/types'

export function TabSofa({ stay }: { stay: StayFull }) {
  const { mutate } = useUpsertSofaToday()
  const today = new Date().toISOString().slice(0, 10)
  const a = stay.sofa_assessments.find(x => x.assessed_on === today)
  const scores: SofaScores = {
    resp: a?.resp ?? null, coag: a?.coag ?? null, liver: a?.liver ?? null,
    cardio: a?.cardio ?? null, neuro: a?.neuro ?? null, renal: a?.renal ?? null,
  }
  const total = calcSofa(scores)
  const risk = sofaRisk(total)

  function setScore(key: keyof SofaScores, score: number) {
    mutate({ stay_id: stay.id, ...scores, [key]: score })
  }

  return (
    <div>
      <p>
        <strong>SOFA total: {total ?? '—'}</strong>{' '}
        <Badge tone={risk.tone}>{risk.risk}</Badge>
      </p>
      {SOFA_DOMAINS.map(d => (
        <fieldset key={d.key} className="sofa-domain">
          <legend>{d.full} <span className="sofa-hint">({d.hint})</span></legend>
          <div className="tabrow" role="radiogroup" aria-label={d.full}>
            {d.options.map(o => (
              <label key={o.score} className="sofa-option">
                <input type="radio" name={`sofa-${stay.id}-${d.key}`}
                  checked={scores[d.key] === o.score}
                  onChange={() => setScore(d.key, o.score)}
                  aria-label={`${d.full}: ${o.label} (${o.score} puntos)`} />
                <span>{o.score} · {o.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ))}
    </div>
  )
}
```

Agregar a `patient.css`:

```css
.sofa-domain { border: 1px solid var(--border); border-radius: var(--radius-sm); margin-bottom: var(--space-3); padding: var(--space-3); }
.sofa-domain legend { font-weight: 700; padding: 0 var(--space-1); }
.sofa-hint { font-weight: 400; color: var(--ink-secondary); }
.sofa-option { display: inline-flex; align-items: center; gap: var(--space-1); min-height: var(--tap-min); padding: var(--space-1) var(--space-2); }
```

- [ ] **Step 5: Verificar que pasa, agregar tabs a PatientPage y commit**

```bash
cd app && npx vitest run && npx tsc --noEmit
cd .. && git add app/src && git commit -m "feat: nutrition tab and SOFA tab persisting daily assessments"
```
Expected: PASS. Manual: puntuar SOFA en box 1, refrescar → persiste; el BoxCard del tablero muestra el total.

---

### Task 14: Tabs Metas y Sugerencias

**Files:**
- Create: `app/src/features/patient/tabs/TabMetas.tsx`, `TabSugerencias.tsx`
- Modify: `app/src/features/patient/PatientPage.tsx` (queda con los 7 tabs)

- [ ] **Step 1: Crear `app/src/features/patient/tabs/TabMetas.tsx`** (PROTO-DASH línea 400)

```tsx
import { Button } from '../../../design-system/Button'
import { TextField } from '../../../design-system/Field'
import { useChildRow } from '../../../lib/supabase/useBoard'
import type { StayFull } from '../../../lib/supabase/types'

export function TabMetas({ stay }: { stay: StayFull }) {
  const goals = useChildRow('goals')
  const sorted = [...stay.goals].sort((a, b) => a.position - b.position)
  return (
    <div>
      <ul className="metas">
        {sorted.map(g => (
          <li key={g.id} className="tabrow">
            <input type="checkbox" checked={g.done} id={`goal-${g.id}`}
              onChange={e => goals.update.mutate({ id: g.id, patch: { done: e.target.checked } })}
              aria-label={`Meta cumplida: ${g.text || 'sin texto'}`} />
            <TextField label={`Meta ${sorted.indexOf(g) + 1}`} value={g.text}
              onChange={v => goals.update.mutate({ id: g.id, patch: { text: v } })} />
            <Button variant="secondary" aria-label={`Eliminar meta ${g.text || 'sin texto'}`}
              onClick={() => goals.remove.mutate(g.id)}>Eliminar</Button>
          </li>
        ))}
      </ul>
      <Button variant="secondary"
        onClick={() => goals.insert.mutate({ stay_id: stay.id, text: '', done: false, position: stay.goals.length })}>
        + Agregar meta del día
      </Button>
    </div>
  )
}
```

Agregar a `patient.css`: `.metas { list-style: none; margin: 0 0 var(--space-3); padding: 0; display: flex; flex-direction: column; gap: var(--space-2); }`

- [ ] **Step 2: Crear `app/src/features/patient/tabs/TabSugerencias.tsx`** (PROTO-DASH línea 423; solo lectura, derivado del diagnóstico)

```tsx
import { Badge } from '../../../design-system/Badge'
import { getSuggestion } from '../../../lib/clinical/suggestions'
import type { StayFull } from '../../../lib/supabase/types'

export function TabSugerencias({ stay }: { stay: StayFull }) {
  const s = getSuggestion(stay.diagnosis)
  if (!s) {
    return <p>Sin sugerencias para el diagnóstico actual. Las sugerencias se activan al ingresar un diagnóstico reconocido (ej.: "shock séptico", "NAC", "politrauma").</p>
  }
  return (
    <div>
      <p><Badge tone="proc">Guía: {s.matched}</Badge></p>
      <h3>Antibióticos sugeridos</h3>
      <p>{s.atb}</p>
      <h3>Metas terapéuticas</h3>
      <ul>{s.goals.map(g => <li key={g}>{g}</li>)}</ul>
      <h3>Monitorización</h3>
      <ul>{s.monitor.map(m => <li key={m}>{m}</li>)}</ul>
      <p className="sugerencias-disclaimer">
        Material de apoyo — no reemplaza el juicio clínico del equipo tratante.
      </p>
    </div>
  )
}
```

Agregar a `patient.css`: `.sugerencias-disclaimer { color: var(--ink-secondary); font-style: italic; }`

- [ ] **Step 3: Verificar (los 7 tabs completos) y commit**

```bash
cd app && npx vitest run && npx tsc --noEmit
cd .. && git add app/src && git commit -m "feat: daily goals and treatment suggestions tabs"
```
Manual: con diagnóstico "shock septico" el tab Sugerencias muestra la guía completa.

---

### Task 15: Resumen Ejecutivo (TDD en KPIs)

**Files:**
- Create: `app/src/features/executive/kpis.ts`, `kpis.test.ts`, `ExecutivePage.tsx`, `executive.css`
- Modify: `app/src/App.tsx` (ruta `/ejecutivo`)

- [ ] **Step 1: Test que falla — `app/src/features/executive/kpis.test.ts`**

Los KPIs replican los agregados de **PROTO-EXEC** (líneas 250-266) como funciones puras sobre `StayFull[]`:

```ts
import { describe, expect, test } from 'vitest'
import { boardKpis } from './kpis'
import type { StayFull } from '../../lib/supabase/types'

const today = new Date().toISOString().slice(0, 10)

function stay(over: Partial<StayFull>): StayFull {
  return {
    id: Math.random().toString(), box_number: 1, active: true, patient_name: 'X',
    record_number: '', diagnosis: '', alert: 'none', residente: '', destination: '',
    dias_hosp: 0, dias_vm: 0, vm_mode: '—', rcp: 'Sí', alergias: '',
    prevision: 'Fonasa A', consentimiento: false, balance_meta: '', balance_real: '',
    contacto_nombre: '', contacto_tel: '', ultimo_contacto: '', notes: '',
    enfermera: '', tens: '', kine: '', updated_at: '',
    goals: [], antibiotics: [], accesses: [], nutrition: null, sofa_assessments: [],
    ...over,
  }
}

function withSofa(total3each: number[]): StayFull['sofa_assessments'] {
  const [resp, coag, liver, cardio, neuro, renal] = total3each
  return [{ id: 'a', stay_id: 's', assessed_on: today, resp, coag, liver, cardio, neuro, renal }]
}

describe('boardKpis', () => {
  test('censo y camas libres', () => {
    const k = boardKpis([stay({ box_number: 1 }), stay({ box_number: 2 })])
    expect(k.occupied).toBe(2)
    expect(k.freeBeds).toBe(22)
  })

  test('SOFA promedio y máximo ignoran no evaluados', () => {
    const k = boardKpis([
      stay({ sofa_assessments: withSofa([1, 1, 0, 0, 0, 0]) }), // 2
      stay({ box_number: 2, sofa_assessments: withSofa([4, 4, 0, 0, 0, 0]) }), // 8
      stay({ box_number: 3 }), // sin SOFA
    ])
    expect(k.sofaAvg).toBe('5.0')
    expect(k.sofaMax).toBe(8)
  })

  test('en VM, críticos, fin de vida y egresables', () => {
    const k = boardKpis([
      stay({ dias_vm: 2, alert: 'critical' }),
      stay({ box_number: 2, alert: 'eol' }),
      stay({ box_number: 3, alert: 'procurement' }),
      stay({ box_number: 4, destination: 'egreso' }),
    ])
    expect(k.onVM).toBe(1)
    expect(k.critical).toBe(1)
    expect(k.eol).toBe(2)
    expect(k.dischargeable).toBe(1)
  })
})
```

- [ ] **Step 2: Verificar que falla**

```bash
cd app && npx vitest run src/features/executive
```
Expected: FAIL — módulo inexistente.

- [ ] **Step 3: Implementar `app/src/features/executive/kpis.ts`**

```ts
import { BOX_COUNT } from '../../lib/clinical/constants'
import { staySofaToday } from '../../lib/supabase/derive'
import type { StayFull } from '../../lib/supabase/types'

export function boardKpis(stays: StayFull[]) {
  const sofas = stays.map(staySofaToday).filter((x): x is number => x !== null)
  return {
    occupied: stays.length,
    freeBeds: BOX_COUNT - stays.length,
    sofaAvg: sofas.length ? (sofas.reduce((a, b) => a + b, 0) / sofas.length).toFixed(1) : '—',
    sofaMax: sofas.length ? Math.max(...sofas) : '—' as const,
    onVM: stays.filter(s => s.dias_vm > 0).length,
    critical: stays.filter(s => s.alert === 'critical').length,
    eol: stays.filter(s => s.alert === 'eol' || s.alert === 'procurement').length,
    dischargeable: stays.filter(s => s.destination.toLowerCase().includes('egreso')).length,
  }
}
```

(`staySofaToday` viene de `app/src/lib/supabase/derive.ts`, creado en Task 10 — el mismo derivado que usa `BoxCard`.)

- [ ] **Step 4: Verificar que pasa**

```bash
cd app && npx vitest run
```
Expected: PASS (todos, incluidos los de BoxCard tras el refactor).

- [ ] **Step 5: Crear `app/src/features/executive/ExecutivePage.tsx`**

```tsx
import { Link } from 'react-router-dom'
import { Badge } from '../../design-system/Badge'
import { ALERT_TYPES } from '../../lib/clinical/constants'
import { sofaRisk } from '../../lib/clinical/sofa'
import { staySofaToday } from '../../lib/supabase/derive'
import { useBoard } from '../../lib/supabase/useBoard'
import { boardKpis } from './kpis'
import './executive.css'

export function ExecutivePage() {
  const { data: stays = [], isLoading } = useBoard()
  if (isLoading) return <p role="status">Cargando…</p>
  const k = boardKpis(stays)
  const now = new Date()
  const alerted = stays.filter(s => s.alert !== 'none')

  return (
    <div className="exec">
      <header className="exec__header">
        <Link to="/" className="exec__back">← Tablero</Link>
        <h1>Resumen Ejecutivo</h1>
        <p className="exec__date">
          {now.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          {' · '}
          {now.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </header>

      <dl className="exec__kpis">
        <div className="kpi"><dt>Ocupación</dt><dd data-kpi>{k.occupied}<span className="kpi__sub">/24</span></dd></div>
        <div className="kpi"><dt>Camas libres</dt><dd data-kpi>{k.freeBeds}</dd></div>
        <div className="kpi"><dt>SOFA promedio</dt><dd data-kpi>{k.sofaAvg}</dd></div>
        <div className="kpi"><dt>SOFA máximo</dt><dd data-kpi>{k.sofaMax}</dd></div>
        <div className="kpi"><dt>En VM</dt><dd data-kpi>{k.onVM}</dd></div>
        <div className="kpi"><dt>Críticos</dt><dd data-kpi>{k.critical}</dd></div>
        <div className="kpi"><dt>Fin de vida / procuración</dt><dd data-kpi>{k.eol}</dd></div>
        <div className="kpi"><dt>Egresables</dt><dd data-kpi>{k.dischargeable}</dd></div>
      </dl>

      <section aria-labelledby="exec-alerts">
        <h2 id="exec-alerts">Pacientes con alerta</h2>
        {alerted.length === 0 && <p>Sin alertas activas.</p>}
        <ul className="exec__alerts">
          {alerted.map(s => {
            const sofa = staySofaToday(s)
            return (
              <li key={s.id}>
                <Link to={`/box/${s.box_number}`}>
                  <strong>Box {s.box_number}</strong> · {s.patient_name || '—'} · {s.diagnosis || 'sin diagnóstico'}
                </Link>
                <Badge tone={ALERT_TYPES[s.alert].tone}>{ALERT_TYPES[s.alert].label}</Badge>
                <Badge tone={sofaRisk(sofa).tone}>{sofa === null ? 'SOFA —' : `SOFA ${sofa}`}</Badge>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
```

- [ ] **Step 6: Crear `app/src/features/executive/executive.css`**

```css
.exec { max-width: 1100px; margin: 0 auto; padding: var(--space-4); }
.exec__header { display: flex; align-items: baseline; gap: var(--space-4); flex-wrap: wrap; margin-bottom: var(--space-5); }
.exec__back { color: var(--accent-strong); font-weight: 600; }
.exec__date { color: var(--ink-secondary); margin: 0; text-transform: capitalize; }
.exec__kpis {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: var(--space-3); margin: 0 0 var(--space-6);
}
.kpi {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius); padding: var(--space-4); box-shadow: var(--shadow);
}
.kpi dt { font-size: 0.8rem; font-weight: 600; color: var(--ink-secondary); }
.kpi dd { margin: 0; font-family: var(--font-display); font-size: 2.2rem; font-weight: 600; }
.kpi__sub { font-size: 1.1rem; color: var(--ink-muted); }
.exec__alerts { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--space-2); }
.exec__alerts li {
  display: flex; align-items: center; gap: var(--space-3); flex-wrap: wrap;
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius); padding: var(--space-3);
}
.exec__alerts a { color: inherit; }
```

- [ ] **Step 7: Conectar ruta `/ejecutivo`, verificar y commit**

```bash
cd app && npx vitest run && npx tsc --noEmit
cd .. && git add app/src && git commit -m "feat: executive summary computed from live board data"
```
Manual: los KPIs cambian en vivo al editar un box en otra pestaña.

---

### Task 16: Animaciones GSAP (con reduced motion)

**Files:**
- Create: `app/src/features/board/animations.ts`
- Modify: `app/src/features/board/BoardPage.tsx`, `app/src/features/executive/ExecutivePage.tsx`

- [ ] **Step 1: Crear `app/src/features/board/animations.ts`**

```ts
import { gsap } from 'gsap'

/** Entrada del grid: stagger sutil. No-op si el usuario prefiere menos movimiento. */
export function animateGridEntrance(container: HTMLElement) {
  const mm = gsap.matchMedia()
  mm.add('(prefers-reduced-motion: no-preference)', () => {
    gsap.from(container.querySelectorAll('.boxcard'), {
      opacity: 0, y: 12, duration: 0.35, stagger: 0.02, ease: 'power2.out', clearProps: 'all',
    })
  })
  return () => mm.revert()
}

/** Contadores del ejecutivo: cuentan hacia su valor. */
export function animateKpis(container: HTMLElement) {
  const mm = gsap.matchMedia()
  mm.add('(prefers-reduced-motion: no-preference)', () => {
    container.querySelectorAll<HTMLElement>('[data-kpi]').forEach(el => {
      const text = el.childNodes[0]
      const target = Number(text?.textContent)
      if (!Number.isFinite(target) || !text) return
      const obj = { v: 0 }
      gsap.to(obj, {
        v: target, duration: 0.7, ease: 'power1.out',
        onUpdate: () => { text.textContent = String(Math.round(obj.v)) },
      })
    })
  })
  return () => mm.revert()
}
```

- [ ] **Step 2: Aplicar en BoardPage**

En `BoardPage.tsx`, sobre el `<ul className="board__grid">`: usar un ref + effect que corre cuando deja de cargar:

```tsx
const gridRef = useRef<HTMLUListElement>(null)
useEffect(() => {
  if (!isLoading && gridRef.current) return animateGridEntrance(gridRef.current)
}, [isLoading])
// ...
<ul className="board__grid" ref={gridRef}>
```

(imports: `useEffect, useRef` de react; `animateGridEntrance` de `./animations`).

- [ ] **Step 3: Aplicar en ExecutivePage**

Mismo patrón: ref en `<dl className="exec__kpis">` + `useEffect` que llama `animateKpis` cuando `!isLoading`. Nota: como `ExecutivePage` retorna temprano durante la carga, mover el early-return DESPUÉS de los hooks o condicionar dentro del effect (los hooks no pueden ser condicionales):

```tsx
const kpisRef = useRef<HTMLDListElement>(null)
useEffect(() => {
  if (!isLoading && kpisRef.current) return animateKpis(kpisRef.current)
}, [isLoading])
```

- [ ] **Step 4: Verificación manual**

```bash
cd app && npm run dev
```
Tablero: las tarjetas entran con stagger. Ejecutivo: los números cuentan. Con "reducir movimiento" activado en el SO (o emulado en DevTools → Rendering → prefers-reduced-motion), no hay animación.

- [ ] **Step 5: Tests + commit**

```bash
cd app && npx vitest run
cd .. && git add app/src && git commit -m "feat: GSAP entrance and counter animations honoring reduced motion"
```

---

### Task 17: Indicador de conexión y modo offline

**Files:**
- Create: `app/src/features/shared/ConnectionBanner.tsx`
- Modify: `app/src/App.tsx`

- [ ] **Step 1: Crear `app/src/features/shared/ConnectionBanner.tsx`**

```tsx
import { useEffect, useState } from 'react'

export function ConnectionBanner() {
  const [online, setOnline] = useState(navigator.onLine)

  useEffect(() => {
    const up = () => setOnline(true)
    const down = () => setOnline(false)
    window.addEventListener('online', up)
    window.addEventListener('offline', down)
    return () => {
      window.removeEventListener('online', up)
      window.removeEventListener('offline', down)
    }
  }, [])

  if (online) return null
  return (
    <div role="status" className="conn-banner">
      Sin conexión — mostrando última copia. Los cambios se guardarán al reconectar.
    </div>
  )
}
```

Agregar a `global.css`:

```css
.conn-banner {
  position: sticky; top: 0; z-index: 10;
  background: var(--warn-tint); color: var(--warn-text);
  border-bottom: 1px solid var(--warn-border);
  padding: var(--space-2) var(--space-4); text-align: center; font-weight: 600;
}
```

- [ ] **Step 2: Montarlo en `App.tsx`** — dentro de `<BrowserRouter>`, antes de `<Routes>`: `<ConnectionBanner />`.

- [ ] **Step 3: Verificación manual**

DevTools → Network → Offline: aparece el banner y el tablero sigue mostrando datos (caché persistida de Task 9). Volver online: banner desaparece.

- [ ] **Step 4: Commit**

```bash
cd "/c/Users/Ozymandias/Downloads/UCI CONTROL"
git add app/src && git commit -m "feat: offline banner with cached board reads"
```

---

### Task 18: Auditoría de accesibilidad

**Files:**
- Create: `app/src/a11y/axe.test.tsx`

- [ ] **Step 1: Test axe — `app/src/a11y/axe.test.tsx`**

```tsx
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { axe } from 'vitest-axe'
import * as matchers from 'vitest-axe/matchers'
import { expect, test, vi } from 'vitest'

expect.extend(matchers)

vi.mock('../lib/supabase/client', () => ({
  supabase: { auth: { signInWithPassword: vi.fn() } },
}))

import { LoginPage } from '../features/auth/LoginPage'
import { BoxCard } from '../features/board/BoxCard'

test('LoginPage sin violaciones axe', async () => {
  const { container } = render(<LoginPage />)
  expect(await axe(container)).toHaveNoViolations()
})

test('BoxCard ocupado y libre sin violaciones axe', async () => {
  const { container } = render(
    <MemoryRouter>
      <BoxCard boxNumber={3} stay={null} />
    </MemoryRouter>,
  )
  expect(await axe(container)).toHaveNoViolations()
})
```

Correr y arreglar cualquier violación reportada (cambiando componentes, no el test).

```bash
cd app && npx vitest run src/a11y
```
Expected: PASS sin violaciones.

- [ ] **Step 2: Auditoría Lighthouse sobre las 4 pantallas**

```bash
cd app && npm run build && npm run preview &
```
Con el preview en http://localhost:4173: correr Lighthouse (Chrome DevTools → Lighthouse → Accessibility, o `npx lighthouse http://localhost:4173 --only-categories=accessibility --quiet --chrome-flags="--headless"`) para `/login`, `/`, `/box/1`, `/ejecutivo` (las protegidas requieren sesión iniciada en la ventana auditada).
Expected: score ≥ 95 en cada una. Si algo baja el puntaje, corregir el componente y re-auditar.

- [ ] **Step 3: Pase de teclado manual**

Recorrido completo con Tab/Shift+Tab/flechas/Enter en las 4 pantallas: login → tablero → filtros → tarjeta → detalle → las 7 pestañas (flechas izquierda/derecha) → egresar (confirmación) → ejecutivo. Todo alcanzable y operable; el foco siempre visible (anillo terracota). Además, con zoom del navegador al 200% (Ctrl +): sin pérdida de contenido ni scroll horizontal (criterio 1.4.4/1.4.10).

- [ ] **Step 4: Commit**

```bash
cd "/c/Users/Ozymandias/Downloads/UCI CONTROL"
git add app/src && git commit -m "test: automated axe accessibility checks"
```

---

### Task 19: Capacitor

**Files:**
- Create: `app/capacitor.config.ts`

- [ ] **Step 1: Instalar e inicializar**

```bash
cd app
npm i @capacitor/core && npm i -D @capacitor/cli
npx cap init "UCI Control" "cl.huap.ucicontrol" --web-dir dist
```
Expected: crea `capacitor.config.ts`.

- [ ] **Step 2: Ajustar `app/capacitor.config.ts`**

```ts
import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'cl.huap.ucicontrol',
  appName: 'UCI Control',
  webDir: 'dist',
  backgroundColor: '#FAF9F5',
}

export default config
```

- [ ] **Step 3: Verificar el criterio de éxito 6 del spec**

```bash
cd app && npm run build && npx cap add android
```
Expected: `android/` generado y sincronizado sin errores ("Sync finished"). (iOS requiere macOS — `npx cap add ios` queda documentado para cuando haya una Mac; no es bloqueante para v1.)

Agregar la línea `app/android/` al `.gitignore` raíz: aunque la convención Capacitor es commitear la plataforma nativa, en v1 no se publica y el directorio se regenera con un comando — mantenerlo fuera del repo evita ruido. Se commiteará cuando empiece el trabajo de publicación real.

- [ ] **Step 4: Commit**

```bash
cd "/c/Users/Ozymandias/Downloads/UCI CONTROL"
git add app/capacitor.config.ts app/package.json app/package-lock.json .gitignore
git commit -m "chore: capacitor configured for future store packaging"
```

---

### Task 20: README y verificación final

**Files:**
- Create: `README.md` (raíz)

- [ ] **Step 1: Crear `README.md`**

```markdown
# UCI Control — UCI Torre Valech · HUAP

Tablero clínico en tiempo real para la UPC: 24 boxes, 7 módulos por paciente,
resumen ejecutivo para jefatura. React + Vite + Supabase + Capacitor.

## Desarrollo

    cd app
    npm install
    # crear app/.env.local con VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
    npm run dev

## Tests

    cd app && npx vitest run

## Estructura

- `app/` — la aplicación (React + Vite + TS)
- `supabase/migrations/` — esquema de base de datos
- `docs/superpowers/` — spec y plan de implementación
- `UCI_Dashboard_Completo/`, `dataucicontrrol/` — prototipos originales (referencia)

## Publicación en tiendas (pendiente, todo preparado)

1. Cuenta Apple Developer (USD 99/año) y Google Play Console (USD 25).
2. Política de privacidad publicada (obligatoria: datos de salud).
3. `cd app && npm run build && npx cap add ios && npx cap add android`.
4. Iconos/splash, screenshots, y revisión de guidelines médicas de cada tienda.

## Advertencia de uso

La app maneja datos sensibles de salud (Ley 21.719). **No usar con datos de
pacientes reales** hasta contar con autorización institucional del HUAP.
```

- [ ] **Step 2: Verificación final completa (criterios de éxito del spec)**

```bash
cd app && npx vitest run && npx tsc --noEmit && npm run build
```
Expected: todo PASS. Luego verificación manual contra el spec §12:
1. Dos navegadores con sesiones distintas: un cambio se ve en el otro en <2 s. ✔
2. Refrescar no pierde datos. ✔
3. Lighthouse a11y ≥ 95 en las 4 pantallas (Task 18). ✔
4. Tablero operable solo con teclado (Task 18). ✔
5. Probar en DevTools a 375 px y 1440 px: sin scroll horizontal, todo usable. ✔
6. `npx cap add android` compila sin cambios de código web (Task 19). ✔

- [ ] **Step 3: Commit final**

```bash
cd "/c/Users/Ozymandias/Downloads/UCI CONTROL"
git add README.md && git commit -m "docs: project README with store checklist and data warning"
```

---

## Notas para el ejecutor

- **Contenido clínico:** el texto de `SOFA_DOMAINS`, `SUGGESTIONS` y las listas de constantes se copia VERBATIM del prototipo. Es material clínico validado por el médico autor — no editarlo ni "mejorarlo".
- **Privacidad:** solo datos de prueba/ficticios durante el desarrollo. Nada de nombres reales de pacientes.
- **Si el MCP de Supabase no está disponible** en la sesión: pedir al usuario que cree el proyecto en supabase.com y pegue URL + anon key; la migración se aplica por el SQL Editor.
- **Orden:** las tasks están en orden de dependencia estricta; no adelantarse.





