# Exportar CSV del tablero — Diseño

**Fecha:** 2026-07-28
**Proyecto:** UCI Torre Valech — HUAP
**Origen:** UCI_Dashboard (16).html / UCI_Dashboard_v16.html (extracción ya hecha, se te da abajo)

## 1. Objetivo

Agregar un botón "Exportar CSV" en el tablero (`BoardPage`) que descarga, cliente-side, una fila por box ocupado con los datos administrativos y clínicos vigentes de `useBoard()`, replicando el formato del prototipo v16 (BOM UTF-8, separador `;`, nombre de archivo con fecha) para que el archivo se abra correctamente en Excel Chile/LATAM.

## 2. Enfoques considerados

**Opción A — función de export ad-hoc con un array de strings por fila (traducción literal del prototipo).**
Pro: rápido de escribir. Contra: agregar/quitar una columna obliga a tocar dos lugares (el header y el builder de la fila) y a contar índices a mano — exactamente el tipo de acoplamiento que se quiere evitar sabiendo que 3 columnas (SOFA basal, ΔSOFA, IAAS resumen) van a aparecer después, escritas por otro sub-proyecto.

**Opción B — lista declarativa de columnas `{ header: string, getValue(stay: StayFull): string }` recorrida una sola vez para header y filas (recomendada).**
Pro: agregar una columna nueva es una línea en el array, sin tocar la función de serialización; cada `getValue` es una función pura testeable de forma aislada; las columnas que dependen de sub-proyectos aún no implementados se agregan hoy con un `getValue` que retorna `'—'`, y el día que SOFA-basal/IAAS existan en `StayFull` se reemplaza solo esa línea. Contra: una capa mínima de indirección (un `.map` extra) que no existía en el prototipo — irrelevante en tamaño (24 boxes).

**Opción C — exportar via una vista/función SQL en Supabase que arme el CSV en el servidor.**
Pro: reutilizable desde otros clientes (ej. un futuro reporte automático). Contra: el enunciado es explícito en que esto es una función pura cliente-side sobre datos que `useBoard()` ya trae completos; introducir una función de servidor agrega latencia, superficie de RLS y despliegue sin ningún beneficio hoy. Se descarta.

**Recomendación:** Opción B. Es el mismo costo de implementación que A pero elimina por diseño el riesgo de "index mismatch" entre header y fila, y dado que 3 de las 16 columnas dependen de trabajo en paralelo, la lista declarativa es la única forma de que integrarlas después sea un diff de una línea y no un refactor.

## 3. Modelo de datos (Supabase, migración nueva)

No aplica. Es una función pura cliente-side sobre datos que `useBoard()` ya carga (`StayFull[]`, incluye `sofa_assessments`, `antibiotics`, `nutrition`). No requiere tablas, columnas ni migración nueva.

## 4. Lógica clínica

Módulo nuevo puro: `app/src/lib/export/csvExport.ts` (carpeta nueva junto a `lib/clinical` y `lib/supabase`, ya que no es una regla clínica sino de formateo/serialización — no calza en `lib/clinical`).

### 4.1 Tipo de columna

```ts
export interface CsvColumn {
  header: string
  getValue: (stay: StayFull) => string
}
```

### 4.2 Definición de columnas — `BOARD_CSV_COLUMNS: CsvColumn[]`

Orden y headers verbatim del prototipo v16 (`[Box, Paciente, Diagnóstico, Alerta, Residente, Destino, SOFA, SOFA basal, ΔSOFA, Días UCI, Días VM, ATB activos, Alergias, Cal. meta, Cal. real, Prevención IAAS (resumen)]`):

| # | Header | `getValue(stay)` | Fuente / nota |
|---|---|---|---|
| 1 | `Box` | `String(stay.box_number)` | `Stay.box_number` |
| 2 | `Paciente` | `stay.patient_name` | `Stay.patient_name` |
| 3 | `Diagnóstico` | `stay.diagnosis` | `Stay.diagnosis` |
| 4 | `Alerta` | `ALERT_TYPES[stay.alert].label` | reusa catálogo existente, no el código crudo |
| 5 | `Residente` | `stay.residente` | `Stay.residente` |
| 6 | `Destino` | `stay.destino_tipo === '' ? '—' : DESTINO_TIPOS[stay.destino_tipo]` | reusa catálogo existente (`lib/clinical/constants.ts`) |
| 7 | `SOFA` | SOFA total más reciente: tomar de `stay.sofa_assessments` la fila con `assessed_on` máximo, pasar sus 6 dominios a `calcSofa()` (`lib/clinical/sofa.ts`); `calcSofa` retorna `null` si no hay ninguna evaluación → `'—'` | si `sofa_assessments` está vacío, `'—'` |
| 8 | `SOFA basal` | `'—'` (placeholder fijo) | **columna pendiente**: depende del sub-proyecto "SOFA basal" (Fase 3, en spec paralelo). Hoy no existe el dato en `StayFull`. Cuando se agregue el campo (ej. `stay.sofa_basal`), esta línea se reemplaza por su `getValue` real — sin tocar el resto del archivo. |
| 9 | `ΔSOFA` | `'—'` (placeholder fijo) | **columna pendiente**: depende de que exista SOFA basal (columna 8) y SOFA actual (columna 7); se calcula como `sofaActual - sofaBasal` una vez ambos existan. Mismo mecanismo de reemplazo de una línea. |
| 10 | `Días UCI` | `String(stay.dias_hosp)` | `Stay.dias_hosp` |
| 11 | `Días VM` | `String(stay.dias_vm)` | `Stay.dias_vm` |
| 12 | `ATB activos` | `stay.antibiotics.map(a => a.drug).join(', ')` o `'—'` si vacío | `Antibiotic.drug`, todas las filas de `stay.antibiotics` (no hay campo de "activo" vs "histórico" en el esquema actual — se listan todas las registradas para el stay, igual que hace `TabATB.tsx`) |
| 13 | `Alergias` | `stay.alergias \|\| '—'` | `Stay.alergias` |
| 14 | `Cal. meta` | `stay.nutrition ? String(stay.nutrition.cal_meta) : '—'` | `Nutrition.cal_meta` |
| 15 | `Cal. real` | `stay.nutrition ? String(stay.nutrition.cal_real) : '—'` | `Nutrition.cal_real` |
| 16 | `Prevención IAAS (resumen)` | `'—'` (placeholder fijo) | **columna pendiente**: depende del sub-proyecto "módulo IAAS" (Fase 3, en spec paralelo). Cuando exista el dato agregado (ej. `stay.iaas_summary` o un cálculo derivado de una tabla nueva), se reemplaza esta línea. |

Las 3 columnas pendientes (8, 9, 16) quedan **en su posición final del layout desde el día uno** — no se omiten del CSV, se rellenan con `'—'` — para que el archivo exportado hoy y el exportado después de integrar SOFA-basal/IAAS tengan exactamente las mismas 16 columnas en el mismo orden (ningún consumidor del CSV, ej. Excel con fórmulas por columna, se rompe cuando se complete el dato).

### 4.3 Función de serialización — `buildBoardCsv(stays: StayFull[]): string`

```ts
export function buildBoardCsv(stays: StayFull[]): string {
  const header = BOARD_CSV_COLUMNS.map(c => escapeCsvField(c.header)).join(';')
  const rows = stays.map(s =>
    BOARD_CSV_COLUMNS.map(c => escapeCsvField(c.getValue(s))).join(';'))
  return [header, ...rows].join('\r\n')
}
```

- `escapeCsvField(value: string): string` — si el valor contiene `;`, `"` o salto de línea, se envuelve en comillas dobles duplicando las comillas internas (regla RFC 4180 estándar; el prototipo no lo hacía explícitamente pero `Diagnóstico`/`ATB activos` pueden traer comas o textos libres con `;` y romper columnas si no se escapa — necesario porque ahora los datos vienen de campos de texto libre reales, no de un prototipo con datos de prueba fijos).
- Separador `;` (no `,`) — verbatim del prototipo, correcto para configuración regional CL de Excel.
- Fin de línea `\r\n` para compatibilidad Excel/Windows.

### 4.4 Función de descarga — `downloadBoardCsv(stays: StayFull[]): void`

```ts
export function downloadBoardCsv(stays: StayFull[]): void {
  const csv = buildBoardCsv(stays)
  const BOM = '﻿'
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `UCI_Torre_Valech_datos_${todayStamp()}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
```

- `todayStamp()`: función auxiliar local que retorna `YYYY-MM-DD` (misma convención de fecha que ya usa `useUpsertSofaToday` con `new Date().toISOString().slice(0, 10)`), verbatim del patrón `UCI_Torre_Valech_datos_{fecha}.csv` del prototipo.
- BOM UTF-8 (`﻿`) antepuesto al blob — verbatim del prototipo, necesario para que Excel detecte UTF-8 y no rompa acentos/ñ.
- Blob + `URL.createObjectURL` — mismo mecanismo del prototipo, sin dependencias nuevas.

### 4.5 Alcance de la exportación

Exporta **todos los boxes con stay activo** (`stays` tal como los entrega `useBoard()`, ya filtrado por `.eq('active', true)` en `fetchBoard`), sin aplicar los filtros de búsqueda/alerta/residente de la UI del tablero — el export es un snapshot administrativo completo, no una vista filtrada. Ver pregunta abierta 8.1 sobre este punto.

## 5. UI — componentes y dónde van

- **`app/src/features/board/BoardPage.tsx`**: agregar un botón `Exportar CSV` (componente `Button` de `app/src/design-system/Button.tsx`, variante secundaria/neutra igual que "Reintentar") dentro de `<nav aria-label="Principal">`, junto a `ThemeToggle` y antes de "Cerrar sesión". `onClick={() => downloadBoardCsv(stays)}` usando el `stays` que ya devuelve `useBoard()` en la misma página (no se necesita una query nueva).
- No requiere estado de carga propio: `stays` ya está resuelto en el momento en que el botón es interactivo (se deshabilita mientras `isLoading` es `true`, mismo criterio que ya aplica el resto del header).
- Botón deshabilitado (`disabled`) cuando `stays.length === 0` (tablero vacío) — evita descargar un CSV con solo el header.
- Nuevo módulo `app/src/lib/export/csvExport.ts` (sección 4) — no toca ningún componente de tablas hijas existente ni el design system.

## 6. Testing

TDD sobre `app/src/lib/export/csvExport.test.ts`, usando `baseStay()` de `app/src/test/fixtures.ts` como fixture base y sobrescribiendo campos por caso:

- `buildBoardCsv([])` retorna solo la línea de header (16 columnas, separadas por `;`).
- Con un stay con todos los campos llenos: la fila generada tiene el orden exacto de columnas de la sección 4.2, incluyendo `'—'` literal en las posiciones 8, 9 y 16.
- Alerta: `stay.alert = 'critical'` → columna 4 debe ser `'Crítico'` (el label de `ALERT_TYPES`, no la clave `'critical'`).
- Destino vacío: `stay.destino_tipo = ''` → columna 6 es `'—'`.
- Destino con valor: `stay.destino_tipo = 'pabellon'` → columna 6 es `'→ Pabellón'` (label de `DESTINO_TIPOS`).
- SOFA: `stay.sofa_assessments = []` → columna 7 es `'—'`.
- SOFA con dos evaluaciones en fechas distintas (ej. `assessed_on: '2026-07-26'` y `'2026-07-28'`) → columna 7 usa el total calculado de la fecha más reciente (`'2026-07-28'`), no la primera del array.
- SOFA con evaluación de hoy pero todos los dominios `null` → `calcSofa` retorna `null` → columna 7 es `'—'` (no `'0'`).
- ATB: `stay.antibiotics = []` → columna 12 es `'—'`; con dos antibióticos (`drug: 'Meropenem'`, `drug: 'Vancomicina'`) → columna 12 es `'Meropenem, Vancomicina'`.
- Nutrición: `stay.nutrition = null` → columnas 14 y 15 son `'—'`; con `nutrition.cal_meta = 1800, cal_real = 1200` → columnas 14/15 son `'1800'`/`'1200'`.
- Escape CSV: `stay.diagnosis = 'Sepsis; shock séptico'` (contiene el separador) → la celda queda entre comillas dobles: `"Sepsis; shock séptico"`.
- Escape CSV: `stay.patient_name = 'Pérez "Pato" Soto'` (contiene comillas) → comillas internas duplicadas: `"Pérez ""Pato"" Soto"`.
- `downloadBoardCsv`: test de integración liviano mockeando `URL.createObjectURL`/`document.createElement` (patrón ya usado si existe un test de descarga previo en el repo; si no existe, mockear `HTMLAnchorElement.prototype.click` y verificar que `a.download` matchea `UCI_Torre_Valech_datos_YYYY-MM-DD.csv` con regex, sin fijar el string completo para no acoplar el test a la fecha del día de ejecución).
- UI: test en `app/src/features/board/BoardPage.test.tsx` (o el archivo de test existente de `BoardPage`) verificando que el botón "Exportar CSV" está deshabilitado cuando `stays` está vacío y habilitado cuando hay al menos un box ocupado.

## 7. Criterios de éxito

- El CSV descargado abre en Excel (config regional CL) sin mojibake en acentos/ñ y con columnas correctamente separadas (BOM + `;` verificados).
- Las 16 columnas aparecen en el orden exacto del prototipo v16, con headers idénticos.
- Las columnas 8 (`SOFA basal`), 9 (`ΔSOFA`) y 16 (`Prevención IAAS (resumen)`) muestran `'—'` hoy y no rompen el layout cuando se les asigne un `getValue` real más adelante.
- Agregar una columna nueva al CSV (ej. cuando el módulo IAAS esté listo) requiere solo agregar/editar una entrada en `BOARD_CSV_COLUMNS`, sin tocar `buildBoardCsv` ni `downloadBoardCsv`.
- El nombre del archivo sigue el patrón `UCI_Torre_Valech_datos_{YYYY-MM-DD}.csv`.
- Todos los casos de la sección 6 pasan (`npm test` en `app/`).
- El botón "Exportar CSV" es alcanzable por teclado y tiene foco visible (mismo criterio de accesibilidad que el resto del header del tablero, ya auditado en el plan T18).

## 8. Decisiones confirmadas con el usuario / por defecto razonable (2026-07-28)

**8.1 — ¿El export respeta los filtros activos del tablero o siempre exporta todos los boxes ocupados?**
**Confirmado con el usuario: siempre todos.** Snapshot administrativo completo, predecible,
igual espíritu que el prototipo. El spec ya asumía este comportamiento por defecto; queda
confirmado, sin cambios sobre el diseño original.

**8.2 — Columna "ATB activos": ¿debe filtrar solo antibióticos vigentes o listar todo el historial del stay?**
El esquema actual (`Antibiotic { id, stay_id, drug, day }`) no tiene un campo de estado (activo/suspendido) — `TabATB.tsx` lista todas las filas del stay sin distinguir. Este spec replica ese mismo comportamiento (listar todas), que es el único disponible sin inventar un umbral clínico no especificado en ningún documento fuente. Se deja así por defecto — no requirió pregunta al usuario porque no hay una alternativa definible sin inventar criterio médico; si más adelante se agrega una noción real de "antibiótico activo" al esquema, esta columna se ajusta en una línea.
