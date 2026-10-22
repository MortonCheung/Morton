/**
 * Opening state machine.
 *
 * boot -> drawing -> built -> reveal -> hero   (or fallback-ready -> reveal)
 *
 * Two gates: the drawing animation finishing, and the *real* final hero being
 * ready (fonts + images decoded + one painted frame). Both must pass before the
 * sheets open. If resources are slow the cover holds in `built`; it never fakes
 * progress and never reveals an unready surface.
 *
 * The drawing and the progress line share one GSAP clock.
 */
import gsap from 'gsap'
import { useCallback, useEffect, useRef, useState } from 'react'

export type OpeningState = 'boot' | 'drawing' | 'built' | 'reveal' | 'hero' | 'reduced' | 'error'

export interface OpeningTimings {
  mount: number
  drawing: number
  built: number
  targetReady: number
  reveal: number
  hero: number
}

export interface MortonProbe {
  state: OpeningState
  timings: Partial<OpeningTimings> & Record<string, number>
  frames?: { count: number; p95: number; max: number }
}

declare global {
  interface Window {
    __MORTON__?: MortonProbe
  }
}

const DRAW_MS = 1180
const REVEAL_MS = 620
const HOLD_MS = 60

/** Wait for the real final target: fonts, hero images decoded, one painted frame. */
async function waitForTarget(root: HTMLElement, gateDelay = 0): Promise<void> {
  if (gateDelay > 0) await new Promise((r) => setTimeout(r, gateDelay))
  // Only the hero's own images gate the reveal. Below-the-fold sections are
  // lazy and must not block the opening.
  const hero = root.querySelector<HTMLElement>('[data-hero-section], #index') ?? root
  const images = Array.from(hero.querySelectorAll<HTMLImageElement>('img')).filter((img) => img.currentSrc || img.src)
  await Promise.all([
    document.fonts.ready.then(() => undefined),
    ...images.map(async (img) => {
      if (!img.complete) {
        await new Promise<void>((resolve) => {
          img.addEventListener('load', () => resolve(), { once: true })
          img.addEventListener('error', () => resolve(), { once: true })
        })
      }
      if (img.naturalWidth && 'decode' in img) {
        try {
          await img.decode()
        } catch {
          /* decode can reject for already-decoded images; not fatal */
        }
      }
    }),
    new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))),
  ])
}

export function useOpeningSequence(gateDelay = 0) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [state, setState] = useState<OpeningState>('boot')
  const timings = useRef<Partial<OpeningTimings>>({})
  const timeline = useRef<gsap.core.Timeline | null>(null)

  // the probe state must survive timing marks: mark() used to reset it to 'boot',
  // which made `drawing` unobservable for automated checks
  const current = useRef<OpeningState>('boot')
  const mark = useCallback((key: keyof OpeningTimings) => {
    timings.current[key] = Math.round(performance.now())
    window.__MORTON__ = { state: current.current, timings: { ...timings.current } }
  }, [])

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    let cancelled = false
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const top = root.querySelector<HTMLElement>('[data-sheet="top"]')
    const bottom = root.querySelector<HTMLElement>('[data-sheet="bottom"]')
    const progress = root.querySelector<HTMLElement>('[data-progress]')
    const cover = root.querySelector<HTMLElement>('[data-cover]')
    const viewport = window.matchMedia('(max-width: 719px)').matches ? 'mobile' : 'desktop'
    const strokes = Array.from(root.querySelectorAll<SVGPathElement>(`[data-variant="${viewport}"] [data-stroke]`))
    if (!top || !bottom || !progress || !cover) return

    // lock the page while the cover is up
    document.documentElement.classList.add('is-opening')
    mark('mount')
    const probeState = (s: OpeningState) => {
      current.current = s
      setState(s)
      window.__MORTON__ = { state: s, timings: { ...timings.current } }
    }
    root.dataset.phase = 'boot'

    for (const p of strokes) gsap.set(p, { strokeDasharray: 100, strokeDashoffset: 100 })
    gsap.set(progress, { scaleX: 0, transformOrigin: 'left center' })
    gsap.set([top, bottom], { yPercent: 0, force3D: true })

    const finish = () => {
      if (cancelled) return
      mark('hero')
      probeState('hero')
      root.dataset.phase = 'hero'
      cover.setAttribute('hidden', '')
      document.documentElement.classList.remove('is-opening')
    }

    const reveal = () =>
      new Promise<void>((resolve) => {
        mark('reveal')
        probeState('reveal')
        root.dataset.phase = 'reveal'
        timeline.current = gsap.timeline({ onComplete: resolve })
        timeline.current
          .to(top, { yPercent: -101, duration: REVEAL_MS / 1000, ease: 'power3.inOut' }, 0)
          .to(bottom, { yPercent: 101, duration: REVEAL_MS / 1000, ease: 'power3.inOut' }, 0)
          .to(progress, { autoAlpha: 0, duration: 0.18, ease: 'power1.out' }, 0)
      })

    const run = async () => {
      const targetReady = waitForTarget(root, gateDelay)

      if (reduced) {
        await targetReady
        if (cancelled) return
        mark('targetReady')
        probeState('reduced')
        gsap.set(cover, { autoAlpha: 0 })
        finish()
        return
      }

      // drawing + progress on one clock
      probeState('drawing')
      mark('drawing')
      const drawn = new Promise<void>((resolve) => {
        const tl = gsap.timeline({ onComplete: resolve })
        timeline.current = tl
        const byFamily = (name: string) => strokes.filter((p) => p.closest('[data-line-family]')?.getAttribute('data-line-family') === name)
        const order: Array<[string, number, number]> = [
          ['silhouette', 0, 0.62],
          ['detail', 0.22, 0.58],
          ['shading', 0.38, 0.5],
        ]
        for (const [family, at, span] of order) {
          const group = byFamily(family)
          if (!group.length) continue
          const stagger = span / Math.max(1, group.length)
          group.forEach((p, i) => {
            tl.to(p, { strokeDashoffset: 0, duration: Math.min(0.5, stagger + 0.18), ease: 'power1.inOut' }, at + i * stagger)
          })
        }
        const total = Math.max(DRAW_MS / 1000, tl.duration())
        tl.to(progress, { scaleX: 1, duration: total, ease: 'none' }, 0)
        tl.play(0)
      })

      await drawn
      if (cancelled) return
      mark('built')
      probeState('built')

      try {
        await Promise.race([
          targetReady,
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('target timeout')), 12000)),
        ])
      } catch {
        // never leave the user on a cover forever: reveal the real hero even if
        // an image failed (the hero has its own tone fallback underneath)
        root.dataset.phase = 'fallback'
      }
      if (cancelled) return
      mark('targetReady')
      await new Promise((r) => setTimeout(r, HOLD_MS))
      await reveal()
      if (cancelled) return
      finish()
    }

    void run()

    const onVisibility = () => {
      if (document.hidden) timeline.current?.pause()
      else timeline.current?.resume()
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisibility)
      timeline.current?.kill()
      timeline.current = null
      document.documentElement.classList.remove('is-opening')
    }
  }, [gateDelay, mark])

  return { rootRef, state }
}
