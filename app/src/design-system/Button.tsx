import { forwardRef, type ButtonHTMLAttributes } from 'react'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger'
}

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = 'primary', type = 'button', className, ...rest }, ref,
) {
  const mod = variant === 'primary' ? '' : ` ds-button--${variant}`
  return <button ref={ref} type={type} className={`ds-button${mod}${className ? ` ${className}` : ''}`} {...rest} />
})
