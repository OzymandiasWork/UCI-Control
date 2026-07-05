# RYGF Fase 2, parte 1 — Evaluación Funcional + EMR — Diseño

**Fecha:** 2026-07-05
**Proyecto:** UCI Torre Valech — HUAP
**Origen:** `dataucicontrrol/RYGF_Digital_HUAP_v1 (1).html`, paneles `panel-funcional` y `panel-emr`
**Precede a:** RYGF Fase 1 (Ventilación, ya en producción en ucicontrol.cl)

## 1. Objetivo

Migrar los paneles de Evaluación Funcional (MRC-SS, FSS-ICU, IMS, fuerza) y Entrenamiento Muscular Respiratorio (EMR) del prototipo RYGF a la arquitectura React+Supabase existente, como dos pestañas nuevas en el detalle del paciente.

## 2. Decisión de alcance: por qué solo esta parte

El prototipo RYGF completo (Fase 2) tiene 5 paneles restantes: Funcional, Conciencia/Sedación/Delirium, Traqueostomía, EMR, y "Proyección IA". Son subsistemas independientes entre sí — mezclarlos en una sola implementación sería tan grande como toda la Fase 1. Se decidió con el usuario:

- **Esta pasada**: Funcional + EMR (agrupados porque kinesiología los usa juntos en el prototipo y no suman complejidad real entre sí).
- **Quedan para specs futuras**: Conciencia/Sedación/Delirium, Traqueostomía.
- **Descartado explícitamente**: el panel "Proyección IA" del prototipo no contiene lógica real — son valores de ejemplo escritos a mano (ej. "PAFI estimada mañana: 240–260") sin cálculo detrás. Replicarlo tal cual simularía una capacidad de IA que no existe, lo cual no es aceptable en una herramienta clínica real. Si en el futuro se quiere una proyección de indicadores, debe construirse con lógica real (como se hizo con la proyección de ocupación de camas), no como panel decorativo.

## 3. Modelo de datos (Supabase, migración 004)

### `mrc_assessments` — historial con fecha (como `blood_gases`, no como `sofa_assessments`)

El MRC-SS se mide cada varios días para trackear evolución de la debilidad, no a diario — cada evaluación es una fila nueva, sin límite de una por día.

```sql
create table public.mrc_assessments (
  id uuid primary key default gen_random_uuid(),
  stay_id uuid not null references public.stays on delete cascade,
  assessed_at timestamptz not null default now(),
  -- MRC-SS: 12 grupos musculares, 0-5 cada uno (nullable = no evaluado aún)
  abd_hh_d int check (abd_hh_d between 0 and 5),   -- abducción hombro derecho
  flex_hh_d int check (flex_hh_d between 0 and 5), -- flexión codo derecho
  ext_mu_d int check (ext_mu_d between 0 and 5),   -- extensión muñeca derecha
  abd_hh_i int check (abd_hh_i between 0 and 5),
  flex_hh_i int check (flex_hh_i between 0 and 5),
  ext_mu_i int check (ext_mu_i between 0 and 5),
  flex_rod_d int check (flex_rod_d between 0 and 5), -- flexión rodilla derecha
  ext_rod_d int check (ext_rod_d between 0 and 5),
  dors_pie_d int check (dors_pie_d between 0 and 5), -- dorsiflexión pie derecho
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
  pct_fcr int,          -- % frecuencia cardíaca de reserva (separado del texto combinado del prototipo)
  borg_fuerza int check (borg_fuerza between 0 and 10),
  dolor_ena int check (dolor_ena between 0 and 10),
  dva_sesion boolean not null default false,
  uma numeric,           -- unidades metabólicas de actividad (MET)
  set_min int,           -- tiempo de ejercicio (min)
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users
);
```

### `emr_sessions` — historial libre (sin límite de sesiones por día)

```sql
create table public.emr_sessions (
  id uuid primary key default gen_random_uuid(),
  stay_id uuid not null references public.stays on delete cascade,
  session_at timestamptz not null default now(),
  session_type text not null default 'fuerza' check (session_type in ('fuerza','resistencia')),
  carga_pct int,
  cmh2o int,
  repeticiones int,      -- solo aplica a 'fuerza'
  series int,            -- solo aplica a 'fuerza'
  minutos int,           -- solo aplica a 'resistencia'
  tolerancia boolean not null default true,
  borg int check (borg between 0 and 10),
  -- Chequeo basal opcional (remedición periódica, no en cada sesión)
  pim_test int,
  pef_test int,
  fraccion_acort_pct numeric,
  eco_diaf_esp_mm numeric,
  eco_diaf_ins_mm numeric,
  notas text not null default '',
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users
);
```

Ambas tablas: mismo trigger `touch_row`, misma política RLS (`authenticated all`), agregadas a `supabase_realtime`, siguiendo exactamente el patrón de las migraciones 001-003.

## 4. Lógica clínica (`app/src/lib/clinical/functional.ts`)

Migrado **verbatim** de `calcMRC()` del prototipo (línea 1612):

```ts
export function calcMrcTotal(scores: (number | null)[]): number | null // null-safe, igual que calcSofa
export function mrcInterp(total: number | null): { label: string; tone: 'ok'|'proc'|'warn'|'danger'|'muted' }
// total >= 48 → "Fuerza normal" (ok)
// total >= 36 → "Debilidad adquirida leve" (proc)
// total >= 24 → "Debilidad adquirida moderada" (warn)
// total < 24  → "DAUCI severa" (danger)
// null        → "—" (muted)
```

FSS-ICU e IMS se muestran como número simple con su rango (`/35`, `/10`) — el prototipo no define umbrales de interpretación para ellos, así que no se inventan; solo se muestra el valor.

## 5. UI — dos pestañas nuevas

Se insertan después de "Sugerencias" en `PatientPage.tsx` (10 pestañas totales; la barra ya es deslizable en móvil desde la sesión anterior).

**"Funcional"** (`TabFuncional.tsx`):
- Grilla de 12 campos MRC-SS (AutoNumber 0-5), agrupados visualmente D/I como en el prototipo.
- Total autocalculado + Badge de interpretación, recalculado en cada cambio de campo (antes de guardar, igual que Ventilación).
- FSS-ICU, IMS, handgrip D/I, tiempo de trabajo, %FCR, Borg, dolor ENA, DVA, UMA, SET.
- Botón "Guardar evaluación" que inserta una fila nueva en `mrc_assessments` (no autosave campo-por-campo, porque es una evaluación puntual con fecha, no un dato continuo como Ventilación) — usa `useChildRow('mrc_assessments').insert.mutate(...)`, extendiendo el union type de `useChildRow` en `useBoard.ts` (línea 85) que ya soporta `goals | antibiotics | accesses | blood_gases`.
- Lista de las últimas 5 evaluaciones con fecha, total y Badge, cada una con `ConfirmDeleteButton` (mismo patrón visual de lista que la sección "🧪 Gases arteriales" de `TabVentilacion.tsx`).

**"EMR"** (`TabEMR.tsx`):
- Formulario para agregar sesión: tipo (Fuerza/Resistencia vía `SelectField` de `design-system/Field.tsx`, que muestra repeticiones+series o minutos según el tipo elegido), carga, cmH₂O, tolerancia, Borg, y los 5 campos de chequeo basal opcionales.
- Lista de sesiones registradas con fecha, tipo, parámetros, `ConfirmDeleteButton` — usa `useChildRow('emr_sessions')`, mismo union type extendido.

## 6. Seguridad de datos (reutilizando lo aprendido hoy)

- Los inserts nuevos NO reutilizan el patrón de "objeto completo + patch" — cada evaluación/sesión es un INSERT nuevo (no upsert de fila compartida), así que el bug de clobbering de esta sesión no aplica aquí por diseño.
- Cada fila insertada usa `AutoNumber`/`AutoText` solo para edición posterior si se permite (v1 de esta feature: **las evaluaciones son de solo lectura tras guardarse** — si kine se equivoca, borra con `ConfirmDeleteButton` y crea una nueva. Editar una evaluación histórica ya guardada queda fuera de alcance).

## 7. Testing

- `functional.test.ts`: suma MRC-SS null-safe, los 4 umbrales exactos, casos límite (47/48, 35/36, 23/24).
- `TabFuncional.test.tsx` / `TabEMR.test.tsx`: insertar evaluación/sesión llama al insert con los campos correctos; borrar pide confirmación (reutilizando `ConfirmDeleteButton`, ya testeado).
- Regresión: ningún insert de estas tablas debe depender de un objeto local desactualizado (test que confirma que el payload del insert es independiente de renders anteriores).

## 8. Criterios de éxito

1. Un usuario autenticado registra una evaluación MRC-SS completa (12 campos) desde el celular y ve el total + interpretación correctos antes de guardar.
2. La evaluación queda en Supabase con fecha/hora, visible en la lista de historial, sin pisar evaluaciones anteriores.
3. Una sesión EMR (fuerza o resistencia) se registra y aparece en el historial de sesiones.
4. Borrar una evaluación o sesión pide confirmación (mismo componente que ya existe).
5. Lighthouse accesibilidad se mantiene en 100 en `/box/:n` con las pestañas nuevas.
6. 0 regresiones en los 114 tests existentes.
