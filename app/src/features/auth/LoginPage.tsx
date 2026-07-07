import { useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase/client'
import { Button } from '../../design-system/Button'
import { TextField } from '../../design-system/Field'
import { ThemeToggle } from '../../design-system/ThemeToggle'
import './auth.css'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (error) setError('Credenciales incorrectas. Revisa email y contraseña.')
  }

  return (
    <main className="login">
      <div className="login__theme"><ThemeToggle /></div>
      <form className="login__card" onSubmit={onSubmit}>
        <h1>UCI Control</h1>
        <p className="login__unit">UCI Torre Valech · HUAP</p>
        <TextField label="Email" value={email} onChange={setEmail} />
        <div className="ds-field">
          <label htmlFor="login-pass">Contraseña</label>
          <input id="login-pass" type="password" value={password}
            onChange={e => setPassword(e.target.value)} autoComplete="current-password" />
        </div>
        {error && <p role="alert" className="login__error">{error}</p>}
        <Button type="submit" disabled={busy}>
          {busy ? 'Ingresando…' : 'Ingresar'}
        </Button>
      </form>
    </main>
  )
}
