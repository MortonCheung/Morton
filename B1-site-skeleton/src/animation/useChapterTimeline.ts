import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useLayoutEffect } from 'react'
import type { RefObject } from 'react'

gsap.registerPlugin(ScrollTrigger)

export type BuildTimeline = (tl: gsap.core.Timeline, section: HTMLElement) => void

/**
 * Creates one scrubbed, chapter-local timeline and destroys it on unmount.
 *
 * The sticky panel provides the visual pin (position: sticky), so this trigger
 * only maps chapter progress to content motion. Every chapter owns its own
 * trigger, so no single mega-timeline drives the page.
 */
export function useChapterTimeline(
  sectionRef: RefObject<HTMLElement | null>,
  build: BuildTimeline,
  deps: unknown[] = [],
  reduced = false,
) {
  useLayoutEffect(() => {
    const section = sectionRef.current
    if (!section || reduced) return
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'none' }, paused: true })
      build(tl, section)
      // Normalise the timeline to exactly 1 unit so authored positions (0..1 in
      // the build functions) map 1:1 to the chapter's scroll progress.
      tl.set({}, {}, 1)
      ScrollTrigger.create({
        trigger: section,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.5,
        animation: tl,
        invalidateOnRefresh: true,
      })
    }, section)
    return () => ctx.revert()
    // deps are owned by the caller; build is intentionally stable per chapter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced, ...deps])
}

export { gsap, ScrollTrigger }
