import { act, fireEvent, render, screen } from '@testing-library/react'
import { vi, afterEach, beforeEach, expect, test } from 'vitest'
import { AutoText, AutoNumber } from './AutoFields'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

const typeSequence = (input: HTMLElement, steps: string[]) => {
  for (const s of steps) fireEvent.change(input, { target: { value: s } })
}

test('escribe local al instante pero guarda UNA vez tras la pausa (debounce)', async () => {
  const save = vi.fn()
  render(<AutoText label="Diagnóstico" value="" onSave={save} />)
  const input = screen.getByLabelText('Diagnóstico')

  fireEvent.focus(input)
  typeSequence(input, ['P', 'PE', 'PED', 'PEDR', 'PEDRO'])
  expect(input).toHaveValue('PEDRO')
  expect(save).not.toHaveBeenCalled()

  await act(async () => { await vi.advanceTimersByTimeAsync(700) })
  expect(save).toHaveBeenCalledTimes(1)
  expect(save).toHaveBeenCalledWith('PEDRO')
})

test('un eco viejo del servidor NO pisa lo que estoy escribiendo', () => {
  const save = vi.fn()
  const { rerender } = render(<AutoText label="Diagnóstico" value="" onSave={save} />)
  const input = screen.getByLabelText('Diagnóstico')

  fireEvent.focus(input)
  typeSequence(input, ['P', 'PE', 'PED', 'PEDR', 'PEDRO'])
  // llega un refetch con datos viejos mientras el campo está enfocado/sucio
  rerender(<AutoText label="Diagnóstico" value="PED" onSave={save} />)
  expect(input).toHaveValue('PEDRO')
})

test('al salir del campo se guarda de inmediato lo pendiente', () => {
  const save = vi.fn()
  render(<AutoText label="Diagnóstico" value="" onSave={save} />)
  const input = screen.getByLabelText('Diagnóstico')

  fireEvent.focus(input)
  typeSequence(input, ['N', 'NA', 'NAC'])
  fireEvent.blur(input)
  expect(save).toHaveBeenCalledTimes(1)
  expect(save).toHaveBeenCalledWith('NAC')
})

test('sin ediciones, los cambios del servidor SÍ se reflejan', () => {
  const save = vi.fn()
  const { rerender } = render(<AutoText label="Diagnóstico" value="shock" onSave={save} />)
  rerender(<AutoText label="Diagnóstico" value="shock septico" onSave={save} />)
  expect(screen.getByLabelText('Diagnóstico')).toHaveValue('shock septico')
})

test('AutoNumber agrupa clics rápidos en un solo guardado', async () => {
  const save = vi.fn()
  render(<AutoNumber label="Días VM" value={2} onSave={save} />)
  const plus = screen.getByRole('button', { name: /aumentar días vm/i })

  fireEvent.click(plus)
  fireEvent.click(plus)
  fireEvent.click(plus)
  expect(screen.getByLabelText('Días VM')).toHaveValue(5)
  expect(save).not.toHaveBeenCalled()

  await act(async () => { await vi.advanceTimersByTimeAsync(700) })
  expect(save).toHaveBeenCalledTimes(1)
  expect(save).toHaveBeenCalledWith(5)
})

test('si el guardado falla tras reintentar, muestra aviso explícito (nunca falla en silencio)', async () => {
  const save = vi.fn().mockRejectedValue(new Error('network down'))
  render(<AutoText label="Diagnóstico" value="" onSave={save} />)
  const input = screen.getByLabelText('Diagnóstico')

  fireEvent.focus(input)
  typeSequence(input, ['X'])
  fireEvent.blur(input)

  // deja correr los reintentos (con backoff) hasta agotarlos
  await act(async () => { await vi.runAllTimersAsync() })

  expect(screen.getByRole('alert')).toHaveTextContent(/no se pudo guardar/i)
  expect(save.mock.calls.length).toBeGreaterThan(1) // reintentó, no fue un solo intento
})

test('un reintento exitoso NO muestra error', async () => {
  const save = vi.fn()
    .mockRejectedValueOnce(new Error('network down'))
    .mockResolvedValueOnce(undefined)
  render(<AutoText label="Diagnóstico" value="" onSave={save} />)
  const input = screen.getByLabelText('Diagnóstico')

  fireEvent.focus(input)
  typeSequence(input, ['X'])
  fireEvent.blur(input)
  await act(async () => { await vi.runAllTimersAsync() })

  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  expect(save).toHaveBeenCalledTimes(2)
})

test('el aviso de error desaparece tras un guardado exitoso posterior', async () => {
  const save = vi.fn().mockRejectedValue(new Error('network down'))
  render(<AutoText label="Diagnóstico" value="" onSave={save} />)
  const input = screen.getByLabelText('Diagnóstico')

  fireEvent.focus(input)
  typeSequence(input, ['X'])
  fireEvent.blur(input)
  await act(async () => { await vi.runAllTimersAsync() })
  expect(screen.getByRole('alert')).toBeInTheDocument()

  save.mockReset()
  save.mockResolvedValue(undefined)
  fireEvent.focus(input)
  typeSequence(input, ['XY'])
  fireEvent.blur(input)
  await act(async () => { await vi.runAllTimersAsync() })
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})
