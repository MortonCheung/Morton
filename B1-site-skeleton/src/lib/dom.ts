/** Small math / DOM helpers shared by the scene and scroll layers. */

export const clamp = (v: number, min = 0, max = 1): number => Math.min(max, Math.max(min, v))

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t

export const smoothstep = (edge0: number, edge1: number, x: number): number => {
  if (edge0 === edge1) return x < edge0 ? 0 : 1
  const t = clamp((x - edge0) / (edge1 - edge0))
  return t * t * (3 - 2 * t)
}

/** Eased 0..1 window: stays 0 before `from`, 1 after `to`. */
export const window01 = (p: number, from: number, to: number): number => smoothstep(from, to, p)

export const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false
  const override = new URLSearchParams(window.location.search).get('motion')
  if (override === 'reduce') return true
  if (override === 'full') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export const isNarrow = (): boolean => typeof window !== 'undefined' && window.matchMedia('(max-width: 820px)').matches
