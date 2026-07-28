# APACHE II (Acute Physiology and Chronic Health Evaluation II) — Diseño

**Fecha:** 2026-07-28
**Proyecto:** UCI Torre Valech — HUAP
**Origen:** UCI_Dashboard (16).html / UCI_Dashboard_v16.html (extracción ya hecha, se te da abajo)

## 1. Objetivo

Agregar una pestaña de score APACHE II dentro de la ficha de cada box/paciente (`PatientPage.tsx`), que reproduzca exactamente el modelo del prototipo v16: 12 variables fisiológicas (peor valor de 24h) + edad + salud crónica, con selección por índice de opción (no por puntaje), total 0–71 y banda de mortalidad de referencia, con historial fechado de evaluaciones — llevando la app a paridad con el prototipo del Dr. Arteaga.

## 2. Enfoques considerados

**Opción A — Snapshot único 1:1 con el stay (upsert), estilo `vent_settings`/`nutrition`.**
Una sola fila `apache2_assessment` por `stay_id`, se sobreescribe cada vez que el equipo actualiza el score.
- Pros: UI más simple (un solo formulario "vivo", sin lista de historial); calza con el patrón `useUpsertVent`.
- Contras: pierde trazabilidad — APACHE II se calcula típicamente en las primeras 24h de ingreso y a veces se recalcula; perder el valor anterior impide auditar cómo evolucionó la gravedad al ingreso. El prototipo v16 no versiona esto porque es una app de un solo `localStorage`, pero nuestra app SÍ tiene la capacidad de historial y el propio codebase la usa para scores account-like (MRC-SS).

**Opción B — Historial fechado insert-only, estilo `mrc_assessments`/`blood_gases` (tabla hija vía `useChildRow`).**
Cada "Guardar evaluación" inserta una fila nueva con `assessed_at = now()`; la UI muestra el cálculo en vivo del formulario actual + una lista de evaluaciones pasadas con `ConfirmDeleteButton`.
- Pros: reutiliza el patrón `useChildRow` ya genérico (solo se agrega el nombre de tabla al union type de `useBoard.ts`), consistente con `TabFuncional.tsx`; preserva auditoría clínica (quién calculó qué APACHE II y cuándo, relevante para justificar gravedad al ingreso o pedir cupo UCI); no requiere una migración de "reset a null" cuando se quiere recalcular limpio, porque cada evaluación es independiente.
- Contras: la UI es algo más compleja que un formulario 1:1 (hay que armar el "formulario en curso" + lista de historial, como ya hace `TabFuncional`).

**Opción C — Guardar solo el total (número) en una columna de `stays`, sin persistir las 14 selecciones individuales.**
- Pros: mínimo esfuerzo de esquema.
- Contras: viola directamente el requisito explícito del enunciado (guardar el índice elegido por variable, no solo el puntaje, para poder reconstruir qué opción exacta se marcó); imposibilita re-renderizar el formulario con las opciones previamente marcadas al reabrir la pestaña; pierde el detalle clínico variable-por-variable que un score de severidad debe conservar. Se descarta.

**Recomendación: Opción B.** Es el patrón que el propio codebase ya usa para el score más comparable (MRC-SS vía `mrc_assessments`), soporta trazabilidad clínica real (APACHE II se usa para justificar gravedad/pronóstico y eso debe quedar auditado con fecha), y el costo adicional de UI es bajo porque `TabFuncional.tsx` ya es la plantilla completa a copiar (formulario con estado local + botón guardar + historial con borrado).

## 3. Modelo de datos (Supabase, migración nueva)

Nueva migración `supabase/migrations/006_apache2.sql`, siguiendo el estilo exacto de `004_funcional_emr.sql` (tabla hija insert-only, trigger `touch_row`, RLS `authenticated all`, alta a `supabase_realtime`).

Cada columna fisiológica guarda el **índice** (0-based) de la opción elegida dentro del array `APACHE2_VARS` correspondiente — nunca el puntaje — para poder reconstruir exactamente qué opción se marcó (varias opciones de una misma variable comparten puntaje, ej. temperatura ≥41 y <30 valen ambas 4 puntos pero son índices distintos). El `check` de cada columna limita el rango al tamaño real del array de opciones en el prototipo v16.

```sql
-- UCI Control — Fase 3: APACHE II (Acute Physiology and Chronic Health Evaluation II)
-- Cada columna fisiológica guarda el ÍNDICE de la opción elegida en APACHE2_VARS
-- (app/src/lib/clinical/apache2.ts), NO el puntaje: varias opciones de una misma
-- variable pueden compartir puntaje (ej. temperatura muy alta / muy baja = 4 ambas)
-- y solo el índice permite reconstruir cuál se marcó. Ver Knaus et al. 1985.

create table public.apache2_assessments (
  id uuid primary key default gen_random_uuid(),
  stay_id uuid not null references public.stays on delete cascade,
  assessed_at timestamptz not null default now(),
  -- 12 variables fisiológicas (peor valor de las últimas 24h) — índice de opción, no puntaje
  temp int check (temp between 0 and 7),    -- Temperatura (8 opciones)
  map int check (map between 0 and 5),      -- Presión arterial media (6 opciones)
  hr int check (hr between 0 and 6),        -- Frecuencia cardíaca (7 opciones)
  rr int check (rr between 0 and 6),        -- Frecuencia respiratoria (7 opciones)
  oxy int check (oxy between 0 and 7),      -- Oxigenación (8 opciones)
  ph int check (ph between 0 and 6),        -- pH arterial (7 opciones)
  na int check (na between 0 and 7),        -- Sodio (8 opciones)
  k int check (k between 0 and 6),          -- Potasio (7 opciones)
  creat int check (creat between 0 and 4),  -- Creatinina (5 opciones)
  arf boolean not null default false,       -- Falla renal aguda: duplica el puntaje de creatinina
  hct int check (hct between 0 and 5),      -- Hematocrito (6 opciones)
  wbc int check (wbc between 0 and 5),      -- Leucocitos (6 opciones)
  gcs int check (gcs between 0 and 12),     -- Glasgow (13 opciones: GCS 15..3)
  -- Edad y salud crónica — también índice de opción, no puntaje
  age int check (age between 0 and 4),      -- Edad (5 bandas)
  chronic int check (chronic between 0 and 2), -- Salud crónica (3 niveles)
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users
);

do $$
declare t text;
begin
  foreach t in array array['apache2_assessments']
  loop
    execute format('create trigger touch before insert or update on public.%I
                    for each row execute function public.touch_row()', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "authenticated all" on public.%I
                    for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

alter publication supabase_realtime add table public.apache2_assessments;
```

Cambios de capa de datos que acompañan la migración (fuera del SQL, pero parte de este mismo paso T de implementación):
- `app/src/lib/supabase/types.ts`: nueva interfaz `Apache2Assessment` (mismos campos que la tabla, tipados `number | null` para las 14 variables + `arf: boolean`), y agregar `apache2_assessments: Apache2Assessment[]` a `StayFull`.
- `app/src/lib/supabase/useBoard.ts`: agregar `'apache2_assessments'` al union type de `useChildRow` (línea 85) y a la query `.select(...)` de `fetchBoard` (línea 12).
- `app/src/test/fixtures.ts`: agregar `apache2_assessments: []` a `baseStay()`.

## 4. Lógica clínica

Nuevo módulo puro `app/src/lib/clinical/apache2.ts`. Valores migrados **verbatim** de `UCI_Dashboard (16).html` líneas 105–188 (`APACHE2_VARS`, `APACHE2_AGE`, `APACHE2_CHRONIC`, `calcApache2`, `apache2Mortality`, `APACHE2_TOTAL_FIELDS`, `apache2FilledCount`).

```ts
// Lógica APACHE II migrada VERBATIM de UCI_Dashboard (16).html líneas 105-188
// (Knaus et al. 1985, sin cambios desde su publicación). Cada variable es el
// peor valor de las últimas 24h.
//
// IMPORTANTE: "value"/índice es la posición de la opción elegida dentro de
// "options", NO el puntaje — varias opciones de una misma variable pueden
// compartir puntaje (ej. temperatura muy alta y muy baja) y solo el índice
// permite reconstruir cuál se marcó. Ver ScorePillGroup en el prototipo.

export type Apache2Key =
  | 'temp' | 'map' | 'hr' | 'rr' | 'oxy' | 'ph' | 'na' | 'k'
  | 'creat' | 'hct' | 'wbc' | 'gcs'

export interface Apache2Option { score: number; label: string }
export interface Apache2VarDef { key: Apache2Key; label: string; hint: string; options: Apache2Option[] }

export const APACHE2_VARS: Apache2VarDef[] = [
  { key: 'temp', label: 'Temperatura', hint: '°C, rectal/core', options: [
    { score: 4, label: '≥41' }, { score: 3, label: '39–40.9' }, { score: 1, label: '38.5–38.9' }, { score: 0, label: '36–38.4' },
    { score: 1, label: '34–35.9' }, { score: 2, label: '32–33.9' }, { score: 3, label: '30–31.9' }, { score: 4, label: '<30' }] },
  { key: 'map', label: 'Presión arterial media', hint: 'mmHg', options: [
    { score: 4, label: '≥160' }, { score: 3, label: '130–159' }, { score: 2, label: '110–129' }, { score: 0, label: '70–109' },
    { score: 2, label: '50–69' }, { score: 4, label: '<50' }] },
  { key: 'hr', label: 'Frecuencia cardíaca', hint: 'lpm', options: [
    { score: 4, label: '≥180' }, { score: 3, label: '140–179' }, { score: 2, label: '110–139' }, { score: 0, label: '70–109' },
    { score: 2, label: '55–69' }, { score: 3, label: '40–54' }, { score: 4, label: '<40' }] },
  { key: 'rr', label: 'Frecuencia respiratoria', hint: '/min (VM o espontánea)', options: [
    { score: 4, label: '≥50' }, { score: 3, label: '35–49' }, { score: 1, label: '25–34' }, { score: 0, label: '12–24' },
    { score: 1, label: '10–11' }, { score: 2, label: '6–9' }, { score: 4, label: '<6' }] },
  { key: 'oxy', label: 'Oxigenación', hint: 'FiO₂≥0.5: A-aDO₂ · FiO₂<0.5: PaO₂', options: [
    { score: 4, label: 'A-aDO₂≥500 (FiO₂≥0.5)' }, { score: 3, label: 'A-aDO₂ 350–499' }, { score: 2, label: 'A-aDO₂ 200–349' }, { score: 0, label: 'A-aDO₂<200' },
    { score: 0, label: 'PaO₂>70 (FiO₂<0.5)' }, { score: 1, label: 'PaO₂ 61–70' }, { score: 3, label: 'PaO₂ 55–60' }, { score: 4, label: 'PaO₂<55' }] },
  { key: 'ph', label: 'pH arterial', hint: '', options: [
    { score: 4, label: '≥7.7' }, { score: 3, label: '7.6–7.69' }, { score: 1, label: '7.5–7.59' }, { score: 0, label: '7.33–7.49' },
    { score: 2, label: '7.25–7.32' }, { score: 3, label: '7.15–7.24' }, { score: 4, label: '<7.15' }] },
  { key: 'na', label: 'Sodio', hint: 'mmol/L', options: [
    { score: 4, label: '≥180' }, { score: 3, label: '160–179' }, { score: 2, label: '155–159' }, { score: 1, label: '150–154' },
    { score: 0, label: '130–149' }, { score: 2, label: '120–129' }, { score: 3, label: '111–119' }, { score: 4, label: '≤110' }] },
  { key: 'k', label: 'Potasio', hint: 'mmol/L', options: [
    { score: 4, label: '≥7' }, { score: 3, label: '6–6.9' }, { score: 1, label: '5.5–5.9' }, { score: 0, label: '3.5–5.4' },
    { score: 1, label: '3–3.4' }, { score: 2, label: '2.5–2.9' }, { score: 4, label: '<2.5' }] },
  { key: 'creat', label: 'Creatinina', hint: 'mg/dL — puntaje ×2 si Falla Renal Aguda', options: [
    { score: 4, label: '≥3.5' }, { score: 3, label: '2–3.4' }, { score: 2, label: '1.5–1.9' }, { score: 0, label: '0.6–1.4' }, { score: 2, label: '<0.6' }] },
  { key: 'hct', label: 'Hematocrito', hint: '%', options: [
    { score: 4, label: '≥60' }, { score: 2, label: '50–59.9' }, { score: 1, label: '46–49.9' }, { score: 0, label: '30–45.9' },
    { score: 2, label: '20–29.9' }, { score: 4, label: '<20' }] },
  { key: 'wbc', label: 'Leucocitos', hint: '×1000/mm³', options: [
    { score: 4, label: '≥40' }, { score: 2, label: '20–39.9' }, { score: 1, label: '15–19.9' }, { score: 0, label: '3–14.9' },
    { score: 2, label: '1–2.9' }, { score: 4, label: '<1' }] },
  { key: 'gcs', label: 'Glasgow', hint: 'puntos = 15 − GCS real', options:
    Array.from({ length: 13 }, (_, i) => { const gcs = 15 - i; return { score: 15 - gcs, label: `GCS ${gcs} → ${15 - gcs} pts` } }) },
]

export const APACHE2_AGE: Apache2Option[] = [
  { score: 0, label: '≤44 años' }, { score: 2, label: '45–54 años' }, { score: 3, label: '55–64 años' },
  { score: 5, label: '65–74 años' }, { score: 6, label: '≥75 años' },
]

export const APACHE2_CHRONIC: Apache2Option[] = [
  { score: 0, label: 'Sin insuficiencia orgánica grave / inmunocompromiso' },
  { score: 2, label: 'Con insuficiencia orgánica grave o inmunocompromiso — postop. electiva' },
  { score: 5, label: 'Con insuficiencia orgánica grave o inmunocompromiso — urgencia / no quirúrgico' },
]

export interface Apache2Scores {
  temp: number | null; map: number | null; hr: number | null; rr: number | null
  oxy: number | null; ph: number | null; na: number | null; k: number | null
  creat: number | null; arf: boolean; hct: number | null; wbc: number | null; gcs: number | null
  age: number | null; chronic: number | null
}

export const emptyApache2 = (): Apache2Scores => ({
  temp: null, map: null, hr: null, rr: null, oxy: null, ph: null, na: null, k: null,
  creat: null, arf: false, hct: null, wbc: null, gcs: null, age: null, chronic: null,
})

const APACHE2_PHYS_KEYS: Apache2Key[] = ['temp', 'map', 'hr', 'rr', 'oxy', 'ph', 'na', 'k', 'creat', 'hct', 'wbc', 'gcs']

/** Suma simple 0-71. Null-safe: si nada se ha marcado (ni fisiológicas, ni edad, ni
 * salud crónica), retorna null en vez de 0, igual que calcSofa/calcMrcTotal. */
export function calcApache2(a: Apache2Scores): number | null {
  const allEmpty = APACHE2_PHYS_KEYS.every(k => a[k] === null) && a.age === null && a.chronic === null
  if (allEmpty) return null
  let total = 0
  APACHE2_PHYS_KEYS.forEach(k => {
    const idx = a[k]
    if (idx === null) return
    const varDef = APACHE2_VARS.find(v => v.key === k)!
    let v = varDef.options[idx].score
    if (k === 'creat' && a.arf) v = v * 2
    total += v
  })
  if (a.age !== null) total += APACHE2_AGE[a.age].score
  if (a.chronic !== null) total += APACHE2_CHRONIC[a.chronic].score
  return total
}

/** Bandas de referencia aproximadas (Knaus 1985) — NO es una ecuación de
 * regresión, son bandas textuales tal como las presenta el prototipo v16. */
export function apache2Mortality(t: number): string {
  if (t <= 4) return '≈4%'
  if (t <= 9) return '≈8%'
  if (t <= 14) return '≈15%'
  if (t <= 19) return '≈25%'
  if (t <= 24) return '≈40%'
  if (t <= 29) return '≈55%'
  if (t <= 34) return '≈73%'
  return '≈85%'
}

export const APACHE2_TOTAL_FIELDS = 14 // 12 fisiológicas + edad + salud crónica

export function apache2FilledCount(a: Apache2Scores): number {
  let n = APACHE2_PHYS_KEYS.filter(k => a[k] !== null).length
  if (a.age !== null) n++
  if (a.chronic !== null) n++
  return n
}
```

Notas de fidelidad con el HTML fuente:
- El array de Glasgow se genera programáticamente igual que en el HTML (`Array.from({length:13},...)`) — no se transcriben las 13 opciones a mano para evitar un error de transcripción; el resultado es idéntico (GCS 15→0pts ... GCS 3→12pts).
- `apache2Mortality` recibe `t: number` (no `number | null`) a propósito: el caller (UI) solo debe invocarla cuando `calcApache2` ya devolvió un total no nulo, igual que hace el prototipo (`{total!==null && (...apache2Mortality(total)...)}`).
- El checkbox de Falla Renal Aguda (`arf`) vive fuera del array de opciones de creatinina (es un booleano independiente que multiplica ×2 el puntaje ya elegido), igual que en el HTML.

## 5. UI — componentes y dónde van

Nuevo archivo `app/src/features/patient/tabs/TabApache2.tsx`, agregado como pestaña nueva en `PatientPage.tsx` (mismo patrón de integración que se usó para `TabFuncional`/`TabEMR` en RYGF Fase 2 — junto a las demás pestañas del box, no en el tablero general).

Estructura del componente (calco de `TabFuncional.tsx`, con un componente de opciones nuevo estilo `ScorePillGroup` del prototipo en vez de `TextField` porque acá se seleccionan opciones de un array, no se tipean números):

- **`ScorePillGroup`** (nuevo, en `app/src/design-system/` — reutilizable, ya que APACHE II y futuros scores por catálogo de opciones lo necesitan): grupo de botones tipo "pill" que renderiza `options.map((opt, i) => ...)`, selecciona por índice `i` (`value === i`), click en la opción ya seleccionada la deselecciona (`onChange(value === i ? null : i)`), y linterna visual bordeada cuando hay una opción marcada (mismo comportamiento del prototipo, línea 853-878 de `UCI_Dashboard (16).html`). Props: `{ label, hint?, options: Apache2Option[], value: number | null, onChange: (v: number | null) => void }`. Cada pill muestra `<span class="score-pill__score">{opt.score}</span>{opt.label}`.
- **`TabApache2.tsx`**:
  - Estado local del formulario "en curso" (`useState<Apache2Scores>(emptyApache2())`), igual que `TabFuncional` usa `useState(emptyForm())`.
  - Barra de progreso `filled/14 variables registradas` con `Badge` (tone `ok` si `filled === APACHE2_TOTAL_FIELDS`, `warn` si `filled > 0`, `muted` si `filled === 0`) + advertencia textual "las variables sin marcar cuentan como 0 puntos, no como 'sin dato'" cuando está incompleto — calco literal del prototipo (línea 934-938).
  - Checkbox de Falla Renal Aguda encima del grupo de Creatinina (o junto a él), controla `form.arf`.
  - Un `ScorePillGroup` por cada entrada de `APACHE2_VARS`, más uno para `APACHE2_AGE` (label "Edad") y uno para `APACHE2_CHRONIC` (label "Salud crónica").
  - Bloque de total en vivo: `calcApache2(form)` + `Badge tone="danger"` (o similar) mostrando `total` y `apache2Mortality(total)` cuando `total !== null` — igual al bloque rojo del prototipo (línea 941-949), pero usando tokens del design system en vez de `C.redDim`/`C.red` hardcodeados.
  - Botón **"+ Guardar evaluación"** (`Button` del design system) que llama `useChildRow('apache2_assessments').insert.mutate({ stay_id: stay.id, ...form })` y resetea el formulario a `emptyApache2()` — igual que `mrc.insert.mutate(...)` en `TabFuncional`. No se guarda si el formulario está completamente vacío (`filled === 0`), mismo guard que usa `TabFuncional` (`allBlank`).
  - Sección **"Historial de evaluaciones"**: lista `stay.apache2_assessments` ordenada por `assessed_at` descendente, mostrando fecha/hora, total calculado (`calcApache2`) + badge de mortalidad, y `ConfirmDeleteButton` para borrar (`apache2.remove.mutate(a.id)`) — calco de la sección `func-historial` de `TabFuncional.tsx` (líneas 105-137).
  - Nota al pie idéntica en espíritu a la del prototipo: "Cada variable es el peor valor registrado en las últimas 24 horas. Tablas de puntaje: Knaus et al. 1985."

Reutiliza del design system: `Badge` (design-system/Badge.tsx), `Button` (design-system/Button.tsx), `ConfirmDeleteButton` (design-system/ConfirmDeleteButton.tsx). No usa `AutoText`/`AutoNumber` porque APACHE II no es un patch directo a una fila compartida — es un insert a una tabla de historial vía `useChildRow`, igual que MRC-SS.

No se requieren tokens de color nuevos en `tokens.css`: el bloque de total reutiliza el tono `danger` (o el que ya exista para severidad alta) y `ScorePillGroup` reutiliza los tokens de superficie/borde/acento ya definidos para inputs/botones del design system (sin hex hardcodeado, siguiendo la regla del proyecto).

## 6. Testing

TDD, Vitest + React Testing Library. Casos concretos:

**`apache2.test.ts` (lib/clinical):**
- `calcApache2(emptyApache2())` → `null` (nada marcado).
- Formulario con solo `temp: 0` (índice 0 → score 4, "≥41") y el resto `null` → total `4` (no cuenta edad/crónico como 0 forzado, pero si se marcan sí suman).
- Índices distintos con mismo puntaje se distinguen correctamente: `temp: 0` (≥41, score 4) vs `temp: 7` (<30, score 4) — ambos dan el mismo total pero deben poder reconstruirse como opciones distintas al leer el objeto (test verifica que `a.temp` guarda el índice, no el score).
- Creatinina con `creat: 0` (≥3.5, score 4) y `arf: true` → contribuye `8` (×2), no `4`.
- Creatinina con `creat: 3` (0.6–1.4, score 0) y `arf: true` → contribuye `0` (0×2 sigue siendo 0), caso límite para evitar un bug de "arf suma un flat +algo" en vez de multiplicar.
- Glasgow: `gcs: 0` (GCS 15) → score `0`; `gcs: 12` (GCS 3) → score `12`. Verifica la fórmula `15 - gcs_real` generada programáticamente.
- Edad `age: 4` (≥75 años) → suma `6`; `chronic: 2` (urgencia/no quirúrgico) → suma `5`.
- Total máximo teórico: todas las variables en su peor opción (12×4 = 48) + edad 6 + crónico 5 + ARF duplicando creatinina (+4 extra) = 63 (el máximo real del score completo, para verificar que no se satura en 71 artificialmente ni se pasa por un error de suma).
- `apache2Mortality`: valores límite exactos de cada banda — `4` → `≈4%`, `5` → `≈8%`, `9` → `≈8%`, `10` → `≈15%`, `35` → `≈85%` (por sobre 34) — para pescar un típico off-by-one en los `<=`.
- `apache2FilledCount`: cuenta 0 al inicio, sube a 14 cuando se llenan todas las fisiológicas + edad + crónico; `arf` NO cuenta como una de las 14 (es un modificador, no una variable independiente) — test explícito para evitar ese bug.

**`TabApache2.test.tsx` (component, RTL):**
- Render inicial: 0/14 variables registradas, sin bloque de total (porque `calcApache2` es `null`).
- Click en una opción de `ScorePillGroup` la marca (aria-pressed / clase activa) y actualiza el contador a 1/14.
- Click en la misma opción ya marcada la deselecciona (vuelve a `null`), replicando el toggle del prototipo.
- Con el formulario completo, aparece el bloque de total con el número correcto y el texto de mortalidad.
- Botón "Guardar evaluación" deshabilitado o no-op cuando el formulario está completamente vacío (mismo guard `allBlank` que `TabFuncional`).
- Al guardar, se llama `insert.mutate` con el `stay_id` correcto y el formulario se resetea a vacío.
- El historial muestra evaluaciones previas de `stay.apache2_assessments` con su total recalculado, y el botón de borrar dispara `remove.mutate(id)` tras confirmar (patrón `ConfirmDeleteButton`).
- Caso de fixture: usar `baseStay()` extendido con `apache2_assessments: []` por defecto y un caso con 1-2 evaluaciones previas para probar el orden descendente por `assessed_at`.

## 7. Criterios de éxito

- `app/src/lib/clinical/apache2.ts` reproduce exactamente (sin parafrasear) los puntajes y umbrales de `UCI_Dashboard (16).html` líneas 105-188, verificado variable por variable contra el HTML fuente.
- El modelo de datos guarda el índice de cada opción elegida (no el puntaje), permitiendo reconstruir exactamente qué opción se marcó en cada una de las 14 variables + ARF.
- Migración `006_apache2.sql` aplica limpio contra el proyecto Supabase (`mcp__supabase-uci-control__apply_migration`) y sigue el estilo de `004_funcional_emr.sql` (trigger `touch_row`, RLS `authenticated all`, alta a `supabase_realtime`).
- Pestaña APACHE II visible dentro de `PatientPage.tsx` de cada box, con historial de evaluaciones fechadas y borrado individual.
- 100% de los tests nuevos (`apache2.test.ts`, `TabApache2.test.tsx`) pasan, incluyendo los casos límite de bandas de mortalidad y el caso ARF+creatinina baja (×2 de 0 sigue siendo 0).
- Ningún color nuevo hardcodeado en hex — todo token de `tokens.css` existente o extendido con par claro/oscuro.
- Build y typecheck (`npm run build`) sin errores tras integrar `Apache2Assessment` a `types.ts` y `StayFull`.

## 8. Decisiones (2026-07-28)

Las 3 preguntas del borrador original se resuelven aquí con criterio propio — ninguna es una
bifurcación de producto que requiera al usuario, a diferencia de las de IAAS (sección
correspondiente del spec IAAS):

1. **Ubicación de la pestaña**: SOFA-basal (spec paralelo) no agrega una pestaña nueva — es un
   campo (`stays.sofa_basal`) dentro de la pestaña SOFA existente. Los únicos tabs realmente
   nuevos de esta ronda son APACHE II e IAAS (IAAS ya decidió en su propio spec ir al final del
   array). **Decisión: "APACHE II" va inmediatamente después de la pestaña "SOFA" existente**
   — ambas son scores de severidad, agrupación natural para el equipo clínico. Cambiar el
   orden después es una línea en el array `tabs` de `PatientPage.tsx`.
2. **`ScorePillGroup` como componente compartido**: no bloquea esta fase — SAPS3 está
   explícitamente fuera de esta ronda de specs (pendiente de que el usuario confirme con el Dr.
   Arteaga qué versión de la ecuación de mortalidad es la vigente, ver memoria
   `v16-v7-comparacion-produccion`). Se construye `ScorePillGroup` ahora en `design-system/`
   tal como propone este spec; si SAPS3 termina necesitando el mismo patrón, lo reutiliza sin
   cambios — no hay nada que unificar todavía porque no existe aún el otro consumidor.
3. **Retención/edición del historial**: confirmado que sigue el mismo comportamiento que
   MRC-SS (insert + borrar, sin edición in-place) — es el único patrón de historial que existe
   hoy en el repo para evaluaciones clínicas repetidas, sin motivo para desviarse.
