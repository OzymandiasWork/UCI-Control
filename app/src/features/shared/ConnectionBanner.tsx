import { useEffect, useState } from 'react'

export function ConnectionBanner() {
  const [online, setOnline] = useState(navigator.onLine)

  useEffect(() => {
    const up = () => setOnline(true)
    const down = () => setOnline(false)
    window.addEventListener('online', up)
    window.addEventListener('offline', down)
    return () => {
      window.removeEventListener('online', up)
      window.removeEventListener('offline', down)
    }
  }, [])

  if (online) return null
  return (
    <div role="status" className="conn-banner">
      Sin conexión — mostrando última copia. Los cambios se guardarán al reconectar.
    </div>
  )
}
