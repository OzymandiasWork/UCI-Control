import type { ReactNode } from 'react'

export type BadgeTone = 'ok' | 'warn' | 'danger' | 'eol' | 'proc' | 'trial' | 'muted'

export function Badge({ tone, children }: { tone: BadgeTone; children: ReactNode }) {
  return <span className={`ds-badge ds-badge--${tone}`}>{children}</span>
}
