import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { Badge } from '../Badge'
import { Button } from '../Button'
import { TextField, SelectField, NumberField } from '../Field'
import { Tabs } from '../Tabs'

test('Badge muestra el texto del estado (no solo color)', () => {
  render(<Badge tone="danger">Crítico</Badge>)
  expect(screen.getByText('Crítico')).toBeInTheDocument()
})

test('Button expone su nombre accesible', () => {
  render(<Button onClick={() => {}}>Guardar</Button>)
  expect(screen.getByRole('button', { name: 'Guardar' })).toBeInTheDocument()
})

test('TextField asocia label e input', () => {
  render(<TextField label="Diagnóstico" value="" onChange={() => {}} />)
  expect(screen.getByLabelText('Diagnóstico')).toBeInTheDocument()
})

test('SelectField asocia label y opciones', async () => {
  const onChange = vi.fn()
  render(
    <SelectField label="Previsión" value="Fonasa A" onChange={onChange}
      options={['Fonasa A', 'Isapre']} />,
  )
  await userEvent.selectOptions(screen.getByLabelText('Previsión'), 'Isapre')
  expect(onChange).toHaveBeenCalledWith('Isapre')
})

test('NumberField incrementa con nombre accesible', async () => {
  function Wrap() {
    const [v, setV] = useState(2)
    return <NumberField label="Días VM" value={v} onChange={setV} />
  }
  render(<Wrap />)
  await userEvent.click(screen.getByRole('button', { name: /aumentar días vm/i }))
  expect(screen.getByLabelText('Días VM')).toHaveValue(3)
})

test('Tabs implementa el patrón WAI-ARIA y cambia de panel', async () => {
  render(
    <Tabs
      label="Módulos del paciente"
      tabs={[
        { id: 'a', label: 'Clínico', content: <p>panel clínico</p> },
        { id: 'b', label: 'SOFA', content: <p>panel sofa</p> },
      ]}
    />,
  )
  expect(screen.getByRole('tablist', { name: 'Módulos del paciente' })).toBeInTheDocument()
  expect(screen.getByText('panel clínico')).toBeInTheDocument()
  await userEvent.click(screen.getByRole('tab', { name: 'SOFA' }))
  expect(screen.getByText('panel sofa')).toBeInTheDocument()
  expect(screen.getByRole('tab', { name: 'SOFA' })).toHaveAttribute('aria-selected', 'true')
})

test('Tabs navega con flechas del teclado', async () => {
  render(
    <Tabs
      label="Módulos"
      tabs={[
        { id: 'a', label: 'Uno', content: <p>uno</p> },
        { id: 'b', label: 'Dos', content: <p>dos</p> },
      ]}
    />,
  )
  screen.getByRole('tab', { name: 'Uno' }).focus()
  await userEvent.keyboard('{ArrowRight}')
  expect(screen.getByRole('tab', { name: 'Dos' })).toHaveFocus()
  expect(screen.getByText('dos')).toBeInTheDocument()
})
