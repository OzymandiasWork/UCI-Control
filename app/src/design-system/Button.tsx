import type { ButtonHTMLAttributes } from 'react'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger'
}

export function Button({ variant = 'primary', type = 'button', className, ...rest }: Props) {
  const mod = variant === 'primary' ? '' : ` ds-button--${variant}`
  return <button type={type} className={`ds-button${mod}${className ? ` ${className}` : ''}`} {...rest} />
}
