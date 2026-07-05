import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { ConfirmDeleteButton } from './ConfirmDeleteButton'

test('estado inicial: solo el botón, sin llamar onConfirm', () => {
  const onConfirm = vi.fn()
  render(<ConfirmDeleteButton ariaLabel="Eliminar Pip/Tazo" confirmText="¿Eliminar Pip/Tazo?" onConfirm={onConfirm} />)
  expect(screen.getByRole('button', { name: 'Eliminar Pip/Tazo' })).toBeInTheDocument()
  expect(screen.queryByText('¿Eliminar Pip/Tazo?')).not.toBeInTheDocument()
  expect(onConfirm).not.toHaveBeenCalled()
})

test('clic muestra confirmación inline sin borrar todavía', async () => {
  const onConfirm = vi.fn()
  render(<ConfirmDeleteButton ariaLabel="Eliminar Pip/Tazo" confirmText="¿Eliminar Pip/Tazo?" onConfirm={onConfirm} />)
  await userEvent.click(screen.getByRole('button', { name: 'Eliminar Pip/Tazo' }))
  expect(screen.getByText('¿Eliminar Pip/Tazo?')).toBeInTheDocument()
  expect(onConfirm).not.toHaveBeenCalled()
})

test('confirmar llama onConfirm', async () => {
  const onConfirm = vi.fn()
  render(<ConfirmDeleteButton ariaLabel="Eliminar Pip/Tazo" confirmText="¿Eliminar Pip/Tazo?" onConfirm={onConfirm} />)
  await userEvent.click(screen.getByRole('button', { name: 'Eliminar Pip/Tazo' }))
  await userEvent.click(screen.getByRole('button', { name: /confirmar/i }))
  expect(onConfirm).toHaveBeenCalledTimes(1)
})

test('cancelar vuelve al estado inicial sin borrar', async () => {
  const onConfirm = vi.fn()
  render(<ConfirmDeleteButton ariaLabel="Eliminar Pip/Tazo" confirmText="¿Eliminar Pip/Tazo?" onConfirm={onConfirm} />)
  await userEvent.click(screen.getByRole('button', { name: 'Eliminar Pip/Tazo' }))
  await userEvent.click(screen.getByRole('button', { name: /cancelar/i }))
  expect(screen.queryByText('¿Eliminar Pip/Tazo?')).not.toBeInTheDocument()
  expect(onConfirm).not.toHaveBeenCalled()
  expect(screen.getByRole('button', { name: 'Eliminar Pip/Tazo' })).toBeInTheDocument()
})

test('Escape cancela la confirmación', async () => {
  const onConfirm = vi.fn()
  render(<ConfirmDeleteButton ariaLabel="Eliminar Pip/Tazo" confirmText="¿Eliminar Pip/Tazo?" onConfirm={onConfirm} />)
  await userEvent.click(screen.getByRole('button', { name: 'Eliminar Pip/Tazo' }))
  await userEvent.keyboard('{Escape}')
  expect(screen.queryByText('¿Eliminar Pip/Tazo?')).not.toBeInTheDocument()
  expect(onConfirm).not.toHaveBeenCalled()
})

test('acepta una etiqueta e ícono personalizados para el botón inicial (variante compacta)', () => {
  render(<ConfirmDeleteButton ariaLabel="Eliminar evento X" confirmText="¿Eliminar?" onConfirm={vi.fn()} idleLabel="✕" />)
  expect(screen.getByRole('button', { name: 'Eliminar evento X' })).toHaveTextContent('✕')
})

test('al confirmar aparecer, el foco va a "Cancelar" (opción segura por defecto)', async () => {
  render(<ConfirmDeleteButton ariaLabel="Eliminar Pip/Tazo" confirmText="¿Eliminar Pip/Tazo?" onConfirm={vi.fn()} />)
  await userEvent.click(screen.getByRole('button', { name: 'Eliminar Pip/Tazo' }))
  expect(screen.getByRole('button', { name: /cancelar/i })).toHaveFocus()
})

test('al cancelar, el foco vuelve al botón original (no se pierde)', async () => {
  render(<ConfirmDeleteButton ariaLabel="Eliminar Pip/Tazo" confirmText="¿Eliminar Pip/Tazo?" onConfirm={vi.fn()} />)
  await userEvent.click(screen.getByRole('button', { name: 'Eliminar Pip/Tazo' }))
  await userEvent.click(screen.getByRole('button', { name: /cancelar/i }))
  expect(screen.getByRole('button', { name: 'Eliminar Pip/Tazo' })).toHaveFocus()
})
