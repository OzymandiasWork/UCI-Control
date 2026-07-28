# Prevención de IAAS — Diseño

**Fecha:** 2026-07-28
**Proyecto:** UCI Torre Valech — HUAP
**Origen:** UCI_Dashboard (16).html / UCI_Dashboard_v16.html (extracción ya hecha, se detalla abajo)

## 1. Objetivo

Llevar a producción el módulo de Prevención de IAAS (Infecciones Asociadas a la Atención de
Salud) del prototipo v16: 17-18 categorías de vigilancia diaria (dispositivos invasivos, metas
DAAS, kinesiología, fonoaudiología, tromboprofilaxis, cuidados de piel) que el equipo tratante
completa por paciente, con foco en indicación activa y retiro oportuno de dispositivos —
el mecanismo de prevención de IAAS más efectivo y el que el prototipo prioriza visualmente
(⚠ día≥5).

## 2. Enfoques considerados

### Modelo de datos: ¿una tabla genérica o dos tablas por cardinalidad?

- **A. Tabla única `iaas_entries` tipo EAV** (`stay_id`, `category_key`, `value jsonb`).
  Pro: una sola tabla para las 17-18 categorías, agregar una categoría nueva no toca el
  esquema. Contra: pierde los `check` de Postgres sobre valores válidos, las consultas para
  `computeIaasStats` (¿tiene la categoría algún valor?) se vuelven `jsonb` ad-hoc en vez de
  `is not null`/`<> ''`, y no hay precedente de este patrón en el repo (todas las tablas
  existentes son columnas tipadas).
- **B. Dos tablas separadas por cardinalidad, cada una siguiendo un patrón YA usado en el
  repo** — **recomendada, con un ajuste tras revisión con el usuario (ver abajo)**:
  - `iaas_devices`: **insert-only, un evento por fila** — mismo patrón que
    `mrc_assessments`/`blood_gases` (`id` propio + `recorded_at timestamptz default now()`),
    NO un singleton por `(stay_id, device_key)`. Decisión confirmada con el usuario: IPC/
    Enfermería necesita poder reportar cuántos ciclos instalar→retirar→reinstalar tuvo un
    dispositivo durante la estadía, algo que un singleton que se sobreescribe no puede dar.
    "Estado actual" de un dispositivo = la fila más reciente por `recorded_at` para ese
    `(stay_id, device_key)` (misma derivación que ya usa `TabFuncional.tsx` para mostrar la
    última evaluación MRC-SS: `[...rows].sort((a,b) => b.at.localeCompare(a.at))[0]`).
  - `iaas_status`: una fila por `stay_id` con una columna por cada categoría "single" (2) y
    "multi" (7, como `text[]`) — mismo patrón 1:1 que `nutrition`/`vent_settings`. Esta parte
    no cambia: el pedido de historial fue específicamente sobre dispositivos, no sobre las
    metas DAAS/kine/etc., que sí son razonables como "estado del día".
  Pro: reutiliza dos patrones ya probados en el codebase (insert-only y singleton-por-stay),
  mantiene `check` constraints sobre status de dispositivo, es directo de tipar en `types.ts`.
  Contra: dos tablas nuevas en vez de una; `iaas_devices` insert-only genera más filas con el
  tiempo que un singleton (aceptado explícitamente al elegir historial completo).
- **C. Extender la tabla `accesses` existente** con `status`/`retiro_day`/`retiro_motivo` para
  cubrir los dispositivos, y solo agregar `iaas_status` para single/multi. Se descarta por la
  misma razón que antes — `accesses` permite múltiples filas simultáneas del mismo tipo sin
  noción de "estado", semántica distinta a IAAS — pero **con una corrección importante**: el
  borrador original de este spec afirmaba que "CVC, CUP, L.A., CHD ya se registran en Accesos
  vasculares". Verificado contra `lib/clinical/constants.ts`, eso es **incorrecto**: el
  catálogo real de `ACCESS_TYPES` es `CVC, FAP, PICC, Port-a-cath, PVC, Diálisis, Marcapasos
  transitorio` — de los 9 dispositivos IAAS, **solo CVC se superpone de verdad**; Swan-Ganz,
  SMCT, CHD, L.A., CUP, TOT, TQT y Contención no se registran hoy en ningún lado. Con la
  confirmación del usuario de fusionar ambas secciones, la fusión real y acotada es: **CVC
  sale de `ACCESS_TYPES`/"Accesos vasculares" y pasa a vivir exclusivamente en `iaas_devices`**
  (con migración de datos de las filas existentes, sección 3). Los otros 6 tipos de
  `ACCESS_TYPES` (FAP, PICC, Port-a-cath, PVC, Diálisis, Marcapasos transitorio) no tienen
  equivalente en IAAS y se quedan sin cambios en `TabClinico.tsx`.

Se recomienda **B** con el ajuste de arriba: `iaas_devices` insert-only, y CVC fusionado desde
`accesses` hacia `iaas_devices` como fuente única de verdad.

### UI: ¿17-18 componentes o uno genérico dirigido por configuración?

- **A. Un componente por categoría** (`TabIaasCvc.tsx`, `TabIaasSwanGanz.tsx`, …, 18
  archivos). Pro: cada archivo es trivial de leer aislado. Contra: ~18 archivos casi
  idénticos (mismo JSX para "device", repetido 9 veces); cualquier cambio de estilo o de
  comportamiento (ej. agregar el aviso de día≥5) hay que replicarlo 9 veces; viola DRY de
  forma flagrante para un patrón que es genuinamente data-driven.
- **B. Un solo `TabIaas.tsx` dirigido por un array de configuración** (`IAAS_CATEGORIES` en
  `lib/clinical/iaas.ts`, cada entrada con `{ type: 'device'|'single'|'multi', ... }`), con
  tres subcomponentes de presentación (`DeviceCategory`, `SingleCategory`, `MultiCategory`)
  elegidos por `category.type` — **recomendada**. Pro: ~4 archivos chicos en vez de 18,
  agregar una categoría nueva es agregar una entrada al array (no un archivo), el
  comportamiento del aviso día≥5 vive en un solo lugar. Contra: quien lea `TabIaas.tsx` por
  primera vez necesita mirar también la config para entender qué se renderiza — indirección
  levemente mayor que A, pero muy inferior al costo de mantener 18 copias.
- **C. Tres componentes agrupados por patrón** (`TabIaasDevices.tsx`,
  `TabIaasSingle.tsx`, `TabIaasMulti.tsx`), cada uno iterando su propio catálogo. Es
  esencialmente B partido en 3 archivos en vez de 1 contenedor + 3 subcomponentes de
  presentación. Trade-off marginal frente a B; se deja como variante aceptable durante la
  implementación si `TabIaas.tsx` resulta muy largo, pero no cambia el modelo de datos ni la
  config.

Se recomienda **B** (con libertad de aplicar el split de C si el archivo crece demasiado):
es exactamente el caso que la nota de alcance del encargo pide evaluar, y con 17-18
categorías × 3 patrones, un componente por categoría es inmantenible.

## 3. Modelo de datos (Supabase, migración nueva)

Archivo: `supabase/migrations/006_iaas.sql`

```sql
-- UCI Control — Fase 3: Prevención de IAAS (dispositivos invasivos + metas DAAS/kine/TO/
-- fono/tromboprofilaxis/piel). Ver docs/superpowers/specs/2026-07-28-fase3-iaas-design.md.
--
-- Dos tablas por cardinalidad (mismo criterio que el resto del esquema):
--  - iaas_devices: insert-only, un evento por fila — igual patrón que mrc_assessments/
--    blood_gases (id propio + recorded_at). El "estado actual" de un dispositivo es la fila
--    más reciente por (stay_id, device_key). CVC se fusiona aquí desde `accesses` (ver bloque
--    de migración de datos más abajo); los otros 8 dispositivos son nuevos.
--  - iaas_status: singleton por stay_id — igual patrón que nutrition/vent_settings.

create table public.iaas_devices (
  id uuid primary key default gen_random_uuid(),
  stay_id uuid not null references public.stays on delete cascade,
  device_key text not null
    check (device_key in ('cvc','swan_ganz','smct','chd','la','cup','tot','tqt','contencion')),
  status text not null default 'no_aplica'
    check (status in ('no_aplica','instalar','mantener','retirar')),
  day int not null default 0,
  retiro_day int,
  retiro_motivo text not null default '',
  recorded_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users
);

create index iaas_devices_stay_device_recorded_idx
  on public.iaas_devices (stay_id, device_key, recorded_at desc);

create table public.iaas_status (
  stay_id uuid primary key references public.stays on delete cascade,
  -- "single": una sola opción seleccionada (o '' si no evaluado aún)
  daas_meta_rass text not null default ''
    check (daas_meta_rass in ('', 'Titular sedación para RASS 0 a -1', 'RASS -2 a -3', 'RASS -4 a -5 y BIS 40–60')),
  balance_hidrico text not null default ''
    check (balance_hidrico in ('', 'Restricción de volumen', 'Balance hídrico adecuado')),
  -- "multi": checklist, arrays de opciones seleccionadas del catálogo fijo de cada categoría
  -- (el catálogo válido de cada columna vive en lib/clinical/iaas.ts, no como check de array
  -- en SQL — mismo criterio que `comorbilidades`/`destination`, texto libre validado en la app)
  daas_evaluaciones text[] not null default '{}',
  vm_metas text[] not null default '{}',
  kine_metas text[] not null default '{}',
  to_metas text[] not null default '{}',
  fono_metas text[] not null default '{}',
  tromboprofilaxis text[] not null default '{}',
  piel_cuidados text[] not null default '{}',
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users
);

do $$
declare t text;
begin
  foreach t in array array['iaas_devices','iaas_status']
  loop
    execute format('create trigger touch before insert or update on public.%I
                    for each row execute function public.touch_row()', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "authenticated all" on public.%I
                    for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

alter publication supabase_realtime add table public.iaas_devices, public.iaas_status;

-- Fusión CVC: migrar filas existentes de accesses (type='CVC') a iaas_devices como evento
-- inicial 'mantener' (no sabemos si fue instalado en esta estadía o antes; "mantener" es el
-- status neutro que no fuerza retiro_day/retiro_motivo), preservando el contador `day` tal
-- cual estaba. `accesses.type` es texto libre sin `check`, así que este `where` es seguro.
insert into public.iaas_devices (stay_id, device_key, status, day, recorded_at)
  select stay_id, 'cvc', 'mantener', day, now()
  from public.accesses
  where type = 'CVC';

delete from public.accesses where type = 'CVC';
```

Tras esta migración, `ACCESS_TYPES` en `lib/clinical/constants.ts` pierde `'CVC'` (queda `FAP,
PICC, Port-a-cath, PVC, Diálisis, Marcapasos transitorio`), y el botón "+ agregar" de
"Accesos vasculares" en `TabClinico.tsx` cambia su default de `type: 'CVC'` a `type: 'FAP'`
(primer elemento del catálogo reducido). CVC deja de ser seleccionable ahí — su único punto
de registro pasa a ser la pestaña IAAS.

Nota sobre nombres: se usó `daas_meta_rass` y `balance_hidrico` (no `sedacion_meta` /
`balance_meta`) para no colisionar conceptualmente con las columnas ya existentes
`stays.balance_meta`/`stays.balance_real` (texto libre de balance hídrico numérico que ya
se edita en `TabClinico.tsx`) — son dos conceptos distintos: uno es la cifra objetivo/real,
el otro es la estrategia DAAS seleccionada del catálogo fijo del prototipo.

`useBoard.ts`: agregar `iaas_devices(*), iaas_status(*)` al `select` de `fetchBoard`, agregar
`'iaas_devices'` al union type de `useChildRow` (mismo mecanismo que `'mrc_assessments'` —
`iaas_devices` es insert-only, así que `useChildRow('iaas_devices')` alcanza, no hace falta un
hook de upsert nuevo), y agregar un hook singleton nuevo siguiendo el patrón de
`useUpsertNutrition`:

- `useUpsertIaasStatus()` — upsert simple sobre `iaas_status` (única tabla de esta fase que
  sigue siendo singleton-por-stay).

`types.ts`: agregar `IaasDevice` y `IaasStatus` a `StayFull` (`iaas_devices: IaasDevice[]`,
`iaas_status: IaasStatus | null`), siguiendo el mismo nullable-1:1 que `nutrition`/
`vent_settings`.

## 4. Lógica clínica

Módulo nuevo: `app/src/lib/clinical/iaas.ts`

```ts
export type IaasDeviceKey =
  | 'cvc' | 'swan_ganz' | 'smct' | 'chd' | 'la' | 'cup' | 'tot' | 'tqt' | 'contencion'

export type IaasDeviceStatus = 'no_aplica' | 'instalar' | 'mantener' | 'retirar'

/** Forma de una fila de `iaas_devices` (insert-only, un evento por fila). Definido también
 *  en types.ts como parte de StayFull; se repite aquí porque las funciones puras de este
 *  módulo lo usan como parámetro. */
export interface IaasDevice {
  id: string
  stay_id: string
  device_key: IaasDeviceKey
  status: IaasDeviceStatus
  day: number
  retiro_day: number | null
  retiro_motivo: string
  recorded_at: string
}

export interface IaasDeviceDef {
  key: IaasDeviceKey
  label: string   // nombre del dispositivo, para armar "Instalar X / Mantener X / Retirar X"
}

// Nombres y glosario verbatim de Glosario_UCI_Torre_Valech.docx
export const IAAS_DEVICES: IaasDeviceDef[] = [
  { key: 'cvc', label: 'CVC' },
  { key: 'swan_ganz', label: 'Swan-Ganz' },
  { key: 'smct', label: 'SMCT' },
  { key: 'chd', label: 'CHD' },
  { key: 'la', label: 'L.A.' },
  { key: 'cup', label: 'CUP' },
  { key: 'tot', label: 'TOT' },
  { key: 'tqt', label: 'TQT' },
  { key: 'contencion', label: 'Contención mecánica' },
]

export function deviceStatusOptions(label: string): { value: IaasDeviceStatus; text: string }[] {
  return [
    { value: 'instalar', text: `Instalar ${label}` },
    { value: 'mantener', text: `Mantener ${label}` },
    { value: 'retirar', text: `Retirar ${label}` },
    { value: 'no_aplica', text: 'No aplica' },
  ]
}

// Verbatim del prototipo (sección Metas → Prevención de IAAS)
export const RETIRO_MOTIVOS = [
  'Cumplió indicación clínica',
  'Complicación (infección/trombosis/sangrado)',
  'Fin de necesidad terapéutica',
  'Traslado/alta',
  'Disfunción del dispositivo',
  'Otro',
] as const

/** Se piden día del retiro + motivo cuando el status es "retirar" (regla del prototipo) */
export const needsRetiroFields = (status: IaasDeviceStatus): boolean => status === 'retirar'

/** Se pide "Día del dispositivo" siempre que el dispositivo esté en uso */
export const needsDayField = (status: IaasDeviceStatus): boolean => status !== 'no_aplica'

/** Aviso visual del prototipo: "⚠ evaluar recambio" a partir del día 5 */
export const deviceDayWarning = (day: number): boolean => day >= 5

/**
 * `iaas_devices` es insert-only (un evento por fila). El "estado actual" de un dispositivo
 * es su evento más reciente por `recorded_at`. Misma derivación que ya usa TabFuncional.tsx
 * para la última evaluación MRC-SS.
 */
export function latestDeviceStatus(
  events: IaasDevice[], key: IaasDeviceKey,
): IaasDevice | null {
  const forDevice = events.filter(e => e.device_key === key)
  if (forDevice.length === 0) return null
  return [...forDevice].sort((a, b) => b.recorded_at.localeCompare(a.recorded_at))[0]
}

export type IaasSingleKey = 'daas_meta_rass' | 'balance_hidrico'

export const IAAS_SINGLE: { key: IaasSingleKey; label: string; options: string[] }[] = [
  {
    key: 'daas_meta_rass', label: 'DAAS — meta de sedación (RASS)',
    options: ['Titular sedación para RASS 0 a -1', 'RASS -2 a -3', 'RASS -4 a -5 y BIS 40–60'],
  },
  {
    key: 'balance_hidrico', label: 'Balance hídrico',
    options: ['Restricción de volumen', 'Balance hídrico adecuado'],
  },
]

export type IaasMultiKey =
  | 'daas_evaluaciones' | 'vm_metas' | 'kine_metas' | 'to_metas'
  | 'fono_metas' | 'tromboprofilaxis' | 'piel_cuidados'

export const IAAS_MULTI: { key: IaasMultiKey; label: string; options: string[] }[] = [
  { key: 'daas_evaluaciones', label: 'DAAS — evaluaciones',
    options: ['Aplicar CAM-ICU', 'Evaluar TOF'] },
  { key: 'vm_metas', label: 'Ventilación mecánica',
    options: ['Plan de weaning'] },
  { key: 'kine_metas', label: 'Rehabilitación kinésica',
    options: ['Atención kinésica integral', 'Evaluación kinésica integral', 'Sentar en Berger'] },
  { key: 'to_metas', label: 'Terapia ocupacional',
    options: ['Atención integral de T.O.', 'Intervención en AVD', 'Intervención en ayudas técnicas y técnicas asistidas'] },
  { key: 'fono_metas', label: 'Fonoaudiología',
    options: [
      'Evaluación de la voz', 'del habla', 'del lenguaje',
      'Rehabilitación del habla y del lenguaje',
      'Evaluación clínica de la deglución', 'Rehabilitación de la deglución',
    ] },
  { key: 'tromboprofilaxis', label: 'Tromboprofilaxis',
    options: ['Compresión neumática intermitente', 'Farmacológica', 'Medias antiembólicas'] },
  { key: 'piel_cuidados', label: 'Cuidados de piel',
    options: ['Movilización horaria', 'Aseo y humectación de la piel', 'Contraindicación de cambios de posición'] },
]
```

**`computeIaasStats` (futuro, NO se implementa en esta fase):** el modelo de datos ya lo
soporta sin cambios porque cada categoría es una columna/fila con valor vacío por defecto.
Firma prevista para el Resumen Ejecutivo: `computeIaasStats(stays: StayFull[]): { key: string;
label: string; covered: number; total: number }[]` — "covered" cuenta pacientes con
`status !== 'no_aplica'` (device) o array/string no vacío (single/multi) para esa categoría;
"total" es `stays.length`. No se escribe aquí porque el encargo pide explícitamente no
implementarlo todavía.

## 5. UI — componentes y dónde van

**Nueva pestaña propia "IAAS"** en `PatientPage.tsx` (no embebida en `TabMetas.tsx`). Razón:
`TabMetas` hoy es una lista de metas de texto libre del día (`goals`), un flujo de edición
completamente distinto al de un checklist estructurado de 17-18 categorías con reglas
condicionales (mostrar/ocultar campos según status). Embeberlo ahí generaría una pestaña
gigante mezclando dos modelos de datos no relacionados, y el futuro Resumen Ejecutivo necesita
leer IAAS como unidad propia — separarlo ahora evita una migración de datos después. Se agrega
como última entrada del array `tabs` en `PatientPage.tsx` (mínima disrupción al resto de la
navegación; reordenar es un cambio de una línea si el equipo lo pide después).

Archivos nuevos:

- `app/src/lib/clinical/iaas.ts` — catálogos y funciones puras (sección 4).
- `app/src/features/patient/tabs/TabIaas.tsx` — contenedor: lee `stay.iaas_devices` /
  `stay.iaas_status`, arma el estado por defecto (`iaas_status` puede ser `null` la primera
  vez, igual que `nutrition`/`vent_settings` — mismo patrón `stay.iaas_status ?? emptyIaasStatus(stay.id)`
  que usa `TabVentilacion.tsx` con `emptyVent`), y renderiza tres secciones (`<section>` con
  `aria-labelledby`, igual que `TabVentilacion.tsx`): "Dispositivos invasivos", "Metas DAAS y
  balance", "Kinesiología / T.O. / Fonoaudiología / Tromboprofilaxis / Piel".
- `app/src/features/patient/tabs/iaas/DeviceCategory.tsx` — una fila por `IAAS_DEVICES`,
  siguiendo el patrón formulario-más-historial de `TabFuncional.tsx` (no el de edición-en-vivo
  de `TabClinico.tsx`, porque `iaas_devices` es insert-only): `latestDeviceStatus(stay.iaas_devices,
  device.key)` calcula el estado actual, mostrado como cabecera de la fila (`Badge` con el
  status + "Día N" si `needsDayField`); debajo, un formulario compacto para **registrar un
  nuevo evento** — precargado con los valores del estado actual como punto de partida (a
  diferencia de `TabFuncional.tsx`, que siempre arranca en blanco, aquí conviene precargar
  porque la mayoría de los cambios son incrementales: "mismo status, día+1"). El formulario
  tiene `SelectField` con las 4 opciones de `deviceStatusOptions(label)`; si
  `needsDayField(status)` muestra `AutoNumber` "Día del dispositivo"; si `day >= 5`
  (`deviceDayWarning`) muestra `<Badge tone="warn">⚠ evaluar recambio</Badge>`; si
  `needsRetiroFields(status)` muestra `NumberField`/`AutoNumber` "Día del retiro" +
  `SelectField` con `RETIRO_MOTIVOS`. Botón "Registrar cambio" hace
  `devices.insert.mutate({ stay_id, device_key, status, day, retiro_day, retiro_motivo })` —
  **inserta una fila nueva, nunca actualiza una existente** (así se preserva el historial
  completo). Debajo del formulario, una lista colapsable con los eventos previos de ese
  dispositivo (fecha + status + día), mismo estilo que la lista de evaluaciones MRC-SS de
  `TabFuncional.tsx`.
- `app/src/features/patient/tabs/iaas/SingleCategory.tsx` — una fila por `IAAS_SINGLE`:
  `SelectField` con las opciones + una opción "— Sin evaluar —" al inicio que mapea a `''`
  (mismo patrón `!== undefined` de `TabClinico.tsx` para no perder el reset a vacío).
- `app/src/features/patient/tabs/iaas/MultiCategory.tsx` — una fila por `IAAS_MULTI`: checklist
  de `<input type="checkbox">` (igual que `TabSofa.tsx` usa `<fieldset>`/`role="radiogroup"`,
  aquí sin `role="radiogroup"` porque es multi-select, cada checkbox con
  `aria-label="{label}: {opción}"`), on-change hace `upd({ [key]: toggled(current, option) })`.
- Reutiliza sin cambios: `Badge`, `Button` ("Registrar cambio" en `DeviceCategory.tsx`),
  `SelectField`/`NumberField` de `Field.tsx`, `AutoNumber` de `AutoFields.tsx`.
- `PatientPage.tsx`: importar `TabIaas` y agregar `{ id: 'iaas', label: 'IAAS', content:
  <TabIaas stay={stay} /> }` al array de `tabs`.

`DeviceCategory.tsx` inserta filas nuevas en `iaas_devices` (nunca actualiza una existente),
así que el riesgo de pisar cambios concurrentes que motivó el criterio de "enviar solo el
patch" en `TabSofa.tsx`/`TabVentilacion.tsx` no aplica ahí — cada insert es independiente. Ese
criterio sigue aplicando a `SingleCategory.tsx`/`MultiCategory.tsx`, que sí editan `iaas_status`
in place: sus `upd(...)` envían solo el campo que cambió, no el objeto `iaas_status` completo,
igual que el resto de tabs singleton del proyecto.

## 6. Testing

TDD, siguiendo el estilo de `sofa.test.ts`/`vent.test.ts` y `TabSofa.test.tsx`/
`TabVentilacion.test.tsx`.

`app/src/lib/clinical/iaas.test.ts`:
- `IAAS_DEVICES` tiene exactamente 9 entradas con las claves
  `cvc/swan_ganz/smct/chd/la/cup/tot/tqt/contencion` (previene drift silencioso del catálogo).
- `deviceStatusOptions('CVC')` devuelve exactamente `['Instalar CVC','Mantener CVC','Retirar CVC','No aplica']` en ese orden.
- `RETIRO_MOTIVOS` tiene exactamente los 6 textos verbatim del encargo, en el mismo orden.
- `needsDayField('no_aplica')` → `false`; `needsDayField('instalar'|'mantener'|'retirar')` → `true`.
- `needsRetiroFields('retirar')` → `true`; para los otros 3 status → `false`.
- `deviceDayWarning(4)` → `false`; `deviceDayWarning(5)` → `true` (límite exacto del prototipo);
  `deviceDayWarning(0)` → `false`.
- `IAAS_SINGLE`/`IAAS_MULTI`: cada catálogo tiene el número de opciones esperado (3, 2; y
  2,1,3,3,6,3,3 respectivamente) y los textos verbatim — snapshot test para detectar cualquier
  parafraseo accidental de las opciones clínicas.
- `latestDeviceStatus([], 'cvc')` → `null` (sin eventos).
- Con 3 eventos de CVC en distinto `recorded_at` (no necesariamente insertados en orden
  cronológico, para no depender del orden del array), `latestDeviceStatus` devuelve el de
  `recorded_at` más reciente, no el último insertado.
- `latestDeviceStatus` filtra por `device_key`: eventos de otro dispositivo en la misma lista
  no interfieren.

`app/src/features/patient/tabs/TabIaas.test.tsx` (usa `baseStay()` extendido con
`iaas_devices: []`, `iaas_status: null`):
- Con `iaas_status: null` y `iaas_devices: []`, el formulario renderiza con todos los campos en
  su default vacío (no crashea leyendo propiedades de `null` ni de `latestDeviceStatus` sin
  eventos).
- Seleccionar "Retirar" en el formulario de CVC revela "Día del retiro" y el `SelectField` de
  motivo; seleccionar "Mantener" los oculta.
- Seleccionar "No aplica" oculta también "Día del dispositivo" (a diferencia de
  instalar/mantener/retirar, que sí lo muestran).
- Con el evento más reciente de un dispositivo en `day: 5`, se ve `Badge` con texto
  "⚠ evaluar recambio" en la cabecera de esa fila; con `day: 4` no aparece.
- Click en "Registrar cambio" llama `devices.insert.mutate` con un objeto nuevo (incluyendo
  `device_key`), **nunca** `devices.update.mutate` — verifica que el historial nunca se
  sobreescribe.
- Con 2 eventos previos de CVC en `stay.iaas_devices`, la fila de CVC muestra el estado del más
  reciente en la cabecera y ambos eventos en la lista de historial, ordenados de más reciente a
  más antiguo.
- Registrar un evento con status "no_aplica" tras uno con `retiro_motivo` guardado: el evento
  anterior sigue intacto en el historial (no se edita), y el nuevo evento no envía
  `retiro_motivo` (queda `''` por default de columna) — el historial preserva ambos estados por
  separado, a diferencia del modelo singleton original donde "no se borra" era la propiedad
  relevante.
- Marcar dos checkboxes de "Cuidados de piel" (`piel_cuidados`) y luego desmarcar uno: el
  `mutate` de `iaas_status` final refleja el array con un solo elemento (no ambos, no ninguno)
  — cubre el caso límite de toggle sobre array.
- Elegir "— Sin evaluar —" en un `SingleCategory` después de haber elegido una opción, guarda
  `''` explícitamente (mismo caso límite que el reset de `destino_tipo` en `TabClinico.test.tsx`
  — `!== undefined`, no truthiness).

`app/src/features/patient/tabs/TabClinico.test.tsx` (ajuste a tests existentes, no cobertura
nueva): `ACCESS_TYPES` ya no incluye `'CVC'` — los tests que asumían CVC como primer/único tipo
en "Accesos vasculares" deben actualizarse a `'FAP'` o al tipo que corresponda.

## 7. Criterios de éxito

- Migración `006_iaas.sql` aplicada sin errores; `iaas_devices`/`iaas_status` visibles en
  `list_tables`, con RLS "authenticated all" y agregadas a `supabase_realtime`.
- Las 9 categorías de dispositivo, 2 single y 7 multi (18 categorías en total — ver sección 8,
  pregunta 1 resuelta) están representadas en `TabIaas.tsx` y son editables end-to-end
  (persisten y sobreviven a un refresh).
- `iaas_devices` es insert-only: registrar un segundo evento para el mismo dispositivo agrega
  una fila nueva y dos eventos previos siguen visibles en el historial de esa fila, con fecha.
- **Migración de datos de CVC verificada sin pérdida**: antes de aplicar la migración, contar
  filas de `accesses where type = 'CVC'`; después, ese mismo número de filas existe en
  `iaas_devices where device_key = 'cvc'` con el mismo `day`, y `accesses` ya no tiene filas
  `type = 'CVC'`. `ACCESS_TYPES` ya no ofrece `'CVC'` como opción en "Accesos vasculares".
- Ningún componente nuevo hardcodea un color: cualquier estado visual nuevo (ej. el warn del
  día≥5) usa `Badge tone="warn"` existente, sin hex nuevo.
- El aviso "⚠ evaluar recambio" aparece si y solo si `day >= 5`, para cualquier dispositivo con
  status ≠ "no_aplica" (evaluado sobre el evento más reciente).
- Los campos de retiro (día + motivo) solo son visibles cuando `status === 'retirar'` en el
  formulario de registro; eventos pasados con esos campos siguen mostrándose en el historial
  tal como se guardaron (nunca se editan retroactivamente).
- `npm test` pasa incluyendo los casos límite de la sección 6; `npm run build` sin errores de
  tipos (columnas nuevas reflejadas en `types.ts`).
- No se modifica el comportamiento de `TabMetas.tsx`, ni el de "Otros accesos"/el resto de
  `ACCESS_TYPES` en `TabClinico.tsx` — el único cambio en `TabClinico.tsx` es la salida de CVC
  del catálogo de "Accesos vasculares".

## 8. Decisiones confirmadas con el usuario (2026-07-28)

Las tres preguntas abiertas del borrador original de este spec fueron resueltas directamente
con el usuario antes de aprobar el spec; se documentan aquí como registro de la decisión, no
como preguntas pendientes:

1. **El encargo dice "17 categorías" pero la lista detallada suma 18** (9 dispositivos + 2
   single + 7 multi) — **resuelto por revisión propia contra la extracción original del
   prototipo**: en `UCI_Dashboard (16).html`, "Protocolo DAAS" está numerado como **una sola**
   categoría (#9) con dos sub-secciones (meta de sedación + evaluaciones); este spec las separó
   en `daas_meta_rass` (single) y `daas_evaluaciones` (multi) porque son patrones de UI
   distintos (selección única vs. checklist) y forzarlas a una sola estructura de datos sería
   artificial. El modelo de datos de esta fase no necesita resolver el conteo — queda como nota
   para cuando se implemente `computeIaasStats` en el Resumen Ejecutivo: decidir ahí si DAAS
   cuenta como 1 categoría o 2 para el denominador de cobertura.
2. **Superposición con "Accesos vasculares" de `TabClinico.tsx`** — **decisión: fusionar**.
   Verificado que la superposición real es solo CVC (no CUP/L.A./CHD, que no están en
   `ACCESS_TYPES` hoy). CVC sale de `ACCESS_TYPES` y pasa a vivir exclusivamente en
   `iaas_devices`, con migración de las filas existentes (sección 3). Los otros 6 tipos de
   `ACCESS_TYPES` no tienen equivalente IAAS y no cambian.
3. **¿Historial completo o solo estado actual?** — **decisión: historial completo desde
   ahora**. `iaas_devices` es insert-only (sección 2/3), no singleton. Habilita reportar
   cuántas veces se recambió un dispositivo durante la estadía.
