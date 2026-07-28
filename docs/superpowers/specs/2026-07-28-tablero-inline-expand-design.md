# Tablero: expansión inline de box (reemplaza navegación a página) — Diseño

**Fecha:** 2026-07-28
**Proyecto:** UCI Torre Valech — HUAP
**Origen:** comparación visual en vivo entre `ucicontrol.cl` y `UCI_Dashboard (16).html` (dashboard
definitivo, confirmado por el usuario) — el equipo médico pidió explícitamente que la interfaz
calce con el prototipo, no solo que existan los mismos datos/features.

## 1. Objetivo

Hoy, click en un box navega a una página aparte (`/box/:boxNumber` → `PatientPage.tsx`). En el
prototipo definitivo, click en un box **expande la tarjeta inline dentro de la misma grilla del
tablero** — sin cambiar de página, en modo acordeón (expandir uno colapsa cualquier otro que
estuviera abierto). Esto se verificó en vivo, no se adivinó: se sirvió el HTML localmente y se
midió con el navegador (ver hallazgos abajo).

Este spec cubre **solo el contenedor** tablero↔detalle — el "shell" que decide qué se ve y cómo
se navega entre boxes. No toca el contenido de ningún tab clínico existente.

## 2. Hallazgos verificados contra el prototipo en vivo

- Tarjeta de box colapsada: **46px de alto** (vs. `min-height: 132px` actual) — una sola línea:
  `#box · nombre · dx · alerta · residente · díaN · 💾 · ▼`.
- Grid: `display: grid`, `padding: 0 20px 30px`, `gap: 8px` — sin scroll para los 24 boxes en un
  viewport de estación (1280×720 probado).
- Expandir es **acordeón**: se probó abrir el box #5 y luego el #6 sin cerrar el primero — el
  #5 se cerró solo al abrir el #6. Un solo box expandido a la vez.
- Al expandir, aparece un header (alerta + destino) y una fila de tabs como etiquetas planas:
  Metas / Clínico / Antibióticos y Alergias / Nutrición / Equipo / SOFA / APACHE II / SAPS 3 /
  Sugerencias — y **"🛡 Prevención de IAAS" como sección colapsable aparte, con su propio ▼**,
  fuera de la fila de tabs, no como una pestaña más. Esto corrige
  `docs/superpowers/specs/2026-07-28-fase3-iaas-design.md` sección 5, que asumía IAAS como tab
  (ver sección 7 de este documento).
- Íconos 💾 "Guardar" (por fila + uno global "Último guardado: hace Nm") — artefacto de que el
  prototipo es 100% localStorage sin backend. **Decisión confirmada con el usuario: se omiten.**
  Nuestra app ya persiste cada cambio al instante vía Supabase (`PatientPage.tsx` ya tiene el
  patrón correcto: `✓ Guardado automático` en el header, sin botón de guardar real).
- Color de fondo `rgb(13,17,23)` = `#0d1117` y fuente `Inter` — **ya coinciden exactamente**
  con nuestro tema oscuro (`77f2df6`). El gap nunca fue de paleta, fue de densidad/arquitectura
  de navegación.

## 3. Estado actual exacto (para no reinventar lo que ya sirve)

- Ruta: `App.tsx` → `<Route path="/box/:boxNumber" element={<Protected><PatientPage /></Protected>} />`.
- La clave real es `box_number` (entero 1–24), **no** `stay.id` — `PatientPage.tsx` hace
  `stays.find(s => s.box_number === n)`. Un box puede estar libre (`stay === null`).
- `BoxCard.tsx` es un `<Link to={`/box/${boxNumber}`}>`, usado dentro de `<li>` en
  `BoardPage.tsx` → `<ul className="board__grid" ref={gridRef}>` (el `gridRef` alimenta
  `animateGridEntrance`, una animación GSAP de entrada que corre en `useEffect` con dependencia
  `[isLoading]` — no se dispara al expandir/colapsar, no hay que tocarla).
- `design-system/Tabs.tsx` **ya es exactamente lo que necesitamos**: `role="tablist"` con
  botones planos + paneles `role="tabpanel"`, navegación con flechas, sin dependencia de rutas.
  Se reutiliza sin cambios.
- Los 10 `Tab*.tsx` actuales (`TabClinico`, `TabVentilacion`, `TabEquipo`, `TabATB`,
  `TabNutricion`, `TabSofa`, `TabMetas`, `TabSugerencias`, `TabFuncional`, `TabEMR`) **todos
  reciben solo `{ stay: StayFull }`** — ya están desacoplados de la ruta/página. Se reutilizan
  sin cambios; lo único que se reemplaza es el contenedor.
- `IngresoEgreso` (controles de admitir/dar de alta un box) también recibe `{ boxNumber, stay }`
  — reutilizable sin cambios.

## 4. Enfoques considerados

### Mecanismo de expansión

- **A. `grid-column: 1 / -1` dentro de la misma grilla — recomendada.** El box expandido cambia
  de clase y ocupa el ancho completo de `.board__grid`, empujando a los boxes siguientes a la
  fila de abajo; el resto sigue en flujo normal `auto-fill`. Es exactamente el mecanismo del
  prototipo. Estado: un solo `expandedBoxNumber: number | null` en `BoardPage`.
- **B. Panel fijo separado (split view).** Descartada: no es lo que hace el prototipo (que
  reordena la grilla, no abre un panel aparte), y el usuario ya pidió fidelidad total.
- **C. Modal/overlay.** Descartada por la misma razón — el prototipo no usa overlay, la tarjeta
  crece en su lugar dentro del flujo normal del documento.

### Contenedor del detalle expandido

- **A. Nuevo componente `ExpandedBox.tsx`, reutilizando `Tabs` + los 10 `Tab*.tsx` sin cambios
  — recomendada.** Reemplaza el `<header>`/`<main>` de página de `PatientPage.tsx` por un
  fragmento que se monta dentro del `<li>` del box expandido. Mismo contenido, sin el chrome de
  página completa (sin "← Tablero", sin navegación "← Box N / Box N+1 →" porque ya no hay
  cambio de página — moverse a otro box es simplemente expandir otro box).
- **B. Reescribir cada `Tab*.tsx` para que no dependa de `PatientPage.tsx`.** Innecesario: ya no
  dependen de la página, dependen solo de `stay`. Se descarta por ser trabajo repetido sin
  beneficio.

## 5. Diseño

### 5.1 Estado y componentes

`BoardPage.tsx` agrega `const [expandedBoxNumber, setExpandedBoxNumber] = useState<number | null>(null)`.

`BoxCard.tsx` dejará de ser un `<Link>` y pasa a recibir `{ boxNumber, stay, expanded, onToggle }`:
- `expanded === false`: renderiza la fila compacta (nueva, sección 5.3) con
  `<button onClick={onToggle}>` en vez de `<Link>`.
- `expanded === true`: renderiza la fila compacta igual (con ▲ en vez de ▼) **más**
  `<ExpandedBox stay={stay} boxNumber={boxNumber} onClose={onToggle} />` debajo, dentro del
  mismo `<li>`. El `<li>` gana `className="board__grid-item--expanded"` → CSS aplica
  `grid-column: 1 / -1`.

`ExpandedBox.tsx` (nuevo, en `features/patient/`): calco del contenido actual de
`PatientPage.tsx` sin el `<header>` de página completa — mantiene `IngresoEgreso`, el `Badge` de
alerta, el `SelectField` de destino (ya en `TabClinico`, no se duplica aquí), el componente
`Tabs` con los mismos 10 tabs, y agrega debajo (fuera del array `tabs`) un `<details>` o sección
colapsable propia para "🛡 Prevención de IAAS" — vacía/oculta en este spec (no hay contenido
IAAS todavía; el spec de IAAS la llena en su propia implementación, ver sección 7). Recibe
`{ stay: StayFull | null, boxNumber: number }`: con `stay === null` (box libre) renderiza solo
`IngresoEgreso` — igual que hace hoy `PatientPage.tsx` con el mismo `{stay && (...)}` guard —
sin `Tabs` ni sección IAAS, porque no hay datos de paciente que editar.

`BoxCard.tsx` hoy tiene dos ramas de render totalmente distintas (`stay === null` → tarjeta
mínima "Cama libre"; `stay` presente → tarjeta con badges). Ambas ramas cambian de `<Link>` a
`<button onClick={onToggle}>`, y ambas pueden expandirse — un box libre también se puede abrir
para admitir un paciente vía `IngresoEgreso`, igual que hoy se puede navegar a un box libre para
lo mismo.

### 5.2 Ruteo — `/box/:boxNumber` se mantiene como deep-link

Por decisión confirmada del usuario: la URL sigue existiendo para poder compartir un link directo
a un box. `App.tsx` cambia la ruta `/box/:boxNumber` para que monte un componente delgado
`BoxRedirect` (nuevo, unas 5 líneas) en vez de `PatientPage`:

```tsx
function BoxRedirect() {
  const { boxNumber } = useParams()
  return <Navigate to="/" replace state={{ expandBox: Number(boxNumber) }} />
}
```

`BoardPage.tsx` lee `const location = useLocation()` e inicializa
`useState<number | null>(location.state?.expandBox ?? null)`. Es el patrón idiomático de
react-router-dom v6 (`state` en `Navigate`/`useNavigate`, leído con `useLocation`) — no requiere
`history.replaceState` manual ni un segundo render para limpiar la URL, porque `/box/:boxNumber`
nunca llega a pintarse: `Navigate` reemplaza la entrada de historial antes del primer paint.
`PatientPage.tsx` y su archivo de test se eliminan.

### 5.3 Estilos — nueva densidad en `board.css`

- `.boxcard` colapsada: se reduce a un layout de una fila (`display:flex; align-items:center;
  gap: var(--space-2)`), sin `box-shadow`, sin `min-height: 132px` (pasa a auto, contenido
  determina el alto ~40-48px con el padding actual reducido). Se conserva el borde de color por
  alerta (más angosto, ej. 3px) — es información clínica real, no decoración; el prototipo
  también lo tiene (el `⚠`/color por fila).
  - Se retira la animación `pulso-critico` de la tarjeta colapsada por ahora — con 24 filas
    compactas visibles simultáneamente, un pulso por cada crítico sería visualmente ruidoso.
    Se conserva el `Badge` de alerta como indicador (no silencioso). Si el equipo lo pide
    después, se puede limitar el pulso a un ícono chico en vez de la tarjeta completa.
- `.board__grid-item--expanded`: `grid-column: 1 / -1`.
- Se retiran del markup los íconos 💾 y el texto "Último guardado" (decisión confirmada,
  sección 2).
- El `board__grid` conserva `grid-template-columns: repeat(auto-fill, minmax(240px, 1fr))` —
  no se fuerza un número fijo de columnas; en una pantalla de 1280px con la nueva altura
  reducida, 24 filas caben sin scroll siguiendo el mismo criterio que el prototipo.

### 5.4 Interacción con los filtros del tablero

Si `expandedBoxNumber` corresponde a un box que un filtro activo (alerta/residente/búsqueda)
deja de mostrar, se colapsa automáticamente (`setExpandedBoxNumber(null)` en un `useEffect` que
observa `visible` y el valor actual) — evita un estado inconsistente donde un box expandido
"desaparece" de la lista visible pero sigue montado.

## 6. Testing

- `BoxCard.test.tsx`: agregar casos para `expanded={true}` (renderiza `ExpandedBox`, muestra ▲)
  vs `expanded={false}` (▼, sin `ExpandedBox` montado); click en la fila colapsada llama
  `onToggle` (ya no navega — se quita cualquier aserción de `MemoryRouter`/`Link` si ya no aplica).
- `ExpandedBox.test.tsx` (nuevo, migra los casos relevantes de `PatientPage.test.tsx` si existen):
  renderiza los 10 tabs, cada uno recibe `stay` correctamente; sección IAAS colapsable presente
  pero vacía en esta fase.
- `BoardPage.test.tsx`: expandir box A, expandir box B → A se colapsa (acordeón); expandir un
  box y luego cambiar un filtro que lo excluye → se colapsa automáticamente; navegar directo a
  `/box/7` → el tablero carga con el box 7 ya expandido y la URL vuelve a `/`.
- `npm run build` sin errores (tipos de las nuevas props).
- Verificación visual en navegador: los 24 boxes visibles sin scroll en 1280×800 con todos
  colapsados: expandir uno no rompe el layout de los demás.

## 7. Impacto en los specs de Fase 3 ya committeados

Los specs de IAAS, APACHE II, SOFA-basal y CSV export (commit `c3f0c64`) asumen integrarse en
`PatientPage.tsx` vía el array `tabs`. Tras este rediseño, se integran en `ExpandedBox.tsx` en
el mismo lugar (mismo array `tabs`, mismo componente `Tabs`, sin cambios de fondo en esos 4
specs) — **excepto IAAS**, que debe corregirse: no es un tab más, es la sección colapsable
"🛡 Prevención de IAAS" descrita en la sección 5.1 de este documento, hermana de `Tabs`, no un
elemento del array. Esa corrección se hace como un ajuste puntual al spec de IAAS existente
(no amerita reescribirlo completo) una vez este spec esté aprobado e implementado.

## 8. Criterios de éxito

- Click en un box lo expande inline sin navegar; click de nuevo (o abrir otro box) lo colapsa.
- Los 24 boxes colapsados caben sin scroll en 1280×800 (mismo criterio que el prototipo).
- `/box/:boxNumber` sigue funcionando como deep-link (abre el tablero con ese box expandido).
- Ningún `Tab*.tsx` cambia de comportamiento — todos los tests existentes de tabs individuales
  siguen pasando sin modificación.
- No quedan íconos 💾 ni texto "Último guardado" en el tablero.
- `npm test` y `npm run build` pasan.

## 9. Preguntas abiertas

Ninguna — las decisiones de alcance (deep-link se mantiene, botones de guardar se omiten,
expansión inline literal) ya fueron confirmadas directamente con el usuario antes de escribir
este spec.
