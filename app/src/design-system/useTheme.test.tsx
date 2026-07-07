import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { resolveInitialTheme, applyTheme } from './useTheme'
import { ThemeToggle } from './ThemeToggle'

function mockMatchMedia(prefersDark: boolean) {
  vi.stubGlobal('matchMedia', vi.fn().mockImplementation((q: string) => ({
    matches: q.includes('dark') ? prefersDark : false,
    media: q, addEventListener: vi.fn(), removeEventListener: vi.fn(),
  })))
}

beforeEach(() => {
  localStorage.clear()
  delete document.documentElement.dataset.theme
})

afterEach(() => vi.unstubAllGlobals())

test('sin preferencia guardada, sigue el modo del sistema (oscuro)', () => {
  mockMatchMedia(true)
  expect(resolveInitialTheme()).toBe('dark')
})

test('sin preferencia guardada, sigue el modo del sistema (claro)', () => {
  mockMatchMedia(false)
  expect(resolveInitialTheme()).toBe('light')
})

test('la preferencia guardada manda sobre el sistema', () => {
  mockMatchMedia(true)
  localStorage.setItem('uci-theme', 'light')
  expect(resolveInitialTheme()).toBe('light')
})

test('applyTheme marca el documento y sincroniza el theme-color del navegador', () => {
  const meta = document.createElement('meta')
  meta.name = 'theme-color'
  meta.content = '#FAF9F5'
  document.head.appendChild(meta)

  applyTheme('dark')
  expect(document.documentElement.dataset.theme).toBe('dark')
  expect(meta.content).toBe('#0d1117')

  applyTheme('light')
  expect(document.documentElement.dataset.theme).toBe('light')
  expect(meta.content).toBe('#FAF9F5')
  meta.remove()
})

test('el toggle alterna a oscuro, persiste la elección y expone nombre accesible', async () => {
  mockMatchMedia(false)
  render(<ThemeToggle />)
  const btn = screen.getByRole('button', { name: 'Cambiar a modo oscuro' })
  await userEvent.click(btn)
  expect(document.documentElement.dataset.theme).toBe('dark')
  expect(localStorage.getItem('uci-theme')).toBe('dark')
  expect(screen.getByRole('button', { name: 'Cambiar a modo claro' })).toBeInTheDocument()
})

test('el toggle vuelve a claro desde oscuro guardado', async () => {
  mockMatchMedia(true)
  localStorage.setItem('uci-theme', 'dark')
  render(<ThemeToggle />)
  await userEvent.click(screen.getByRole('button', { name: 'Cambiar a modo claro' }))
  expect(document.documentElement.dataset.theme).toBe('light')
  expect(localStorage.getItem('uci-theme')).toBe('light')
})
