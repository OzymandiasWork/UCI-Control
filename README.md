# UCI Control — UCI Torre Valech · HUAP

Tablero clínico en tiempo real para la UPC: 24 boxes, 7 módulos por paciente
(Clínico, Equipo, ATB, Nutrición, SOFA, Metas, Sugerencias), resumen ejecutivo
para jefatura y agenda del día. React + Vite + TypeScript + Supabase + GSAP,
tema claro estilo Claude, accesibilidad WCAG 2.2 AA.

## Desarrollo

    cd app
    npm install
    # crear app/.env.local con:
    #   VITE_SUPABASE_URL=https://<ref>.supabase.co
    #   VITE_SUPABASE_ANON_KEY=<anon key>
    npm run dev

## Comandos

    npm run test        # suite de tests (Vitest + Testing Library + axe)
    npm run typecheck   # TypeScript sin emitir
    npm run build       # typecheck + build de producción
    npm run cap -- add android   # generar proyecto Android (Capacitor)

## Estructura

- `app/` — la aplicación (React + Vite + TS)
- `supabase/migrations/` — esquema de base de datos (aplicar en el SQL Editor
  de Supabase o vía MCP `apply_migration`)
- `docs/superpowers/` — spec de diseño y plan de implementación
- `UCI_Dashboard_Completo/`, `dataucicontrrol/` — prototipos originales (solo referencia)

## Puesta en marcha de la base de datos

1. Crear proyecto en supabase.com (región São Paulo).
2. Aplicar `supabase/migrations/001_schema.sql` en el SQL Editor.
3. Crear usuarios en Authentication → Users (con "Auto Confirm User").
4. Copiar URL y anon key a `app/.env.local`.

## Publicación en tiendas (pendiente, todo preparado)

1. Cuenta Apple Developer (USD 99/año) y Google Play Console (USD 25 una vez).
2. Política de privacidad publicada (obligatoria: datos de salud).
3. `cd app && npm run build && npm run cap -- add ios` (requiere macOS) /
   `npm run cap -- add android` + Android Studio para firmar el binario.
4. Iconos/splash, screenshots, y revisión de guidelines médicas de cada tienda.

## Advertencia de uso

La app maneja datos sensibles de salud (Ley 21.719, Chile). **No usar con datos
de pacientes reales** hasta contar con autorización institucional del HUAP y
política de privacidad publicada. Mientras tanto, solo datos de prueba.
