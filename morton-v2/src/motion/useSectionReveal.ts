/**
 * Reveal-on-scroll for below-the-fold sections.
 *
 * Deliberately IntersectionObserver + CSS transition instead of a second GSAP
 * clock: one observer, one class, no scroll-linked work per frame. Unobserves
 * after the first reveal so nothing accumulates.
 */
import { useEffect } from 'react'

export function useSectionReveal(rootSelector = '[data-reveal]') {
  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>(rootSelector))
    if (!nodes.length) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      nodes.forEach((n) => n.classList.add('is-in'))
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          entry.target.classList.add('is-in')
          io.unobserve(entry.target)
        }
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.08 },
    )
    nodes.forEach((n) => io.observe(n))
    return () => io.disconnect()
  }, [rootSelector])
}
