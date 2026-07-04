# UCI Control — Diseño de la aplicación v1

**Fecha:** 2026-07-03
**Proyecto:** UCI Torre Valech — HUAP — Servicio de Salud Metropolitano Central
**Origen:** prototipos React/HTML existentes (`UCI_Dashboard_Completo/`, `dataucicontrrol/`)

## 1. Objetivo

Convertir los prototipos del tablero UCI en una aplicación real de producción: primero web, con la misma base de código lista para empaquetarse para App Store y Play Store mediante Capacitor. Tema claro estilo Claude, animaciones GSAP sobrias, accesibilidad WCAG 2.2 AA.

## 2. Alcance

### Incluido en v1

- **Tablero operativo**: 24 boxes con 7 módulos clínicos por paciente (Clínico, Equipo, ATB, Nutrición, SOFA, Metas, Sugerencias de tratamiento), migrados del prototipo `uci_dashboard.jsx`.
- **Resumen Ejecutivo**: censo, SOFA promedio/máximo, pacientes en VM, camas libres, egresables, alertas activas — **calculado desde los datos reales del tablero** (el prototipo `uci_executive.jsx` usa datos fijos).
- **Agenda del día** (eventos de la unidad).
- **Autenticación** con email y contraseña. En v1 las cuentas se crean manualmente desde el panel de Supabase (sin registro abierto ni UI de administración de usuarios).
- **Sincronización en tiempo real** entre todos los dispositivos conectados.
- **Capacitor configurado** desde el inicio (viewport, safe areas, iconos, splash), sin generar binarios de tienda todavía.

### Fuera de alcance (v2+)

- Módulo RYGF de ventilación mecánica (`RYGF_Digital_HUAP_v1.html`) — se integrará como módulo dentro de esta misma arquitectura.
- Roles con permisos diferenciados (v1: todos los usuarios autenticados editan).
- Publicación efectiva en App Store / Play Store (v1 deja todo preparado).
- Historial clínico longitudinal, reportería avanzada, exportaciones.
- Los PDFs de costos (mspg002, Caso de Costos) no forman parte de la app.

## 3. Decisiones tomadas con el usuario

| Decisión | Elección |
|---|---|
| Alcance v1 | Dashboard + Resumen Ejecutivo (RYGF a v2) |
| Datos | Compartidos en tiempo real vía backend en la nube (Supabase) |
| Usuarios | Todos los autenticados editan; vista ejecutiva visible para todos |
| Datos de paciente | Completos (nombre, contacto familiar), como el prototipo |
| Dispositivos | Desktop de estación primero, experiencia móvil completa para visita |
| Stack | React + Vite + TypeScript + Capacitor + Supabase + GSAP |

## 4. Advertencia legal (obligatoria de resolver antes de uso real)

La app manejará **datos sensibles de salud con identificación de pacientes** (Ley 21.719 de protección de datos personales, Chile). El uso con pacientes reales requiere respaldo institucional del HUAP: convenio o autorización formal, y una política de privacidad publicada. Hasta entonces, la app debe usarse solo con datos de prueba o ficticios. Mitigaciones técnicas incluidas en v1: acceso solo autenticado, RLS en todas las tablas, registro de `updated_by`/`updated_at`, sin acceso público ni anónimo.

## 5. Arquitectura

### Stack

- **Frontend:** React 18 + Vite + TypeScript.
- **Backend:** Supabase (Postgres + Auth + Realtime). Sin servidor propio.
- **Estado de servidor:** TanStack Query + suscripciones Realtime de supabase-js.
- **Animación:** GSAP (+ plugin Flip).
- **Empaquetado móvil:** Capacitor (iOS/Android), misma base de código.
- **Testing:** Vitest + React Testing Library + vitest-axe.

### Estructura del proyecto

La app vive en `app/` dentro del repositorio `UCI CONTROL` (las carpetas de prototipos quedan como referencia histórica).

```
app/
  src/
    features/
      board/        # tablero de 24 boxes, filtros, agenda
      patient/      # detalle de box: 7 pestañas
      executive/    # resumen ejecutivo
      auth/         # login, sesión
    lib/
      clinical/     # SOFA, sugerencias, riesgos — funciones puras
      supabase/     # cliente, tipos generados, hooks de datos
    design-system/  # tokens, componentes base (Button, Input, Tabs, Badge…)
```

Cada unidad tiene una responsabilidad clara: `lib/clinical` no importa nada de UI; `design-system` no conoce el dominio clínico; las `features` componen ambos.

## 6. Modelo de datos (Supabase)

Tablas normalizadas — lo que permite que el ejecutivo consulte agregados reales:

- **`stays`** — episodio de paciente en un box: `box_number` (1–24, único mientras activo), nombre, ficha, diagnóstico, alerta (`none|moderate|critical|eol|procurement|trial`), residente, destino, días hosp/VM, modo VM, RCP, alergias, previsión, consentimiento, balance meta/real, contacto familiar (nombre, teléfono, último contacto), notas, `active`.
- **`sofa_assessments`** — 6 dominios (resp, coag, hepático, cardio, neuro, renal) + fecha. La pestaña SOFA edita la evaluación de hoy; las de días anteriores quedan guardadas como historial (la UI de historial es v2).
- **`goals`** — metas del día por stay (texto, hecho/pendiente).
- **`antibiotics`** — ATB por stay (fármaco, día de tratamiento).
- **`accesses`** — accesos vasculares (tipo, días).
- **`nutrition`** — tipo, vía, calorías meta/real, días, notas (1:1 con stay).
- **`unit_events`** — agenda del día (hora, etiqueta); cualquier usuario autenticado puede agregar y eliminar eventos.
- **`profiles`** — datos del usuario (nombre a mostrar), enlazado a auth.

Todas las tablas llevan `updated_by` y `updated_at` (trigger). Boxes sin `stay` activo = cama libre.

### Seguridad y tiempo real

- **RLS activado en todas las tablas**: solo usuarios autenticados leen/escriben; sin acceso anónimo.
- Cuentas creadas por invitación (sin registro abierto).
- **Realtime**: suscripción a cambios de Postgres en las tablas del tablero → actualización de la caché de TanStack Query → todos los dispositivos ven el cambio al segundo.

## 7. UX/UI

### Lenguaje visual "Claude claro"

- Fondo crema cálido `#FAF9F5`; tarjetas blancas, bordes `#E8E6DE`, sombras leves.
- Tinta `#1A1915`; texto secundario en gris cálido.
- Acento terracota `#D97757` para acciones, foco y elementos interactivos.
- Tipografía: **Source Serif 4** para títulos y cifras grandes; **Inter** para UI operativa.
- Estados clínicos en verde/ámbar/rojo/morado/celeste **recalibrados para contraste AA sobre fondo claro**, siempre acompañados de texto e ícono (el color nunca es el único indicador).
- Todos los colores viven como design tokens en `design-system/`; ningún color hardcodeado en features.

### Pantallas

1. **Login** — email + contraseña, nombre de la unidad.
2. **Tablero** — desktop: grid de 24 boxes (4–6 columnas según ancho) con paciente, diagnóstico, alerta, SOFA y metas a la vista; filtros por alerta y residente; búsqueda; agenda en panel lateral. Móvil: lista compacta + navegación deslizando entre boxes.
3. **Detalle de box** — las 7 pestañas; desktop: se expande sobre el tablero; móvil: pantalla completa.
4. **Resumen Ejecutivo** — KPIs y alertas activas calculados en vivo.

### GSAP

Entrada del grid con stagger sutil; expansión tarjeta→detalle con Flip; contadores animados en KPIs; transiciones de pestañas. **Siempre respetando `prefers-reduced-motion`** (las animaciones se reducen a fundidos o se omiten).

## 8. Accesibilidad — WCAG 2.2 AA

(La 2.2 es la versión vigente; "2.3" aún no existe.)

- Contraste ≥ 4.5:1 texto, ≥ 3:1 componentes/estados, verificado token por token.
- Navegación completa por teclado; foco visible (anillo terracota); sin trampas de foco en modales.
- Patrones WAI-ARIA correctos: tabs, dialog, listas; etiquetas en todos los campos e íconos.
- Objetivos táctiles ≥ 24×24 px (criterio 2.5.8 de WCAG 2.2).
- `lang="es"`, textos escalables a 200% sin pérdida de contenido.
- axe automatizado en la suite de tests + auditoría Lighthouse antes de cerrar la v1.

## 9. Conexión y manejo de errores

- Indicador de conexión discreto y permanente.
- Sin red: banner "Sin conexión — mostrando última copia"; lectura desde caché persistida (TanStack Query persister en localStorage).
- Escrituras optimistas con reintento automático; si el guardado falla definitivamente, aviso explícito — nunca fallo silencioso con datos clínicos.
- Edición concurrente: gana el último cambio (`updated_at`); el otro usuario recibe notificación de que el dato cambió.

## 10. Testing

- **Unitario (Vitest):** toda `lib/clinical` (cálculo SOFA, matching de sugerencias, umbrales de riesgo) con cobertura exhaustiva — es lo que no puede fallar.
- **Componentes (Testing Library):** tablero, pestañas, formularios clave.
- **Accesibilidad (vitest-axe):** sin violaciones en las pantallas principales.
- Desarrollo guiado por tests (TDD) según la disciplina de las skills.

## 11. Preparación para tiendas (documentado, no ejecutado en v1)

- Capacitor configurado desde el día uno: `capacitor.config.ts`, safe areas, iconos y splash.
- Checklist para publicar (v2): cuenta Apple Developer (USD 99/año), cuenta Google Play (USD 25 única vez), política de privacidad publicada (obligatoria por datos de salud), screenshots por dispositivo, revisión de guidelines de Apple sobre apps médicas.

## 12. Criterios de éxito de la v1

1. Dos dispositivos con sesiones distintas ven el mismo cambio en menos de 2 segundos.
2. Refrescar la página no pierde ningún dato.
3. Lighthouse: accesibilidad ≥ 95 en las 4 pantallas; cero violaciones axe.
4. El tablero completo es operable solo con teclado.
5. La app funciona y se ve correcta en 375 px (móvil) y 1440 px (desktop).
6. `npx cap add ios/android` produce un proyecto que compila sin cambios de código web.
