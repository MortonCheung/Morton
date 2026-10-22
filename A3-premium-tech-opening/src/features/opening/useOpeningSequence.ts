import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import gsap from 'gsap'
import type { WordBuild } from '../../letters/buildWord'
import type { LayoutFrame } from '../../lib/frame'
import type { SceneApi } from '../../scenes/OpeningScene'
import { getProbe, setExtra, setLetters, setState, type OpeningState } from '../../lib/timeline'
import { createDrawTimeline } from './drawTimeline'
import { createExpandTimeline, EXPAND_DURATION } from './expandTimeline'

interface SequenceArgs {
  build: WordBuild | null
  frame: LayoutFrame | null
  reduced: boolean
  svgRef: RefObject<SVGSVGElement | null>
  sceneRef: RefObject<SceneApi | null>
  assetsReady: Promise<void>
}

interface Run {
  cancelled: boolean
  timelines: gsap.core.Timeline[]
}

/**
 * Opening state machine.
 *
 * loading -> drawing (fixed >=1000ms authored timeline) -> built (outline held)
 * -> [real assets ready] -> expanding (~500ms) -> hero
 *
 * The gate is `Promise.all`-shaped by construction: the expand timeline is only
 * created inside the drawing-complete callback *after* `assetsReady` resolves.
 * Nothing invents a percentage and nothing skips the drawing when the font or
 * environment happens to be warm.
 */
export function useOpeningSequence({ build, frame, reduced, svgRef, sceneRef, assetsReady }: SequenceArgs) {
  const [state, setLocalState] = useState<OpeningState>('loading')
  const runRef = useRef<Run | null>(null)
  const startedRef = useRef<string | null>(null)
  const [epoch, setEpoch] = useState(0)
  const replayCount = useRef(0)

  const transition = useCallback((next: OpeningState) => {
    setState(next)
    setLocalState(next)
  }, [])

  // Cancel only on unmount. Frame/resize re-runs of the effect below must not
  // abort a run that is already in flight.
  useEffect(
    () => () => {
      const run = runRef.current
      if (!run) return
      run.cancelled = true
      for (const timeline of run.timelines) timeline.kill()
      runRef.current = null
    },
    [],
  )

  useLayoutEffect(() => {
    if (!build || !frame) return
    const svg = svgRef.current
    if (!svg) return
    const key = String(epoch)
    if (startedRef.current === key) return
    const paths = Array.from(svg.querySelectorAll<SVGPathElement>('path[data-draw]'))
    if (paths.length === 0) return
    startedRef.current = key

    const previous = runRef.current
    if (previous) {
      previous.cancelled = true
      for (const timeline of previous.timelines) timeline.kill()
    }

    const api = sceneRef.current
    api?.reset()

    const run: Run = { cancelled: false, timelines: [] }
    runRef.current = run
    const startAt = performance.now()

    if (reduced) {
      paths.forEach((path) => {
        const length = path.getTotalLength()
        gsap.set(path, { strokeDasharray: `${length} ${length}`, strokeDashoffset: 0 })
      })
      gsap.set(svg, { opacity: 0 })
      api?.showStatic()
      if (api) setLetters(api.snapshot())
      setExtra({ reducedMotion: true })
      transition('reduced')
      return
    }

    transition('drawing')
    const { timeline, duration } = createDrawTimeline(paths)
    run.timelines.push(timeline)
    setExtra({ plan: { drawMs: Math.round(duration * 1000), expandMs: Math.round(EXPAND_DURATION * 1000) } })
    gsap.set(svg, { opacity: 1 })

    timeline.eventCallback('onComplete', () => {
      if (run.cancelled) return
      transition('built')

      void assetsReady.then(() => {
        if (run.cancelled) return
        const scene = sceneRef.current
        if (!scene) return
        transition('expanding')

        const expand = createExpandTimeline(scene.controls, svg)
        run.timelines.push(expand)
        expand.eventCallback('onComplete', () => {
          if (run.cancelled) return
          scene.enterHero()
          setLetters(scene.snapshot())
          transition('hero')
          const timings = getProbe().timings
          const summary = {
            drawMs: (timings.builtAt ?? 0) - (timings.drawingAt ?? 0),
            expandMs: (timings.heroAt ?? 0) - (timings.expandingAt ?? 0),
            totalMs: Math.round(performance.now() - startAt),
          }
          setExtra({
            lastRun: summary,
            replays: replayCount.current,
            renderer: scene.rendererInfo(),
          })
        })
        expand.play(0)
      })
    })

    timeline.play(0)
  }, [build, frame, reduced, epoch, svgRef, sceneRef, assetsReady, transition])

  const replay = useCallback(() => {
    const run = runRef.current
    if (run) {
      run.cancelled = true
      for (const timeline of run.timelines) timeline.kill()
      runRef.current = null
    }
    replayCount.current += 1
    startedRef.current = null
    setLocalState('loading')
    setExtra({ replays: replayCount.current })
    setEpoch((value) => value + 1)
  }, [])

  return { state, replay }
}
