import { render, screen } from '@testing-library/react'
import App from './App'

test('renderiza el título', () => {
  render(<App />)
  expect(screen.getByRole('heading', { name: /uci control/i })).toBeInTheDocument()
})
