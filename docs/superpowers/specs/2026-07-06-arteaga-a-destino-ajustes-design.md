# Cambios Arteaga 2026-07-06, sub-proyecto A — Destino estructurado + ajustes de ficha — Diseño

**Fecha:** 2026-07-06
**Proyecto:** UCI Torre Valech — HUAP
**Origen:** documento "UCI Dashboard Torre Valech — Resumen de Cambios" (Dr. Arteaga, 2026-07-06, `UCI_Dashboard_Resumen_Cambios.docx`), secciones 4 y 6; opciones de destino verbatim del prototipo `dataucicontrrol/UCI_Dashboard.html` línea 603.

## 1. Contexto y descomposición del paquete completo

El documento del Dr. Arteaga describe cambios hechos sobre **su prototipo HTML local**, no sobre la app de producción. Se descompuso con el usuario en 4 sub-proyectos, cada uno con su propio ciclo spec → plan → implementación:

- **A (este spec):** destino estructurado + ajustes de ficha (TQT, comorbilidades, otros accesos) + KPIs de traslado/fallecido.
- **B (futuro):** zonas físicas de camas por color (A: 1–6, B: 7–11+23, C: 12–16+24, D: 17–22) + header sticky en el detalle.
- **C (futuro):** ΔSOFA + SOFA ajustado por sedación (RASS 10 niveles, componente neuro N/E si RASS ≤ -3 con opción de forzar, basal día 1 congelable, Δ por componente y total con alerta ≥2, badge en tarjeta y KPI de servicio).
- **D (futuro):** tab "Calidad" (GES, IAAS: NAV/CLABSI/ITU-CUP, UPP con Braden y estadios, bundle: CAM-ICU/profilaxis TVP/profilaxis úlcera de estrés/contención física/control glicémico, badge X/4, KPIs).

Orden acordado: **A → C → B → D**.

**Restricción para C y D:** el `UCI_Dashboard.html` actualizado (el que contiene esta lógica nueva) NO está en la máquina — las copias locales son del 2026-07-03 y no incluyen Braden/ΔSOFA/Calidad (verificado por grep). Antes de diseñar C y D hay que pedirle al usuario ese archivo para migrar los umbrales clínicos verbatim, según la regla del proyecto.

**No aplican** (ya resueltos en producción): los "bugs" del doc sobre nombre de paciente editable, eventos editables y metas — eran defectos solo del prototipo. La "persistencia de datos" que el doc lista como pendiente es exactamente lo que producción ya resuelve con Supabase.

## 2. Alcance de A

Cuatro cambios chicos y uno mediano, todos sobre código existente:

1. **Destino estructurado** (mediano): selector con catálogo + el texto libre actual conservado como detalle.
2. **Comorbilidades**: campo nuevo en el tab Clínico, junto a Alergias.
3. **Otros accesos**: segunda sección de accesos (Sonda urinaria/Foley, lista abierta).
4. **TQT** en el selector de Modo VM.
5. **KPIs de servicio**: "→ Traslado" y "Fallecidos" en el Resumen Ejecutivo, + badge de destino en la tarjeta del tablero.

## 3. Modelo de datos (migración 005)

```sql
-- 005_destino_comorbilidades.sql
alter table public.stays
  add column comorbilidades text not null default '',
  add column destino_tipo text not null default '';
```

- Ambas columnas con default seguro: el patrón de guardado por patch parcial (`useUpdateStay` con `{ id, ...patch }`) lo exige.
- `destination` (texto libre existente) **no se toca** — hay datos reales del equipo guardados ahí (ej. "TC abdomen"). Pasa a ser el campo "detalle" en la UI. Cero pérdida de datos, cero migración de valores.
- Sin cambios de RLS/triggers/realtime: `stays` ya tiene todo eso y `alter table add column` no lo afecta.

## 4. Catálogos (`lib/clinical/constants.ts`)

**`DESTINO_TIPOS`** — patrón de `ALERT_TYPES` (clave estable en BD + label de UI). Claves `tac|pabellon|egreso|ingreso` verbatim del prototipo original (línea 603); `traslado|fallecido` nuevas del doc de hoy:

| clave (BD) | label |
|---|---|
| `''` | Destino — |
| `tac` | → TAC |
| `pabellon` | → Pabellón |
| `egreso` | → Egreso |
| `ingreso` | ⬇ Ingreso |
| `traslado` | → Traslado a otro hospital |
| `fallecido` | ✝ Fallecido |

Se guarda la **clave**, no el label: los KPIs cuentan `destino_tipo === 'traslado'` sin depender de emojis/textos, igual que hoy `alert === 'critical'`.

**`OTHER_ACCESS_TYPES = ['Sonda urinaria (Foley)']`** — lista abierta (drenajes futuros se agregan aquí). `ACCESS_TYPES` (vasculares) queda intacto. La tabla `accesses` no cambia: la UI clasifica cada fila según a qué catálogo pertenece su `type`; lo que no está en `OTHER_ACCESS_TYPES` se muestra como vascular, así ninguna fila existente se mueve ni se migra.

**`VM_MODES`**: se agrega `'TQT'`.

**`types.ts`**: `Stay` gana `comorbilidades: string` y `destino_tipo: string`.

## 5. UI

**Tab Clínico** (`TabClinico.tsx`):
- **Destino**: `SelectField` con los labels de `DESTINO_TIPOS`; al cambiar guarda solo `{ destino_tipo: clave }` (patch parcial — patrón anti-clobbering establecido). Debajo, el campo existente se re-etiqueta **"Detalle destino (texto libre)"** (mismo `AutoText`, misma columna `destination`); cuando `destino_tipo === 'traslado'` muestra un hint: *"Sigla del centro, ej. HSJD"*.
- **Comorbilidades**: `AutoText` "Enfermedades de base / Comorbilidades" junto a Alergias → columna `comorbilidades`.
- **Accesos en dos secciones**: la sección existente ya se titula "Accesos vasculares" y queda igual; sección nueva "Otros accesos" debajo, misma tabla y misma UI (tipo + días + `ConfirmDeleteButton` + agregar). El "+ Agregar" de cada sección inserta con el tipo por defecto de su catálogo: `'CVC'` la vascular (el default que ya usa `TabClinico.tsx:81`, sin cambio) y `'Sonda urinaria (Foley)'` la nueva. Cada selector de tipo ofrece solo su propio catálogo.
- **TQT**: automático al extender `VM_MODES` (el selector ya itera el catálogo).

**Tablero** (`BoxCard.tsx`): cuando `destino_tipo ≠ ''`, badge con el label del catálogo (tono `muted`), visible sin expandir — equivalente al `DestBadge` del prototipo.

**Resumen Ejecutivo** (`kpis.ts` + `ExecutivePage.tsx`): dos KPIs nuevos — "→ Traslado" (count de stays activos con `destino_tipo === 'traslado'`) y "Fallecidos" (`=== 'fallecido'`). Función pura extendida con tests, mismo patrón de los KPIs existentes.

## 6. Semántica de "Fallecido"

Informativo, **no** ejecuta el egreso: el egreso sigue siendo la acción explícita con confirmación que ya existe (`IngresoEgreso`). El KPI cuenta stays **activos** marcados como fallecido — fiel a las StatPills del prototipo, que cuentan el estado actual de los 24 boxes. Las estadísticas históricas de mortalidad quedan explícitamente fuera de alcance (pertenecen a la "hoja resumen jefatura" que el doc lista como Fase 2 pendiente).

## 7. Testing

- `kpis.test.ts`: 2 KPIs nuevos, incluyendo el caso "0 marcados" y mezcla de destinos.
- `TabClinico.test.tsx` (o extensión del existente): cambiar destino llama a `useUpdateStay` con **solo** `{ destino_tipo }` (regresión anti-clobbering); la sección "Otros accesos" inserta con tipo `Sonda urinaria (Foley)`; el hint de sigla aparece solo con `traslado`.
- Suite completa en verde (141 tests actuales, 0 regresiones) + typecheck limpio.
- Lighthouse accesibilidad 100 se mantiene en tablero, box y ejecutivo.

## 8. Criterios de éxito

1. Seleccionar "→ Traslado a otro hospital" y escribir la sigla en el detalle persiste en Supabase y sobrevive recarga.
2. Marcar "✝ Fallecido" muestra el badge en la tarjeta del tablero y suma al KPI del Ejecutivo en tiempo real (realtime existente, sin código nuevo de sync).
3. Se puede registrar "Sonda urinaria (Foley)" con días en "Otros accesos" y borrarla con confirmación; los accesos vasculares existentes no se mueven.
4. TQT seleccionable como Modo VM; comorbilidades persiste como cualquier AutoText.
5. Los valores reales ya guardados en `destination` siguen visibles y editables sin alteración.
