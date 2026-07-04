import { gsap } from 'gsap'

/** Entrada del grid: stagger sutil. No-op si el usuario prefiere menos movimiento. */
export function animateGridEntrance(container: HTMLElement) {
  const mm = gsap.matchMedia()
  mm.add('(prefers-reduced-motion: no-preference)', () => {
    gsap.from(container.querySelectorAll('.boxcard'), {
      opacity: 0, y: 12, duration: 0.35, stagger: 0.02, ease: 'power2.out', clearProps: 'all',
    })
  })
  return () => mm.revert()
}

/** Contadores del ejecutivo: cuentan hacia su valor entero. */
export function animateKpis(container: HTMLElement) {
  const mm = gsap.matchMedia()
  mm.add('(prefers-reduced-motion: no-preference)', () => {
    container.querySelectorAll<HTMLElement>('[data-kpi]').forEach(el => {
      const text = el.childNodes[0]
      const target = Number(text?.textContent)
      if (!Number.isFinite(target) || !text) return
      const obj = { v: 0 }
      gsap.to(obj, {
        v: target, duration: 0.7, ease: 'power1.out',
        onUpdate: () => { text.textContent = String(Math.round(obj.v)) },
      })
    })
  })
  return () => mm.revert()
}
