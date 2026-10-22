import gsap from 'gsap'
import { TIMING } from '../data/stageConfig'

export interface DrawHandle {
  timeline: gsap.core.Timeline
  /** seconds from the first stroke to the built state */
  duration: number
}

/**
 * Draws the construction lines letter by letter, contour by contour.
 *
 * Each path carries `pathLength={1}`, so a single dash covers the whole
 * contour and animating dashoffset from 1 → 0 is exactly "the pen draws this
 * line". Timing is derived from TIMING so the measured drawing phase always
 * stays above the 1000 ms floor (see docs/TEST_REPORT.md).
 */
export function createDrawTimeline(
  svg: SVGSVGElement,
  progressEl: HTMLElement | null,
  onComplete: () => void,
): DrawHandle {
  const letters = Array.from(svg.querySelectorAll<SVGGElement>('[data-letter-index]'))
  const paths = Array.from(svg.querySelectorAll<SVGPathElement>('path'))
  const ink = svg.querySelector<SVGGElement>('[data-outline-ink]')

  gsap.killTweensOf([...paths, ...(ink ? [ink] : []), ...(progressEl ? [progressEl] : [])])
  // Path lengths are in glyph/user units; the group transform scales them onto
  // screen. Measuring the real length avoids any pathLength/non-scaling-stroke
  // interaction (which turns the dash pattern into noise).
  for (const path of paths) {
    const length = path.getTotalLength()
    gsap.set(path, { strokeDasharray: length, strokeDashoffset: length, opacity: 0 })
  }
  if (ink) gsap.set(ink, { opacity: 1 })
  if (progressEl) gsap.set(progressEl, { scaleX: 0 })

  const timeline = gsap.timeline({ onComplete })
  const letterDuration = (group: SVGGElement) => {
    const count = group.querySelectorAll('path').length
    return TIMING.contour + Math.max(0, count - 1) * TIMING.contourStagger
  }
  const maxLetterDuration = letters.reduce((max, group) => Math.max(max, letterDuration(group)), 0)

  letters.forEach((group, letterIndex) => {
    const start = TIMING.lead + letterIndex * TIMING.letterStagger
    const groupPaths = Array.from(group.querySelectorAll<SVGPathElement>('path'))
    groupPaths.forEach((path, contourIndex) => {
      const at = start + contourIndex * TIMING.contourStagger
      timeline.set(path, { opacity: 1 }, at)
      timeline.to(path, { strokeDashoffset: 0, duration: TIMING.contour, ease: 'power1.inOut' }, at)
    })
  })

  const lastLetterStart = TIMING.lead + Math.max(0, letters.length - 1) * TIMING.letterStagger
  const drawSpan = lastLetterStart + maxLetterDuration
  if (progressEl) {
    timeline.fromTo(
      progressEl,
      { scaleX: 0 },
      { scaleX: 1, duration: drawSpan, ease: 'none' },
      0,
    )
  }
  // the built state is held for a beat so it reads as a composition, not a frame
  timeline.to({}, { duration: TIMING.settle })

  return { timeline, duration: timeline.duration() }
}
