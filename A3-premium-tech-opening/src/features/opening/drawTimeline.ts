import gsap from 'gsap'

/**
 * The drawing state: stroke-dashoffset reveals the *real* glyph contours in a
 * fixed M -> O -> R -> T -> O -> N order.
 *
 * Timing is authored so that the measured drawing state is deliberately longer
 * than the 1000 ms floor:
 *
 *   lead-in 30ms + 5 letter gaps x 165ms + 300ms outer stroke = 1155ms
 *
 * Constant-speed ("none") easing is the point: a machine traces at one speed,
 * it does not ease in and out like a UI transition.
 */

export interface DrawTiming {
  leadIn: number
  letterStagger: number
  outerDuration: number
  innerDuration: number
  innerStagger: number
}

export const DRAW_TIMING: DrawTiming = {
  leadIn: 0.03,
  letterStagger: 0.165,
  outerDuration: 0.3,
  innerDuration: 0.22,
  innerStagger: 0.06,
}

export function applyDrawInit(paths: SVGPathElement[]): number[] {
  const lengths = paths.map((path) => path.getTotalLength())
  paths.forEach((path, index) => {
    const length = lengths[index]
    gsap.set(path, {
      strokeDasharray: `${length} ${length}`,
      strokeDashoffset: length,
      opacity: 1,
    })
  })
  return lengths
}

export function createDrawTimeline(paths: SVGPathElement[], timing: DrawTiming = DRAW_TIMING) {
  const lengths = applyDrawInit(paths)
  const groups = new Map<number, { path: SVGPathElement; index: number }[]>()
  paths.forEach((path, index) => {
    const letterIndex = Number(path.dataset.letter ?? '0')
    if (!groups.has(letterIndex)) groups.set(letterIndex, [])
    groups.get(letterIndex)!.push({ path, index })
  })

  const tl = gsap.timeline({ paused: true })
  for (const [letterIndex, group] of groups) {
    group.forEach((item, withinLetter) => {
      const isOuter = withinLetter === 0
      tl.to(
        item.path,
        {
          strokeDashoffset: 0,
          duration: isOuter ? timing.outerDuration : timing.innerDuration,
          ease: 'none',
        },
        timing.leadIn + letterIndex * timing.letterStagger + withinLetter * timing.innerStagger,
      )
    })
  }

  return { timeline: tl, lengths, duration: tl.duration() }
}
