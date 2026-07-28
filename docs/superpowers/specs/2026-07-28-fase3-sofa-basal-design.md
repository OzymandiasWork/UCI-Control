# SOFA basal y ΔSOFA — Diseño

**Fecha:** 2026-07-28
**Proyecto:** UCI Torre Valech — HUAP
**Origen:** UCI_Dashboard_v16.html (extracción ya hecha, se te da abajo)

## 1. Objetivo

Agregar a la pestaña SOFA (ya existente en producción) un valor de referencia "SOFA basal (al ingreso)", registrado una sola vez por estadía, y mostrar el ΔSOFA (SOFA actual − basal) junto al badge de riesgo, con color según si el paciente empeoró o mejoró respecto al ingreso.

## 2. Enfoques considerados

**Opción A — columna `sofa_basal` en `stays`.**
El basal es un atributo de la estadía (fijo, un valor por paciente-ingreso), no un evento fechado. Encaja con el patrón ya usado para `destino_tipo`/`comorbilidades` (migración 005): columna simple en `stays`, editada con `useUpdateStay` (patch parcial, ya anti-clobbering). Pro: cero tablas nuevas, cero triggers nuevos (stays ya tiene `touch_row`/RLS/realtime), consistente con el prototipo (`box.sofaBasal` vive en el mismo objeto que el resto de datos del box). Contra: si en el futuro se quisiera un historial de "distintos basales" (ej. reingreso), no quedaría modelado — pero eso no es el comportamiento actual del prototipo ni un requisito pedido.

**Opción B — tabla separada `sofa_baseline` (stay_id PK, valor, fecha de registro).**
Sigue el patrón de tabla "hijo" 1:1 (como `nutrition`/`vent_settings`). Pro: aísla el dato, deja espacio para metadatos futuros (quién lo registró, cuándo). Contra: sobre-ingeniería para un solo número que el prototipo trata como campo plano del box; obliga a un join adicional en `fetchBoard` y a una mutación extra (`useUpsertSofaBasal`) que haría exactamente lo mismo que `useUpdateStay` ya hace genéricamente.

**Opción C — primer registro de `sofa_assessments` como basal implícito ("el primer día evaluado es el basal").**
Pro: no requiere columna nueva. Contra: no es lo que pide el prototipo (el basal es un campo editable explícito, independiente de si se te olvidó cargar el SOFA el día 1) y es frágil (¿qué pasa si se corrige el primer día después?, ¿qué pasa si el primer día real no se cargó a tiempo?). Se descarta.

**Recomendación: Opción A.** Es la más simple, reutiliza infraestructura existente sin tocarla (mismo patrón que 005), y replica exactamente el modelo de datos del prototipo (`sofaBasal` es un campo más del box, no una entidad con vida propia).

## 3. Modelo de datos (Supabase, migración nueva)

Archivo: `supabase/migrations/006_sofa_basal.sql`

```sql
-- UCI Control — Fase 3: SOFA basal (al ingreso) para cálculo de ΔSOFA
-- Valor de referencia único por estadía, editado una sola vez (o corregido
-- manualmente). NULL = no registrado todavía; el resto de la app (SOFA
-- actual, badge de riesgo) sigue funcionando igual sin este dato.
alter table public.stays
  add column sofa_basal integer,
  add constraint sofa_basal_range check (sofa_basal is null or sofa_basal between 0 and 24);
```

No se necesita trigger `touch_row` nuevo, política RLS nueva, ni alta en `supabase_realtime`: `stays` ya tiene los tres desde la migración base, y `sofa_basal` es una columna más de esa misma tabla — el `update` la cubre automáticamente igual que `destino_tipo`/`comorbilidades`.

`sofa_basal` queda **nullable sin default** (a diferencia de `comorbilidades`/`destino_tipo`, que son `not null default ''`) porque semánticamente "no registrado" y "0 puntos" son valores distintos y ambos válidos clínicamente: un `default 0` mentiría (sugeriría un SOFA basal de 0 sin que nadie lo haya evaluado).

## 4. Lógica clínica

Archivo: `app/src/lib/clinical/sofa.ts` — agregar (no tocar `SOFA_DOMAINS`/`calcSofa`/`sofaRisk` existentes):

```ts
export type SofaDeltaTrend = 'worse' | 'better' | 'same'

export interface SofaDelta {
  value: number
  trend: SofaDeltaTrend
}

/**
 * ΔSOFA = SOFA total actual − SOFA basal.
 * Null-safe: si falta el total actual o el basal, no hay delta (prototipo:
 * `basal!==null && basal!==undefined && basal!==""`).
 */
export function calcSofaDelta(total: number | null, basal: number | null): SofaDelta | null {
  if (total === null || basal === null) return null
  const value = total - basal
  const trend: SofaDeltaTrend = value > 0 ? 'worse' : value < 0 ? 'better' : 'same'
  return { value, trend }
}

/** Mapea la tendencia del delta a un tono del design system (Badge/color). */
export function sofaDeltaTone(trend: SofaDeltaTrend): SofaTone {
  if (trend === 'worse') return 'danger'
  if (trend === 'better') return 'ok'
  return 'warn'
}
```

Valores migrados verbatim del HTML fuente (`TabSofa` del prototipo, líneas ~800-820 y ~1314-1358):
- `delta = total - Number(basal)`, solo si `total!==null` y `basal` está presente (`!==null && !==undefined && !==""`).
- Color: `delta>0` → rojo (empeoró), `delta<0` → verde (mejoró), `delta===0` → ámbar/texto ("sin cambio"). Esto mapea a los tonos existentes del design system: `danger` (rojo), `ok` (verde), `warn` (ámbar) — no se inventan colores nuevos, se reutiliza `SofaTone`/`Badge`.
- Rango de input: `min={0} max={24}` (igual al prototipo — 6 dominios × 4 puntos máx.).
- Texto de badge de tarjeta (vista tablero, líneas ~1358): solo se muestra si `sofaDelta!==null && sofaDelta!==0`, formato `Δ{+n}` o `Δ{-n}` (sin signo si negativo, ya lo trae `n`).
- Texto de la pestaña (línea ~818): `"empeoró"` / `"mejoró"` / `"sin cambio"` + `" vs. basal"`.

## 5. UI — componentes y dónde van

**`app/src/design-system/Field.tsx` — extender `NumberField` (no crear componente paralelo):**
Agregar soporte a valor nulo, porque "SOFA basal" debe poder estar vacío (a diferencia de todos los `NumberField` actuales, que siempre parten de 0):
```ts
export function NumberField({ label, value, onChange, min = 0, max = 999 }:
  BaseProps & { value: number | null; onChange: (v: number | null) => void; min?: number; max?: number })
```
Cuando `value === null` el input se muestra vacío (`value={value ?? ''}`); al escribir, `''` → `onChange(null)`, cualquier otro número se clampa igual que hoy. Los botones +/− parten de 0 si el valor actual es `null`. Esto es un cambio de tipo (`number` → `number | null`) que afecta a todos los usos existentes de `NumberField`/`AutoNumber` — deben seguir compilando porque `number` es asignable donde se espera `number | null`; los `onChange` existentes que asumen `number` no-nulo deben revisarse (los actuales siempre parten de un valor con default numérico en su tabla, así que en la práctica nunca reciben `null`, pero el tipo del callback cambia y hay que ajustar las firmas).

**`app/src/features/patient/AutoFields.tsx` — extender `AutoNumber` en paralelo:**
```ts
export function AutoNumber({ label, value, onSave, min, max }:
  { label: string; value: number | null; onSave: (v: number | null) => void | Promise<void>; min?: number; max?: number })
```
Sigue el mismo patrón (`useDraft` genérico, ya soporta cualquier `T` incluyendo `number | null` sin cambios).

**`app/src/features/patient/tabs/TabSofa.tsx` — agregar:**
- Import `useUpdateStay` (ya existe en `useBoard.ts`) además de `useUpsertSofaToday`.
- Import `calcSofaDelta`, `sofaDeltaTone` de `sofa.ts`.
- Bajo el `<p>` de SOFA total/badge de riesgo existente, agregar el bloque de basal + delta:
  ```tsx
  const { mutate: updateStay } = useUpdateStay()
  const delta = calcSofaDelta(total, stay.sofa_basal)
  // ...
  <AutoNumber
    label="SOFA basal (al ingreso)"
    value={stay.sofa_basal}
    onSave={v => updateStay({ id: stay.id, patch: { sofa_basal: v } })}
    min={0} max={24}
  />
  {delta && (
    <Badge tone={sofaDeltaTone(delta.trend)}>
      ΔSOFA {delta.value > 0 ? '+' : ''}{delta.value} ·{' '}
      {delta.trend === 'worse' ? 'empeoró' : delta.trend === 'better' ? 'mejoró' : 'sin cambio'} vs. basal
    </Badge>
  )}
  ```
  Nótese `patch: { sofa_basal: v }` — nunca se manda el stay completo (mismo anti-patrón ya corregido antes en este proyecto).

**`app/src/features/patient/BoxCard.tsx`** (o el componente de tarjeta del tablero que ya muestra el badge de riesgo SOFA — confirmar nombre exacto en el código, el prototipo lo hace en la vista de grilla ~línea 1358): agregar junto al badge de riesgo existente un badge secundario compacto `Δ{n}` (con signo si positivo) solo cuando `delta !== null && delta.value !== 0`, usando el mismo `sofaDeltaTone`.

**`app/src/lib/supabase/types.ts`**: agregar `sofa_basal: number | null` al tipo `Stay` (columna nueva de la tabla, análogo a como se agregaron `destino_tipo`/`comorbilidades` en la migración 005).

**Ningún token de color nuevo**: `danger`/`ok`/`warn` de `Badge`/`SofaTone` ya cubren rojo/verde/ámbar con sus pares claro/oscuro definidos en `tokens.css`.

## 6. Testing

TDD, en `app/src/lib/clinical/sofa.test.ts` (extender el archivo existente) y `TabSofa.test.tsx`:

- `calcSofaDelta`:
  - `calcSofaDelta(null, null)` → `null`.
  - `calcSofaDelta(8, null)` → `null` (SOFA actual sin basal registrado — caso más común al inicio de cualquier estadía).
  - `calcSofaDelta(null, 4)` → `null` (basal cargado pero SOFA del día aún no evaluado).
  - `calcSofaDelta(8, 4)` → `{ value: 4, trend: 'worse' }`.
  - `calcSofaDelta(2, 6)` → `{ value: -4, trend: 'better' }`.
  - `calcSofaDelta(5, 5)` → `{ value: 0, trend: 'same' }`.
  - `calcSofaDelta(0, 0)` → `{ value: 0, trend: 'same' }` (caso límite: basal 0 es un valor legítimo, no debe tratarse como "no registrado" — por eso la función distingue `null` de `0`).
- `sofaDeltaTone('worse')` → `'danger'`, `('better')` → `'ok'`, `('same')` → `'warn'`.
- `TabSofa.tsx` (RTL, usando `baseStay()` de `app/src/test/fixtures.ts`):
  - Sin `sofa_basal` (null) y sin evaluación de hoy: no se renderiza el bloque ΔSOFA, el input de basal aparece vacío.
  - Con `sofa_basal = 4` y SOFA de hoy sumando 8: se ve "ΔSOFA +4 · empeoró vs. basal" con tono `danger`.
  - Con `sofa_basal = 6` y SOFA de hoy sumando 2: "ΔSOFA -4 · mejoró vs. basal" con tono `ok`.
  - Al escribir en el input de basal y perder foco (`blur`), se llama `updateStay` con `{ id: stay.id, patch: { sofa_basal: <valor> } }` — nunca con el objeto `stay` completo (regresión del bug de spread ya corregido antes).
  - Borrar el input de basal (dejarlo vacío) guarda `sofa_basal: null`, no `0` ni `NaN`.
- Migración: test de esquema (`check-schema.mjs` o el mecanismo ya usado en RYGF2 T8) verificando que `sofa_basal` existe en `stays` como `integer` nullable.

## 7. Criterios de éxito

- La pestaña SOFA existente sigue funcionando exactamente igual si nadie toca el basal (sin regresiones en el cálculo de SOFA total/riesgo ya en producción).
- Se puede registrar/editar/borrar el SOFA basal desde la pestaña SOFA de cualquier box, con guardado automático (debounce + reintento, patrón `AutoNumber`) y sin pisar otros campos del stay.
- El ΔSOFA se muestra solo cuando hay tanto SOFA actual como basal; el signo y color (rojo=empeoró, verde=mejoró, ámbar=sin cambio) coinciden exactamente con el prototipo v16.
- El badge compacto de Δ aparece en la tarjeta del tablero junto al indicador de riesgo, solo si el delta es distinto de 0.
- `sofa_basal` persiste por estadía (se resetea solo al dar de alta/crear un nuevo ingreso en el mismo box, igual que el resto de columnas de `stays`).
- Todos los tests nuevos pasan; no se modifican `SOFA_DOMAINS`, `calcSofa` ni `sofaRisk` existentes.
- El cambio de tipo de `NumberField`/`AutoNumber` (`number` → `number | null`) no rompe compilación TS en ningún uso existente (vent_settings, nutrition, etc.) — se revisan y ajustan si hace falta.

## 8. Preguntas resueltas (2026-07-28)

- **Columnas SOFA basal/ΔSOFA en el export CSV**: resuelto por el spec paralelo de CSV export,
  que ya reservó las columnas 8 y 9 como `'—'` fijo hasta que este spec (SOFA-basal) exista —
  ver `2026-07-28-fase3-csv-export-design.md` sección 4.2. No hace falta trabajo adicional
  aquí: cuando esta fase se implemente, el CSV export solo necesita reemplazar esas dos líneas
  con el `getValue` real, sin tocar el resto del generador.
- **¿`sofa_basal` se limpia automáticamente en un reingreso al mismo box?** Verificado contra
  `useAdmitStay()` (`app/src/lib/supabase/useBoard.ts:61`): un nuevo ingreso hace
  `supabase.from('stays').insert({ box_number: boxNumber })`, una fila `stays` completamente
  nueva con todas las demás columnas en su default de esquema — no reutiliza ni reescribe la
  fila anterior. Con `sofa_basal` nullable sin default explícito (`null`), un paciente nuevo en
  el mismo box parte automáticamente con `sofa_basal: null`. Confirmado, sin trabajo adicional
  necesario.
