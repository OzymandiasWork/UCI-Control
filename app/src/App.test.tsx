import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'

vi.mock('./lib/supabase/client', () => ({
  supabase: { auth: { signInWithPassword: vi.fn() } },
}))

import { LoginPage } from './features/auth/LoginPage'

test('login muestra campos accesibles', () => {
  render(<LoginPage />)
  expect(screen.getByLabelText('Email')).toBeInTheDocument()
  expect(screen.getByLabelText('Contraseña')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /ingresar/i })).toBeInTheDocument()
})
