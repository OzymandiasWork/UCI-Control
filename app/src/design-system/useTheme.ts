// Tema claro/oscuro por dispositivo. Sin preferencia guardada se sigue al
// sistema (prefers-color-scheme); el toggle guarda la elección en localStorage.
// index.html aplica el tema ANTES de cargar la app (anti-flash) con esta misma
// lógica duplicada a propósito — si cambias la clave o el default, cambia ambos.
import { useEffect, useState } from 'react'

export type Theme = 'light' | 'dark'

const KEY = 'uci-theme'

/** Sincroniza la barra del navegador/PWA con el fondo de cada tema. */
const THEME_COLORS: Record<Theme, string> = { light: '#FAF9F5', dark: '#0d1117' }

export function resolveInitialTheme(): Theme {
  const stored = localStorage.getItem(KEY)
  if (stored === 'light' || stored === 'dark') return stored
  // matchMedia no existe en jsdom (tests) ni en WebViews muy viejos: claro.
  if (typeof window.matchMedia !== 'function') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[theme])
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(resolveInitialTheme)

  useEffect(() => { applyTheme(theme) }, [theme])

  const toggle = () => setTheme(t => {
    const next: Theme = t === 'dark' ? 'light' : 'dark'
    localStorage.setItem(KEY, next)
    return next
  })

  return { theme, toggle }
}
